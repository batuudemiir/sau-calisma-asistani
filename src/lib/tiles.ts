import type { Box } from "./pan-zoom";

/**
 * Gerçek sokak haritası döşemeleri (CARTO Voyager, OpenStreetMap verisi; ücretsiz, anahtarsız). SVG haritanın en
 * altına <image> olarak konur; paket yok. Döşemeler Web Mercator'dadır, harita eşdikdörtgen: kampüs ölçeğinde
 * (≈1-2 km) aradaki fark bir pikselin altında kalır, bu yüzden her döşemenin köşeleri ayrı ayrı izdüşürülür.
 */

type LatLng = readonly [lat: number, lng: number];
type Point = readonly [x: number, y: number];

/** Ekvatorda z=0, 256 px döşeme için metre/piksel. */
const M_PER_PX_Z0 = 156_543.033_92;
export const TILE_ATTRIBUTION = "© OpenStreetMap katkıda bulunanlar © CARTO";
export const MIN_ZOOM = 15;
export const MAX_ZOOM = 19;
/** Aşırı uzaklaşmada istek patlamasın diye üst sınır. */
const MAX_TILES = 60;

/** Ekrandaki ölçeğe (metre / CSS pikseli) en yakın döşeme yakınlığı. */
export function tileZoom(metersPerScreenPx: number, lat: number): number {
  const z = Math.round(Math.log2((M_PER_PX_Z0 * Math.cos((lat * Math.PI) / 180)) / metersPerScreenPx));
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export const lngToTileX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
export function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}
export const tileXToLng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
export const tileYToLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI - (2 * Math.PI * y) / 2 ** z)) * 180) / Math.PI;

export function tileUrl(z: number, x: number, y: number) {
  const sub = "abcd"[(x + y) % 4];
  return `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`;
}

export interface Tile {
  key: string;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Görünen alanı (+1 döşeme pay) kaplayan döşemeler, SVG koordinatlarında. */
export function tilesFor(
  view: Box,
  z: number,
  project: (p: LatLng) => Point,
  unproject: (p: Point) => LatLng,
): Tile[] {
  const [north, west] = unproject([view.x, view.y]);
  const [south, east] = unproject([view.x + view.w, view.y + view.h]);
  const x0 = Math.floor(lngToTileX(west, z)) - 1;
  const x1 = Math.floor(lngToTileX(east, z)) + 1;
  const y0 = Math.floor(latToTileY(north, z)) - 1;
  const y1 = Math.floor(latToTileY(south, z)) + 1;
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_TILES) return [];
  const tiles: Tile[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const [ax, ay] = project([tileYToLat(ty, z), tileXToLng(tx, z)]);
      const [bx, by] = project([tileYToLat(ty + 1, z), tileXToLng(tx + 1, z)]);
      // İzdüşüm 0,1 birime yuvarlanır; döşemeler arasında ince boşluk kalmasın diye hafif bindirme
      tiles.push({ key: `${z}/${tx}/${ty}`, url: tileUrl(z, tx, ty), x: ax, y: ay, w: bx - ax + 0.3, h: by - ay + 0.3 });
    }
  }
  return tiles;
}
