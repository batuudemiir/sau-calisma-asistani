// Ekibin çizdiği şematik yerleşim. Ölçekli değildir ve kaynak veri gibi sunulmaz.
// Burada olmayan binalar otomatik olarak boş bir hücreye yerleşir (src/lib/map-geometry.ts).

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CAMPUS_VIEWBOX = { w: 360, h: 250 };

export const CAMPUS_LAYOUT: Record<string, Rect> = {
  kutuphane: { x: 20, y: 20, w: 150, h: 95 },
  "isletme-a": { x: 190, y: 20, w: 150, h: 95 },
  "demo-blok": { x: 20, y: 135, w: 150, h: 95 },
};
