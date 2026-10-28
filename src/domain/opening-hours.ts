/**
 * OpenStreetMap opening_hours'un basit biçimleri: "24/7", "Mo-Fr 08:00-20:00", "Mo-Fr 08:00-20:00; Sa 10:00-16:00".
 * Yorumlanamayan biçim null döner ve "açık" sayılmaz (bilinmeyen asla olumlu değildir, kural 5).
 */
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Haftanın günü (1 = Pazartesi … 7 = Pazar) → [açılış, kapanış] dakika; o gün kapalıysa yok. */
export type WeekHours = Map<number, [open: number, close: number]>;

export function parseOpeningHours(raw: string | null | undefined): WeekHours | "ALWAYS" | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s === "24/7") return "ALWAYS";
  const out: WeekHours = new Map();
  for (const rule of s.split(";").map((r) => r.trim()).filter(Boolean)) {
    const m = /^([A-Za-z,\- ]+)\s+(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(rule);
    if (!m) return null;
    const days = new Set<number>();
    for (const part of m[1].replace(/\s/g, "").split(",")) {
      const [a, b] = part.split("-");
      const i = DAYS.indexOf(a);
      const j = b === undefined ? i : DAYS.indexOf(b);
      if (i < 0 || j < 0) return null;
      for (let k = i; ; k = (k + 1) % 7) {
        days.add(k + 1);
        if (k === j) break;
      }
    }
    const open = Number(m[2]) * 60 + Number(m[3]);
    const close = Number(m[4]) * 60 + Number(m[5]);
    if (close <= open) return null; // gece yarısını aşan saatler yorumlanmaz
    for (const d of days) out.set(d, [open, close]);
  }
  return out;
}

/** Seçilen aralığın tamamında açık mı? Bilinmiyorsa false. */
export function isOpenDuring(raw: string | null | undefined, weekday: number, start: number, end: number): boolean {
  const h = parseOpeningHours(raw);
  if (h === "ALWAYS") return true;
  const day = h?.get(weekday);
  return day !== undefined && day[0] <= start && end <= day[1];
}

/** O günün saatleri: "08.00–20.00", "7/24" ya da kapalıysa "kapalı"; yorumlanamıyorsa null. */
export function hoursOn(raw: string | null | undefined, weekday: number): string | null {
  const h = parseOpeningHours(raw);
  if (h === null) return null;
  if (h === "ALWAYS") return "7/24";
  const day = h.get(weekday);
  return day ? `${fmt(day[0])}–${fmt(day[1])}` : "kapalı";
}

const DAY_SHORT = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
/** Dakika → "08.30" */
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}.${String(m % 60).padStart(2, "0")}`;

/** "Mo-Fr 08:00-20:00" → "Pzt–Cum 08.00–20.00"; yorumlanamazsa ham değer. */
export function hoursText(h: string): string {
  const parsed = parseOpeningHours(h);
  if (parsed === "ALWAYS") return "7/24 açık";
  if (parsed === null) return h;
  const groups: { from: number; to: number; hours: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const v = parsed.get(d);
    if (!v) continue;
    const hours = `${fmt(v[0])}–${fmt(v[1])}`;
    const last = groups.at(-1);
    if (last && last.to === d - 1 && last.hours === hours) last.to = d;
    else groups.push({ from: d, to: d, hours });
  }
  return groups.map((g) => `${DAY_SHORT[g.from]}${g.to > g.from ? `–${DAY_SHORT[g.to]}` : ""} ${g.hours}`).join(", ");
}

