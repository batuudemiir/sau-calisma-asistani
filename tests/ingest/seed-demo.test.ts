import { describe, expect, it } from "vitest";
import { demoPlan } from "../../scripts/seed-demo/plan";

describe("seed-demo planı", () => {
  it("her örnek kayıt isSimulated taşır, kodlar Ö- önekli, çakışan blok yok", () => {
    const p = demoPlan();
    expect(p.building.isSimulated).toBe(true);
    expect(p.source.isSimulated).toBe(true);
    expect(p.spaces.every((s) => s.isSimulated && s.code.startsWith("Ö-"))).toBe(true);
    expect(p.blocks.length).toBeGreaterThan(0);
    expect(p.blocks.every((b) => b.isSimulated)).toBe(true);
    for (const a of p.blocks)
      for (const b of p.blocks)
        if (a !== b && a.spaceId === b.spaceId && a.weekday === b.weekday)
          expect(a.startMinute < b.endMinute && b.startMinute < a.endMinute).toBe(false);
    expect(p.spaces.filter((s) => s.dataQuality === "INCOMPLETE")).toHaveLength(1);
    expect(p.ratings.every((r) => r.isSimulated)).toBe(true);
    const ids = new Set([...p.spaces.map((s) => s.id), p.library.id]);
    expect(p.ratings.every((r) => ids.has(r.spaceId))).toBe(true);
  });
});
