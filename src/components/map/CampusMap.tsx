"use client";

import { useMemo, useRef, useState } from "react";
import { CAMPUS, buildingShape, osmBuilding, shortName } from "@/data/campus";
import { declutter, placeLabels } from "@/lib/declutter";
import { ICON_BOOK, ICON_COFFEE } from "../ui/icons";
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
  // Telefonda üstte arama/zaman kutusu, altta panel haritayı kapatır: kutu iki yana da uzatılır, işaretler ortada kalır
  const box = boxAround(centers, 30);
  return { ...box, y: box.y - box.h * 0.25, h: box.h * 1.9 };
}

export type MapSelection = { b?: string; s?: string };

/** Bina iğnesi (CSS pikseli; ucu 0,0'da, gerçek konum): damla biçimi, gövde merkezi PIN_Y yukarıda. */
const PIN_Y = 22;
const PIN = "M0,0 C-5,-7 -16,-12 -16,-22 A16,16 0 1,1 16,-22 C16,-12 5,-7 0,0Z";
type PinTone = "VERIFIED_FREE" | "PROGRAM_FREE" | "UNKNOWN";
const PIN_FILL: Record<PinTone, string> = {
  VERIFIED_FREE: "fill-status-verified-bg",
  PROGRAM_FREE: "fill-status-program-bg",
  UNKNOWN: "fill-status-unknown-bg",
};
const PIN_TEXT: Record<PinTone, string> = {
  VERIFIED_FREE: "fill-status-verified-fg",
  PROGRAM_FREE: "fill-status-program-fg",
  UNKNOWN: "fill-status-unknown-fg",
};
type AppBuilding = MapResponse["buildings"][number];
const isFree = (s: AppBuilding["spaces"][number]) =>
  !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE");
const freeOf = (b: AppBuilding) => b.spaces.filter(isFree).length;
/** Bina rengi: öğrenci doğruladığı boş sınıf varsa yeşil, programa göre boş varsa mavi, yoksa gri. */
function buildingTone(b: AppBuilding): PinTone {
  if (b.spaces.some((s) => isFree(s) && s.status.code === "VERIFIED_FREE")) return "VERIFIED_FREE";
  return freeOf(b) > 0 ? "PROGRAM_FREE" : "UNKNOWN";
}
/** Bu ölçeğin altında (metre / ekran pikseli) kısa adlar gösterilir. */
const LABEL_MPP = 2.6;
/** İğneler arasında en az bu kadar ekran pikseli. */
const MIN_GAP_PX = 40;

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
  const placeMarkers = data.places.flatMap((p) => {
    const ob = p.osm ? osmBuilding(p.osm) : null;
    return ob ? [{ ...p, ob }] : [];
  });

  // İğneler: gerçek konum (SVG) + üst üste binmesin diye ekran pikselinde kaydırma (dx, dy)
  const showLabels = pz.px * metersPerUnit < LABEL_MPP;
  const markers = useMemo(() => {
    const base = [
      ...appBuildings.map((b) => {
        const [x, y] = project(b.shapeOf.center);
        return { id: b.id, kind: "building" as const, x, y, label: shortName(b.id, b.name), active: selected.b === b.id };
      }),
      ...placeMarkers.map((p) => {
        const [x, y] = project(p.ob.center);
        return { id: p.spaceId, kind: "place" as const, x, y, label: shortName(p.spaceId, p.name), active: selected.s === p.spaceId };
      }),
    ];
    // Bina iğnesinin gövdesi konumun PIN_Y px yukarısında: çakışma gövdeye göre ölçülür
    const body = (m: (typeof base)[number]) => (m.kind === "building" ? PIN_Y : 0);
    const moved = declutter(
      base.map((m) => ({ id: m.id, x: m.x / pz.px, y: m.y / pz.px - body(m) })),
      MIN_GAP_PX,
    );
    return base.map((m) => {
      const p = moved.get(m.id)!;
      return { ...m, dx: p.x - m.x / pz.px, dy: p.y + body(m) - m.y / pz.px };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- veri ve seçim değişince yeniden
  }, [data, pz.px, selected.b, selected.s]);
  const byId = new Map(markers.map((m) => [m.id, m]));
  // Kısa adlar: yakınlaşınca (seçili olanınki her zaman); başka iğneyi ya da adı kapatan ad gösterilmez
  const labelled = useMemo(() => {
    const at = (m: (typeof markers)[number]) => ({ X: m.x / pz.px + m.dx, Y: m.y / pz.px + m.dy });
    const pins = markers.map((m) => {
      const { X, Y } = at(m);
      return m.kind === "building" ? { id: m.id, x: X, y: Y - PIN_Y, r: 18 } : { id: m.id, x: X, y: Y, r: 16 };
    });
    const labels = markers
      .filter((m) => showLabels || m.active)
      .sort((a, b) => Number(b.active) - Number(a.active))
      .map((m) => {
        const { X, Y } = at(m);
        const w = m.label.length * 7 + 6;
        return { id: m.id, x: X - w / 2, y: Y + (m.kind === "building" ? 3 : 17), w, h: 15 };
      });
    return placeLabels(labels, pins);
  }, [markers, showLabels, pz.px]);

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
        {/* Bina ve yer sınırları (iğnelerin altında) */}
        {appBuildings.map((b) => (
          <path
            key={`sinir-${b.id}`}
            d={shape(b.shapeOf.outline)}
            className={FILL[buildingTone(b)]}
            fillOpacity={0.55}
            strokeWidth={selected.b === b.id ? 3 : 1.5}
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          />
        ))}
        {placeMarkers.map((p) => (
          <path
            key={`sinir-${p.spaceId}`}
            d={shape(p.ob.outline)}
            className={FILL[p.status.code]}
            fillOpacity={0.55}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          />
        ))}

        {/* Kaydırılan iğnenin gerçek yeri: ince çizgi + nokta */}
        <g aria-hidden="true">
          {markers
            .filter((m) => Math.hypot(m.dx, m.dy) > 2)
            .map((m) => (
              <g key={`iz-${m.id}`}>
                <line
                  x1={m.x}
                  y1={m.y}
                  x2={m.x + m.dx * pz.px}
                  y2={m.y + m.dy * pz.px}
                  className="stroke-ink-900"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={m.x} cy={m.y} r={2.5 * pz.px} className="fill-ink-900" />
              </g>
            ))}
        </g>

        {appBuildings.map((b) => {
          const m = byId.get(b.id)!;
          const free = freeOf(b);
          const tone = buildingTone(b);
          const active = selected.b === b.id;
          return (
            <a
              key={b.id}
              href={`/harita?${query}&b=${encodeURIComponent(b.id)}`}
              onClick={pick({ b: b.id })}
              aria-label={`${b.name}: ${free} boş sınıf. Sınıfları gör.`}
              aria-current={active ? "true" : undefined}
            >
              <g
                transform={`translate(${m.x + m.dx * pz.px} ${m.y + m.dy * pz.px}) scale(${pz.px * (active ? 1.15 : 1)})`}
                className="drop-shadow-md"
              >
                {active && <circle cy={-PIN_Y} r="24" className="fill-accent" fillOpacity={0.22} />}
                <path d={PIN} className={active ? "fill-ink-900 stroke-card" : `${PIN_FILL[tone]} stroke-card`} strokeWidth="2" />
                <text
                  aria-hidden="true"
                  y={-PIN_Y + 5.5}
                  textAnchor="middle"
                  className={`font-display text-[16px] font-bold ${active ? "fill-lime-500" : PIN_TEXT[tone]}`}
                >
                  {free}
                </text>
              </g>
            </a>
          );
        })}

        {placeMarkers.map((p) => {
          const m = byId.get(p.spaceId)!;
          const active = selected.s === p.spaceId;
          return (
            <a
              key={p.spaceId}
              href={`/harita?${query}&s=${encodeURIComponent(p.spaceId)}`}
              onClick={pick({ s: p.spaceId })}
              aria-label={`${p.name}: ${statusTitle(p.status, true)}`}
              aria-current={active ? "true" : undefined}
            >
              <g
                transform={`translate(${m.x + m.dx * pz.px} ${m.y + m.dy * pz.px}) scale(${pz.px * (active ? 1.15 : 1)})`}
                className="drop-shadow-md"
              >
                {active && <circle r="22" className="fill-accent" fillOpacity={0.22} />}
                <circle r="14" className={`fill-ink-900 ${STROKE[p.status.code]}`} strokeWidth="3.5" />
                <path
                  d={p.kind === "LIBRARY" ? ICON_BOOK : ICON_COFFEE}
                  transform="translate(-8.4 -8.4) scale(0.7)"
                  fill="none"
                  className="stroke-lime-500"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </a>
          );
        })}

        {/* Kısa adlar: yakınlaşınca ya da seçiliyken (bağlantının dışında; aynı bilgi aria-label'da) */}
        <g aria-hidden="true">
          {markers
            .filter((m) => labelled.has(m.id))
            .map((m) => (
              <text
                key={`ad-${m.id}`}
                transform={`translate(${m.x + m.dx * pz.px} ${m.y + m.dy * pz.px}) scale(${pz.px})`}
                y={m.kind === "building" ? 15 : 28}
                textAnchor="middle"
                paintOrder="stroke"
                className="fill-fg-1 stroke-card text-[12px] font-semibold"
                strokeWidth="3.5"
                strokeLinejoin="round"
              >
                {m.label}
              </text>
            ))}
        </g>
      </svg>

      <p className="absolute right-2 bottom-[16.4rem] z-10 flex items-center gap-1.5 rounded-sm bg-overlay px-1.5 text-[11px] text-fg-2 lg:right-auto lg:bottom-2 lg:left-2">
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
