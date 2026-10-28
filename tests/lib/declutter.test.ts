import { describe, expect, it } from "vitest";
import { declutter } from "../../src/lib/declutter";

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe("declutter", () => {
  it("uzak işaretlere dokunmaz", () => {
    const out = declutter(
      [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 100, y: 0 },
      ],
      30,
    );
    expect(out.get("a")).toEqual({ x: 0, y: 0 });
    expect(out.get("b")).toEqual({ x: 100, y: 0 });
  });

  it("yakın işaretleri en az minDist ayırır, yerlerinden çok uzaklaştırmaz", () => {
    const pts = [
      { id: "m2", x: 100, y: 100 },
      { id: "m4", x: 108, y: 104 },
      { id: "m6", x: 104, y: 112 },
      { id: "ayni", x: 104, y: 112 },
    ];
    const out = declutter(pts, 30);
    const ids = pts.map((p) => p.id);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) expect(dist(out.get(ids[i])!, out.get(ids[j])!)).toBeGreaterThanOrEqual(29.5);
    for (const p of pts) expect(dist(out.get(p.id)!, p)).toBeLessThan(40);
    // Deterministik
    expect(declutter(pts, 30)).toEqual(out);
  });
});

describe("placeLabels", () => {
  it("başka iğneyi ya da etiketi kapatan etiketi gizler; sıra önceliktir", async () => {
    const { placeLabels } = await import("../../src/lib/declutter");
    const pins = [
      { id: "ek", x: 100, y: 100, r: 16 },
      { id: "merkez", x: 100, y: 140, r: 16 },
      { id: "uzak", x: 300, y: 300, r: 16 },
    ];
    const labels = [
      { id: "ek", x: 50, y: 116, w: 100, h: 14 }, // merkez iğnesine değer
      { id: "merkez", x: 50, y: 156, w: 100, h: 14 },
      { id: "uzak", x: 260, y: 316, w: 80, h: 14 },
      { id: "cakisan", x: 60, y: 160, w: 80, h: 14 }, // merkez etiketiyle çakışır
    ];
    expect([...placeLabels(labels, pins)].sort()).toEqual(["merkez", "uzak"]);
  });
});
