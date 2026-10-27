import { describe, expect, it } from "vitest";
import { cachedSource } from "../../src/server/cached-source";
import type { DataSource } from "../../src/server/data-source";

function countingSource() {
  const calls: Record<string, number> = {};
  const hit = (k: string) => (calls[k] = (calls[k] ?? 0) + 1);
  let failSpaces = false;
  const ds: DataSource = {
    activeTerm: async () => (hit("term"), null),
    spaces: async () => {
      hit("spaces");
      if (failSpaces) throw new Error("geçici hata");
      return [];
    },
    buildings: async () => (hit("buildings"), []),
    publishedSources: async () => (hit("sources"), []),
    blocks: async (_t, w) => (hit(`blocks${w}`), []),
    reportsSince: async () => (hit("reports"), []),
    librarySimulation: async () => (hit("sim"), null),
    ratings: async () => (hit("ratings"), []),
  };
  return { ds, calls, setFailSpaces: (v: boolean) => (failSpaces = v) };
}

describe("cachedSource", () => {
  it("statik veriyi TTL boyunca tekrar okumaz; bildirim ve puanları her seferinde okur", async () => {
    let t = 0;
    const { ds, calls } = countingSource();
    const c = cachedSource(ds, 60_000, () => t);
    for (let i = 0; i < 3; i++) {
      await Promise.all([c.activeTerm(), c.spaces(), c.blocks("x", 2), c.reportsSince(0), c.ratings(), c.librarySimulation()]);
    }
    expect(calls).toMatchObject({ term: 1, spaces: 1, blocks2: 1, reports: 3, ratings: 3, sim: 3 });
    await c.blocks("x", 3);
    expect(calls.blocks3).toBe(1); // farklı gün ayrı anahtar
    t = 60_000;
    await c.spaces();
    expect(calls.spaces).toBe(2); // süre doldu
  });

  it("hata önbellekte kalmaz", async () => {
    const { ds, calls, setFailSpaces } = countingSource();
    const c = cachedSource(ds, 60_000, () => 0);
    setFailSpaces(true);
    await expect(c.spaces()).rejects.toThrow();
    setFailSpaces(false);
    await expect(c.spaces()).resolves.toEqual([]);
    expect(calls.spaces).toBe(2);
  });
});
