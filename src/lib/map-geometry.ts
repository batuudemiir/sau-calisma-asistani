/** Oda kodundan kat: son sayı grubunun ilk rakamı ("A204" → 2, "M2-101" → 1, "Z01" → 0). Rakam yoksa null. */
export function floorOf(code: string): number | null {
  const groups = code.match(/\d+/g);
  return groups ? Number(groups[groups.length - 1][0]) : null;
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

/**
 * Enlem/boylam → SVG koordinatı. Kampüs ölçeğinde (≈1-2 km) eşdikdörtgen izdüşüm yeterlidir:
 * boylam farkı enlemin kosinüsüyle ölçeklenir, kuzey yukarıdadır.
 */
export function projector(points: readonly (readonly [number, number])[], width: number, pad = 8) {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLng - minLng) * kx;
  const spanY = maxLat - minLat;
  const scale = (width - 2 * pad) / spanX;
  const height = Math.ceil(spanY * scale + 2 * pad);
  const project = ([lat, lng]: readonly [number, number]): [number, number] => [
    Math.round((pad + (lng - minLng) * kx * scale) * 10) / 10,
    Math.round((pad + (maxLat - lat) * scale) * 10) / 10,
  ];
  /** SVG koordinatı → enlem/boylam (harita döşemelerini yerleştirmek için). */
  const unproject = ([x, y]: readonly [number, number]): [number, number] => [
    maxLat - (y - pad) / scale,
    minLng + (x - pad) / (kx * scale),
  ];
  return { project, unproject, height, metersPerUnit: 111_320 / scale };
}

export const toPath = (pts: readonly [number, number][]) => `M${pts.map((p) => `${p[0]},${p[1]}`).join("L")}Z`;
