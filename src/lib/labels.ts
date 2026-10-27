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

export const STATUS_STYLE: Record<StatusCode, string> = {
  VERIFIED_FREE: "bg-green-100 text-green-900 border-green-700 dark:bg-green-950 dark:text-green-100 dark:border-green-400",
  PROGRAM_FREE: "bg-sky-100 text-sky-900 border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-400",
  UNKNOWN: "bg-zinc-100 text-zinc-900 border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-400",
  REPORTED_BUSY: "bg-red-100 text-red-900 border-red-700 dark:bg-red-950 dark:text-red-100 dark:border-red-400",
};

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
