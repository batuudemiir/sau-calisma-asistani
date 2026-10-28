import { CLOSE_MINUTE, OPEN_MINUTE } from "@/domain/config";
import { formatMinute, toLocalTime } from "@/domain/time";

/**
 * Arama zamanı: gün + başlangıç + bitiş. URL'de `at` (başlangıç, "2026-10-29T13:00") ve `d` (dakika) olarak taşınır;
 * `at` yoksa başlangıç "şimdi". Saatler Europe/Istanbul, gün içi dakika (kural 11).
 */
export const STEP_MIN = 30;
const DAY_MS = 86_400_000;
const WEEKDAY_SHORT = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export interface When {
  dateISO: string;
  /** null: şimdi (yalnızca bugün). */
  start: number | null;
  end: number;
  /** Bugünün tarihi ve şu anki dakika (seçenekleri sınırlamak için). */
  todayISO: string;
  nowMinute: number;
}

const AT = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

export function whenFrom(params: URLSearchParams, nowMs: number): When {
  const local = toLocalTime(nowMs);
  const d = Number(params.get("d")) || 60;
  const m = AT.exec(params.get("at") ?? "");
  if (m) {
    const start = Number(m[2]) * 60 + Number(m[3]);
    return { dateISO: m[1], start, end: start + d, todayISO: local.dateISO, nowMinute: local.minute };
  }
  return { dateISO: local.dateISO, start: null, end: local.minute + d, todayISO: local.dateISO, nowMinute: local.minute };
}

/** URL değerleri: başlangıç şimdiyse `at` silinir (""). */
export function whenQuery(w: Pick<When, "dateISO" | "start" | "end" | "nowMinute">): { at: string; d: string } {
  const from = w.start ?? w.nowMinute;
  return {
    at: w.start === null ? "" : `${w.dateISO}T${formatMinute(w.start).replace(".", ":")}`,
    d: String(Math.max(15, w.end - from)),
  };
}

/** Bugün, Yarın ve sonraki günler. */
export function dayOptions(nowMs: number, count = 7): { dateISO: string; label: string; weekday: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const t = toLocalTime(nowMs + i * DAY_MS);
    const day = Number(t.dateISO.slice(8, 10));
    const label = i === 0 ? "Bugün" : i === 1 ? "Yarın" : `${WEEKDAY_SHORT[t.weekday]} ${day}`;
    return { dateISO: t.dateISO, label, weekday: t.weekday };
  });
}

const ceilStep = (m: number) => Math.ceil(m / STEP_MIN) * STEP_MIN;

/** Başlangıç seçenekleri (yarım saat adımla, bina açıkken); bugün için geçmiş saatler yok. */
export function startOptions(dateISO: string, w: Pick<When, "todayISO" | "nowMinute">): number[] {
  const first = dateISO === w.todayISO ? Math.max(OPEN_MINUTE, ceilStep(w.nowMinute + 1)) : OPEN_MINUTE;
  const out: number[] = [];
  for (let m = first; m <= CLOSE_MINUTE - STEP_MIN; m += STEP_MIN) out.push(m);
  return out;
}

/** Bitiş seçenekleri: başlangıçtan en az 15 dk sonra, en geç kapanış. */
export function endOptions(start: number): number[] {
  const out: number[] = [];
  for (let m = ceilStep(start + 15); m <= CLOSE_MINUTE; m += STEP_MIN) out.push(m);
  return out;
}

/** "Perşembe 29 Ekim · 13.00–15.00" */
export function windowText(dateISO: string, weekdayName: string, start: number, end: number): string {
  const day = Number(dateISO.slice(8, 10));
  const month = MONTHS[Number(dateISO.slice(5, 7)) - 1];
  return `${weekdayName} ${day} ${month} · ${formatMinute(start)}–${formatMinute(Math.min(end, 24 * 60 - 1))}`;
}

/** Bina kapalıyken önerilecek ilk açık aralık (09.00–11.00): bugün sabahsa bugün, değilse yarın. */
export function nextOpenWindow(nowMs: number): { at: string; d: string; label: string } {
  const local = toLocalTime(nowMs);
  const today = local.minute < OPEN_MINUTE;
  const dateISO = today ? local.dateISO : toLocalTime(nowMs + DAY_MS).dateISO;
  return { at: `${dateISO}T09:00`, d: "120", label: `${today ? "Bugün" : "Yarın"} 09.00–11.00` };
}

/** Süre çipleri (dakika). */
export const DURATION_CHOICES = [30, 60, 90, 120, 180, 240] as const;

/** "30 dk", "1 sa", "1,5 sa", "1 sa 40 dk" */
export function durationLabel(min: number): string {
  if (min < 60) return `${min} dk`;
  if (min % 60 === 0) return `${min / 60} sa`;
  if (min % 30 === 0) return `${String(min / 60).replace(".", ",")} sa`;
  return `${Math.floor(min / 60)} sa ${min % 60} dk`;
}

/** Uzun hâli: "2 saat", "1,5 saat", "45 dakika" */
export function durationText(min: number): string {
  return durationLabel(min).replace(/ sa$/, " saat").replace(/ sa /, " saat ").replace(/ dk$/, " dakika");
}

/** Gün çizelgesinde (08.00–22.00) konum, yüzde. */
export const dayPercent = (minute: number) =>
  Math.min(100, Math.max(0, ((minute - OPEN_MINUTE) / (CLOSE_MINUTE - OPEN_MINUTE)) * 100));
