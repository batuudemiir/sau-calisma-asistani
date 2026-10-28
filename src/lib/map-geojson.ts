import { CAMPUS, CAMPUS_PLACES, osmBuilding, type LatLng } from "@/data/campus";
import type { StatusCode } from "@/domain/types";
import type { MapResponse } from "@/server/search-service";

/**
 * Mapbox haritası için saf veri: kampüs binaları (OSM, © OpenStreetMap ODbL) GeoJSON olarak ve tıklanabilir işaretler.
 * Koordinatlar GeoJSON gereği [boylam, enlem]. SVG yedek harita aynı kataloğu kullanır.
 */

/** Numaralı rehber: haritadaki işaret numarası = paneldeki rehber sırası. */
export const GUIDE = CAMPUS_PLACES.filter((p) => (p.category === "FACULTY" || p.category === "LAB") && osmBuilding(p.osm));

export type BuildingRole = "other" | "guide" | "app" | "place";
type LngLat = [number, number];
const toLngLat = ([lat, lng]: LatLng | readonly [number, number]): LngLat => [lng, lat];
const ring = (outline: readonly LatLng[]): LngLat[] => {
  const pts = outline.map(toLngLat);
  const [f, l] = [pts[0], pts[pts.length - 1]];
  return f && l && (f[0] !== l[0] || f[1] !== l[1]) ? [...pts, f] : pts;
};

export interface Selection {
  b?: string;
  s?: string;
}

const isFree = (code: StatusCode) => code === "PROGRAM_FREE" || code === "VERIFIED_FREE";

export function campusGeoJson(data: MapResponse, selected: Selection) {
  const app = new Map(data.buildings.filter((b) => b.osm).map((b) => [b.osm!, b]));
  const place = new Map(data.places.filter((p) => p.osm).map((p) => [p.osm!, p]));
  const guide = new Set(GUIDE.map((g) => g.osm));
  const features = CAMPUS.buildings.map((b) => {
    const a = app.get(b.osm);
    const p = place.get(b.osm);
    const role: BuildingRole = p ? "place" : a ? "app" : guide.has(b.osm) ? "guide" : "other";
    const tone: StatusCode | null = p ? p.status.code : a ? "PROGRAM_FREE" : null;
    return {
      type: "Feature" as const,
      id: b.osm,
      properties: {
        osm: b.osm,
        role,
        tone,
        selected: (a !== undefined && selected.b === a.id) || (p !== undefined && selected.s === p.spaceId),
      },
      geometry: { type: "Polygon" as const, coordinates: [ring(b.outline)] },
    };
  });
  return { type: "FeatureCollection" as const, features };
}

export function campusBoundary() {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [ring(CAMPUS.boundary)] },
  };
}

export type MarkerSpec =
  | {
      key: string;
      kind: "place";
      lngLat: LngLat;
      label: string;
      letter: "K" | "C";
      tone: StatusCode;
      selection: Selection;
      active: boolean;
    }
  | { key: string; kind: "building"; lngLat: LngLat; label: string; text: string; selection: Selection; active: boolean }
  | { key: string; kind: "guide"; lngLat: LngLat; text: string };

/** Tıklanabilir işaretler (her biri erişilebilir adlı bir düğme olur) + numaralı rehber. */
export function campusMarkers(
  data: MapResponse,
  selected: Selection,
  statusText: (p: MapResponse["places"][number]) => string,
): MarkerSpec[] {
  const out: MarkerSpec[] = GUIDE.map((g, i) => ({
    key: `guide-${g.id}`,
    kind: "guide" as const,
    lngLat: toLngLat(osmBuilding(g.osm)!.center),
    text: String(i + 1),
  }));
  for (const b of data.buildings) {
    const ob = b.osm ? osmBuilding(b.osm) : null;
    if (!ob) continue;
    const free = b.spaces.filter((s) => !s.excludedBecause && isFree(s.status.code)).length;
    out.push({
      key: `b-${b.id}`,
      kind: "building",
      lngLat: toLngLat(ob.center),
      label: `${b.name}: ${free} uygun görünen oda. Odaları gör.`,
      text: `${free} oda`,
      selection: { b: b.id },
      active: selected.b === b.id,
    });
  }
  for (const p of data.places) {
    const ob = p.osm ? osmBuilding(p.osm) : null;
    if (!ob) continue;
    out.push({
      key: `s-${p.spaceId}`,
      kind: "place",
      lngLat: toLngLat(ob.center),
      label: `${p.name}: ${statusText(p)}`,
      letter: p.kind === "LIBRARY" ? "K" : "C",
      tone: p.status.code,
      selection: { s: p.spaceId },
      active: selected.s === p.spaceId,
    });
  }
  return out;
}

type Bounds = [[number, number], [number, number]];
function boundsOf(points: readonly LngLat[]): Bounds {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
}

/** Tüm kampüs: binaların kapladığı alan (geniş ormanlık sınır yerine). */
export const campusBounds = (): Bounds => boundsOf(CAMPUS.buildings.flatMap((b) => b.outline.map(toLngLat)));

/** Merkez görünümü: çalışma yerleri ve derslikli binalar (~120 m pay); yoksa tüm kampüs. */
export function centerBounds(data: MapResponse): Bounds {
  const centers = [...data.places.map((p) => p.osm), ...data.buildings.map((b) => b.osm)]
    .map((o) => (o ? osmBuilding(o)?.center : null))
    .filter((c): c is LatLng => Boolean(c))
    .map(toLngLat);
  if (centers.length === 0) return campusBounds();
  const pad = 0.0011;
  const [[x0, y0], [x1, y1]] = boundsOf(centers);
  return [
    [x0 - pad * 1.3, y0 - pad],
    [x1 + pad * 1.3, y1 + pad],
  ];
}
