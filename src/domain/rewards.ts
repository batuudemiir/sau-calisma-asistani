import type { UserPoints } from "./points";

/**
 * Aylık ödüller: çekiliş DEĞİL (çekiliş Milli Piyango İdaresi izni gerektirir). Ay içinde eşiğe ulaşan doğrulanmış
 * SAÜ öğrencisi, stok bitene kadar her ödülden ayda bir kez alabilir. Sponsor yokken ödüller örnek demo verisidir
 * ve geçerli kupon üretilmez.
 */
export interface Reward {
  id: string;
  title: string;
  /** Ödülü sağlayan (sponsor); örnekte "Örnek sponsor". */
  partner: string;
  description: string;
  /** Ay içinde kazanılması gereken puan. */
  threshold: number;
  stockPerMonth: number;
  isSimulated: boolean;
}

export type ClaimBlock = "NOT_STUDENT" | "NOT_ENOUGH_POINTS" | "ALREADY_CLAIMED" | "OUT_OF_STOCK";

export const CLAIM_MESSAGES: Record<ClaimBlock, string> = {
  NOT_STUDENT: "Ödül almak için SAÜ öğrenci hesabınla giriş yapmalısın",
  NOT_ENOUGH_POINTS: "Bu ay yeterli puanın yok",
  ALREADY_CLAIMED: "Bu ödülü bu ay zaten aldın",
  OUT_OF_STOCK: "Bu ayın stoğu bitti",
};

/** Ödül eşiği için geçerli aylık puan: kullanıcının kaydı başka aya aitse bu ay 0. */
export const monthPointsFor = (user: Pick<UserPoints, "monthKey" | "monthPoints">, monthKey: string) =>
  user.monthKey === monthKey ? user.monthPoints : 0;

export interface ClaimInput {
  reward: Reward;
  student: boolean;
  monthPoints: number;
  alreadyClaimed: boolean;
  /** Bu ay bu ödülden verilen kupon sayısı. */
  claimedCount: number;
}

/** Engel yoksa null. Sıra önemlidir: kullanıcıya en anlamlı neden gösterilir. */
export function claimBlock(i: ClaimInput): ClaimBlock | null {
  if (i.alreadyClaimed) return "ALREADY_CLAIMED";
  if (i.claimedCount >= i.reward.stockPerMonth) return "OUT_OF_STOCK";
  if (i.monthPoints < i.reward.threshold) return "NOT_ENOUGH_POINTS";
  if (!i.student) return "NOT_STUDENT";
  return null;
}

/** Kupon kodu: "<önek>-XXXX-XXXX". Örnek ödülün kuponu ("ORNEK-", sunum prototipinde "KAMPUS-") hiçbir yerde geçmez. */
export function couponCode(randomHex: string, prefix: "SAU" | "ORNEK" | "KAMPUS"): string {
  const body = randomHex
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "")
    .slice(0, 8)
    .padEnd(8, "0");
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
}
