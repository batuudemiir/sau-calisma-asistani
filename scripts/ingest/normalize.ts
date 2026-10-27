import type { Weekday } from "../../src/domain/types";

// Kaynak belgelerdeki serbest metin gün/saat değerlerini ortak şemaya çevirir. Tanımadığı değer için null döner.

const fold = (s: string) =>
  s
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\.$/, "");

const DAYS: [string[], Weekday][] = [
  [["pazartesi", "pzt", "pts"], 1],
  [["sali", "sal"], 2],
  [["carsamba", "car", "crs"], 3],
  [["persembe", "per", "prs"], 4],
  [["cuma", "cum"], 5],
  [["cumartesi", "cmt", "cts"], 6],
  [["pazar", "paz", "pz"], 7],
];

export function parseWeekday(value: unknown): Weekday | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7) return value as Weekday;
  if (typeof value !== "string") return null;
  const f = fold(value);
  for (const [names, day] of DAYS) if (names.includes(f)) return day;
  return null;
}

/** "13:00", "13.00", "9:5" değil → 780 | null */
export function parseTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** "13:00-14:50", "13.00 – 14.50" → { start, end } | null */
export function parseTimeRange(value: unknown): { start: number; end: number } | null {
  if (typeof value !== "string") return null;
  const parts = value.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);
  return start === null || end === null ? null : { start, end };
}

/** Oda kodlarını karşılaştırılabilir biçime getirir: " a-204 " → "A204" */
export function normalizeRoomCode(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const code = String(value).toLocaleUpperCase("tr").replace(/[\s\-_.]/g, "");
  return code.length ? code : null;
}

export function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const t = String(value).replace(/\s+/g, " ").trim();
  return t.length ? t : null;
}
