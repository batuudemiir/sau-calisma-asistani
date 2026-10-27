"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MISSING_LOCATIONS, OSM_ATTRIBUTION, osmBuilding, osmUrl, type PlaceCategory } from "@/data/campus";
import { LIBRARY_LEVEL_LABELS, WEEKDAY_NAMES, statusTitle, time } from "@/lib/labels";
import { applyFilters, parseFilters } from "@/lib/filters";
import { carryQuery, durationParam, useApi } from "@/lib/use-api";
import type { MapResponse, PlaceDTO, ResultDTO } from "@/server/search-service";
import { DurationChips } from "../nav/DurationChips";
import { FilterChips } from "../nav/FilterChips";
import { ShareButton } from "../ShareButton";
import { openingHoursText } from "../PlaceCard";
import { RatingChip } from "../Ratings";
import { ReportButtons } from "../ReportButtons";
import { POLL_MS } from "../ResultsView";
import { SimulatedBadge, StatusBadge } from "../StatusBadge";
import { BuildingMap } from "./BuildingMap";
import { SearchBox } from "./SearchBox";
import { CampusMap, GUIDE, type MapSelection } from "./CampusMap";
import { FILL, SHORT, isSimStatus, shownRating, type Tone } from "./map-style";

type SheetState = "peek" | "half" | "full";
const NEXT: Record<SheetState, SheetState> = { peek: "half", half: "full", full: "peek" };
const SHEET_HEIGHT: Record<SheetState, string> = { peek: "h-64", half: "h-[55%]", full: "h-[calc(100%-0.5rem)]" };

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  FACULTY: "Fakülte / öğretim binası",
  LAB: "Laboratuvar / araştırma merkezi",
  LIBRARY: "Kütüphane",
  CAFE: "Kafe / kantin",
  OTHER: "Diğer",
};

/**
 * Ana ekran: tam ekran kampüs haritası + alt panel. Telefonda panel 3 kademelidir (özet / liste / tam);
 * geniş ekranda sağda sabit sütundur. Haritadaki her bilgi panelde metin olarak da vardır.
 */
export function MapHome() {
  const params = useSearchParams();
  const router = useRouter();
  const query = carryQuery(params);
  const selected: MapSelection = { b: params.get("b") ?? undefined, s: params.get("s") ?? undefined };
  const { data, error, loading, reload } = useApi<MapResponse>(`/api/map?${query}`, POLL_MS);
  const d = durationParam(params);

  const [sheet, setSheet] = useState<SheetState>("peek");
  const trigger = useRef<Element | null>(null);
  const sheetTitle = useRef<HTMLHeadingElement>(null);

  const building = data?.buildings.find((b) => b.id === selected.b) ?? null;
  const place = data?.places.find((p) => p.spaceId === selected.s) ?? null;
  const panelOpen = Boolean(building || place);
  // Seçim varken panel en az yarım açık; seçimi kapatınca kullanıcının seçtiği kademeye döner
  const state: SheetState = panelOpen && sheet === "peek" ? "half" : sheet;

  const select = (sel: MapSelection, from: Element | null) => {
    trigger.current = from;
    router.replace(`/?${carryQuery(params, sel as Record<string, string>)}`, { scroll: false });
  };
  const close = () => {
    router.replace(`/?${query}`, { scroll: false });
    // Odak, paneli açan işarete döner (yoksa panel başlığına)
    const t = trigger.current;
    trigger.current = null;
    setTimeout(() => (t instanceof HTMLElement || t instanceof SVGElement ? t.focus() : sheetTitle.current?.focus()), 0);
  };

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col overflow-hidden lg:h-[calc(100dvh-3.5rem)] lg:flex-row">
      <div className="relative min-h-0 flex-1">
        <header className="absolute inset-x-2 top-2 z-10 space-y-2 rounded-xl border border-zinc-300 bg-background/95 p-2 shadow-sm lg:right-auto lg:w-[28rem] dark:border-zinc-700">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h1 className="text-base font-bold">Kampüs haritası</h1>
            {data && (
              <p className="text-xs opacity-80">
                {WEEKDAY_NAMES[data.now.weekday]} {time(data.now.minute)}
                {data.now.isDemoClock && <strong className="ml-1">(demo saati)</strong>}
              </p>
            )}
          </div>
          {data && <SearchBox data={data} query={query} onSelect={select} />}
          <DurationChips basePath="/" />
        </header>

        {loading && !data && (
          <p role="status" className="p-4 pt-32">
            Yükleniyor…
          </p>
        )}
        {error && (
          <div role="alert" className="absolute inset-x-2 top-32 z-10 rounded-lg border border-red-700 bg-background p-3 text-sm">
            {error}.{" "}
            <button type="button" onClick={() => void reload()} className="font-semibold underline">
              Tekrar dene
            </button>
          </div>
        )}
        {data && <CampusMap data={data} query={query} selected={selected} onSelect={select} />}
      </div>

      <section
        aria-labelledby="sheet-title"
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-zinc-300 bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.12)] motion-safe:transition-[height] lg:static lg:h-auto lg:w-[26rem] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none dark:border-zinc-700 ${SHEET_HEIGHT[state]}`}
      >
        <button
          type="button"
          onClick={() => setSheet(NEXT[state])}
          aria-expanded={state !== "peek"}
          aria-controls="sheet-body"
          aria-label={state === "full" ? "Paneli küçült" : "Paneli büyüt"}
          className="flex min-h-8 w-full shrink-0 items-center justify-center lg:hidden"
        >
          <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-zinc-400" />
        </button>
        <div id="sheet-body" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 lg:pt-4">
          {data && building && (
            <Panel title={building.name} onClose={close}>
              <p className="text-sm">
                {d} dakika için uygun görünen oda:{" "}
                <strong>
                  {
                    building.spaces.filter(
                      (s) => !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE"),
                    ).length
                  }
                </strong>
              </p>
              <BuildingMap spaces={building.spaces} query={query} />
              <p className="text-xs opacity-70">Kat görünümü şematiktir, ölçekli değildir. Odaya dokun: ayrıntı ve check-in.</p>
              <Legend data={data} />
            </Panel>
          )}
          {data && place && !building && (
            <Panel title={place.name} onClose={close}>
              <PlaceSummary place={place} nowMs={data.now.nowMs} />
              <ShareButton title={place.name} />
              <ReportButtons spaceId={place.spaceId} onReported={() => void reload()} />
              <Link
                href={`/yer/${encodeURIComponent(place.spaceId)}?${query}`}
                className="inline-flex min-h-11 items-center font-semibold underline"
              >
                Ayrıntılar ve değerlendirme →
              </Link>
            </Panel>
          )}
          {data && !panelOpen && (
            <Overview data={data} query={query} d={d} expanded={state !== "peek"} titleRef={sheetTitle} onSelect={select} />
          )}
        </div>
      </section>
    </div>
  );
}

/** Seçili bina/yer paneli: açılınca başlığa odaklanır, Esc ile kapanır. */
function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [title]);
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="panel-title"
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="panel-title" ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 shrink-0 rounded-lg border border-zinc-400 px-3 text-sm font-semibold"
        >
          Kapat
        </button>
      </div>
      {children}
    </div>
  );
}

function PlaceSummary({ place, nowMs }: { place: PlaceDTO; nowMs: number }) {
  const hours = openingHoursText(place.openingHours);
  return (
    <div className="space-y-2">
      <StatusBadge status={place.status} isLibrary />
      <p className="text-sm">{hours ?? "Açılış saatleri bilinmiyor"}</p>
      {place.simulation && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Yoğunluk: <strong>{LIBRARY_LEVEL_LABELS[place.simulation.level]}</strong>
          {place.simulation.pattern !== "DAILY" &&
            ` · ${Math.max(0, Math.floor((nowMs - place.simulation.updatedAtMs) / 60_000))} dk önce`}
          <SimulatedBadge />
        </p>
      )}
      <RatingChip rating={place.rating} />
    </div>
  );
}

function ResultRow({ r, query }: { r: ResultDTO; query: string }) {
  return (
    <li>
      <Link
        href={`/yer/${encodeURIComponent(r.spaceId)}?${query}`}
        className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
      >
        <span>
          <strong>{r.code}</strong> <span className="text-sm opacity-80">· {r.buildingName}</span>
        </span>
        <span className="text-right text-sm">
          {statusTitle(r.status)}
          {r.freeUntil !== null && <span className="block text-xs opacity-80">{time(r.freeUntil)}&apos;a kadar</span>}
          {r.isSimulated && <span className="sr-only"> (örnek demo verisi)</span>}
        </span>
      </Link>
    </li>
  );
}

function Overview({
  data,
  query,
  d,
  expanded,
  titleRef,
  onSelect,
}: {
  data: MapResponse;
  query: string;
  d: number;
  expanded: boolean;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  onSelect: (sel: MapSelection, el: Element) => void;
}) {
  const n = data.results.length;
  const more = expanded ? "" : "hidden lg:block";
  const filters = parseFilters(useSearchParams().get("f"));
  const results = applyFilters(data.results, filters);
  const places = applyFilters(data.places, filters);
  const noLocation = data.buildings.filter((b) => !b.osm || !osmBuilding(b.osm));
  return (
    <div className="space-y-3">
      <div>
        <h2 id="sheet-title" ref={titleRef} tabIndex={-1} className="text-lg font-bold outline-none">
          {n > 0 ? `Şu an ${n} derslik uygun görünüyor` : "Programda uygun görünen derslik yok"}
        </h2>
        <p className="text-sm opacity-80">
          {d} dakika boyunca · çalışma yerleri aşağıda
          {filters.length > 0 && ` · filtre: ${filters.length} etkin, ${results.length} derslik uyuyor`}
        </p>
      </div>
      <div className={more}>
        <FilterChips />
      </div>
      <ul className="space-y-2" aria-label="Uygun görünen derslikler">
        {(expanded ? results : results.slice(0, 3)).map((r) => (
          <ResultRow key={r.spaceId} r={r} query={query} />
        ))}
      </ul>
      {!expanded && results.length > 3 && (
        <p className="text-sm lg:hidden">ve {results.length - 3} derslik daha — paneli büyüt.</p>
      )}

      <div className={`space-y-4 ${more}`}>
        <Link href={`/liste?${query}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
          Ayrıntılı liste →
        </Link>
        <section aria-labelledby="places-title" className="space-y-2">
          <h3 id="places-title" className="font-bold">
            Çalışma yerleri
          </h3>
          <ul className="space-y-1">
            {places.length === 0 && <li className="text-sm">Filtreye uyan çalışma yeri yok.</li>}
            {places.map((p) => (
              <li key={p.spaceId}>
                <a
                  href={`/?${query}&s=${encodeURIComponent(p.spaceId)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelect({ s: p.spaceId }, e.currentTarget);
                  }}
                  className="flex min-h-11 items-center justify-between gap-3"
                >
                  <span className="underline">
                    {p.kind === "LIBRARY" ? "K" : "C"} · {p.name}
                  </span>
                  <span className="shrink-0 text-right text-sm opacity-80">{statusTitle(p.status, true)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {data.buildings.length > 0 && (
          <section aria-labelledby="buildings-title" className="space-y-1">
            <h3 id="buildings-title" className="font-bold">
              Derslikli binalar
            </h3>
            <ul className="text-sm">
              {data.buildings.map((b) => (
                <li key={b.id}>
                  <a
                    href={`/?${query}&b=${encodeURIComponent(b.id)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelect({ b: b.id }, e.currentTarget);
                    }}
                    className="inline-flex min-h-11 items-center underline"
                  >
                    {b.name} — odaları gör{noLocation.includes(b) ? " (konumu haritada yok)" : ""}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Legend data={data} />

        <details className="rounded-lg border border-zinc-300 p-3 text-sm dark:border-zinc-700">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">Kampüs rehberi (numaralı binalar)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-6">
            {GUIDE.map((p) => (
              <li key={p.id}>
                <a href={osmUrl(p.osm)} target="_blank" rel="noreferrer" className="underline">
                  {p.name}
                </a>
                <span className="opacity-70">
                  {" "}
                  · {CATEGORY_LABEL[p.category]}
                  {p.operator ? ` · ${p.operator}` : ""}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs opacity-80">
            Konumu açık kaynakta bulunamayanlar (haritada gösterilmez): {MISSING_LOCATIONS.join("; ")}.
          </p>
        </details>
      </div>
    </div>
  );
}

function Legend({ data }: { data: MapResponse }) {
  const anySimulated =
    data.buildings.some((b) => b.spaces.some((s) => shownRating(s.rating)?.simulated || isSimStatus(s))) ||
    data.places.some((p) => shownRating(p.rating)?.simulated || isSimStatus(p));
  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Harita açıklaması">
        {(Object.keys(SHORT) as Tone[]).map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <svg width="14" height="14" aria-hidden="true">
              <rect
                x="1"
                y="1"
                width="12"
                height="12"
                rx="2"
                className={FILL[t]}
                strokeWidth="1.5"
                strokeDasharray={t === "EXCLUDED" ? "3 2" : undefined}
              />
            </svg>
            {SHORT[t]}
          </li>
        ))}
        <li>★ ortalama puan (3+ değerlendirme)</li>
        <li>
          <strong>K</strong> kütüphane · <strong>C</strong> kafe
        </li>
      </ul>
      {anySimulated && (
        <p className="flex items-center gap-2 text-xs">
          <SimulatedBadge /> * işaretli puan ve bildirimler örnek demo verisidir.
        </p>
      )}
      <p className="text-xs opacity-70">
        Bina konum ve sınırları gerçek ölçeklidir; adlar gönüllü haritacılardandır, eksik olabilir. Renk tek başına anlam taşımaz;
        her yerde durum metni yazar. Harita verisi{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
          {OSM_ATTRIBUTION}
        </a>
      </p>
    </div>
  );
}
