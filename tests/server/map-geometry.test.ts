import { describe, expect, it } from "vitest";
import { campusRects, floorOf, floorRows } from "../../src/lib/map-geometry";

describe("harita geometrisi", () => {
  it("kat: ilk rakam", () => {
    expect(floorOf("A204")).toBe(2);
    expect(floorOf("Ö-101")).toBe(1);
    expect(floorOf("Z01")).toBe(0);
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

  it("çizilmiş yerleşim korunur, bilinmeyen binalar çakışmadan boş hücrelere yerleşir", () => {
    const ids = ["kutuphane", "isletme-a", "demo-blok", "yeni-1", "yeni-2", "yeni-3", "yeni-4"];
    const { rects, height } = campusRects(ids);
    expect(rects.get("kutuphane")).toEqual({ x: 20, y: 20, w: 150, h: 95 });
    const all = ids.map((id) => rects.get(id)!);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const [a, b] = [all[i], all[j]];
        expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
      }
    expect(height).toBeGreaterThanOrEqual(Math.max(...all.map((r) => r.y + r.h)));
  });
});
