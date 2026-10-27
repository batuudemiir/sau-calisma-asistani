import { describe, expect, it } from "vitest";
import { CLASSROOM_BASE, LIBRARY_BASE, PARTIAL_BASE, evaluateTrust } from "../../src/domain/trust";
import type { SpaceReport } from "../../src/domain/types";
import { LIBRARY, nowMsAt, report, space } from "./fixtures";

const A204 = space("A204");
const NOW = nowMsAt(13);
const classroom = (reports: SpaceReport[]) => evaluateTrust({ base: CLASSROOM_BASE, reports, nowMs: NOW });

describe("güven değerlendirmesi (T11-T16)", () => {
  it("T11: 5 dk önce AVAILABLE → VERIFIED_FREE", () => {
    expect(classroom([report(A204, "AVAILABLE", 5, NOW)])).toEqual({ code: "VERIFIED_FREE", minutesAgo: 5, reportCount: 1 });
  });

  it("T12: 40 dk önce AVAILABLE → PROGRAM_FREE (süre doldu)", () => {
    expect(classroom([report(A204, "AVAILABLE", 40, NOW)])).toEqual({ code: "PROGRAM_FREE" });
  });

  it("T13: 8 dk önce AVAILABLE, 3 dk önce BUSY, farklı uid → çelişki", () => {
    expect(classroom([report(A204, "AVAILABLE", 8, NOW, "u1"), report(A204, "BUSY", 3, NOW, "u2")])).toEqual({
      code: "UNKNOWN",
      reason: "CONFLICTING_REPORTS",
    });
  });

  it("T14: 25 dk önce AVAILABLE, 5 dk önce BUSY → REPORTED_BUSY", () => {
    expect(classroom([report(A204, "AVAILABLE", 25, NOW, "u1"), report(A204, "BUSY", 5, NOW, "u2")])).toEqual({
      code: "REPORTED_BUSY",
      minutesAgo: 5,
      reportType: "BUSY",
    });
  });

  it("T15: yalnızca 25 dk önce BUSY → PROGRAM_FREE", () => {
    expect(classroom([report(A204, "BUSY", 25, NOW)])).toEqual({ code: "PROGRAM_FREE" });
  });

  it("T16: en yeni bildirim OUTDATED → UNKNOWN(REPORTED_OUTDATED)", () => {
    expect(classroom([report(A204, "AVAILABLE", 10, NOW), report(A204, "OUTDATED", 2, NOW)])).toEqual({
      code: "UNKNOWN",
      reason: "REPORTED_OUTDATED",
    });
  });
});

describe("güven değerlendirmesi — ek durumlar", () => {
  it("aynı uid önce uygun sonra dolu derse çelişki değil, dolu", () => {
    expect(classroom([report(A204, "AVAILABLE", 8, NOW, "u1"), report(A204, "UNUSABLE", 3, NOW, "u1")])).toMatchObject({
      code: "REPORTED_BUSY",
      reportType: "UNUSABLE",
    });
  });

  it("dolu bildiriminden sonra 10 dk içinde farklı kişi uygun derse çelişki", () => {
    expect(classroom([report(A204, "BUSY", 9, NOW, "u1"), report(A204, "AVAILABLE", 1, NOW, "u2")])).toEqual({
      code: "UNKNOWN",
      reason: "CONFLICTING_REPORTS",
    });
  });

  it("dolu bildiriminden 10 dk'dan uzun süre sonra uygun → VERIFIED_FREE", () => {
    expect(classroom([report(A204, "BUSY", 18, NOW, "u1"), report(A204, "AVAILABLE", 2, NOW, "u2")])).toMatchObject({
      code: "VERIFIED_FREE",
    });
  });

  it("birden çok uygun bildirimi sayılır, en yenisinin yaşı döner", () => {
    expect(classroom([report(A204, "AVAILABLE", 12, NOW, "u1"), report(A204, "AVAILABLE", 4, NOW, "u2")])).toEqual({
      code: "VERIFIED_FREE",
      minutesAgo: 4,
      reportCount: 2,
    });
  });

  it("gelecek zamanlı bildirim yok sayılır", () => {
    expect(classroom([report(A204, "BUSY", -5, NOW)])).toEqual({ code: "PROGRAM_FREE" });
  });
});

describe("kütüphane (T-L1, T-L2)", () => {
  const library = (reports: SpaceReport[]) => evaluateTrust({ base: LIBRARY_BASE, reports, nowMs: NOW });

  it("T-L1: bildirim yok → UNKNOWN(NO_SOURCE)", () => {
    expect(library([])).toEqual({ code: "UNKNOWN", reason: "NO_SOURCE" });
  });

  it("T-L2: yalnızca 25 dk önce BUSY → UNKNOWN(NO_SOURCE), asla PROGRAM_FREE değil", () => {
    expect(library([report(LIBRARY, "BUSY", 25, NOW)])).toEqual({ code: "UNKNOWN", reason: "NO_SOURCE" });
  });

  it("4 dk önce BUSY → REPORTED_BUSY", () => {
    expect(library([report(LIBRARY, "BUSY", 4, NOW)])).toMatchObject({ code: "REPORTED_BUSY", minutesAgo: 4 });
  });
});

describe("kısmi kaynak ve örnek bildirimler", () => {
  const partial = (reports: SpaceReport[]) => evaluateTrust({ base: PARTIAL_BASE, reports, nowMs: NOW });

  it("T26: kısmi kaynaklı oda bildirim yokken 'Program kısmi'; asla PROGRAM_FREE değil", () => {
    expect(partial([])).toEqual({ code: "UNKNOWN", reason: "PARTIAL_SOURCE" });
    expect(partial([report(A204, "BUSY", 25, NOW)])).toEqual({ code: "UNKNOWN", reason: "PARTIAL_SOURCE" });
  });

  it("T27: kısmi kaynaklı odada yerinde bildirim etiketi değiştirir", () => {
    expect(partial([report(A204, "AVAILABLE", 3, NOW)])).toMatchObject({ code: "VERIFIED_FREE" });
    expect(partial([report(A204, "BUSY", 3, NOW)])).toMatchObject({ code: "REPORTED_BUSY" });
  });

  it("kararı örnek bildirim verdiyse simulated işaretlenir; gerçek bildirimde alan yok", () => {
    const sim = { ...report(A204, "BUSY", 2, NOW), isSimulated: true };
    expect(classroom([sim])).toMatchObject({ code: "REPORTED_BUSY", simulated: true });
    expect(classroom([report(A204, "BUSY", 2, NOW)])).not.toHaveProperty("simulated");
  });
});
