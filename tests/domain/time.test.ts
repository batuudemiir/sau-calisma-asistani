import { describe, expect, it } from "vitest";
import { formatMinute, toLocalTime } from "../../src/domain/time";

describe("Europe/Istanbul zaman dönüşümü", () => {
  it("UTC 10.00 → Istanbul 13.00, Salı", () => {
    expect(toLocalTime(Date.UTC(2026, 9, 27, 10, 0))).toEqual({ dateISO: "2026-10-27", weekday: 2, minute: 780 });
  });

  it("UTC gece yarısından önce Istanbul'da ertesi gün olur", () => {
    expect(toLocalTime(Date.UTC(2026, 10, 1, 22, 30))).toEqual({ dateISO: "2026-11-02", weekday: 1, minute: 90 });
  });

  it("Pazar = 7", () => {
    expect(toLocalTime(Date.UTC(2026, 10, 1, 9, 0)).weekday).toBe(7);
  });

  it("dakika biçimi", () => {
    expect(formatMinute(840)).toBe("14.00");
    expect(formatMinute(545)).toBe("09.05");
  });
});
