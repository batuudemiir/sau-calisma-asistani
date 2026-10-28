import { hoursText } from "@/domain/opening-hours";

export { hoursText };

/** Açılış saatleri metni; gerçek kayıtta kaynağı (OpenStreetMap) da yazılır. Bilinmiyorsa uydurulmaz (null). */
export function openingHoursText(h: string | null, fromOsm = true): string | null {
  if (!h) return null;
  const text = hoursText(h);
  const body = text === "7/24 açık" ? text : `Açılış saatleri: ${text}`;
  return fromOsm ? `${body} (OpenStreetMap)` : body;
}
