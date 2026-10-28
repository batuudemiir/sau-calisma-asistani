import { describe, expect, it } from "vitest";
import { CAMPUS, CAMPUS_PLACES, osmBuilding } from "../../src/data/campus";

describe("kampüs kataloğu", () => {
  it("her yerin OSM kaydı veri dosyasında var ve kampüs sınırı içinde", () => {
    const lats = CAMPUS.boundary.map((p) => p[0]);
    const lngs = CAMPUS.boundary.map((p) => p[1]);
    for (const p of CAMPUS_PLACES) {
      const b = osmBuilding(p.osm);
      expect(b, p.id).not.toBeNull();
      const [lat, lng] = b!.center;
      expect(lat).toBeGreaterThan(Math.min(...lats));
      expect(lat).toBeLessThan(Math.max(...lats));
      expect(lng).toBeGreaterThan(Math.min(...lngs));
      expect(lng).toBeLessThan(Math.max(...lngs));
    }
  });

  it("kimlikler benzersiz, URL güvenli; bilgilerin kaynağı var", () => {
    const ids = CAMPUS_PLACES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
    for (const p of CAMPUS_PLACES) for (const f of p.facts ?? []) expect(f.source).toMatch(/^https:\/\//);
  });

  it("veri dosyası OSM atfını taşır", () => {
    expect(CAMPUS.attribution).toContain("OpenStreetMap");
    expect(CAMPUS.buildings.length).toBeGreaterThan(100);
  });
});

describe("haritadaki kısa adlar", () => {
  it("kısa ad tam adın içinde geçer (erişilebilir adla tutarlı)", async () => {
    const { CAMPUS_PLACES } = await import("../../src/data/campus");
    for (const p of CAMPUS_PLACES.filter((x) => x.short)) expect(p.name).toContain(p.short!);
  });
});
