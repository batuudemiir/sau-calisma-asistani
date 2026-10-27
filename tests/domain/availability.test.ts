import { describe, expect, it } from "vitest";
import { checkProgram, type ProgramCheckInput } from "../../src/domain/availability";
import type { ScheduleBlock, Space } from "../../src/domain/types";
import { TERM, at, block, hm, space } from "./fixtures";

const A204 = space("A204");
const published = new Set([A204.id]);

function check(
  now: ReturnType<typeof at>,
  durationMin: number,
  blocks: ScheduleBlock[] = [],
  over: Partial<ProgramCheckInput> & { space?: Space } = {},
) {
  return checkProgram({ now, durationMin, term: TERM, space: A204, blocks, publishedSpaceIds: published, ...over });
}

describe("program kontrolü (T1-T10)", () => {
  it("T1: 13.00, 60 dk, ders yok → boş, freeUntil kapanış", () => {
    expect(check(at(13), 60)).toEqual({ kind: "FREE", freeUntil: 1320, nextClass: null });
  });

  it("T2: ders 13.30'da başlıyor → listeden çıkar", () => {
    expect(check(at(13), 60, [block(A204, hm(13, 30), hm(15))])).toEqual({ kind: "EXCLUDED", why: "CLASS_CONFLICT" });
  });

  it("T3: ders 14.10'da başlıyor → uygun, freeUntil 14.00", () => {
    const r = check(at(13), 60, [block(A204, hm(14, 10), hm(16))]);
    expect(r.kind).toBe("FREE");
    if (r.kind !== "FREE") return;
    expect(r.freeUntil).toBe(840);
    expect(r.nextClass).toMatchObject({ courseCode: "UTC425", startMinute: hm(14, 10), sourceRef: "s.2, satır 14" });
  });

  it("T4: ders 14.05'te başlıyor → listeden çıkar (pay 13.55'e taşar)", () => {
    expect(check(at(13), 60, [block(A204, hm(14, 5), hm(16))]).kind).toBe("EXCLUDED");
  });

  it("T5: 13.05, 30 dk, ders 11.00-13.00 → listeden çıkar", () => {
    expect(check(at(13, 5), 30, [block(A204, hm(11), hm(13))]).kind).toBe("EXCLUDED");
  });

  it("T6: 13.10, 30 dk, ders 11.00-13.00 → uygun (yarı açık sınır)", () => {
    expect(check(at(13, 10), 30, [block(A204, hm(11), hm(13))])).toEqual({ kind: "FREE", freeUntil: 1320, nextClass: null });
  });

  it("T7: 21.30, 60 dk → listeden çıkar (kapanış)", () => {
    expect(check(at(21, 30), 60)).toEqual({ kind: "EXCLUDED", why: "BUILDING_CLOSED" });
  });

  it("T7b: 21.30, veri eksik oda → yine listeden çıkar (bina saati önce)", () => {
    const s = space("A204", { dataQuality: "INCOMPLETE" });
    expect(check(at(21, 30), 60, [], { space: s })).toEqual({ kind: "EXCLUDED", why: "BUILDING_CLOSED" });
  });

  it("T8: oda yayımlanmış kaynakta yok → UNKNOWN(NO_SOURCE)", () => {
    expect(check(at(13), 60, [], { publishedSpaceIds: new Set() })).toEqual({ kind: "UNKNOWN", reason: "NO_SOURCE" });
  });

  it("T9: dönem bitmiş → UNKNOWN(STALE_SOURCE)", () => {
    expect(check(at(13, 0, "2027-01-16"), 60)).toEqual({ kind: "UNKNOWN", reason: "STALE_SOURCE" });
  });

  it("T10: dataQuality INCOMPLETE → UNKNOWN(DATA_INCOMPLETE)", () => {
    const s = space("A204", { dataQuality: "INCOMPLETE" });
    expect(check(at(13), 60, [], { space: s })).toEqual({ kind: "UNKNOWN", reason: "DATA_INCOMPLETE" });
  });
});

describe("program kontrolü — ek kenar durumlar", () => {
  it("dönemin son günü geçerlidir, aktif olmayan dönem geçersizdir, dönem yoksa geçersizdir", () => {
    expect(check(at(13, 0, "2027-01-15"), 60).kind).toBe("FREE");
    expect(check(at(13, 0, "2026-09-20"), 60)).toEqual({ kind: "UNKNOWN", reason: "STALE_SOURCE" });
    expect(check(at(13), 60, [], { term: { ...TERM, isActive: false } })).toEqual({ kind: "UNKNOWN", reason: "STALE_SOURCE" });
    expect(check(at(13), 60, [], { term: null })).toEqual({ kind: "UNKNOWN", reason: "STALE_SOURCE" });
  });

  it("başka oda, başka gün, başka dönem ve SUPERSEDED bloklar dikkate alınmaz", () => {
    const B101 = space("B101");
    const blocks = [
      block(B101, hm(13), hm(14)),
      block(A204, hm(13), hm(14), { weekday: 3 }),
      block(A204, hm(13), hm(14), { termId: "2026-bahar" }),
      block(A204, hm(13), hm(14), { sourceStatus: "SUPERSEDED" }),
    ];
    expect(check(at(13), 60, blocks).kind).toBe("FREE");
  });

  it("sonraki ders birden fazlaysa en erken olanı alınır", () => {
    const r = check(at(9), 60, [block(A204, hm(16), hm(17), { courseCode: "LATE" }), block(A204, hm(12), hm(13), { courseCode: "EARLY" })]);
    expect(r).toMatchObject({ kind: "FREE", freeUntil: hm(11, 50), nextClass: { courseCode: "EARLY" } });
  });

  it("açılıştan önce listeden çıkar, geçersiz süre hata verir", () => {
    expect(check(at(7, 50), 30)).toEqual({ kind: "EXCLUDED", why: "BUILDING_CLOSED" });
    expect(() => check(at(13), 45)).toThrow(RangeError);
  });
});

describe("kısmi kaynak (ekibin kişisel programları)", () => {
  const partial = { publishedSpaceIds: new Set<string>(), partialSpaceIds: new Set([A204.id]) };

  it("T24: bilinen ders yoksa PARTIAL; freeUntil bilinen bir sonraki derse göre", () => {
    expect(check(at(13), 60, [block(A204, hm(15, 10), hm(17))], partial)).toMatchObject({ kind: "PARTIAL", freeUntil: hm(15) });
  });

  it("T25: bilinen dersle çakışan oda yine listeden çıkar", () => {
    expect(check(at(13), 60, [block(A204, hm(13, 30), hm(15))], partial)).toEqual({ kind: "EXCLUDED", why: "CLASS_CONFLICT" });
  });

  it("aynı oda tam kaynakta da varsa FREE (tam kaynak önceliklidir)", () => {
    expect(check(at(13), 60, [], { ...partial, publishedSpaceIds: new Set([A204.id]) }).kind).toBe("FREE");
  });
});
