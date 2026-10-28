import { describe, expect, it } from "vitest";
import { CAMPUS } from "../../src/data/campus";
import type { Status } from "../../src/domain/types";
import { campusBounds, campusGeoJson, campusMarkers, centerBounds, GUIDE } from "../../src/lib/map-geojson";
import type { MapResponse } from "../../src/server/search-service";

const none = { count: 0, averages: null, overall: null };
const LIB = "way/389702261";
const data = {
  now: { dateISO: "2026-10-27", minute: 780, weekday: 2, isDemoClock: false, nowMs: 0 },
  durationMin: 60,
  results: [],
  places: [
    {
      spaceId: "kutuphane-merkez",
      name: "Merkez Kütüphane",
      kind: "LIBRARY",
      isSimulated: false,
      status: { code: "VERIFIED_FREE" } as Status,
      simulation: null,
      rating: { real: none, simulated: none },
      openingHours: "24/7",
      osm: LIB,
    },
  ],
  buildings: [
    {
      id: "bilisim",
      name: "Bilişim",
      isSimulated: false,
      osm: "way/1216863645",
      spaces: [
        {
          spaceId: "a",
          code: "A1",
          isSimulated: false,
          status: { code: "PROGRAM_FREE" } as Status,
          excludedBecause: null,
          rating: { real: none, simulated: none },
        },
        {
          spaceId: "b",
          code: "A2",
          isSimulated: false,
          status: { code: "PROGRAM_FREE" } as Status,
          excludedBecause: "CLASS_CONFLICT",
          rating: { real: none, simulated: none },
        },
      ],
    },
    { id: "konumsuz", name: "Örnek", isSimulated: true, osm: null, spaces: [] },
  ],
} as unknown as MapResponse;

describe("Mapbox verisi", () => {
  it("her OSM binası bir çokgen; GeoJSON [boylam, enlem] ve halka kapalı", () => {
    const fc = campusGeoJson(data, {});
    expect(fc.features).toHaveLength(CAMPUS.buildings.length);
    const lib = fc.features.find((f) => f.properties.osm === LIB)!;
    expect(lib.properties).toMatchObject({ role: "place", tone: "VERIFIED_FREE", selected: false });
    const r = lib.geometry.coordinates[0];
    expect(r[0]).toEqual(r[r.length - 1]);
    expect(r[0][0]).toBeGreaterThan(30); // boylam ~30.33
    expect(r[0][1]).toBeGreaterThan(40); // enlem ~40.74
  });

  it("roller: derslikli bina, rehber binası, diğer; seçim işaretlenir", () => {
    const fc = campusGeoJson(data, { b: "bilisim" });
    expect(fc.features.find((f) => f.properties.osm === "way/1216863645")!.properties).toMatchObject({
      role: "app",
      selected: true,
    });
    expect(fc.features.filter((f) => f.properties.role === "guide").length).toBe(GUIDE.length - 1); // bilişim artık "app"
    expect(fc.features.some((f) => f.properties.role === "other")).toBe(true);
  });

  it("işaretler: uygun oda sayısı (elenen hariç), K/C ve erişilebilir ad; konumsuz bina işaretsiz", () => {
    const m = campusMarkers(data, { s: "kutuphane-merkez" }, () => "Öğrenci doğruladı");
    const b = m.find((x) => x.key === "b-bilisim");
    expect(b).toMatchObject({ kind: "building", text: "1 oda", active: false, selection: { b: "bilisim" } });
    expect(m.find((x) => x.key === "s-kutuphane-merkez")).toMatchObject({
      kind: "place",
      letter: "K",
      active: true,
      label: "Merkez Kütüphane: Öğrenci doğruladı",
    });
    expect(m.some((x) => x.key === "b-konumsuz")).toBe(false);
  });

  it("merkez görünümü tüm kampüsün içinde ve daha dar", () => {
    const [[a0, b0], [a1, b1]] = campusBounds();
    const [[c0, d0], [c1, d1]] = centerBounds(data);
    expect(c1 - c0).toBeLessThan(a1 - a0);
    expect(d0).toBeGreaterThan(b0 - 0.01);
    expect(d1).toBeLessThan(b1 + 0.01);
  });
});
