/** OSM opening_hours değerini kaynağıyla birlikte gösterir; bilinmiyorsa uydurmaz. */
export function openingHoursText(h: string | null): string | null {
  if (!h) return null;
  return h === "24/7" ? "7/24 açık (OpenStreetMap)" : `Açılış saatleri: ${h} (OpenStreetMap)`;
}
