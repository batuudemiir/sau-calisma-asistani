/** Harita görünümü: SVG viewBox (x, y, w, h). Sürükle/yakınlaştır paketsiz, saf hesaplarla. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** En yakın görünüm, tüm kampüsün kaçta biri olabilir. */
export const MAX_ZOOM = 8;

/** Görünümü sınır içinde tutar: genişlik [sınır/MAX_ZOOM, sınır], merkez sınırın içinde. */
export function clampBox(v: Box, bounds: Box): Box {
  const aspect = v.h / v.w;
  const w = Math.min(bounds.w, Math.max(bounds.w / MAX_ZOOM, v.w));
  const h = w * aspect;
  const cx = Math.min(bounds.x + bounds.w, Math.max(bounds.x, v.x + v.w / 2));
  const cy = Math.min(bounds.y + bounds.h, Math.max(bounds.y, v.y + v.h / 2));
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** `factor` > 1 yakınlaştırır; (px, py) noktası ekranda yerinde kalır. */
export function zoomAt(v: Box, factor: number, px: number, py: number, bounds: Box): Box {
  const w = v.w / factor;
  const h = v.h / factor;
  const next = { x: px - ((px - v.x) * w) / v.w, y: py - ((py - v.y) * h) / v.h, w, h };
  return clampBox(next, bounds);
}

/** Görünümü SVG birimiyle kaydırır (sürüklemede parmağın tersine). */
export function panBy(v: Box, dx: number, dy: number, bounds: Box): Box {
  return clampBox({ ...v, x: v.x - dx, y: v.y - dy }, bounds);
}

/** Noktaları kapsayan kutu, kenar payıyla. */
export function boxAround(points: readonly (readonly [number, number])[], pad = 0): Box {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
}

export const viewBoxOf = (v: Box) => `${v.x} ${v.y} ${v.w} ${v.h}`;
