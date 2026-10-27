import { describe, expect, it } from "vitest";
import { MAX_ZOOM, boxAround, clampBox, panBy, zoomAt } from "../../src/lib/pan-zoom";

const B = { x: 0, y: 0, w: 360, h: 240 };

describe("pan-zoom", () => {
  it("yakınlaştırmada imleç altındaki nokta yerinde kalır", () => {
    const v = zoomAt(B, 2, 90, 60, B);
    expect(v).toEqual({ x: 45, y: 30, w: 180, h: 120 });
    expect((90 - v.x) / v.w).toBeCloseTo(0.25);
    expect((60 - v.y) / v.h).toBeCloseTo(0.25);
  });

  it("en fazla MAX_ZOOM kat yakınlaşır, tüm kampüsten fazla uzaklaşmaz", () => {
    expect(zoomAt(B, 100, 180, 120, B).w).toBeCloseTo(360 / MAX_ZOOM);
    expect(zoomAt(B, 0.1, 180, 120, B).w).toBe(360);
  });

  it("kaydırmada merkez kampüs sınırının dışına çıkmaz", () => {
    const v = panBy({ x: 0, y: 0, w: 90, h: 60 }, -10_000, 0, B);
    expect(v.x + v.w / 2).toBe(360);
    expect(panBy(v, 20, 0, B).x).toBe(v.x - 20);
  });

  it("en-boy oranı korunur", () => {
    const v = clampBox({ x: 0, y: 0, w: 1000, h: 500 }, B);
    expect(v.w).toBe(360);
    expect(v.h).toBe(180);
  });

  it("boxAround noktaları payla kapsar", () => {
    expect(
      boxAround(
        [
          [10, 20],
          [30, 50],
        ],
        5,
      ),
    ).toEqual({ x: 5, y: 15, w: 30, h: 40 });
  });
});
