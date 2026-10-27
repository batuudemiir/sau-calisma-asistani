import { describe, expect, it } from "vitest";
import { searchSpaces } from "../../src/domain/search";
import { LIBRARY, TERM, at, block, hm, nowMsAt, report, space } from "./fixtures";

describe("searchSpaces", () => {
  it("dersi olanı eler, bilinmeyeni UNKNOWN döndürür, bildirimi uygular, sıralar, kütüphaneyi ayırır", () => {
    const NOW = nowMsAt(13);
    const free = space("A201");
    const verified = space("A202");
    const busyClass = space("A203");
    const noSource = space("A204");

    const out = searchSpaces({
      now: at(13),
      nowMs: NOW,
      durationMin: 60,
      term: TERM,
      spaces: [free, verified, busyClass, noSource, LIBRARY],
      blocks: [block(busyClass, hm(13, 30), hm(15)), block(free, hm(15, 10), hm(17))],
      publishedSpaceIds: new Set([free.id, verified.id, busyClass.id]),
      reports: [report(verified, "AVAILABLE", 3, NOW), report(LIBRARY, "BUSY", 4, NOW)],
      library: { space: LIBRARY, simulation: null },
    });

    expect(out.results.map((r) => [r.space.code, r.status.code, r.freeUntil])).toEqual([
      ["A202", "VERIFIED_FREE", 1320],
      ["A201", "PROGRAM_FREE", hm(15)],
      ["A204", "UNKNOWN", null],
    ]);
    expect(out.library?.status).toMatchObject({ code: "REPORTED_BUSY" });
  });

  it("UNKNOWN odaya gelen uygun bildirimi etiketi değiştirmez", () => {
    const NOW = nowMsAt(13);
    const s = space("A204");
    const out = searchSpaces({
      now: at(13),
      nowMs: NOW,
      durationMin: 60,
      term: TERM,
      spaces: [s],
      blocks: [],
      publishedSpaceIds: new Set(),
      reports: [report(s, "AVAILABLE", 2, NOW)],
    });
    expect(out.results[0].status).toEqual({ code: "UNKNOWN", reason: "NO_SOURCE" });
    expect(out.library).toBeNull();
  });
});
