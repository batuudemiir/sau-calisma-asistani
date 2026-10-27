import { describe, expect, it } from "vitest";
import type { Checkin, Rating } from "../../src/domain/ratings";
import { submitRating } from "../../src/server/rating-service";
import type { WriteStore } from "../../src/server/write-store";

const NOW = 100_000_000;
const MIN = 60_000;
type StoredRating = Pick<Rating, "uid" | "checkinReportId" | "spaceId" | "createdAtMs">;

function memoryStore(checkins: Checkin[]) {
  const ratings: StoredRating[] = [];
  const store: WriteStore = {
    spaceExists: async (id) => id === "A204",
    addReport: async () => {
      throw new Error("kullanılmıyor");
    },
    addRating: async (r, since, decide) => {
      const d = decide({
        checkins: checkins.filter((c) => c.uid === r.uid && c.createdAtMs >= since),
        ratings: ratings.filter((x) => x.uid === r.uid && x.createdAtMs >= since),
      });
      if (!d.ok) return d;
      ratings.push({ uid: r.uid, spaceId: r.spaceId, checkinReportId: d.checkinId, createdAtMs: r.createdAtMs });
      return { ...d, id: String(ratings.length) };
    },
  };
  return { store, ratings };
}

const body = { spaceId: "A204", scores: { quiet: 4, power: 2, wifi: 5, light: 3 } };

describe("submitRating", () => {
  it("check-in sonrası değerlendirme kaydedilir ve check-in'e bağlanır", async () => {
    const { store, ratings } = memoryStore([{ id: "c1", spaceId: "A204", uid: "u1", createdAtMs: NOW - 20 * MIN }]);
    expect(await submitRating(store, "u1", body, NOW)).toEqual({ ok: true, checkinId: "c1", id: "1" });
    expect(ratings[0].checkinReportId).toBe("c1");
  });

  it("T19/T20/T21 servis üzerinden: check-in yok, süresi dolmuş, aynı check-in ikinci kez", async () => {
    expect(await submitRating(memoryStore([]).store, "u1", body, NOW)).toMatchObject({ ok: false, error: expect.stringContaining("önce bu alanda check-in") });
    const expired = memoryStore([{ id: "c1", spaceId: "A204", uid: "u1", createdAtMs: NOW - 190 * MIN }]);
    expect(await submitRating(expired.store, "u1", body, NOW)).toMatchObject({ ok: false, error: expect.stringContaining("3 saatten fazla") });
    const once = memoryStore([{ id: "c1", spaceId: "A204", uid: "u1", createdAtMs: NOW - 5 * MIN }]);
    await submitRating(once.store, "u1", body, NOW);
    expect(await submitRating(once.store, "u1", body, NOW + MIN)).toMatchObject({ ok: false, error: expect.stringContaining("zaten") });
  });

  it("eksik/aralık dışı/fazla kriter 400, bilinmeyen alan 404", async () => {
    const { store } = memoryStore([]);
    expect(await submitRating(store, "u1", { ...body, scores: { quiet: 4, power: 2, wifi: 5 } }, NOW)).toMatchObject({ status: 400 });
    expect(await submitRating(store, "u1", { ...body, scores: { ...body.scores, light: 6 } }, NOW)).toMatchObject({ status: 400 });
    expect(await submitRating(store, "u1", { ...body, scores: { ...body.scores, yorum: 1 } }, NOW)).toMatchObject({ status: 400 });
    expect(await submitRating(store, "u1", { ...body, spaceId: "Z9" }, NOW)).toMatchObject({ status: 404 });
  });
});
