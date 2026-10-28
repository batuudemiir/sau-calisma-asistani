"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WEEKDAY_NAMES, time } from "@/lib/labels";
import { applyFilters, parseFilters } from "@/lib/filters";
import { matchesQuery } from "@/lib/search";
import { carryQuery, durationParam, useApi } from "@/lib/use-api";
import type { MapResponse, SearchResponse } from "@/server/search-service";
import { Assistant } from "./assistant/Assistant";
import { DemoClockNotice } from "./DemoClockNotice";
import { PlaceRow, RoomCard } from "./home/RoomCard";
import { DurationChips } from "./nav/DurationChips";
import { FilterChips } from "./nav/FilterChips";

export const POLL_MS = 4000;

/** Telefonda ilk ekranda gösterilen boş sınıf sayısı; gerisi "Tümünü göster" ile. */
const FIRST = 6;

const isFree = (code: string) => code === "PROGRAM_FREE" || code === "VERIFIED_FREE";

/**
 * Ana sayfa ("Şimdi"): kaç dakikan var → şu an boş sınıflar → kütüphane ve kafeler. Kaynak, erişim ve ders ayrıntısı
 * oda sayfasındadır; burada yalnızca karar için gereken: oda, bina, durum, ne zamana kadar.
 */
export function ResultsView() {
  const params = useSearchParams();
  const query = carryQuery(params);
  const { data, error, loading, reload } = useApi<SearchResponse>(`/api/search?${query}`, POLL_MS);
  const d = durationParam(params);
  const filters = parseFilters(params.get("f"));
  // Arama URL'de (q) tutulur; Türkçe katlamalı ("bb101" → BB-101)
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(params.get("q") ?? "");
  const [all, setAll] = useState(false);
  const searching = text.trim().length > 0;
  const onSearch = (value: string) => {
    setText(value);
    const q = new URLSearchParams(params);
    if (value.trim()) q.set("q", value);
    else q.delete("q");
    router.replace(`${pathname}?${q}`, { scroll: false });
  };
  const places = data ? applyFilters(data.places, filters).filter((p) => matchesQuery(text, p.name)) : [];
  const results = data ? applyFilters(data.results, filters).filter((r) => matchesQuery(text, r.code, r.buildingName)) : [];
  const free = results.filter((r) => isFree(r.status.code));
  const others = results.filter((r) => !isFree(r.status.code));
  const visible = all || searching ? free : free.slice(0, FIRST);
  const href = (id: string) => `/yer/${encodeURIComponent(id)}?${query}`;
  // Asistan öneri için harita verisini (konumlar dahil) kullanır; yalnızca açılış ve süre değişince yüklenir
  const assistantData = useApi<MapResponse>(`/api/map?${query}`).data;

  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pt-5 pb-28 lg:max-w-5xl lg:px-8 lg:py-10">
      <header className="space-y-3">
        <h1 className="text-[28px] leading-8 font-bold">Kaç dakikan var?</h1>
        <DurationChips basePath="/" />
        <div className="relative">
          <label htmlFor="ara" className="sr-only">
            Sınıf, bina veya yer ara
          </label>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute top-[13px] left-3 text-fg-3"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="ara"
            type="search"
            value={text}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Sınıf, bina veya yer ara"
            autoComplete="off"
            className="min-h-11 w-full rounded-md border border-line-strong bg-card pr-3 pl-9 placeholder:text-fg-3 focus:border-ink-900 focus:outline-2 focus:outline-offset-0 focus:outline-[var(--focus-ring)]"
          />
        </div>
        <p aria-live="polite" className="sr-only">
          {searching && data ? `${places.length + results.length} sonuç` : ""}
        </p>
        <FilterChips only={["quiet", "power", "open"]} />
        {data && (
          <p className="text-sm text-fg-2">
            {WEEKDAY_NAMES[data.now.weekday]} <span className="font-mono">{time(data.now.minute)}</span>
          </p>
        )}
        {data && <DemoClockNotice now={data.now} basePath="/" durationMin={d} />}
      </header>

      {loading && !data && <p role="status">Yükleniyor…</p>}
      {error && (
        <div role="alert" className="rounded-md border border-danger p-3 text-sm">
          {error}.{" "}
          <button type="button" onClick={() => void reload()} className="font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 lg:space-y-0">
          <section aria-labelledby="bos-siniflar" className="space-y-3">
            <h2 id="bos-siniflar" className="text-[22px] leading-7 font-bold">
              Şu an boş sınıflar <span className="text-fg-2">({free.length})</span>
            </h2>
            {free.length === 0 ? (
              <p className="rounded-md border border-line-strong p-4">
                {searching
                  ? `"${text.trim()}" aramasına uyan boş sınıf yok. Sınıf kodunu (ör. BB-102) veya bina adını dene.`
                  : filters.length > 0
                    ? "Filtreye uyan boş sınıf yok. Bir filtreyi kaldırmayı dene."
                    : `${d} dakika boyunca boş sınıf görünmüyor. Daha kısa bir süre seç ya da kütüphaneye bak.`}
              </p>
            ) : (
              <ul className="space-y-2" aria-label="Boş sınıflar">
                {visible.map((r) => (
                  <RoomCard key={r.spaceId} r={r} href={href(r.spaceId)} />
                ))}
              </ul>
            )}
            {!all && !searching && free.length > FIRST && (
              <button
                type="button"
                onClick={() => setAll(true)}
                className="min-h-11 w-full rounded-md border border-line-strong bg-card font-semibold hover:bg-sunken"
              >
                Tümünü göster ({free.length})
              </button>
            )}
            {others.length > 0 && (
              <details className="rounded-lg border border-line bg-card p-3">
                <summary className="min-h-11 cursor-pointer content-center font-semibold">
                  Dolu ya da durumu bilinmeyen ({others.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {others.map((r) => (
                    <RoomCard key={r.spaceId} r={r} href={href(r.spaceId)} />
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section aria-labelledby="calisma-alanlari" className="space-y-3 lg:sticky lg:top-6">
            <h2 id="calisma-alanlari" className="text-[22px] leading-7 font-bold">
              Kütüphane ve kafeler
            </h2>
            {places.length === 0 ? (
              <p className="text-sm">{searching ? "Aramaya uyan yer yok." : "Filtreye uyan yer yok."}</p>
            ) : (
              <ul className="space-y-2">
                {places.map((p) => (
                  <PlaceRow key={p.spaceId} place={p} href={href(p.spaceId)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <Assistant
        page
        data={assistantData}
        duration={d}
        onDuration={(x) => router.replace(`/?${carryQuery(params, { d: String(x) })}`, { scroll: false })}
        onSelect={(sel) => sel.s && router.push(href(sel.s))}
        query={query}
      />
    </div>
  );
}
