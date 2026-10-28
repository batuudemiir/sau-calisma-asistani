import { describe, expect, it } from "vitest";
import { projector } from "../../src/lib/map-geometry";
import { latToTileY, lngToTileX, tileUrl, tileXToLng, tileYToLat, tileZoom, tilesFor } from "../../src/lib/tiles";

// Merkez Kütüphane civarı (Esentepe)
const LAT = 40.7425;
const LNG = 30.3325;

describe("harita döşemeleri", () => {
  it("enlem/boylam ↔ döşeme dönüşümü tutarlı", () => {
    const z = 17;
    const x = lngToTileX(LNG, z);
    const y = latToTileY(LAT, z);
    expect(Math.floor(x)).toBe(76579); // (30,3325 + 180) / 360 · 2¹⁷ = 76579,7
    expect(tileXToLng(x, z)).toBeCloseTo(LNG, 9);
    expect(tileYToLat(y, z)).toBeCloseTo(LAT, 9);
  });

  it("yakınlık ekrandaki ölçeğe göre seçilir ve sınırlanır", () => {
    expect(tileZoom(0.9, LAT)).toBe(17); // z17: ≈0,91 m/px
    expect(tileZoom(0.45, LAT)).toBe(18);
    expect(tileZoom(50, LAT)).toBe(15);
    expect(tileZoom(0.01, LAT)).toBe(19);
  });

  it("URL CARTO Voyager, alt alan adı dağıtılır", () => {
    expect(tileUrl(17, 76580, 48920)).toBe("https://a.basemaps.cartocdn.com/rastertiles/voyager/17/76580/48920@2x.png");
    expect(tileUrl(17, 76581, 48920)).toMatch(/^https:\/\/b\./);
  });

  it("görünen alanı boşluksuz kaplar; döşemeler komşu", () => {
    const pts: [number, number][] = [
      [40.738, 30.324],
      [40.745, 30.337],
    ];
    const { project, unproject, height } = projector(pts, 360, 12);
    const view = { x: 0, y: 0, w: 360, h: height };
    const tiles = tilesFor(view, 17, project, unproject);
    expect(tiles.length).toBeGreaterThan(4);
    const minX = Math.min(...tiles.map((t) => t.x));
    const minY = Math.min(...tiles.map((t) => t.y));
    const maxX = Math.max(...tiles.map((t) => t.x + t.w));
    const maxY = Math.max(...tiles.map((t) => t.y + t.h));
    expect(minX).toBeLessThanOrEqual(0);
    expect(minY).toBeLessThanOrEqual(0);
    expect(maxX).toBeGreaterThanOrEqual(360);
    expect(maxY).toBeGreaterThanOrEqual(height);
    // Aynı satırdaki komşu döşemeler uç uca (bindirme payı dışında)
    const row = tiles.filter((t) => t.y === tiles[0].y).sort((a, b) => a.x - b.x);
    expect(Math.abs(row[0].x + row[0].w - 0.3 - row[1].x)).toBeLessThan(0.15);
  });

  it("izdüşüm ve tersi aynı noktaya döner", () => {
    const { project, unproject } = projector([[40.738, 30.324], [40.745, 30.337]], 360, 12);
    const [lat, lng] = unproject(project([LAT, LNG]));
    expect(lat).toBeCloseTo(LAT, 4);
    expect(lng).toBeCloseTo(LNG, 4);
  });

  it("aşırı uzaklaşmada döşeme istemez", () => {
    const { project, unproject } = projector([[40.738, 30.324], [40.745, 30.337]], 360, 12);
    expect(tilesFor({ x: -5000, y: -5000, w: 10000, h: 10000 }, 19, project, unproject)).toEqual([]);
  });
});

describe("Google döşemeleri", () => {
  it("oturum ve anahtarla 2D döşeme adresi; tilesFor verilen kaynağı kullanır", async () => {
    const { googleTileUrl } = await import("../../src/lib/tiles");
    const url = googleTileUrl("oturum+1", "anahtar");
    expect(url(17, 76579, 49266)).toBe("https://tile.googleapis.com/v1/2dtiles/17/76579/49266?session=oturum%2B1&key=anahtar");
    const { project, unproject, height } = projector([[40.738, 30.324], [40.745, 30.337]], 360, 12);
    const tiles = tilesFor({ x: 0, y: 0, w: 360, h: height }, 16, project, unproject, url);
    expect(tiles.every((t) => t.url.startsWith("https://tile.googleapis.com/v1/2dtiles/16/"))).toBe(true);
  });
});
