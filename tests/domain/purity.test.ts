import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md kural 3: src/domain saf TypeScript'tir.
const DOMAIN_DIR = join(__dirname, "../../src/domain");
const FORBIDDEN = /from\s+["'](firebase|firebase-admin|react|react-dom|next|server-only)(\/[^"']*)?["']/;

describe("src/domain saflığı", () => {
  it("Firebase, React veya Next importu yok", () => {
    const files = readdirSync(DOMAIN_DIR, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => FORBIDDEN.test(readFileSync(join(DOMAIN_DIR, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
