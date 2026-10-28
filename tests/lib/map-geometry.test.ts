import { describe, expect, it } from "vitest";
import { floorOf, floorRows } from "../../src/lib/map-geometry";

describe("harita geometrisi", () => {
  it("kat: ilk rakam", () => {
    expect(floorOf("A204")).toBe(2);
    expect(floorOf("Ö-101")).toBe(1);
    expect(floorOf("Z01")).toBe(0);
    expect(floorOf("M2-101")).toBe(1);
    expect(floorOf("Amfi")).toBeNull();
  });

  it("katlar yukarıdan aşağı, katı bilinmeyen en altta", () => {
    const rows = floorRows([{ code: "A101" }, { code: "Amfi" }, { code: "A201" }, { code: "A102" }]);
    expect(rows.map((r) => [r.floor, r.rooms.map((x) => x.code)])).toEqual([
      [2, ["A201"]],
      [1, ["A101", "A102"]],
      [null, ["Amfi"]],
    ]);
  });
});

describe("izdüşüm", () => {
  it("kuzey yukarıda, doğu sağda; genişliğe sığar; ölçek kampüs boyutunda makul", async () => {
    const { projector } = await import("../../src/lib/map-geometry");
    const { CAMPUS } = await import("../../src/data/campus");
    const { project, height, metersPerUnit } = projector(CAMPUS.boundary, 360);
    const north = project([40.748, 30.33]);
    const south = project([40.736, 30.33]);
    const east = project([40.74, 30.34]);
    const west = project([40.74, 30.322]);
    expect(north[1]).toBeLessThan(south[1]);
    expect(east[0]).toBeGreaterThan(west[0]);
    for (const p of CAMPUS.boundary.map(project)) {
      expect(p[0]).toBeGreaterThanOrEqual(0);
      expect(p[0]).toBeLessThanOrEqual(360);
      expect(p[1]).toBeLessThanOrEqual(height);
    }
    // ~1,6 km genişlik / 344 birim ≈ 4-5 m
    expect(metersPerUnit).toBeGreaterThan(3);
    expect(metersPerUnit).toBeLessThan(6);
  });
});
