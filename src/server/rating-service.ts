import { z } from "zod";
import { RATING_WINDOW_MIN } from "@/domain/config";
import { CAN_RATE_MESSAGES, CRITERIA, canRate, type Criterion, type Scores } from "@/domain/ratings";
import { checkRatingRate } from "./rate-limit";
import { DEFAULT_LIBRARY } from "./search-service";
import type { RatingDecision, WriteStore } from "./write-store";

const ScoreSchema = z.number().int().min(1).max(5);

export const RatingBodySchema = z.object({
  spaceId: z.string().min(1).max(200),
  scores: z.strictObject(Object.fromEntries(CRITERIA.map((c) => [c, ScoreSchema])) as Record<Criterion, typeof ScoreSchema>),
});

export type RatingResult = (RatingDecision & { id?: string }) | { ok: false; error: string; status: 400 | 404 };

export async function submitRating(store: WriteStore, uid: string, body: unknown, nowMs: number): Promise<RatingResult> {
  const parsed = RatingBodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Her kriter için 1-5 arası puan ver", status: 400 };
  const { spaceId, scores } = parsed.data;
  if (spaceId !== DEFAULT_LIBRARY.id && !(await store.spaceExists(spaceId))) {
    return { ok: false, error: "Alan bulunamadı", status: 404 };
  }

  // Pencere: check-in'ler için RATING_WINDOW_MIN; süresi dolmuş check-in'i "EXPIRED" diye ayırt etmek için iki katı okunur.
  const sinceMs = nowMs - 2 * RATING_WINDOW_MIN * 60_000;
  // Zod 1-5 tam sayı olduğunu doğruladı; Scores'a daraltmak güvenli
  const rating = { spaceId, uid, scores: scores as Scores, createdAtMs: nowMs };
  return store.addRating(rating, sinceMs, ({ checkins, ratings }) => {
    const rate = checkRatingRate(ratings, nowMs);
    if (!rate.ok) return rate;
    const decision = canRate({ uid, spaceId, nowMs, checkins, ratings });
    return decision.ok ? decision : { ok: false, error: CAN_RATE_MESSAGES[decision.reason] };
  });
}
