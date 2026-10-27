import type { SpaceResult, StatusCode } from "./types";

const PRIORITY: Record<StatusCode, number> = {
  VERIFIED_FREE: 0,
  PROGRAM_FREE: 1,
  UNKNOWN: 2,
  REPORTED_BUSY: 3,
};

/** Etiket önceliği → freeUntil azalan (null en sona) → oda kodu alfabetik. Girdiyi değiştirmez. */
export function rankResults(results: readonly SpaceResult[]): SpaceResult[] {
  return [...results].sort((a, b) => {
    const p = PRIORITY[a.status.code] - PRIORITY[b.status.code];
    if (p !== 0) return p;
    if (a.freeUntil !== b.freeUntil) {
      if (a.freeUntil === null) return 1;
      if (b.freeUntil === null) return -1;
      return b.freeUntil - a.freeUntil;
    }
    return a.space.code.localeCompare(b.space.code, "tr", { numeric: true });
  });
}
