import type { Checkin, Rating, Scores } from "@/domain/ratings";
import type { ReportType } from "@/domain/types";
import type { RateDecision, RecentWrite } from "./rate-limit";

export interface NewReport {
  spaceId: string;
  type: ReportType;
  uid: string;
  createdAtMs: number;
}

export type WriteResult = RateDecision & { id?: string };

export interface NewRating {
  spaceId: string;
  uid: string;
  scores: Scores;
  createdAtMs: number;
}

/** decide sonucu: yazılacak check-in kimliği veya ret. */
export type RatingDecision = { ok: true; checkinId: string } | { ok: false; error: string; retryAfterSec?: number };

/** Sunucu tarafı yazmalar. Okuma + karar + yazma atomiktir (yarış durumunda hız sınırı aşılmaz). */
export interface WriteStore {
  spaceExists(spaceId: string): Promise<boolean>;
  addReport(report: NewReport, sinceMs: number, decide: (recent: RecentWrite[]) => RateDecision): Promise<WriteResult>;
  /** Atomik: uid'nin since'ten beri check-in'lerini ve değerlendirmelerini okur, decide ok ise kaydeder. */
  addRating(
    rating: NewRating,
    sinceMs: number,
    decide: (mine: { checkins: Checkin[]; ratings: Pick<Rating, "uid" | "checkinReportId" | "spaceId" | "createdAtMs">[] }) => RatingDecision,
  ): Promise<RatingDecision & { id?: string }>;
}
