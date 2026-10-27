import { describe, expect, it } from "vitest";
import { rankResults } from "../../src/domain/ranking";
import type { SpaceResult, Status } from "../../src/domain/types";
import { hm, space } from "./fixtures";

const result = (code: string, status: Status, freeUntil: number | null): SpaceResult => ({
  space: space(code),
  status,
  freeUntil,
  nextClass: null,
});

describe("sıralama", () => {
  it("T17: VERIFIED (15.00), PROGRAM (17.00), PROGRAM (16.00), BUSY", () => {
    const busy = result("A101", { code: "REPORTED_BUSY", minutesAgo: 2, reportType: "BUSY" }, hm(18));
    const p16 = result("A102", { code: "PROGRAM_FREE" }, hm(16));
    const verified = result("A103", { code: "VERIFIED_FREE", minutesAgo: 3, reportCount: 1 }, hm(15));
    const p17 = result("A104", { code: "PROGRAM_FREE" }, hm(17));
    const input = [busy, p16, verified, p17];

    expect(rankResults(input)).toEqual([verified, p17, p16, busy]);
    expect(input[0]).toBe(busy); // girdi değişmedi
  });

  it("eşitlikte oda kodu sayısal-alfabetik; UNKNOWN null freeUntil en sonda", () => {
    const a10 = result("A10", { code: "PROGRAM_FREE" }, hm(16));
    const a9 = result("A9", { code: "PROGRAM_FREE" }, hm(16));
    const u1 = result("B1", { code: "UNKNOWN", reason: "NO_SOURCE" }, null);
    const u2 = result("B2", { code: "UNKNOWN", reason: "CONFLICTING_REPORTS" }, hm(14));
    expect(rankResults([u1, a10, u2, a9]).map((r) => r.space.code)).toEqual(["A9", "A10", "B2", "B1"]);
  });
});
