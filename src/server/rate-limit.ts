// Bildirim ve değerlendirme hız sınırları (docs/ARCHITECTURE.md §6). Saf fonksiyonlar; veri çağırana aittir.

export const REPORT_SAME_SPACE_MIN = 10; // aynı uid + oda için 10 dk'da 1 bildirim
export const REPORTS_PER_HOUR = 20;
export const RATINGS_PER_HOUR = 10;
const HOUR_MS = 60 * 60_000;

export interface RecentWrite {
  spaceId: string;
  createdAtMs: number;
}

export type RateDecision = { ok: true } | { ok: false; error: string; retryAfterSec: number };

/** recent: bu uid'nin son 1 saatteki bildirimleri. */
export function checkReportRate(spaceId: string, recent: readonly RecentWrite[], nowMs: number): RateDecision {
  const sameSpace = recent
    .filter((r) => r.spaceId === spaceId && nowMs - r.createdAtMs < REPORT_SAME_SPACE_MIN * 60_000)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
  if (sameSpace) {
    return {
      ok: false,
      error: `Bu alan için ${REPORT_SAME_SPACE_MIN} dakikada bir bildirim yapabilirsin`,
      retryAfterSec: Math.ceil((sameSpace.createdAtMs + REPORT_SAME_SPACE_MIN * 60_000 - nowMs) / 1000),
    };
  }
  return checkHourly(recent, nowMs, REPORTS_PER_HOUR, "bildirim");
}

/** recent: bu uid'nin son 1 saatteki değerlendirmeleri. */
export function checkRatingRate(recent: readonly RecentWrite[], nowMs: number): RateDecision {
  return checkHourly(recent, nowMs, RATINGS_PER_HOUR, "değerlendirme");
}

function checkHourly(recent: readonly RecentWrite[], nowMs: number, limit: number, noun: string): RateDecision {
  const inHour = recent.filter((r) => nowMs - r.createdAtMs < HOUR_MS).sort((a, b) => a.createdAtMs - b.createdAtMs);
  if (inHour.length < limit) return { ok: true };
  return {
    ok: false,
    error: `Saatte en fazla ${limit} ${noun} yapabilirsin`,
    retryAfterSec: Math.ceil((inHour[inHour.length - limit].createdAtMs + HOUR_MS - nowMs) / 1000),
  };
}
