"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WEEKDAY_NAMES, time } from "@/lib/labels";
import { applyFilters, parseFilters } from "@/lib/filters";
import { matchesQuery } from "@/lib/search";
import { carryQuery, durationParam, useApi } from "@/lib/use-api";
import type { SearchResponse } from "@/server/search-service";
import { DurationChips } from "./nav/DurationChips";
import { FilterChips } from "./nav/FilterChips";
import { PlaceCard } from "./PlaceCard";
import { SpaceCard } from "./SpaceCard";

export const POLL_MS = 4000;

export function ResultsView() {
  const params = useSearchParams();
  const query = carryQuery(params);
  const { data, error, loading, reload } = useApi<SearchResponse>(`/api/search?${query}`, POLL_MS);
  const d = durationParam(params);
  const filters = parseFilters(params.get("f"));
  // Listede arama: URL'de q (paylaşılabilir); Türkçe katlamalı ("o102" → Ö-102)
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(params.get("q") ?? "");
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

  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6 lg:max-w-6xl lg:px-8 lg:py-10">
      <header className="space-y-3">
        <h1 className="text-[28px] leading-8 font-bold">{d} dakika nerede çalışalım?</h1>
        <div className="relative">
          <label htmlFor="liste-ara" className="sr-only">
            Listede ara: oda, bina veya çalışma yeri
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
            id="liste-ara"
            type="search"
            value={text}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Oda, bina veya yer ara"
            autoComplete="off"
            className="min-h-11 w-full rounded-md border border-line-strong bg-card pr-3 pl-9 placeholder:text-fg-3 focus:border-ink-900 focus:outline-2 focus:outline-offset-0 focus:outline-[var(--focus-ring)]"
          />
        </div>
        <p aria-live="polite" className="sr-only">
          {searching && data ? `${places.length + results.length} sonuç` : ""}
        </p>
        <DurationChips basePath="/liste" />
        <FilterChips />
        {data && (
          <p className="text-sm text-fg-2">
            {WEEKDAY_NAMES[data.now.weekday]} {time(data.now.minute)}
            {data.termLabel ? ` · ${data.termLabel}` : ""}
            {data.now.isDemoClock && <strong className="ml-1">(demo saati)</strong>}
          </p>
        )}
        <Link href={`/?${query}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
          Haritada gör →
        </Link>
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
        // Telefonda tek sütun; geniş ekranda solda çalışma yerleri (kaydırırken sabit), sağda derslikler
        <div className="space-y-5 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
          <section aria-labelledby="places-title" className="space-y-3 lg:sticky lg:top-6">
            <h2 id="places-title" className="sr-only">
              Çalışma yerleri
            </h2>
            {filters.length > 0 || searching ? (
              places.length === 0 ? (
                <p className="text-sm">{searching ? "Aramaya uyan çalışma yeri yok." : "Filtreye uyan çalışma yeri yok."}</p>
              ) : (
                <ul className="space-y-2">
                  {places.map((p) => (
                    <li key={p.spaceId}>
                      <PlaceCard
                        place={p}
                        href={`/yer/${encodeURIComponent(p.spaceId)}?${query}`}
                        nowMs={data.now.nowMs}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <>
                <PlaceCard
                  place={data.places[0]}
                  href={`/yer/${encodeURIComponent(data.places[0].spaceId)}?${query}`}
                  nowMs={data.now.nowMs}
                />
                {data.places.length > 1 && (
                  <details className="rounded-lg border border-line bg-card p-3">
                    <summary className="min-h-11 cursor-pointer content-center font-semibold">
                      Diğer çalışma yerleri ({data.places.length - 1}) — kütüphane ek bina, kafeler
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {data.places.slice(1).map((p) => (
                        <li key={p.spaceId}>
                          <PlaceCard
                            place={p}
                            href={`/yer/${encodeURIComponent(p.spaceId)}?${query}`}
                            nowMs={data.now.nowMs}
                            compact
                          />
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </section>
          <div className="space-y-4">
            <h2 className="text-[22px] leading-7 font-bold">Derslikler</h2>
            {searching && results.length === 0 ? (
              <p className="rounded-md border border-line-strong p-4">
                &quot;{text.trim()}&quot; aramasına uyan uygun derslik yok. Oda kodunu (ör. Ö-102) veya bina adını dene; dolu ya
                da dersi olan odalar bu listede görünmez, haritadaki bina panelinde görünür.
              </p>
            ) : data.results.length > 0 && results.length === 0 ? (
              <p className="rounded-md border border-line-strong p-4">
                Filtreye uyan derslik yok. Yeterli değerlendirmesi olmayan yerler &quot;Sessiz&quot; ve &quot;Priz var&quot;
                filtrelerine girmez.
              </p>
            ) : results.length === 0 ? (
              <p className="rounded-md border border-line-strong p-4">
                Bu süre için programda uygun görünen derslik yok. Daha kısa bir süre deneyebilirsin.
                {data.now.minute + d > 1320 && " Bina kapanış saatine (22.00) yakın olabilir."}
              </p>
            ) : (
              <ul className="space-y-3 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0" aria-label="Uygun görünen alanlar">
                {results.map((r) => (
                  <SpaceCard key={r.spaceId} r={r} href={`/yer/${encodeURIComponent(r.spaceId)}?${query}`} />
                ))}
              </ul>
            )}
            <p className="text-sm text-fg-3">
              Sınav, tatil, ders iptali ve program dışı etkinlik bilgisi yok. Programda boş görünen derslik gerçekten boş
              olmayabilir; gördüğünü bildir, birlikte bilelim.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
