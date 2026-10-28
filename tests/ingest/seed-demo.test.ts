import { describe, expect, it } from "vitest";
import { CAMPUS_PLACES, osmBuilding } from "../../src/data/campus";
import { demoPlan } from "../../scripts/seed-demo/plan";

describe("seed-demo planı", () => {
  it("odalar gerçek (OSM konumlu) fakülte binalarında; her kayıt içte isSimulated; çakışan blok yok", () => {
    const p = demoPlan();
    expect(p.source.isSimulated).toBe(true);
    expect(p.spaces.length).toBeGreaterThanOrEqual(30);
    const places = new Map(CAMPUS_PLACES.map((c) => [c.id, c]));
    for (const s of p.spaces) {
      expect(s.isSimulated).toBe(true);
      const place = places.get(s.buildingId);
      expect(place?.category).toBe("FACULTY");
      expect(osmBuilding(place!.osm)).not.toBeNull();
    }
    expect(new Set(p.spaces.map((s) => s.id)).size).toBe(p.spaces.length);
    expect(p.blocks.length).toBeGreaterThan(0);
    expect(p.blocks.every((b) => b.isSimulated)).toBe(true);
    for (const a of p.blocks)
      for (const b of p.blocks)
        if (a !== b && a.spaceId === b.spaceId && a.weekday === b.weekday)
          expect(a.startMinute < b.endMinute && b.startMinute < a.endMinute).toBe(false);
    expect(p.spaces.filter((s) => s.dataQuality === "INCOMPLETE")).toHaveLength(1);
    expect(p.ratings.every((r) => r.isSimulated)).toBe(true);
    const ids = new Set([...p.spaces.map((s) => s.id), p.library.id]);
    expect(p.ratings.every((r) => ids.has(r.spaceId))).toBe(true);
  });
});
