import type { LocalTime, Weekday } from "./types";

export const TIME_ZONE = "Europe/Istanbul";

const WEEKDAYS: Record<string, Weekday> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

/** Epoch ms → Europe/Istanbul takvim günü, ISO hafta günü ve gün içi dakika. */
export function toLocalTime(epochMs: number): LocalTime {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(epochMs)).map((p) => [p.type, p.value]));
  const weekday = WEEKDAYS[parts.weekday];
  if (!weekday) throw new Error(`Bilinmeyen hafta günü: ${parts.weekday}`);
  return {
    dateISO: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    minute: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** 840 → "14.00" */
export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}
