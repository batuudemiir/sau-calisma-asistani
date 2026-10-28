import { randomBytes } from "node:crypto";
import { SHOW_SAMPLE_LABELS } from "@/lib/backend-mode";
import { z } from "zod";
import { CLAIM_MESSAGES, claimBlock, couponCode, monthPointsFor, type ClaimBlock, type Reward } from "@/domain/rewards";
import { toLocalTime } from "@/domain/time";
import type { WriteStore } from "./write-store";

export const ClaimBodySchema = z.object({ rewardId: z.string().min(1).max(100) });

export interface RewardDTO extends Reward {
  remaining: number;
  /** Bu ay alındıysa kupon kodu. */
  coupon: string | null;
  /** Şu an alınamıyorsa nedeni. */
  block: ClaimBlock | null;
}

export interface RewardsResponse {
  monthKey: string;
  monthPoints: number;
  student: boolean;
  rewards: RewardDTO[];
}

const monthOf = (nowMs: number) => toLocalTime(nowMs).dateISO.slice(0, 7);
// Demo modu kapalıyken örnek ödüller hiç gösterilmez ve alınamaz
const visible = (r: Reward, demoMode: boolean) => demoMode || !r.isSimulated;

export async function rewardsView(store: WriteStore, uid: string, nowMs: number, demoMode: boolean): Promise<RewardsResponse> {
  const monthKey = monthOf(nowMs);
  const rewards = (await store.rewards()).filter((r) => visible(r, demoMode)).sort((a, b) => a.threshold - b.threshold);
  const s = await store.rewardState(
    uid,
    monthKey,
    rewards.map((r) => r.id),
  );
  const monthPoints = monthPointsFor(s.user, monthKey);
  return {
    monthKey,
    monthPoints,
    student: s.student,
    rewards: rewards.map((r) => {
      const claimedCount = s.claimedCount[r.id] ?? 0;
      const coupon = s.claimed[r.id] ?? null;
      return {
        ...r,
        remaining: Math.max(0, r.stockPerMonth - claimedCount),
        coupon,
        block: claimBlock({ reward: r, student: s.student, monthPoints, alreadyClaimed: coupon !== null, claimedCount }),
      };
    }),
  };
}

export type ClaimResponse = { ok: true; code: string } | { ok: false; error: string; status: 400 | 403 | 404 | 409 };

export async function claimRewardFor(
  store: WriteStore,
  uid: string,
  body: unknown,
  nowMs: number,
  demoMode: boolean,
): Promise<ClaimResponse> {
  const parsed = ClaimBodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Geçersiz istek", status: 400 };
  const monthKey = monthOf(nowMs);
  const res = await store.claimReward(
    uid,
    parsed.data.rewardId,
    monthKey,
    (r) => newCouponCode(r.isSimulated),
    (st) => {
      if (!visible(st.reward, demoMode)) return "OUT_OF_STOCK";
      return claimBlock({
        reward: st.reward,
        student: st.student,
        monthPoints: monthPointsFor(st.user, monthKey),
        alreadyClaimed: st.alreadyClaimed,
        claimedCount: st.claimedCount,
      });
    },
  );
  if (res.ok) return { ok: true, code: res.code };
  if (res.block === "NOT_FOUND") return { ok: false, error: "Ödül bulunamadı", status: 404 };
  return { ok: false, error: CLAIM_MESSAGES[res.block], status: res.block === "NOT_STUDENT" ? 403 : 409 };
}

export const newCouponCode = (isSimulated: boolean) =>
  couponCode(randomBytes(4).toString("hex"), isSimulated ? (SHOW_SAMPLE_LABELS ? "ORNEK" : "KAMPUS") : "SAU");
