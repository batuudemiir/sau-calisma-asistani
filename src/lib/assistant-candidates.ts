import type { Candidate, LatLng } from "@/domain/assistant";
import { CAMPUS, osmBuilding } from "@/data/campus";
import type { MapResponse } from "@/server/search-service";

/** Haritanın verisinden asistan adayları: uygun görünen derslikler + çalışma yerleri, OSM konumlarıyla. */
export function candidatesFrom(data: MapResponse): Candidate[] {
  const buildingOf = new Map(data.buildings.flatMap((b) => b.spaces.map((s) => [s.spaceId, b.osm] as const)));
  const at = (osm: string | null | undefined): LatLng | null => (osm ? (osmBuilding(osm)?.center ?? null) : null);
  // Gerçek puan yeterliyse o, yoksa (yalnızca demo modunda gelen) örnek puan
  const avg = (r: MapResponse["places"][number]["rating"]) => r.real.averages ?? r.simulated.averages;
  return [
    ...data.results.map((r) => ({
      id: r.spaceId,
      name: r.code,
      context: r.buildingName,
      kind: r.kind,
      status: r.status,
      freeUntil: r.freeUntil,
      averages: avg(r.rating),
      location: at(buildingOf.get(r.spaceId)),
      openingHours: null,
      isSimulated: r.isSimulated || (!r.rating.real.averages && Boolean(r.rating.simulated.averages)),
    })),
    ...data.places.map((p) => ({
      id: p.spaceId,
      name: p.name,
      kind: p.kind,
      status: p.status,
      freeUntil: null,
      averages: avg(p.rating),
      location: at(p.osm),
      openingHours: p.openingHours,
      isSimulated: p.isSimulated || (!p.rating.real.averages && Boolean(p.rating.simulated.averages)),
    })),
  ];
}

const lats = CAMPUS.boundary.map((p) => p[0]);
const lngs = CAMPUS.boundary.map((p) => p[1]);
/** Kampüs sınırının merkezi; konum kampüsten çok uzaksa mesafe hesaba katılmaz. */
export const CAMPUS_CENTER: LatLng = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
export const CAMPUS_RADIUS_M = 2_000;
