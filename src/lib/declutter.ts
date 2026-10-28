/**
 * Haritada üst üste binen işaretleri birbirinden iter (ekran pikselinde). Her işaret gerçek konumuna yakın kalır;
 * kayan işaretin gerçek yeri ince bir çizgiyle gösterilir (CampusMap). Deterministik: aynı girdi aynı çıktı.
 */
export interface Pt {
  id: string;
  x: number;
  y: number;
}

export function declutter(points: readonly Pt[], minDist: number, iterations = 40): Map<string, { x: number; y: number }> {
  const pos = points.map((p) => ({ id: p.id, x: p.x, y: p.y }));
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i];
        const b = pos[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        if (d < 1e-6) {
          // Aynı noktadakiler: sıraya göre sabit bir yöne açılır
          const angle = ((i + j) * 2.399) % (2 * Math.PI);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          d = 1;
        }
        const push = (minDist - d) / 2 + 0.01;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return new Map(pos.map((p) => [p.id, { x: p.x, y: p.y }]));
}

export interface Rect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Circle {
  id: string;
  x: number;
  y: number;
  r: number;
}

const rectsOverlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function rectHitsCircle(r: Rect, c: Circle) {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
  return Math.hypot(c.x - nx, c.y - ny) < c.r;
}

/**
 * Etiket yerleştirme (açgözlü): verilen sırayla (önce seçili) her etiket, başka bir iğneyi ya da daha önce
 * yerleşmiş bir etiketi kapatmıyorsa gösterilir. Kendi iğnesi engel sayılmaz.
 */
export function placeLabels(labels: readonly Rect[], pins: readonly Circle[]): Set<string> {
  const placed: Rect[] = [];
  const shown = new Set<string>();
  for (const l of labels) {
    if (pins.some((p) => p.id !== l.id && rectHitsCircle(l, p))) continue;
    if (placed.some((p) => rectsOverlap(l, p))) continue;
    placed.push(l);
    shown.add(l.id);
  }
  return shown;
}
