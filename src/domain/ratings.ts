import { MIN_RATINGS_TO_SHOW, RATING_WINDOW_MIN } from "./config";

// Değerlendirme kuralları (docs/AVAILABILITY_RULES.md §4). Puanlar uygunluk etiketini ve sıralamayı etkilemez.

export const CRITERIA = ["quiet", "power", "wifi", "light"] as const;
export type Criterion = (typeof CRITERIA)[number];
export type Score = 1 | 2 | 3 | 4 | 5;
export type Scores = Record<Criterion, Score>;

export const CRITERION_LABELS: Record<Criterion, string> = {
  quiet: "Sessizlik",
  power: "Priz",
  wifi: "İnternet",
  light: "Işık",
};

export interface Checkin {
  id: string; // spaceReports belge kimliği (type = AVAILABLE)
  spaceId: string;
  uid: string;
  createdAtMs: number;
}

export interface Rating {
  spaceId: string;
  uid: string;
  checkinReportId: string;
  scores: Scores;
  createdAtMs: number;
  isSimulated: boolean;
}

export type CanRate =
  | { ok: true; checkinId: string }
  | { ok: false; reason: "NO_CHECKIN" | "EXPIRED" | "ALREADY_RATED" };

export const CAN_RATE_MESSAGES: Record<Exclude<CanRate, { ok: true }>["reason"], string> = {
  NO_CHECKIN: "Değerlendirme için önce bu alanda check-in yapmalısın",
  EXPIRED: "Check-in'inin üzerinden 3 saatten fazla geçti; yeniden check-in yap",
  ALREADY_RATED: "Bu check-in için zaten değerlendirme yaptın",
};

/**
 * checkins/ratings: bu uid'nin kayıtları (başka uid'ninkiler yok sayılır).
 * Değerlendirme, süresi dolmamış ve henüz puanlanmamış en yeni check-in'e bağlanır.
 */
export function canRate(input: {
  uid: string;
  spaceId: string;
  nowMs: number;
  checkins: readonly Checkin[];
  ratings: readonly Pick<Rating, "uid" | "checkinReportId">[];
}): CanRate {
  const mine = input.checkins
    .filter((c) => c.uid === input.uid && c.spaceId === input.spaceId && c.createdAtMs <= input.nowMs)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  if (mine.length === 0) return { ok: false, reason: "NO_CHECKIN" };

  const valid = mine.filter((c) => input.nowMs - c.createdAtMs <= RATING_WINDOW_MIN * 60_000);
  if (valid.length === 0) return { ok: false, reason: "EXPIRED" };

  const rated = new Set(input.ratings.filter((r) => r.uid === input.uid).map((r) => r.checkinReportId));
  const open = valid.find((c) => !rated.has(c.id));
  return open ? { ok: true, checkinId: open.id } : { ok: false, reason: "ALREADY_RATED" };
}

export interface RatingSummary {
  count: number;
  /** count < MIN_RATINGS_TO_SHOW ise null: tek kişinin puanı genel kanı gibi gösterilmez. */
  averages: Record<Criterion, number> | null;
  overall: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function aggregateRatings(ratings: readonly Pick<Rating, "scores">[]): RatingSummary {
  const count = ratings.length;
  if (count < MIN_RATINGS_TO_SHOW) return { count, averages: null, overall: null };
  const sums = Object.fromEntries(CRITERIA.map((c) => [c, ratings.reduce((s, r) => s + r.scores[c], 0) / count])) as Record<Criterion, number>;
  const overall = CRITERIA.reduce((s, c) => s + sums[c], 0) / CRITERIA.length;
  return {
    count,
    averages: Object.fromEntries(CRITERIA.map((c) => [c, round1(sums[c])])) as Record<Criterion, number>,
    overall: round1(overall),
  };
}

/** Gerçek ve simüle puanlar ayrı özetlenir; simüle olanlar "Örnek demo verisi" etiketiyle gösterilir. */
export function summarizeSpaceRatings(ratings: readonly Rating[]) {
  return {
    real: aggregateRatings(ratings.filter((r) => !r.isSimulated)),
    simulated: aggregateRatings(ratings.filter((r) => r.isSimulated)),
  };
}
