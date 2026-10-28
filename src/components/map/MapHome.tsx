"use client";

import { DemoClockNotice } from "../DemoClockNotice";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OSM_ATTRIBUTION, buildingShape } from "@/data/campus";
import { LIBRARY_LEVEL_LABELS, statusTitle } from "@/lib/labels";
import { carryQuery, durationParam, useApi } from "@/lib/use-api";
import type { MapResponse, PlaceDTO } from "@/server/search-service";
import { DurationChips } from "../nav/DurationChips";
import { buttonClass } from "../ui/Button";
import { PlaceGlyph } from "../ui/PlaceGlyph";
import { openingHoursText } from "@/lib/opening-hours";
import { RatingChip } from "../Ratings";
import { ReportButtons } from "../ReportButtons";
import { POLL_MS } from "../ResultsView";
import { SimulatedBadge, StatusBadge } from "../StatusBadge";
import { Assistant } from "../assistant/Assistant";
import { DirectionsLink } from "../DirectionsLink";
import { BuildingMap } from "./BuildingMap";
import { SearchBox } from "./SearchBox";
import { CampusMap, type MapSelection } from "./CampusMap";
import { FILL, SHORT, type Tone } from "./map-style";

type SheetState = "peek" | "half" | "full";
const NEXT: Record<SheetState, SheetState> = { peek: "half", half: "full", full: "peek" };
const SHEET_HEIGHT: Record<SheetState, string> = { peek: "h-64", half: "h-[55%]", full: "h-[calc(100%-0.5rem)]" };


/**
 * Harita sekmesi: tam ekran kampüs haritası + alt panel. Telefonda panel 3 kademelidir (özet / liste / tam);
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
    router.replace(`/harita?${carryQuery(params, sel as Record<string, string>)}`, { scroll: false });
  };
  const close = () => {
    router.replace(`/harita?${query}`, { scroll: false });
    // Odak, paneli açan işarete döner (yoksa panel başlığına)
    const t = trigger.current;
    trigger.current = null;
    setTimeout(() => (t instanceof HTMLElement || t instanceof SVGElement ? t.focus() : sheetTitle.current?.focus()), 0);
  };

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col overflow-hidden lg:h-[calc(100dvh-3.5rem)] lg:flex-row">
      <div className="relative min-h-0 flex-1">
        <header className="absolute inset-x-2 top-2 z-10 space-y-2 rounded-lg border border-line bg-overlay p-2 shadow-float lg:right-auto lg:w-[28rem]">
          <h1 className="sr-only">Kampüs haritası</h1>
          {data && <SearchBox data={data} query={query} onSelect={select} />}
          <DurationChips basePath="/harita" />
        </header>

        {loading && !data && (
          <p role="status" className="p-4 pt-32">
            Yükleniyor…
          </p>
        )}
        {error && (
          <div role="alert" className="absolute inset-x-2 top-40 z-10 rounded-md border border-danger bg-card p-3 text-sm">
            {error}.{" "}
            <button type="button" onClick={() => void reload()} className="font-semibold underline">
              Tekrar dene
            </button>
          </div>
        )}
        {data && <CampusMap data={data} query={query} selected={selected} onSelect={select} controlsHidden={state !== "peek"} />}
        <Assistant
          data={data}
          duration={d}
          onDuration={(x) => router.replace(`/harita?${carryQuery(params, { d: String(x) })}`, { scroll: false })}
          onSelect={select}
          query={query}
          buttonHidden={state !== "peek"}
        />
      </div>

      <section
        aria-labelledby="sheet-title"
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-t border-line bg-card shadow-sheet transition-[height] duration-[var(--dur-sheet)] ease-brand lg:static lg:h-auto lg:w-[26rem] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none ${SHEET_HEIGHT[state]}`}
      >
        <button
          type="button"
          onClick={() => setSheet(NEXT[state])}
          aria-expanded={state !== "peek"}
          aria-controls="sheet-body"
          aria-label={state === "full" ? "Paneli küçült" : "Paneli büyüt"}
          className="flex min-h-8 w-full shrink-0 items-center justify-center lg:hidden"
        >
          <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-line-strong" />
        </button>
        <div id="sheet-body" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 lg:pt-4">
          {data && building && (
            <Panel title={building.name} onClose={close}>
              <p className="text-sm">
                {d} dakika boyunca <strong>{freeCount(building)}</strong> boş sınıf. Sınıfa dokun: ayrıntı ve check-in.
              </p>
              <DirectionsLink osm={building.osm} />
              <BuildingMap spaces={building.spaces} query={query} />
              <Legend />
            </Panel>
          )}
          {data && place && !building && (
            <Panel title={place.name} onClose={close}>
              <PlaceSummary place={place} nowMs={data.now.nowMs} />
              <DirectionsLink osm={place.osm} />
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
            <Overview data={data} query={query} expanded={state !== "peek"} titleRef={sheetTitle} onSelect={select} />
          )}
        </div>
      </section>
    </div>
  );
}

/** Seçili bina/yer paneli: açılınca başlığa odaklanır, Esc ile kapanır. */
function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [title]);
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
        <button type="button" onClick={onClose} className={buttonClass("secondary", "md")}>
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

const freeCount = (b: MapResponse["buildings"][number]) =>
  b.spaces.filter((s) => !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE")).length;

/** Seçim yokken alt panel: kaç boş sınıf var, hangi binada; kütüphane ve kafeler. */
function Overview({
  data,
  query,
  expanded,
  titleRef,
  onSelect,
}: {
  data: MapResponse;
  query: string;
  expanded: boolean;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  onSelect: (sel: MapSelection, el: Element) => void;
}) {
  const buildings = data.buildings
    .filter((b) => buildingShape(b))
    .map((b) => ({ b, free: freeCount(b) }))
    .sort((x, y) => y.free - x.free || x.b.name.localeCompare(y.b.name, "tr"));
  const total = buildings.reduce((n, x) => n + x.free, 0);
  const more = expanded ? "" : "hidden lg:block";
  const pick = (sel: MapSelection) => (e: React.MouseEvent<Element>) => {
    e.preventDefault();
    onSelect(sel, e.currentTarget);
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 id="sheet-title" ref={titleRef} tabIndex={-1} className="text-[21px] leading-[26px] font-bold outline-none">
          {total > 0 ? `${total} boş sınıf` : "Şu an boş sınıf görünmüyor"}
        </h2>
        <p className="text-sm text-fg-2">Haritada bir binaya dokun, boş sınıfları gör.</p>
        <DemoClockNotice now={data.now} basePath="/harita" durationMin={data.durationMin} />
      </div>
      <section aria-labelledby="buildings-title" className="space-y-2">
        <h3 id="buildings-title" className="sr-only">
          Binalar
        </h3>
        <ul className="space-y-2">
          {(expanded ? buildings : buildings.slice(0, 3)).map(({ b, free }) => (
            <li key={b.id}>
              <a
                href={`/harita?${query}&b=${encodeURIComponent(b.id)}`}
                onClick={pick({ b: b.id })}
                className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-line bg-card px-3 no-underline hover:border-fg-1"
              >
                <span className="font-semibold">{b.name}</span>
                <span className="shrink-0 text-sm">
                  <strong>{free}</strong> boş
                </span>
              </a>
            </li>
          ))}
        </ul>
        {!expanded && buildings.length > 3 && (
          <p className="text-sm text-fg-2 lg:hidden">ve {buildings.length - 3} bina daha — paneli yukarı çek.</p>
        )}
      </section>
      <section aria-labelledby="places-title" className={`space-y-2 ${more}`}>
        <h3 id="places-title" className="font-bold">
          Kütüphane ve kafeler
        </h3>
        <ul className="space-y-1">
          {data.places.map((p) => (
            <li key={p.spaceId}>
              <a
                href={`/harita?${query}&s=${encodeURIComponent(p.spaceId)}`}
                onClick={pick({ s: p.spaceId })}
                className="flex min-h-11 items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2">
                  <PlaceGlyph kind={p.kind} size={20} />
                  <span className="underline">{p.name}</span>
                </span>
                <span className="shrink-0 text-right text-sm text-fg-2">{statusTitle(p.status, true)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <div className={more}>
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Harita açıklaması">
        {(["VERIFIED_FREE", "PROGRAM_FREE", "REPORTED_BUSY", "UNKNOWN"] as Tone[]).map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <svg width="14" height="14" aria-hidden="true">
              <rect x="1" y="1" width="12" height="12" rx="2" className={FILL[t]} strokeWidth="1.5" />
            </svg>
            {SHORT[t]}
          </li>
        ))}
        <li>
          <strong>K</strong> kütüphane · <strong>C</strong> kafe · binadaki sayı: boş sınıf
        </li>
      </ul>
      <p className="text-xs text-fg-3">
        Harita:{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
          {OSM_ATTRIBUTION}
        </a>
      </p>
    </div>
  );
}
