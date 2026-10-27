import { describe, expect, it } from "vitest";
import { emptyUser, type UserPoints } from "../../src/domain/points";
import { qrToken } from "../../src/server/qr";
import { submitReport } from "../../src/server/report-service";
import type { NewReport, WriteStore } from "../../src/server/write-store";

function memoryStore(spaces: string[]) {
  const reports: NewReport[] = [];
  const users = new Map<string, UserPoints>();
  const store: WriteStore = {
    spaceExists: async (id) => spaces.includes(id),
    addReport: async (r, since, decide, award) => {
      const recent = reports.filter((x) => x.uid === r.uid && x.createdAtMs >= since);
      const d = decide(recent);
      if (!d.ok) return d;
      const onSpace = reports
        .map((x, i) => ({ ...x, id: String(i + 1), isSimulated: false, qr: x.qr }))
        .filter((x) => x.spaceId === r.spaceId);
      reports.push(r);
      const a = award?.(users.get(r.uid) ?? emptyUser(), onSpace);
      if (a) users.set(r.uid, a.user);
      return { ok: true, id: String(reports.length), points: a?.awards.reduce((n, x) => n + x.points, 0) };
    },
    profile: async () => {
      throw new Error("kullanılmıyor");
    },
    markStudent: async () => {},
    deleteAccountData: async () => {},
    rewards: async () => [],
    rewardState: async () => {
      throw new Error("kullanılmıyor");
    },
    claimReward: async () => {
      throw new Error("kullanılmıyor");
    },
    addRating: async () => {
      throw new Error("kullanılmıyor");
    },
  };
  return { store, reports };
}

const NOW = 50_000_000;

describe("submitReport", () => {
  it("geçerli bildirimi kaydeder", async () => {
    const { store, reports } = memoryStore(["A204"]);
    expect(await submitReport(store, "u1", { spaceId: "A204", type: "AVAILABLE" }, NOW)).toEqual({
      ok: true,
      id: "1",
      points: 5,
    });
    expect(reports).toEqual([{ spaceId: "A204", type: "AVAILABLE", uid: "u1", createdAtMs: NOW, qr: false }]);
  });

  it("T18: aynı uid aynı odaya 4 dk sonra ikinci bildirim → reddedilir; başka uid kabul", async () => {
    const { store } = memoryStore(["A204"]);
    await submitReport(store, "u1", { spaceId: "A204", type: "AVAILABLE" }, NOW);
    expect(await submitReport(store, "u1", { spaceId: "A204", type: "BUSY" }, NOW + 4 * 60_000)).toMatchObject({
      ok: false,
      retryAfterSec: 360,
    });
    expect(await submitReport(store, "u2", { spaceId: "A204", type: "BUSY" }, NOW + 4 * 60_000)).toMatchObject({ ok: true });
  });

  it("geçersiz gövde 400, bilinmeyen alan 404, kütüphane kaydı olmasa da kabul", async () => {
    const { store } = memoryStore([]);
    expect(await submitReport(store, "u1", { spaceId: "A204", type: "BOS" }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(await submitReport(store, "u1", null, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(await submitReport(store, "u1", { spaceId: "A204", type: "BUSY" }, NOW)).toMatchObject({ ok: false, status: 404 });
    expect(await submitReport(store, "u1", { spaceId: "kutuphane-merkez", type: "BUSY" }, NOW)).toMatchObject({ ok: true });
  });

  it("puan bildirimle birlikte: check-in +5; başka kullanıcının aynı yöndeki bildirimi +3 ve doğrulama bonusu +2", async () => {
    const { store } = memoryStore(["A204"]);
    expect(await submitReport(store, "u1", { spaceId: "A204", type: "AVAILABLE" }, NOW)).toMatchObject({ points: 5 });
    expect(await submitReport(store, "u2", { spaceId: "A204", type: "AVAILABLE" }, NOW + 60_000)).toMatchObject({ points: 7 });
    expect(await submitReport(store, "u3", { spaceId: "A204", type: "OUTDATED" }, NOW + 120_000)).toMatchObject({ points: 3 });
  });

  it("QR: geçerli kod +10 ve kaydedilir; başka alanın kodu 400; anahtar yoksa 503; QR yalnızca check-in", async () => {
    const { store, reports } = memoryStore(["A204", "A205"]);
    const token = qrToken("A204", "k");
    expect(await submitReport(store, "u1", { spaceId: "A204", type: "AVAILABLE", qr: token }, NOW, "k")).toMatchObject({
      ok: true,
      points: 10,
    });
    expect(reports[0].qr).toBe(true);
    expect(await submitReport(store, "u2", { spaceId: "A205", type: "AVAILABLE", qr: token }, NOW, "k")).toMatchObject({
      status: 400,
    });
    expect(await submitReport(store, "u3", { spaceId: "A204", type: "AVAILABLE", qr: token }, NOW, null)).toMatchObject({
      status: 503,
    });
    expect(await submitReport(store, "u4", { spaceId: "A204", type: "BUSY", qr: token }, NOW, "k")).toMatchObject({
      status: 400,
    });
  });
});
