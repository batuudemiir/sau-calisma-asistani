import { CAMPUS_LAYOUT, CAMPUS_VIEWBOX, type Rect } from "@/data/map-layout";

const SLOTS: Rect[] = [0, 1, 2, 3, 4, 5].map((i) => ({
  x: i % 2 === 0 ? 20 : 190,
  y: 20 + Math.floor(i / 2) * 115,
  w: 150,
  h: 95,
}));

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Bina kimliklerine dikdörtgen atar: önce elle çizilmiş yerleşim, sonra boş ızgara hücreleri. */
export function campusRects(ids: readonly string[]): { rects: Map<string, Rect>; height: number } {
  const rects = new Map<string, Rect>();
  for (const id of ids) if (CAMPUS_LAYOUT[id]) rects.set(id, CAMPUS_LAYOUT[id]);
  const free = (r: Rect) => [...rects.values()].every((u) => !overlaps(u, r));
  let extraRow = 0;
  for (const id of ids) {
    if (rects.has(id)) continue;
    let slot = SLOTS.find(free);
    while (!slot) {
      extraRow++;
      slot = [0, 1].map((i) => ({ x: i === 0 ? 20 : 190, y: 20 + (2 + extraRow) * 115, w: 150, h: 95 })).find(free);
    }
    rects.set(id, slot);
  }
  const height = Math.max(CAMPUS_VIEWBOX.h, ...[...rects.values()].map((r) => r.y + r.h + 20));
  return { rects, height };
}

/** Oda kodundan kat: ilk rakam ("A204" → 2, "Ö-101" → 1, "Z01" → 0). Rakam yoksa null. */
export function floorOf(code: string): number | null {
  const m = code.match(/\d/);
  return m ? Number(m[0]) : null;
}

/** Odaları katlara göre satırlara böler; en üst kat en üstte, katı bilinmeyenler en altta. */
export function floorRows<T extends { code: string }>(rooms: readonly T[]): { floor: number | null; rooms: T[] }[] {
  const groups = new Map<number | null, T[]>();
  for (const r of rooms) {
    const f = floorOf(r.code);
    groups.set(f, [...(groups.get(f) ?? []), r]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([floor, list]) => ({ floor, rooms: list }));
}
