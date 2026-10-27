import { describe, expect, it } from "vitest";
import { parseQuery } from "../../src/server/request";
import { DEFAULT_LIBRARY, runSearch, spaceDetail } from "../../src/server/search-service";
import { LIBRARY, TERM, block, hm, nowMsAt, report, space } from "../domain/fixtures";
import { fakeSource, type FakeData } from "./fake-source";

const A201 = space("A201");
const A202 = space("A202");
const A203 = space("A203");

function data(over: Partial<FakeData> = {}): FakeData {
  return {
    term: TERM,
    spaces: [A201, A202, A203],
    buildings: [{ id: "isletme-a", name: "İşletme Fakültesi A Blok", campus: "Esentepe", isSimulated: false }],
    sources: [
      { id: "isletme-2026-guz-v1", termId: TERM.id, department: "İşletme", url: "https://x.invalid/p.xlsx", spaceIds: [A201.id, A202.id], isSimulated: false },
    ],
    blocks: [block(A201, hm(14, 10), hm(16)), block(A202, hm(13, 30), hm(15))],
    reports: [],
    simulation: null,
    ...over,
  };
}

const opts = { nowMs: nowMsAt(13), durationMin: 60, demoMode: false };

describe("runSearch", () => {
  it("T3 durumu: freeUntil 14.00, sonraki ders ve kaynak dönüyor; dersi olan elenir; kaynaksız oda UNKNOWN", async () => {
    const res = await runSearch(fakeSource(data()), opts);
    expect(res.now).toEqual({ dateISO: "2026-10-27", weekday: 2, minute: 780, isDemoClock: false, nowMs: opts.nowMs });
    expect(res.results.map((r) => [r.code, r.status.code, r.freeUntil])).toEqual([
      ["A201", "PROGRAM_FREE", 840],
      ["A203", "UNKNOWN", null],
    ]);
    expect(res.results[0]).toMatchObject({
      buildingName: "İşletme Fakültesi A Blok",
      nextClass: { courseCode: "UTC425", startMinute: hm(14, 10) },
      source: { department: "İşletme", termLabel: "2026-2027 Güz" },
    });
    expect(res.results[1].source).toBeNull();
  });

  it("kütüphane kaydı yoksa varsayılan kart: Doluluk verisi yok", async () => {
    const res = await runSearch(fakeSource(data()), opts);
    expect(res.library).toMatchObject({ spaceId: DEFAULT_LIBRARY.id, status: { code: "UNKNOWN", reason: "NO_SOURCE" }, simulation: null });
  });

  it("simülasyon yalnızca demo modunda okunur", async () => {
    const simulation = { level: "BUSY" as const, updatedAtMs: opts.nowMs, isSimulated: true as const };
    const d = data({ spaces: [A201, LIBRARY], simulation });
    expect((await runSearch(fakeSource(d), opts)).library.simulation).toBeNull();
    expect((await runSearch(fakeSource(d), { ...opts, demoMode: true })).library).toMatchObject({ spaceId: LIBRARY.id, simulation });
  });

  it("bildirim etiketi değiştirir", async () => {
    const res = await runSearch(fakeSource(data({ reports: [report(A201, "AVAILABLE", 2, opts.nowMs)] })), opts);
    expect(res.results[0].status).toMatchObject({ code: "VERIFIED_FREE", minutesAgo: 2 });
  });

  it("demo saati programı kaydırır, bildirimler gerçek saatle değerlendirilir", async () => {
    const realNow = nowMsAt(23); // gerçek saat gece; demo saati 13.00
    const d = data({ reports: [report(A201, "AVAILABLE", 2, realNow)] });
    const res = await runSearch(fakeSource(d), { ...opts, reportNowMs: realNow, isDemoClock: true });
    expect(res.now).toMatchObject({ minute: 780, isDemoClock: true, nowMs: realNow });
    expect(res.results[0]).toMatchObject({ code: "A201", status: { code: "VERIFIED_FREE", minutesAgo: 2 } });
  });

  it("aktif dönem yoksa her oda UNKNOWN(STALE_SOURCE)", async () => {
    const res = await runSearch(fakeSource(data({ term: null })), opts);
    expect(res.results.every((r) => r.status.code === "UNKNOWN" && r.status.reason === "STALE_SOURCE")).toBe(true);
  });
});

describe("spaceDetail", () => {
  it("elenmiş odayı nedeniyle, günün programını ve uid'siz bildirimleri döndürür", async () => {
    const d = data({ reports: [report(A202, "BUSY", 3, opts.nowMs, "gizli-uid")] });
    const res = await spaceDetail(fakeSource(d), A202.id, opts);
    expect(res?.space).toMatchObject({ code: "A202", excludedBecause: "CLASS_CONFLICT", status: { code: "REPORTED_BUSY" } });
    expect(res?.today).toEqual([{ startMinute: hm(13, 30), endMinute: hm(15), courseCode: "UTC425", courseName: "Kültürlerarası Pazarlama", sourceRef: "s.2, satır 14" }]);
    expect(res?.recentReports).toEqual([{ type: "BUSY", minutesAgo: 3 }]);
    expect(JSON.stringify(res)).not.toContain("gizli-uid");
  });

  it("bilinmeyen alan → null; kütüphane varsayılan kartla açılır", async () => {
    expect(await spaceDetail(fakeSource(data()), "yok", opts)).toBeNull();
    expect((await spaceDetail(fakeSource(data()), DEFAULT_LIBRARY.id, opts))?.space.status).toEqual({ code: "UNKNOWN", reason: "NO_SOURCE" });
  });
});

describe("parseQuery", () => {
  const p = (q: string, demo = false) => parseQuery(new URLSearchParams(q), demo, 1000);

  it("süre doğrulanır, varsayılan 60", () => {
    expect(p("")).toEqual({ ok: true, durationMin: 60, nowMs: 1000, reportNowMs: 1000, isDemoClock: false });
    expect(p("d=45").ok).toBe(false);
    expect(p("d=abc").ok).toBe(false);
  });

  it("demo saati yalnızca demo modunda, Istanbul saatiyle", () => {
    expect(p("d=30&at=2026-10-27T13:00").ok).toBe(false);
    expect(p("d=30&at=2026-10-27T13:00", true)).toEqual({ ok: true, durationMin: 30, nowMs: nowMsAt(13), reportNowMs: 1000, isDemoClock: true });
    expect(p("d=30&at=dün", true).ok).toBe(false);
  });
});
