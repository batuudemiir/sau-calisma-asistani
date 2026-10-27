"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RatingSummary } from "@/domain/ratings";
import type { Status, StatusCode } from "@/domain/types";
import { WEEKDAY_NAMES, statusTitle, time } from "@/lib/labels";
import {
  CAMPUS,
  CAMPUS_PLACES,
  MISSING_LOCATIONS,
  OSM_ATTRIBUTION,
  osmBuilding,
  osmUrl,
  type PlaceCategory,
} from "@/data/campus";
import { floorRows, projector, toPath } from "@/lib/map-geometry";
import { carryQuery, durationParam, useApi } from "@/lib/use-api";
import type { MapResponse, MapSpaceDTO } from "@/server/search-service";
import { POLL_MS } from "../ResultsView";
import { DurationChips } from "../nav/DurationChips";
import { SimulatedBadge } from "../StatusBadge";

type Tone = StatusCode | "EXCLUDED";

const SHORT: Record<Tone, string> = {
  VERIFIED_FREE: "✓ Doğrulandı",
  PROGRAM_FREE: "○ Programda boş",
  UNKNOWN: "? Bilinmiyor",
  REPORTED_BUSY: "✕ Dolu",
  EXCLUDED: "– Uygun değil",
};

const FILL: Record<Tone, string> = {
  VERIFIED_FREE: "fill-green-100 stroke-green-700 dark:fill-green-950 dark:stroke-green-400",
  PROGRAM_FREE: "fill-sky-100 stroke-sky-700 dark:fill-sky-950 dark:stroke-sky-400",
  UNKNOWN: "fill-zinc-100 stroke-zinc-600 dark:fill-zinc-800 dark:stroke-zinc-400",
  REPORTED_BUSY: "fill-red-100 stroke-red-700 dark:fill-red-950 dark:stroke-red-400",
  EXCLUDED: "fill-zinc-200 stroke-zinc-500 dark:fill-zinc-900 dark:stroke-zinc-600",
};

const toneOf = (s: MapSpaceDTO): Tone => (s.excludedBecause ? "EXCLUDED" : s.status.code);
const isSimStatus = (s: { status: Status; excludedBecause?: unknown }) =>
  !s.excludedBecause && "simulated" in s.status && s.status.simulated === true;

/** Haritada gösterilecek puan: gerçek yeterliyse o, değilse (demo) simüle; ikisi de yoksa null. */
function shownRating(r: { real: RatingSummary; simulated: RatingSummary }) {
  if (r.real.overall !== null) return { value: r.real.overall, simulated: false };
  if (r.simulated.overall !== null) return { value: r.simulated.overall, simulated: true };
  return null;
}

function ratingText(r: { real: RatingSummary; simulated: RatingSummary }) {
  const s = shownRating(r);
  return s ? `★ ${s.value.toFixed(1)}${s.simulated ? "*" : ""}` : "★ –";
}

function ariaFor(code: string, s: MapSpaceDTO) {
  const state = s.excludedBecause
    ? "seçilen süre için uygun değil"
    : `${statusTitle(s.status as Status)}${isSimStatus(s) ? " (örnek demo verisi)" : ""}`;
  const r = shownRating(s.rating);
  return `${code}: ${state}. ${r ? `Ortalama puan ${r.value.toFixed(1)}${r.simulated ? ", örnek demo verisi" : ""}` : "Yeterli değerlendirme yok"}`;
}

export function MapView() {
  const params = useSearchParams();
  const query = carryQuery(params);
  const selected = params.get("b");
  const { data, error, loading, reload } = useApi<MapResponse>(`/api/map?${query}`, POLL_MS);
  const d = durationParam(params);

  const building = data?.buildings.find((b) => b.id === selected) ?? null;
  const anySimulatedRating =
    data?.buildings.some((b) => b.spaces.some((s) => shownRating(s.rating)?.simulated || isSimStatus(s))) ||
    data?.places.some((p) => shownRating(p.rating)?.simulated || isSimStatus(p));

  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-6 lg:max-w-6xl lg:px-8 lg:py-10">
      {building ? (
        <Link href={`/?${query}`} className="inline-flex min-h-11 items-center text-sm underline">
          ← Kampüs
        </Link>
      ) : (
        <DurationChips basePath="/" />
      )}
      <h1 className="text-2xl font-bold">{building ? building.name : "Kampüs haritası"}</h1>
      {data && (
        <p className="text-sm opacity-80">
          {d} dakika · {WEEKDAY_NAMES[data.now.weekday]} {time(data.now.minute)}
          {data.now.isDemoClock && <strong className="ml-1">(demo saati)</strong>}
        </p>
      )}

      {loading && !data && <p role="status">Yükleniyor…</p>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-700 p-3 text-sm">
          {error}.{" "}
          <button type="button" onClick={() => void reload()} className="font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {data && !building && <CampusMap data={data} query={query} />}
      {data && building && <BuildingMap spaces={building.spaces} query={query} />}

      {data && (
        <>
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
          </ul>
          {anySimulatedRating && (
            <p className="flex items-center gap-2 text-xs">
              <SimulatedBadge /> * işaretli puan ve bildirimler örnek demo verisidir.
            </p>
          )}
          <p className="text-xs opacity-70">
            {building
              ? "Kat görünümü şematiktir, ölçekli değildir."
              : "Bina konum ve sınırları gerçek ölçeklidir; adlar ve etiketler gönüllü haritacılardandır, eksik olabilir."}{" "}
            Renk tek başına anlam taşımaz; her yerde durum metni yazar.
          </p>
          <p className="text-xs opacity-70">
            Harita verisi{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
              {OSM_ATTRIBUTION}
            </a>
          </p>
        </>
      )}
    </div>
  );
}

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  FACULTY: "Fakülte / öğretim binası",
  LAB: "Laboratuvar / araştırma merkezi",
  LIBRARY: "Kütüphane",
  CAFE: "Kafe / kantin",
  OTHER: "Diğer",
};

/** Numaralı rehber: haritadaki işaret numarası = listedeki sıra. */
const GUIDE = CAMPUS_PLACES.filter((p) => (p.category === "FACULTY" || p.category === "LAB") && osmBuilding(p.osm));

// Kampüs sınırı geniş ormanlık alan içerir; harita binaların kapladığı alana kırpılır (telefonda okunur kalsın)
const VIEW_POINTS = CAMPUS.buildings.flatMap((b) => b.outline);

/** Merkez görünümü: çalışma yerleri ve derslikli binaların çevresi (~120 m pay). */
function centerPoints(data: MapResponse): [number, number][] {
  const centers = [...data.places.map((p) => p.osm), ...data.buildings.map((b) => b.osm)]
    .map((o) => (o ? osmBuilding(o)?.center : null))
    .filter((c): c is [number, number] => Boolean(c));
  if (centers.length === 0) return VIEW_POINTS;
  const pad = 0.0011; // ≈120 m
  return centers.flatMap(([lat, lng]) => [
    [lat - pad, lng - pad * 1.3],
    [lat + pad, lng + pad * 1.3],
  ]);
}

function CampusMap({ data, query }: { data: MapResponse; query: string }) {
  const [zoom, setZoom] = useState<"center" | "all">("center");
  const { project, height } = projector(zoom === "center" ? centerPoints(data) : VIEW_POINTS, 360, 12);
  const shape = (outline: [number, number][]) => toPath(outline.map(project));
  const appBuildings = data.buildings.filter((b) => b.osm && osmBuilding(b.osm));
  const appOsm = new Set(appBuildings.map((b) => b.osm));
  const placeOsm = new Set(data.places.map((p) => p.osm).filter(Boolean));

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-3">
        <div className="flex gap-2 lg:max-w-sm" role="group" aria-label="Harita görünümü">
          {(["center", "all"] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              aria-pressed={zoom === z}
              className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold ${zoom === z ? "border-current bg-foreground text-background" : "border-zinc-400"}`}
            >
              {z === "center" ? "Merkez" : "Tüm kampüs"}
            </button>
          ))}
        </div>
        <svg
          viewBox={`0 0 360 ${height}`}
          className="w-full overflow-hidden"
          role="group"
          aria-label="Esentepe kampüsü, gerçek bina konumları"
        >
          <path
            d={shape(CAMPUS.boundary)}
            className="fill-zinc-50 stroke-zinc-400 dark:fill-zinc-900 dark:stroke-zinc-600"
            strokeDasharray="4 3"
          />
          {CAMPUS.buildings
            .filter((b) => !appOsm.has(b.osm) && !placeOsm.has(b.osm))
            .map((b) => (
              <path key={b.osm} d={shape(b.outline)} className="fill-zinc-300 dark:fill-zinc-700">
                {b.name && <title>{b.name}</title>}
              </path>
            ))}
          {GUIDE.map((p, i) => {
            const b = osmBuilding(p.osm)!;
            const [x, y] = project(b.center);
            return (
              <g key={p.id} aria-hidden="true">
                <path d={shape(b.outline)} className="fill-zinc-400 dark:fill-zinc-500" />
                <circle cx={x} cy={y} r="6" className="fill-background stroke-current" strokeWidth="1" />
                <text x={x} y={y + 2.6} textAnchor="middle" className="fill-current text-[7px] font-bold">
                  {i + 1}
                </text>
              </g>
            );
          })}
          {appBuildings.map((b) => {
            const ob = osmBuilding(b.osm!)!;
            const [x, y] = project(ob.center);
            const free = b.spaces.filter(
              (s) => !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE"),
            ).length;
            return (
              <a
                key={b.id}
                href={`/?${query}&b=${encodeURIComponent(b.id)}`}
                aria-label={`${b.name}: ${free} uygun görünen oda. Odaları gör.`}
              >
                <path d={shape(ob.outline)} className={FILL.PROGRAM_FREE} strokeWidth="2" />
                <text x={x} y={y - 9} textAnchor="middle" className="fill-current text-[9px] font-bold">
                  {free} oda
                </text>
              </a>
            );
          })}
          {data.places
            .filter((p) => p.osm && osmBuilding(p.osm))
            .map((p) => {
              const ob = osmBuilding(p.osm!)!;
              const [x, y] = project(ob.center);
              return (
                <a
                  key={p.spaceId}
                  href={`/yer/${encodeURIComponent(p.spaceId)}?${query}`}
                  aria-label={`${p.name}: ${statusTitle(p.status, true)}`}
                >
                  <path d={shape(ob.outline)} className={FILL[p.status.code]} strokeWidth="1.5" />
                  <circle cx={x} cy={y} r="8.5" className={FILL[p.status.code]} strokeWidth="1.5" />
                  <text x={x} y={y + 3.5} textAnchor="middle" className="fill-current text-[10px] font-bold">
                    {p.kind === "LIBRARY" ? "K" : "C"}
                  </text>
                </a>
              );
            })}
        </svg>
        <p className="text-xs">
          <strong>K</strong> kütüphane · <strong>C</strong> kafe/kantin · mavi çerçeve: derslikleri uygulamada olan bina ·
          numaralar aşağıdaki rehberde
        </p>
      </div>

      <div className="space-y-4">
        <section aria-labelledby="study-title" className="space-y-1">
          <h2 id="study-title" className="font-bold">
            Çalışma yerleri
          </h2>
          <ul className="space-y-1 text-sm">
            {data.places.map((p) => (
              <li key={p.spaceId}>
                <a
                  href={`/yer/${encodeURIComponent(p.spaceId)}?${query}`}
                  className="inline-flex min-h-11 items-center gap-2 underline"
                >
                  {p.kind === "LIBRARY" ? "K" : "C"} · {p.name} — {statusTitle(p.status, true)}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {data.buildings.some((b) => !b.osm || !osmBuilding(b.osm)) && (
          <section aria-labelledby="nolocation-title" className="space-y-1">
            <h2 id="nolocation-title" className="font-bold">
              Konumu haritada olmayan binalar
            </h2>
            <ul className="text-sm">
              {data.buildings
                .filter((b) => !b.osm || !osmBuilding(b.osm))
                .map((b) => (
                  <li key={b.id}>
                    <a
                      href={`/?${query}&b=${encodeURIComponent(b.id)}`}
                      className="inline-flex min-h-11 items-center underline"
                    >
                      {b.name} — odaları gör
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        )}

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

function BuildingMap({ spaces, query }: { spaces: MapSpaceDTO[]; query: string }) {
  const rows = floorRows(spaces);
  const perRow = Math.max(1, ...rows.map((r) => r.rooms.length));
  const W = 360;
  const gap = 6;
  const cellW = Math.min(110, (W - 40 - gap * (perRow - 1)) / perRow);
  const cellH = 74;
  const rowH = cellH + 26;
  const height = rows.length * rowH + 10;

  if (spaces.length === 0) return <p className="text-sm">Bu binada kayıtlı oda yok.</p>;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full lg:max-w-3xl" role="group" aria-label="Bina odaları, katlara göre">
      {rows.map((row, ri) => {
        const y0 = ri * rowH + 4;
        return (
          <g key={row.floor ?? "x"}>
            <text x="4" y={y0 + 12} className="fill-current text-[11px] font-semibold">
              {row.floor === null ? "Diğer" : row.floor === 0 ? "Zemin kat" : `${row.floor}. kat`}
            </text>
            {row.rooms.map((s, i) => {
              const x = 20 + i * (cellW + gap);
              const y = y0 + 18;
              const tone = toneOf(s);
              return (
                <a key={s.spaceId} href={`/yer/${encodeURIComponent(s.spaceId)}?${query}`} aria-label={ariaFor(s.code, s)}>
                  <rect
                    x={x}
                    y={y}
                    width={cellW}
                    height={cellH}
                    rx="6"
                    className={FILL[tone]}
                    strokeWidth="1.5"
                    strokeDasharray={tone === "EXCLUDED" ? "4 3" : undefined}
                  />
                  <text x={x + 6} y={y + 18} className="fill-current text-[12px] font-bold">
                    {s.code}
                  </text>
                  <text x={x + 6} y={y + 36} className="fill-current text-[9.5px]">
                    {/* Dar hücrede kesilmesin diye uzun etiket iki satıra bölünür */}
                    {`${SHORT[tone]}${isSimStatus(s) ? "*" : ""}`.split(/ (?=boş\*?$)/).map((line, li) => (
                      <tspan key={li} x={x + 6} dy={li === 0 ? 0 : 11}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                  <text x={x + 6} y={y + 64} className="fill-current text-[11px]">
                    {ratingText(s.rating)}
                  </text>
                </a>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
