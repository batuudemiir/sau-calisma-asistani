import { describe, expect, it } from "vitest";
import { DEMO_REPORTS, createMemoryBackend } from "../../src/server/memory-backend";
import { qrToken } from "../../src/server/qr";
import { submitRating } from "../../src/server/rating-service";
import { submitReport } from "../../src/server/report-service";
import { claimRewardFor, rewardsView } from "../../src/server/reward-service";
import { mapView, runSearch } from "../../src/server/search-service";

const NOW = Date.UTC(2026, 9, 27, 10, 0); // Salı 13.00 İstanbul
const opts = { nowMs: NOW, durationMin: 60, demoMode: true };
const ROOM = "demo-blok-Ö-102";
const scores = { quiet: 4, power: 4, wifi: 4, light: 4 };

describe("bellek arka ucu (Firebase'siz prototip)", () => {
  it("örnek veri hazır: kampüs çalışma yerleri, örnek blok ve sıralı sonuçlar", async () => {
    const { source } = createMemoryBackend(NOW);
    const res = await runSearch(source, opts);
    expect(res.places[0].spaceId).toBe("kutuphane-merkez");
    expect(res.places.length).toBeGreaterThan(1);
    expect(res.results.some((r) => r.code === "Ö-102")).toBe(true);
    const map = await mapView(source, opts);
    expect(map.buildings.some((b) => b.id === "demo-blok")).toBe(true);
  });

  it("check-in kaydedilir, durumda görünür, puan verir; hız sınırı çalışır", async () => {
    const { source, store } = createMemoryBackend(NOW);
    expect(await submitReport(store, "a", { spaceId: ROOM, type: "AVAILABLE" }, NOW)).toMatchObject({ ok: true, points: 5 });
    const res = await runSearch(source, opts);
    expect(res.results.find((r) => r.spaceId === ROOM)?.status.code).toBe("VERIFIED_FREE");
    expect(await submitReport(store, "a", { spaceId: ROOM, type: "BUSY" }, NOW + 60_000)).toMatchObject({ ok: false });
    expect(await submitReport(store, "a", { spaceId: "yok", type: "BUSY" }, NOW)).toMatchObject({ status: 404 });
  });

  it("QR +10, ardından değerlendirme +5; profil ve geçmiş", async () => {
    const { store } = createMemoryBackend(NOW);
    const qr = qrToken(ROOM, "k");
    expect(await submitReport(store, "b", { spaceId: ROOM, type: "AVAILABLE", qr }, NOW, "k")).toMatchObject({ points: 10 });
    expect(await submitRating(store, "b", { spaceId: ROOM, scores }, NOW + 60_000)).toMatchObject({ ok: true, points: 5 });
    const p = await store.profile("b", 20);
    expect(p.user.points).toBe(15);
    expect(p.events.map((e) => e.kind)).toEqual(["RATING", "QR_CHECKIN"]);
  });

  it("ödül: puan yeter ama öğrenci değilse alınamaz; öğrenci işaretlenince örnek kupon", async () => {
    const { store } = createMemoryBackend(NOW);
    await submitReport(store, "c", { spaceId: ROOM, type: "AVAILABLE" }, NOW);
    await submitReport(store, "c", { spaceId: "demo-blok-Ö-103", type: "AVAILABLE" }, NOW + 11 * 60_000);
    const view = await rewardsView(store, "c", NOW + 12 * 60_000, true);
    expect(view.rewards.find((r) => r.id === "ornek-cay")?.block).toBe("NOT_STUDENT");
    await store.markStudent("c");
    const res = await claimRewardFor(store, "c", { rewardId: "ornek-cay" }, NOW + 12 * 60_000, true);
    expect(res).toMatchObject({ ok: true, code: expect.stringMatching(/^ORNEK-/) });
    expect(await claimRewardFor(store, "c", { rewardId: "ornek-cay" }, NOW + 13 * 60_000, true)).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("hesap silme: puan ve geçmiş gider, bildirim topluluk verisi olarak kalır", async () => {
    const { source, store } = createMemoryBackend(NOW);
    await submitReport(store, "d", { spaceId: ROOM, type: "AVAILABLE" }, NOW);
    await store.deleteAccountData("d");
    expect((await store.profile("d", 20)).user.points).toBe(0);
    const reports = (await source.reportsSince(NOW - 1)).filter((r) => !r.isSimulated);
    expect(reports).toHaveLength(1);
    expect(reports[0].uid).toBe("silinmis");
  });

  it("örnek bildirimler her an son 30 dakikadadır, etiketlidir ve puan bonusu vermez", async () => {
    const { source, store } = createMemoryBackend(NOW);
    const now = Date.now();
    const demo = await source.reportsSince(now - 30 * 60_000);
    expect(demo.length).toBeGreaterThanOrEqual(DEMO_REPORTS.length);
    expect(demo.every((r) => r.isSimulated && r.uid === "ornek-veri")).toBe(true);
    expect(new Set(demo.map((r) => r.type))).toEqual(new Set(["AVAILABLE", "BUSY"]));
    // Örnek bildirimi "doğrulayan" gerçek check-in yalnızca kendi puanını alır
    const res = await submitReport(store, "e", { spaceId: "lumo-coffee", type: "AVAILABLE" }, now);
    expect(res).toMatchObject({ ok: true, points: 5 });
    expect((await store.profile("ornek-veri", 20)).user.points).toBe(0);
  });
});
