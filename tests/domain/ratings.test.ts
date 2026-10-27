import { describe, expect, it } from "vitest";
import { rankResults } from "../../src/domain/ranking";
import { aggregateRatings, canRate, summarizeSpaceRatings, type Checkin, type Rating, type Scores } from "../../src/domain/ratings";
import type { SpaceResult } from "../../src/domain/types";
import { hm, space } from "./fixtures";

const NOW = 100_000_000;
const checkin = (id: string, minutesAgo: number, uid = "u1", spaceId = "A204"): Checkin => ({ id, spaceId, uid, createdAtMs: NOW - minutesAgo * 60_000 });
const scores = (n: 1 | 2 | 3 | 4 | 5, over: Partial<Scores> = {}): Scores => ({ quiet: n, power: n, wifi: n, light: n, ...over });
const rating = (s: Scores, isSimulated = false): Rating => ({ spaceId: "A204", uid: "u", checkinReportId: "c", scores: s, createdAtMs: NOW, isSimulated });

const can = (checkins: Checkin[], ratings: { uid: string; checkinReportId: string }[] = []) =>
  canRate({ uid: "u1", spaceId: "A204", nowMs: NOW, checkins, ratings });

describe("değerlendirme kuralları", () => {
  it("T19: check-in yokken değerlendirme reddedilir (başka odadaki/başkasının check-in'i sayılmaz)", () => {
    expect(can([])).toEqual({ ok: false, reason: "NO_CHECKIN" });
    expect(can([checkin("x", 5, "u2"), checkin("y", 5, "u1", "A205")])).toEqual({ ok: false, reason: "NO_CHECKIN" });
  });

  it("T20: check-in 190 dk önce → süre doldu; 180 dk sınırı dahil", () => {
    expect(can([checkin("c1", 190)])).toEqual({ ok: false, reason: "EXPIRED" });
    expect(can([checkin("c1", 180)])).toEqual({ ok: true, checkinId: "c1" });
  });

  it("T21: aynı check-in'e ikinci değerlendirme reddedilir; yeni check-in ile yeniden puanlanabilir", () => {
    expect(can([checkin("c1", 30)], [{ uid: "u1", checkinReportId: "c1" }])).toEqual({ ok: false, reason: "ALREADY_RATED" });
    expect(can([checkin("c1", 30), checkin("c2", 5)], [{ uid: "u1", checkinReportId: "c1" }])).toEqual({ ok: true, checkinId: "c2" });
  });

  it("en yeni puanlanmamış check-in seçilir", () => {
    expect(can([checkin("eski", 60), checkin("yeni", 10)])).toEqual({ ok: true, checkinId: "yeni" });
  });

  it("T22: 2 değerlendirme → yetersiz; 3 değerlendirme → kriter ortalamaları", () => {
    expect(aggregateRatings([rating(scores(4)), rating(scores(5))])).toEqual({ count: 2, averages: null, overall: null });
    expect(aggregateRatings([rating(scores(4)), rating(scores(5)), rating(scores(2, { wifi: 5 }))])).toEqual({
      count: 3,
      averages: { quiet: 3.7, power: 3.7, wifi: 4.7, light: 3.7 },
      overall: 3.9,
    });
  });

  it("simüle puanlar gerçek ortalamaya karışmaz", () => {
    const s = summarizeSpaceRatings([rating(scores(5), true), rating(scores(5), true), rating(scores(5), true), rating(scores(1))]);
    expect(s.real).toEqual({ count: 1, averages: null, overall: null });
    expect(s.simulated.overall).toBe(5);
  });

  it("T23: puanlar sıralamayı değiştirmez — sıralama yalnızca etiket, freeUntil ve koda bakar", () => {
    // Yüksek puanlı PROGRAM_FREE oda, puansız VERIFIED_FREE odayı geçemez: rankResults puan girdisi almaz.
    const verified: SpaceResult = { space: space("B1"), status: { code: "VERIFIED_FREE", minutesAgo: 1, reportCount: 1 }, freeUntil: hm(14), nextClass: null };
    const highRated: SpaceResult = { space: space("A1"), status: { code: "PROGRAM_FREE" }, freeUntil: hm(20), nextClass: null };
    expect(rankResults([highRated, verified]).map((r) => r.space.code)).toEqual(["B1", "A1"]);
    expect(rankResults.length).toBe(1);
  });
});
