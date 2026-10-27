import { describe, expect, it } from "vitest";
import { parseQuery } from "../../src/server/request";
import { DEFAULT_LIBRARY, mapView, runSearch, spaceDetail } from "../../src/server/search-service";
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
      {
        id: "isletme-2026-guz-v1",
        termId: TERM.id,
        department: "İşletme",
        url: "https://x.invalid/p.xlsx",
        spaceIds: [A201.id, A202.id],
        isSimulated: false,
        parseMethod: "DETERMINISTIC",
        coverage: "FULL",
      },
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
      source: { department: "İşletme", termLabel: "2026-2027 Güz", isManual: false, isPartial: false },
    });
    expect(res.results[1].source).toBeNull();
  });

  it("kütüphane kaydı yoksa varsayılan kart: Doluluk verisi yok", async () => {
    const res = await runSearch(fakeSource(data()), opts);
    expect(res.places[0]).toMatchObject({
      spaceId: DEFAULT_LIBRARY.id,
      status: { code: "UNKNOWN", reason: "NO_SOURCE" },
      simulation: null,
    });
  });

  it("çalışma yerleri: kütüphane ilk sırada, kafeler alfabetik; derslik listesine girmez; bildirim kendi etiketini değiştirir", async () => {
    const cafe = { ...space("Taş Kafe"), id: "tas-kafe", kind: "STUDY_AREA" as const, openingHours: null, osm: "way/389850270" };
    const kantin = { ...space("Kantin"), id: "kantin", kind: "STUDY_AREA" as const };
    const d = data({ spaces: [A201, cafe, kantin, LIBRARY], reports: [report(cafe, "BUSY", 2, opts.nowMs)] });
    const res = await runSearch(fakeSource(d), opts);
    expect(res.places.map((p) => [p.spaceId, p.status.code])).toEqual([
      [LIBRARY.id, "UNKNOWN"],
      ["kantin", "UNKNOWN"],
      ["tas-kafe", "REPORTED_BUSY"],
    ]);
    expect(res.places[2]).toMatchObject({ osm: "way/389850270", simulation: null });
    expect(res.results.map((r) => r.code)).toEqual(["A201"]);
    const detail = await spaceDetail(fakeSource(d), "tas-kafe", opts);
    expect(detail?.place).toEqual({ openingHours: null, osm: "way/389850270" });
    expect(detail?.today).toEqual([]);
  });

  it("simülasyon yalnızca demo modunda okunur", async () => {
    const simulation = { level: "BUSY" as const, updatedAtMs: opts.nowMs, isSimulated: true as const };
    const d = data({ spaces: [A201, LIBRARY], simulation });
    expect((await runSearch(fakeSource(d), opts)).places[0].simulation).toBeNull();
    expect((await runSearch(fakeSource(d), { ...opts, demoMode: true })).places[0]).toMatchObject({
      spaceId: LIBRARY.id,
      simulation,
    });
  });

  it("DAILY desenli simülasyon program saatine göre seviye verir", async () => {
    const d = data({
      spaces: [A201, LIBRARY],
      simulation: { level: "LOW", pattern: "DAILY", updatedAtMs: 0, isSimulated: true },
    });
    const res = await runSearch(fakeSource(d), { ...opts, demoMode: true });
    expect(res.places[0].simulation).toMatchObject({ level: "BUSY", isSimulated: true });
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

  it("puan özeti karta eklenir; simüle puanlar yalnızca demo modunda, gerçek ortalamaya karışmadan", async () => {
    const r = (isSimulated: boolean, n: 1 | 2 | 3 | 4 | 5) => ({
      spaceId: A201.id,
      uid: "u",
      checkinReportId: "c",
      createdAtMs: 0,
      isSimulated,
      scores: { quiet: n, power: n, wifi: n, light: n },
    });
    const d = data({ ratings: [r(false, 4), r(false, 4), r(false, 5), r(true, 1), r(true, 1), r(true, 1)] });
    const off = await runSearch(fakeSource(d), opts);
    expect(off.results[0].rating.real).toMatchObject({ count: 3, overall: 4.3 });
    expect(off.results[0].rating.simulated.count).toBe(0);
    const on = await runSearch(fakeSource(d), { ...opts, demoMode: true });
    expect(on.results[0].rating.simulated).toMatchObject({ count: 3, overall: 1 });
    expect(JSON.stringify(on)).not.toContain('"uid"');
  });

  it("kişisel programdan (kısmi) gelen oda: bilinen dersle elenir, değilse 'Program kısmi'; örnek bildirim etiketlenir", async () => {
    const B1 = space("B101");
    const B2 = space("B102");
    const d = data({
      spaces: [B1, B2],
      sources: [
        {
          id: "ekip",
          termId: TERM.id,
          department: "Ekip",
          url: "",
          spaceIds: [B1.id, B2.id],
          isSimulated: false,
          parseMethod: "MANUAL",
          coverage: "PARTIAL",
        },
      ],
      blocks: [block(B1, hm(13, 30), hm(15), { sourceId: "ekip" }), block(B2, hm(16, 10), hm(18), { sourceId: "ekip" })],
      reports: [{ ...report(B2, "BUSY", 1, opts.nowMs), isSimulated: true }],
    });
    const res = await runSearch(fakeSource(d), { ...opts, demoMode: true });
    expect(res.results.map((r) => [r.code, r.status.code, r.freeUntil])).toEqual([["B102", "REPORTED_BUSY", hm(16)]]);
    expect(res.results[0].status).toMatchObject({ simulated: true });
    expect(res.results[0].source).toMatchObject({ isManual: true, isPartial: true });
    // Demo modu kapalı: örnek bildirim yok sayılır
    const quiet = await runSearch(fakeSource(d), opts);
    expect(quiet.results[0].status).toEqual({ code: "UNKNOWN", reason: "PARTIAL_SOURCE" });
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
    expect(res?.today).toEqual([
      {
        startMinute: hm(13, 30),
        endMinute: hm(15),
        courseCode: "UTC425",
        courseName: "Kültürlerarası Pazarlama",
        sourceRef: "s.2, satır 14",
      },
    ]);
    expect(res?.recentReports).toEqual([{ type: "BUSY", minutesAgo: 3 }]);
    expect(JSON.stringify(res)).not.toContain("gizli-uid");
  });

  it("bilinmeyen alan → null; kütüphane varsayılan kartla açılır", async () => {
    expect(await spaceDetail(fakeSource(data()), "yok", opts)).toBeNull();
    expect((await spaceDetail(fakeSource(data()), DEFAULT_LIBRARY.id, opts))?.space.status).toEqual({
      code: "UNKNOWN",
      reason: "NO_SOURCE",
    });
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
    expect(p("d=30&at=2026-10-27T13:00", true)).toEqual({
      ok: true,
      durationMin: 30,
      nowMs: nowMsAt(13),
      reportNowMs: 1000,
      isDemoClock: true,
    });
    expect(p("d=30&at=dün", true).ok).toBe(false);
  });
});

describe("mapView", () => {
  it("elenenler dahil her oda bina altında, kod sırasıyla; kütüphane ayrı", async () => {
    const res = await mapView(fakeSource(data({ spaces: [A203, A202, A201, LIBRARY] })), opts);
    expect(res.buildings).toHaveLength(1);
    expect(res.buildings[0]).toMatchObject({ id: "isletme-a", name: "İşletme Fakültesi A Blok" });
    expect(res.buildings[0].spaces.map((s) => [s.code, s.status.code, s.excludedBecause])).toEqual([
      ["A201", "PROGRAM_FREE", null],
      ["A202", "PROGRAM_FREE", "CLASS_CONFLICT"],
      ["A203", "UNKNOWN", null],
    ]);
    expect(res.places[0].spaceId).toBe(LIBRARY.id);
  });

  it("sıralı sonuçlar /api/search ile aynı (alt panel)", async () => {
    const src = fakeSource(data({ spaces: [A203, A202, A201, LIBRARY] }));
    const [map, search] = await Promise.all([mapView(src, opts), runSearch(src, opts)]);
    expect(map.results).toEqual(search.results);
    expect(map.results.map((r) => r.code)).toContain("A201");
  });
});
