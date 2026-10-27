import type { ReportType } from "./types";

/**
 * Kişisel puanlar. Yalnızca kullanıcının kendisine gösterilir; güven etiketini ve sıralamayı ETKİLEMEZ
 * (puan kasmak sonuçları değiştirmez). Örnek demo verisi puan üretmez.
 */
export const POINTS = { CHECKIN: 5, QR_CHECKIN: 10, REPORT: 3, RATING: 5, CONFIRM_BONUS: 2 } as const;
/** Aynı yer için check-in puanı bu kadar dakikada bir verilir. */
export const CHECKIN_POINT_COOLDOWN_MIN = 180;
/** Başka bir kullanıcının aynı yöndeki bildirimi bu süre içindeyse ikisine doğrulama bonusu. */
export const CONFIRM_WINDOW_MIN = 30;
/**
 * Basılı QR'ın fotoğrafı paylaşılabilir: aynı yerde bu kadar dakika içinde bu kadar farklı hesap QR ile check-in
 * yaptıysa, sonrakiler QR bonusu almaz (normal check-in sayılır).
 */
export const QR_ABUSE_WINDOW_MIN = 10;
export const QR_ABUSE_MAX_ACCOUNTS = 8;
/** Günlük (Europe/Istanbul) üst sınır; aşan katkı kaydedilir, puan verilmez. */
export const DAILY_CAP = 60;

export type PointKind = "CHECKIN" | "QR_CHECKIN" | "REPORT" | "RATING" | "CONFIRM_BONUS";

export const LEVELS = [
  { min: 0, name: "Yeni" },
  { min: 50, name: "Kampüs Gezgini" },
  { min: 200, name: "Çalışma Rehberi" },
  { min: 500, name: "Kampüs Uzmanı" },
] as const;

export interface UserPoints {
  points: number;
  /** dayPoints'in ait olduğu gün (YYYY-MM-DD, Europe/Istanbul). */
  dayKey: string;
  dayPoints: number;
  /** monthPoints'in ait olduğu ay (YYYY-MM, Europe/Istanbul); aylık ödül eşiği bununla karşılaştırılır. */
  monthKey: string;
  monthPoints: number;
  counts: { checkins: number; reports: number; ratings: number };
  /** Puan verilen son check-in zamanı, yer bazında (bekleme süresi için; eskiler budanır). */
  checkinAt: Record<string, number>;
}

export const emptyUser = (): UserPoints => ({
  points: 0,
  dayKey: "",
  dayPoints: 0,
  monthKey: "",
  monthPoints: 0,
  counts: { checkins: 0, reports: 0, ratings: 0 },
  checkinAt: {},
});

export interface Award {
  kind: PointKind;
  /** Verilen puan (günlük sınır nedeniyle istenenden az, 0 olabilir). */
  points: number;
}

/** Günlük sınırı uygulayarak puan ekler; günlük ve aylık toplamlar gün/ay değişince sıfırlanır. */
export function grant(user: UserPoints, dayKey: string, want: number): { user: UserPoints; points: number } {
  const monthKey = dayKey.slice(0, 7);
  const dayPoints = user.dayKey === dayKey ? user.dayPoints : 0;
  const monthPoints = user.monthKey === monthKey ? user.monthPoints : 0;
  const points = Math.max(0, Math.min(want, DAILY_CAP - dayPoints));
  return {
    user: {
      ...user,
      points: user.points + points,
      dayKey,
      dayPoints: dayPoints + points,
      monthKey,
      monthPoints: monthPoints + points,
    },
    points,
  };
}

type Direction = "free" | "busy" | null;
const direction = (t: ReportType): Direction => (t === "AVAILABLE" ? "free" : t === "BUSY" || t === "UNUSABLE" ? "busy" : null);

export interface OtherReport {
  id: string;
  uid: string;
  type: ReportType;
  createdAtMs: number;
  isSimulated: boolean;
  /** Sınıftaki QR ile kanıtlanmış check-in. */
  qr?: boolean;
}

export interface ReportAwardInput {
  uid: string;
  spaceId: string;
  type: ReportType;
  nowMs: number;
  dayKey: string;
  /** Sunucuda doğrulanmış QR ile mi geldi. */
  qr?: boolean;
  /** Aynı yere son CONFIRM_WINDOW_MIN dakikadaki bildirimler (kullanıcının kendisininkiler dahil olabilir). */
  recentOnSpace: readonly OtherReport[];
}

export interface ReportAward {
  user: UserPoints;
  awards: Award[];
  /** Doğrulama bonusu alacak diğer kullanıcının bildirimi (bonus o bildirim başına bir kez verilir). */
  confirms: OtherReport | null;
  /** QR geçerliydi ama kısa sürede çok fazla hesap aynı yerde QR kullandığı için QR bonusu verilmedi. */
  qrLimited: boolean;
}

/** Aynı yerde son QR_ABUSE_WINDOW_MIN dakikada QR kullanan farklı (başka) hesap sayısı sınırı aştı mı. */
export function qrOverused(uid: string, recentOnSpace: readonly OtherReport[], nowMs: number): boolean {
  const windowMs = QR_ABUSE_WINDOW_MIN * 60_000;
  const accounts = new Set(
    recentOnSpace.filter((r) => r.qr && r.uid !== uid && nowMs - r.createdAtMs <= windowMs).map((r) => r.uid),
  );
  return accounts.size >= QR_ABUSE_MAX_ACCOUNTS;
}

/** Bildirim/check-in puanı + doğrulama bonusu. Çelişkili bildirim varsa bonus yok. */
export function awardReport(current: UserPoints, input: ReportAwardInput): ReportAward {
  const { uid, spaceId, type, nowMs, dayKey } = input;
  const cooldownMs = CHECKIN_POINT_COOLDOWN_MIN * 60_000;
  // Bekleme süresi dolan check-in kayıtları budanır (belge büyümesin)
  const checkinAt = Object.fromEntries(Object.entries(current.checkinAt).filter(([, ms]) => nowMs - ms < cooldownMs));
  let user: UserPoints = { ...current, checkinAt };
  const awards: Award[] = [];
  let qrLimited = false;

  if (type === "AVAILABLE") {
    user = { ...user, counts: { ...user.counts, checkins: user.counts.checkins + 1 } };
    const onCooldown = checkinAt[spaceId] !== undefined;
    qrLimited = Boolean(input.qr) && qrOverused(uid, input.recentOnSpace, nowMs);
    const qr = Boolean(input.qr) && !qrLimited;
    const g = grant(user, dayKey, onCooldown ? 0 : qr ? POINTS.QR_CHECKIN : POINTS.CHECKIN);
    user = g.user;
    if (!onCooldown) user = { ...user, checkinAt: { ...user.checkinAt, [spaceId]: nowMs } };
    awards.push({ kind: qr ? "QR_CHECKIN" : "CHECKIN", points: g.points });
  } else {
    user = { ...user, counts: { ...user.counts, reports: user.counts.reports + 1 } };
    const g = grant(user, dayKey, POINTS.REPORT);
    user = g.user;
    awards.push({ kind: "REPORT", points: g.points });
  }

  const mine = direction(type);
  const windowMs = CONFIRM_WINDOW_MIN * 60_000;
  const others = input.recentOnSpace.filter((r) => r.uid !== uid && !r.isSimulated && nowMs - r.createdAtMs <= windowMs);
  const contradicted = others.some((r) => direction(r.type) !== null && direction(r.type) !== mine);
  const confirms =
    mine && !contradicted
      ? (others.filter((r) => direction(r.type) === mine).sort((a, b) => b.createdAtMs - a.createdAtMs)[0] ?? null)
      : null;
  if (confirms) {
    const g = grant(user, dayKey, POINTS.CONFIRM_BONUS);
    user = g.user;
    awards.push({ kind: "CONFIRM_BONUS", points: g.points });
  }
  return { user, awards, confirms, qrLimited };
}

/** Değerlendirme puanı (değerlendirme zaten check-in başına bir kez kabul edilir). */
export function awardRating(current: UserPoints, dayKey: string): { user: UserPoints; award: Award } {
  const counted = { ...current, counts: { ...current.counts, ratings: current.counts.ratings + 1 } };
  const g = grant(counted, dayKey, POINTS.RATING);
  return { user: g.user, award: { kind: "RATING", points: g.points } };
}

/** Diğer kullanıcıya verilen doğrulama bonusu. */
export function awardConfirmBonus(current: UserPoints, dayKey: string): { user: UserPoints; award: Award } {
  const g = grant(current, dayKey, POINTS.CONFIRM_BONUS);
  return { user: g.user, award: { kind: "CONFIRM_BONUS", points: g.points } };
}

export function levelOf(points: number) {
  const index = LEVELS.findLastIndex((l) => points >= l.min);
  const next = LEVELS[index + 1] ?? null;
  return {
    index,
    name: LEVELS[index].name,
    next: next ? { name: next.name, min: next.min, remaining: next.min - points } : null,
  };
}
