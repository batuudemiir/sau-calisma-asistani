import type { RatingSummary } from "@/domain/ratings";
import type { Status, StatusCode } from "@/domain/types";
import { statusTitle } from "@/lib/labels";
import type { MapSpaceDTO } from "@/server/search-service";

// Harita renkleri ve erişilebilir etiketler (kampüs haritası, kat görünümü ve açıklama aynı tabloyu kullanır)
export type Tone = StatusCode | "EXCLUDED";

export const SHORT: Record<Tone, string> = {
  VERIFIED_FREE: "✓ Doğrulandı",
  PROGRAM_FREE: "○ Programda boş",
  UNKNOWN: "? Bilinmiyor",
  REPORTED_BUSY: "✕ Dolu",
  EXCLUDED: "– Uygun değil",
};

export const FILL: Record<Tone, string> = {
  VERIFIED_FREE: "fill-status-verified-bg stroke-status-verified-border",
  PROGRAM_FREE: "fill-status-program-bg stroke-status-program-border",
  UNKNOWN: "fill-status-unknown-bg stroke-status-unknown-border",
  REPORTED_BUSY: "fill-status-busy-bg stroke-status-busy-border",
  EXCLUDED: "fill-status-excluded-bg stroke-status-excluded-border",
};

export const toneOf = (s: MapSpaceDTO): Tone => (s.excludedBecause ? "EXCLUDED" : s.status.code);
export const isSimStatus = (s: { status: Status; excludedBecause?: unknown }) =>
  !s.excludedBecause && "simulated" in s.status && s.status.simulated === true;

/** Haritada gösterilecek puan: gerçek yeterliyse o, değilse (demo) simüle; ikisi de yoksa null. */
export function shownRating(r: { real: RatingSummary; simulated: RatingSummary }) {
  if (r.real.overall !== null) return { value: r.real.overall, simulated: false };
  if (r.simulated.overall !== null) return { value: r.simulated.overall, simulated: true };
  return null;
}

export function ratingText(r: { real: RatingSummary; simulated: RatingSummary }) {
  const s = shownRating(r);
  return s ? `★ ${s.value.toFixed(1)}${s.simulated ? "*" : ""}` : "★ –";
}

/** Erişilebilir ad, görünen metinle başlar (WCAG 2.5.3 "label in name"), ardından açık anlatım gelir. */
export function ariaFor(code: string, s: MapSpaceDTO) {
  const visible = `${code} ${SHORT[toneOf(s)]}${isSimStatus(s) ? "*" : ""} ${ratingText(s.rating)}`;
  const state = s.excludedBecause
    ? "seçilen süre için uygun değil"
    : `${statusTitle(s.status as Status)}${isSimStatus(s) ? " (örnek demo verisi)" : ""}`;
  const r = shownRating(s.rating);
  return `${visible}. ${state}. ${r ? `Ortalama puan ${r.value.toFixed(1)}${r.simulated ? ", örnek demo verisi" : ""}` : "Yeterli değerlendirme yok"}`;
}
