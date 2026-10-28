"use client";

import { useMemo, useRef, useState } from "react";
import { CAMPUS, buildingShape, osmBuilding } from "@/data/campus";
import { projector, toPath } from "@/lib/map-geometry";
import { boxAround, type Box } from "@/lib/pan-zoom";
import { statusTitle } from "@/lib/labels";
import { TILE_ATTRIBUTION, tileZoom, tilesFor } from "@/lib/tiles";
import type { MapResponse } from "@/server/search-service";
import { MapControls } from "./MapControls";
import { FILL } from "./map-style";
import { useGoogleTiles } from "./useGoogleTiles";
import { usePanZoom } from "./usePanZoom";

// Kampüs sınırı geniş ormanlık alan içerir; harita binaların kapladığı alanla sınırlanır
const { project, unproject, height, metersPerUnit } = projector(
  CAMPUS.buildings.flatMap((b) => b.outline),
  360,
  12,
);
const BOUNDS: Box = { x: 0, y: 0, w: 360, h: height };
const CAMPUS_LAT = CAMPUS.boundary[0][0];
const shape = (outline: [number, number][]) => toPath(outline.map(project));

/** Merkez görünümü: çalışma yerleri ve derslikli binaların çevresi (~120 m pay). */
function centerBox(data: MapResponse): Box {
  const centers = [
    ...data.places.map((p) => (p.osm ? osmBuilding(p.osm)?.center : null)),
    ...data.buildings.map((b) => buildingShape(b)?.center),
  ]
    .filter((c): c is [number, number] => Boolean(c))
    .map(project);
  if (!centers.length) return BOUNDS;
  // Telefonda alt panel haritanın altını kapatır: kutu aşağı uzatılır, işaretler görünen üst bölgede kalır
  const box = boxAround(centers, 30);
  return { ...box, h: box.h * 1.8 };
}

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
  // Gerçek sokak haritası (dekoratif alt katman): Google anahtarı varsa Google, yoksa CARTO döşemeleri
  const google = useGoogleTiles();
  // Döşeme gerçekten yüklenince yedek çizim (kampüs dolgusu, gri binalar) gizlenir; yüklenmezse harita eskisi gibi
  const [tilesShown, setTilesShown] = useState(false);
  const tiles = useMemo(() => {
    const [x, y, w, h] = pz.viewBox.split(" ").map(Number);
    const z = tileZoom(pz.px * metersPerUnit, CAMPUS_LAT);
    return tilesFor({ x, y, w, h }, z, project, unproject, google?.url);
  }, [pz.viewBox, pz.px, google]);

  const appBuildings = data.buildings.flatMap((b) => {
    const shapeOf = buildingShape(b);
    return shapeOf ? [{ ...b, shapeOf }] : [];
  });
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
        <g aria-hidden="true" className={google ? undefined : "dark:invert dark:hue-rotate-180"}>
          {tiles.map((t) => (
            <image
              key={t.key}
              href={t.url}
              x={t.x}
              y={t.y}
              width={t.w}
              height={t.h}
              preserveAspectRatio="none"
              onLoad={tilesShown ? undefined : () => setTilesShown(true)}
            />
          ))}
        </g>
        <path
          d={shape(CAMPUS.boundary)}
          className={`stroke-map-boundary ${tilesShown ? "fill-none" : "fill-map-campus"}`}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        {/* Diğer binalar döşemede zaten var; yalnızca döşeme yokken yedek olarak çizilir */}
        {!tilesShown &&
          CAMPUS.buildings
            .filter((b) => !appOsm.has(b.osm) && !placeOsm.has(b.osm))
            .map((b) => (
              <path key={b.osm} d={shape(b.outline)} className="fill-map-building">
                {b.name && <title>{b.name}</title>}
              </path>
            ))}
        {appBuildings.map((b) => {
          const ob = b.shapeOf;
          const [x, y] = project(ob.center);
          const free = b.spaces.filter(
            (s) => !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE"),
          ).length;
          const active = selected.b === b.id;
          return (
            <a
              key={b.id}
              href={`/harita?${query}&b=${encodeURIComponent(b.id)}`}
              onClick={pick({ b: b.id })}
              aria-label={`${b.name}: ${free} boş sınıf. Sınıfları gör.`}
              aria-current={active ? "true" : undefined}
            >
              <path
                d={shape(ob.outline)}
                className={free > 0 ? FILL.PROGRAM_FREE : FILL.UNKNOWN}
                strokeWidth={active ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
              <g transform={`translate(${x} ${y}) scale(${pz.px})`}>
                <circle
                  r={active ? 14 : 12}
                  className={active ? "fill-ink-900 stroke-ink-900" : free > 0 ? FILL.PROGRAM_FREE : FILL.UNKNOWN}
                  strokeWidth="2"
                />
                <text
                  aria-hidden="true"
                  y="4.5"
                  textAnchor="middle"
                  className={`text-[13px] font-bold ${active ? "fill-lime-500" : free > 0 ? "fill-status-program-fg" : "fill-status-unknown-fg"}`}
                >
                  {free}
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
                href={`/harita?${query}&s=${encodeURIComponent(p.spaceId)}`}
                onClick={pick({ s: p.spaceId })}
                aria-label={`${p.name}: ${statusTitle(p.status, true)}`}
                aria-current={active ? "true" : undefined}
              >
                <path
                  d={shape(ob.outline)}
                  className={FILL[p.status.code]}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <g transform={`translate(${x} ${y}) scale(${pz.px})`}>
                  <circle
                    r={active ? 14 : 11}
                    className={`fill-ink-900 ${STROKE[p.status.code]}`}
                    strokeWidth="3"
                  />
                  <text
                    aria-hidden="true"
                    y="5"
                    textAnchor="middle"
                    className="fill-lime-500 font-display text-[14px] font-bold"
                  >
                    {p.kind === "LIBRARY" ? "K" : "C"}
                  </text>
                </g>
              </a>
            );
          })}
      </svg>

      <p className="absolute top-[7.75rem] right-2 z-10 flex items-center gap-1.5 rounded-sm bg-overlay px-1.5 text-[11px] text-fg-2 lg:top-auto lg:right-auto lg:bottom-2 lg:left-2">
        {google ? (
          <>
            <span className="text-[13px] font-semibold tracking-tight text-fg-1">Google</span>
            <span>{google.copyright}</span>
          </>
        ) : (
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
            {TILE_ATTRIBUTION}
          </a>
        )}
      </p>

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
