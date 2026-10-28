"use client";

import { useMemo, useRef } from "react";
import { CAMPUS, CAMPUS_PLACES, osmBuilding } from "@/data/campus";
import { projector, toPath } from "@/lib/map-geometry";
import { boxAround, type Box } from "@/lib/pan-zoom";
import { statusTitle } from "@/lib/labels";
import type { MapResponse } from "@/server/search-service";
import { MapControls } from "./MapControls";
import { FILL } from "./map-style";
import { usePanZoom } from "./usePanZoom";

// Kampüs sınırı geniş ormanlık alan içerir; harita binaların kapladığı alanla sınırlanır
const { project, height } = projector(
  CAMPUS.buildings.flatMap((b) => b.outline),
  360,
  12,
);
const BOUNDS: Box = { x: 0, y: 0, w: 360, h: height };
const shape = (outline: [number, number][]) => toPath(outline.map(project));

/** Merkez görünümü: çalışma yerleri ve derslikli binaların çevresi (~120 m pay). */
function centerBox(data: MapResponse): Box {
  const centers = [...data.places.map((p) => p.osm), ...data.buildings.map((b) => b.osm)]
    .map((o) => (o ? osmBuilding(o)?.center : null))
    .filter((c): c is [number, number] => Boolean(c))
    .map(project);
  return centers.length ? boxAround(centers, 30) : BOUNDS;
}

/** Numaralı rehber: haritadaki işaret numarası = paneldeki rehber sırası. */
export const GUIDE = CAMPUS_PLACES.filter((p) => (p.category === "FACULTY" || p.category === "LAB") && osmBuilding(p.osm));

export type MapSelection = { b?: string; s?: string };

/** Çalışma yeri işaretinin kenarı: durum rengi (renk tek başına anlam taşımaz; aria-label durumu yazar). */
const STROKE: Record<string, string> = {
  VERIFIED_FREE: "stroke-status-verified-border",
  PROGRAM_FREE: "stroke-status-program-border",
  UNKNOWN: "stroke-status-unknown-border",
  REPORTED_BUSY: "stroke-status-busy-border",
};

/**
 * Kampüs haritası: gerçek ölçekli (OSM), el çizimi SVG; paket ve ağ isteği yok, anında açılır. Bina/yer işaretleri bağlantıdır (yeni sekmede açılabilir), tıklanınca
 * sayfa değişmeden panel açılır. Her işaretin metin etiketi vardır; aynı bilgi panel listesinde de bulunur.
 */
export function CampusMap({
  data,
  query,
  selected,
  onSelect,
  controlsHidden = false,
}: {
  data: MapResponse;
  query: string;
  selected: MapSelection;
  onSelect: (sel: MapSelection, trigger: Element) => void;
  /** Telefonda alt panel büyükken denetimler panelin altında kalmasın diye gizlenir. */
  controlsHidden?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const center = useMemo(() => centerBox(data), [data]);
  const pz = usePanZoom(svgRef, center, BOUNDS);

  const appBuildings = data.buildings.filter((b) => b.osm && osmBuilding(b.osm));
  const appOsm = new Set(appBuildings.map((b) => b.osm));
  const placeOsm = new Set(data.places.map((p) => p.osm).filter(Boolean));

  const pick = (sel: MapSelection) => (e: React.MouseEvent<Element>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // yeni sekmede açma serbest
    e.preventDefault();
    onSelect(sel, e.currentTarget);
  };

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={pz.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none bg-map select-none"
        role="group"
        aria-label="Esentepe kampüsü, gerçek bina konumları. Sürükleyerek kaydır, iki parmakla yakınlaştır."
        {...pz.handlers}
      >
        <path
          d={shape(CAMPUS.boundary)}
          className="fill-map-campus stroke-map-boundary"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        {CAMPUS.buildings
          .filter((b) => !appOsm.has(b.osm) && !placeOsm.has(b.osm))
          .map((b) => (
            <path key={b.osm} d={shape(b.outline)} className="fill-map-building">
              {b.name && <title>{b.name}</title>}
            </path>
          ))}
        {GUIDE.map((p, i) => {
          const b = osmBuilding(p.osm)!;
          const [x, y] = project(b.center);
          return (
            <g key={p.id} aria-hidden="true">
              <path d={shape(b.outline)} className="fill-map-guide" />
              <g transform={`translate(${x} ${y}) scale(${pz.px})`}>
                <circle r="9" className="fill-white stroke-ink-900" strokeWidth="1.2" />
                <text y="3.8" textAnchor="middle" className="fill-ink-900 text-[10px] font-bold">
                  {i + 1}
                </text>
              </g>
            </g>
          );
        })}
        {appBuildings.map((b) => {
          const ob = osmBuilding(b.osm!)!;
          const [x, y] = project(ob.center);
          const free = b.spaces.filter(
            (s) => !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE"),
          ).length;
          const active = selected.b === b.id;
          return (
            <a
              key={b.id}
              href={`/?${query}&b=${encodeURIComponent(b.id)}`}
              onClick={pick({ b: b.id })}
              aria-label={`${b.name}: ${free} uygun görünen oda. Odaları gör.`}
              aria-current={active ? "true" : undefined}
            >
              <path
                d={shape(ob.outline)}
                className={FILL.PROGRAM_FREE}
                strokeWidth={active ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
              <g transform={`translate(${x} ${y}) scale(${pz.px})`}>
                <rect
                  x="-26"
                  y="-12"
                  width="52"
                  height="24"
                  rx="12"
                  className={active ? "fill-ink-900 stroke-ink-900" : FILL.PROGRAM_FREE}
                  strokeWidth="1.5"
                />
                <text
                  aria-hidden="true"
                  y="4.5"
                  textAnchor="middle"
                  className={`text-[12px] font-bold ${active ? "fill-lime-500" : "fill-status-program-fg"}`}
                >
                  {free} oda
                </text>
              </g>
            </a>
          );
        })}
        {data.places
          .filter((p) => p.osm && osmBuilding(p.osm))
          .map((p) => {
            const ob = osmBuilding(p.osm!)!;
            const [x, y] = project(ob.center);
            const active = selected.s === p.spaceId;
            return (
              <a
                key={p.spaceId}
                href={`/?${query}&s=${encodeURIComponent(p.spaceId)}`}
                onClick={pick({ s: p.spaceId })}
                aria-label={`${p.name}: ${statusTitle(p.status, true)}`}
                aria-current={active ? "true" : undefined}
              >
                <path d={shape(ob.outline)} className={FILL[p.status.code]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <g transform={`translate(${x} ${y}) scale(${pz.px})`}>
                  <circle r={active ? 14 : 11} className={`fill-ink-900 ${STROKE[p.status.code]}`} strokeWidth="3" />
                  <text aria-hidden="true" y="5" textAnchor="middle" className="fill-lime-500 font-display text-[14px] font-bold">
                    {p.kind === "LIBRARY" ? "K" : "C"}
                  </text>
                </g>
              </a>
            );
          })}
      </svg>

      <MapControls
        hidden={controlsHidden}
        onZoomIn={pz.zoomIn}
        onZoomOut={pz.zoomOut}
        onCenter={() => pz.show(center)}
        onAll={() => pz.show(BOUNDS)}
      />
    </div>
  );
}
