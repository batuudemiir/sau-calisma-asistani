import type { Award, OtherReport, PointKind, ReportAward, UserPoints } from "@/domain/points";
import type { Checkin, Rating, Scores } from "@/domain/ratings";
import type { ClaimBlock, Reward } from "@/domain/rewards";
import type { ReportType } from "@/domain/types";
import type { RateDecision, RecentWrite } from "./rate-limit";

export interface NewReport {
  spaceId: string;
  type: ReportType;
  uid: string;
  createdAtMs: number;
  /** Sunucuda doğrulanmış sınıf QR'ı ile geldi. */
  qr?: boolean;
}

/** points: bu katkıyla kazanılan toplam puan (bonus dahil). */
export type WriteResult = RateDecision & { id?: string; points?: number; qrLimited?: boolean };

/** Puan hesabı (saf, src/domain/points): mevcut kullanıcı durumu + aynı yere son bildirimler → yeni durum. */
export type ReportAwardFn = (user: UserPoints, recentOnSpace: OtherReport[]) => ReportAward;
export type RatingAwardFn = (user: UserPoints) => { user: UserPoints; award: Award };

export interface PointEventDTO {
  kind: PointKind;
  points: number;
  spaceId: string;
  createdAtMs: number;
}

export const DELETED_UID = "silinmis";

export interface RewardState {
  user: UserPoints;
  student: boolean;
  /** Bu ay alınan kuponlar: ödül kimliği → kod. */
  claimed: Record<string, string>;
  /** Bu ay her ödülden verilen kupon sayısı. */
  claimedCount: Record<string, number>;
}

export type ClaimResult = { ok: true; code: string } | { ok: false; block: ClaimBlock | "NOT_FOUND" };

export interface Profile {
  user: UserPoints;
  /** Sunucuda doğrulanmış SAÜ öğrenci hesabına bağlı mı. E-posta saklanmaz. */
  student: boolean;
  events: PointEventDTO[];
}

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
  /** Puan, bildirimle aynı transaction'da yazılır (award verilmezse puan yok). */
  addReport(
    report: NewReport,
    sinceMs: number,
    decide: (recent: RecentWrite[]) => RateDecision,
    award?: ReportAwardFn,
  ): Promise<WriteResult>;
  /** Atomik: uid'nin since'ten beri check-in'lerini ve değerlendirmelerini okur, decide ok ise kaydeder. */
  addRating(
    rating: NewRating,
    sinceMs: number,
    decide: (mine: {
      checkins: Checkin[];
      ratings: Pick<Rating, "uid" | "checkinReportId" | "spaceId" | "createdAtMs">[];
    }) => RatingDecision,
    award?: RatingAwardFn,
  ): Promise<RatingDecision & { id?: string; points?: number }>;
  /** Puan durumu ve son katkılar (en yeni önce). */
  profile(uid: string, limit: number): Promise<Profile>;
  /** Hesap sunucuda SAÜ öğrenci hesabı olarak doğrulandı. */
  markStudent(uid: string): Promise<void>;
  /**
   * KVKK silme: kullanıcı belgesi ve puan defteri silinir; bildirim ve değerlendirmeler topluluk verisi olarak
   * kalır ama kişiyle bağı koparılır (uid DELETED_UID olur).
   */
  deleteAccountData(uid: string): Promise<void>;
  rewards(): Promise<Reward[]>;
  rewardState(uid: string, monthKey: string, rewardIds: readonly string[]): Promise<RewardState>;
  /** Atomik: stok, aylık hak ve puan kontrolü + kupon yazımı aynı transaction'da. */
  claimReward(
    uid: string,
    rewardId: string,
    monthKey: string,
    makeCode: (reward: Reward) => string,
    decide: (state: {
      reward: Reward;
      user: UserPoints;
      student: boolean;
      alreadyClaimed: boolean;
      claimedCount: number;
    }) => ClaimBlock | null,
  ): Promise<ClaimResult>;
}
