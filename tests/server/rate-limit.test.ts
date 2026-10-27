import { describe, expect, it } from "vitest";
import { checkRatingRate, checkReportRate } from "../../src/server/rate-limit";

const NOW = 10_000_000;
const ago = (min: number, spaceId = "A204") => ({ spaceId, createdAtMs: NOW - min * 60_000 });

describe("bildirim hız sınırı", () => {
  it("T18: aynı uid aynı odaya 4 dk arayla ikinci bildirim reddedilir", () => {
    const r = checkReportRate("A204", [ago(4)], NOW);
    expect(r).toMatchObject({ ok: false, retryAfterSec: 360 });
  });

  it("10 dk sonra aynı odaya, ya da hemen başka odaya izin var", () => {
    expect(checkReportRate("A204", [ago(10)], NOW)).toEqual({ ok: true });
    expect(checkReportRate("A205", [ago(1)], NOW)).toEqual({ ok: true });
  });

  it("saatte 20 bildirim sınırı", () => {
    const recent = Array.from({ length: 20 }, (_, i) => ago(59 - i * 2, `R${i}`));
    expect(checkReportRate("YENI", recent, NOW)).toMatchObject({ ok: false });
    expect(checkReportRate("YENI", recent.slice(1), NOW)).toEqual({ ok: true });
    expect(checkReportRate("YENI", [...recent.slice(1), ago(61, "ESKI")], NOW)).toEqual({ ok: true });
  });
});

describe("değerlendirme hız sınırı", () => {
  it("saatte 10 değerlendirme", () => {
    const recent = Array.from({ length: 10 }, (_, i) => ago(i, `R${i}`));
    expect(checkRatingRate(recent, NOW)).toMatchObject({ ok: false });
    expect(checkRatingRate(recent.slice(1), NOW)).toEqual({ ok: true });
  });
});
