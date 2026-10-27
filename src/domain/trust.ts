import { CONFLICT_WINDOW_MIN, NEGATIVE_TTL_MIN, REPORT_TTL_MIN } from "./config";
import type { SpaceReport, Status } from "./types";

const MIN_MS = 60_000;

/** Derslik için program sonucu, kısmi kaynaklı oda için "Program kısmi", kütüphane için "Doluluk verisi yok". */
export type BaseStatus = { code: "PROGRAM_FREE" } | { code: "UNKNOWN"; reason: "NO_SOURCE" | "PARTIAL_SOURCE" };

export const CLASSROOM_BASE: BaseStatus = { code: "PROGRAM_FREE" };
export const LIBRARY_BASE: BaseStatus = { code: "UNKNOWN", reason: "NO_SOURCE" };
export const PARTIAL_BASE: BaseStatus = { code: "UNKNOWN", reason: "PARTIAL_SOURCE" };

export interface TrustInput {
  base: BaseStatus;
  reports: readonly SpaceReport[]; // yalnızca bu alanın bildirimleri
  nowMs: number;
}

export function evaluateTrust({ base, reports, nowMs }: TrustInput): Status {
  const ageMin = (r: SpaceReport) => (nowMs - r.createdAtMs) / MIN_MS;

  const recent = reports
    .filter((r) => r.createdAtMs <= nowMs && ageMin(r) <= REPORT_TTL_MIN)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  if (recent.length === 0) return base;
  if (recent[0].type === "OUTDATED") return { code: "UNKNOWN", reason: "REPORTED_OUTDATED" };

  const neg = recent.find((r) => (r.type === "BUSY" || r.type === "UNUSABLE") && ageMin(r) <= NEGATIVE_TTL_MIN);
  const positives = recent.filter((r) => r.type === "AVAILABLE");
  const pos = positives[0];

  if (neg && pos && neg.uid !== pos.uid && Math.abs(neg.createdAtMs - pos.createdAtMs) <= CONFLICT_WINDOW_MIN * MIN_MS) {
    return { code: "UNKNOWN", reason: "CONFLICTING_REPORTS" };
  }
  if (neg && (!pos || neg.createdAtMs > pos.createdAtMs)) {
    return {
      code: "REPORTED_BUSY",
      minutesAgo: Math.floor(ageMin(neg)),
      reportType: neg.type as "BUSY" | "UNUSABLE",
      ...(neg.isSimulated ? { simulated: true as const } : {}),
    };
  }
  if (pos) {
    return {
      code: "VERIFIED_FREE",
      minutesAgo: Math.floor(ageMin(pos)),
      reportCount: positives.length,
      ...(pos.isSimulated ? { simulated: true as const } : {}),
    };
  }
  return base;
}
