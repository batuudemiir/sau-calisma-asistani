import { formatMinute } from "@/domain/time";
import {
  LIBRARY_NO_DATA_LABEL,
  STATUS_LABELS,
  UNKNOWN_REASON_LABELS,
  type LibraryLevel,
  type ReportType,
  type Status,
  type StatusCode,
} from "@/domain/types";

export const WEEKDAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

/** Etiketin ana metni (renk tek başına anlam taşımaz; her zaman bu metin yazılır). */
export function statusTitle(status: Status, isLibrary = false): string {
  if (status.code === "REPORTED_BUSY" && status.reportType === "UNUSABLE") return "Kullanılamıyor bildirildi";
  if (isLibrary && status.code === "UNKNOWN" && status.reason === "NO_SOURCE") return LIBRARY_NO_DATA_LABEL;
  return STATUS_LABELS[status.code];
}

/** Etiketin yanındaki açıklama: ne zaman, neden. */
export function statusDetail(status: Status, isLibrary = false): string | null {
  switch (status.code) {
    case "VERIFIED_FREE":
      return `${ago(status.minutesAgo)} · ${status.reportCount} bildirim`;
    case "REPORTED_BUSY":
      return ago(status.minutesAgo);
    case "UNKNOWN":
      return isLibrary && status.reason === "NO_SOURCE" ? null : UNKNOWN_REASON_LABELS[status.reason];
    case "PROGRAM_FREE":
      return "Gerçek durum bilinmiyor";
  }
}

export const ago = (min: number) => (min < 1 ? "az önce" : `${min} dk önce`);

export const STATUS_ICON: Record<StatusCode, string> = {
  VERIFIED_FREE: "✓",
  PROGRAM_FREE: "○",
  UNKNOWN: "?",
  REPORTED_BUSY: "✕",
};

/** Durum renkleri tasarım token'larından (src/app/globals.css); açık/koyu tema orada. */
export const STATUS_STYLE: Record<StatusCode, string> = {
  VERIFIED_FREE: "bg-status-verified-bg text-status-verified-fg border-status-verified-border",
  PROGRAM_FREE: "bg-status-program-bg text-status-program-fg border-status-program-border",
  UNKNOWN: "bg-status-unknown-bg text-status-unknown-fg border-status-unknown-border",
  REPORTED_BUSY: "bg-status-busy-bg text-status-busy-fg border-status-busy-border",
};

export const EXCLUDED_STYLE = "bg-status-excluded-bg text-status-excluded-fg border-status-excluded-border border-dashed";

export const REPORT_LABELS: Record<ReportType, string> = {
  AVAILABLE: "Buradayım, uygun",
  BUSY: "Dolu",
  UNUSABLE: "Kullanılamıyor",
  OUTDATED: "Bilgi güncel değil",
};

export const LIBRARY_LEVEL_LABELS: Record<LibraryLevel, string> = {
  LOW: "Sakin",
  MEDIUM: "Orta yoğunlukta",
  BUSY: "Çok yoğun",
};

export const time = formatMinute;

// Sayının okunuşundaki son kelimeye göre yönelme eki: 1 bir'e, 2 iki'ye, 6 altı'ya, 9 dokuz'a, 10 on'a, 20 yirmi'ye…
const UNIT_SUFFIX = ["'a", "'e", "'ye", "'e", "'e", "'e", "'ya", "'ye", "'e", "'a"];
const TENS_SUFFIX = ["'a", "'a", "'ye", "'a", "'a", "'ye"];
const numberSuffix = (n: number) => (n % 10 !== 0 ? UNIT_SUFFIX[n % 10] : TENS_SUFFIX[Math.floor(n / 10)]);

/** "17.00'ye kadar", "15.10'a kadar", "13.00'e kadar". */
export function untilText(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${time(minute)}${m === 0 ? numberSuffix(h) : numberSuffix(m)} kadar`;
}
