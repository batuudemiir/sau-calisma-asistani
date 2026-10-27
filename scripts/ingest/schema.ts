import { z } from "zod";
import { cleanText, normalizeRoomCode, parseTime, parseTimeRange, parseWeekday } from "./normalize";

/** Ayrıştırıcıların (XLSX veya Gemini) ürettiği ham satır. Değerler belgedeki gibi, yorumlanmamış. */
export interface RawRow {
  day: unknown;
  time?: unknown; // "13:00-14:50"
  start?: unknown;
  end?: unknown;
  courseCode: unknown;
  courseName: unknown;
  room: unknown;
  sourceRef: string;
}

export const ISSUES = [
  "ROOM_MISSING",
  "ROOM_UNKNOWN",
  "TIME_MISSING",
  "TIME_ORDER",
  "WEEKDAY_INVALID",
  "OVERLAP",
  "DUPLICATE",
  "TERM_MISMATCH",
  "COURSE_NOT_IN_TEXT",
  "MODEL_FLAGGED",
] as const;
export type Issue = (typeof ISSUES)[number];

export const DraftBlockSchema = z.object({
  spaceCode: z.string().min(1).nullable(),
  weekday: z.number().int().min(1).max(7).nullable(),
  startMinute: z.number().int().min(0).max(1440).nullable(),
  endMinute: z.number().int().min(0).max(1440).nullable(),
  courseCode: z.string().nullable(),
  courseName: z.string().nullable(),
  sourceRef: z.string().min(1),
  needsReview: z.boolean(),
  issues: z.array(z.enum(ISSUES)),
});
export type DraftBlock = z.infer<typeof DraftBlockSchema>;

export const DraftSourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  termId: z.string().min(1),
  department: z.string().min(1),
  buildingId: z.string().regex(/^[a-z0-9-]+$/),
  url: z.string(),
  format: z.enum(["PDF", "XLSX", "CSV"]),
  fetchedAt: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  parseMethod: z.enum(["GEMINI", "DETERMINISTIC", "MANUAL"]),
  /** Belgede yazan dönem (ör. "2026-2027 Güz"); termId ile uyuşmazsa tüm kayıtlar işaretlenir. */
  documentTerm: z.string().nullable(),
});
export type DraftSource = z.infer<typeof DraftSourceSchema>;

export const DraftSchema = z.object({
  source: DraftSourceSchema,
  rooms: z.array(z.string().min(1)),
  blocks: z.array(DraftBlockSchema),
});
export type Draft = z.infer<typeof DraftSchema>;

/** Ham satırı taslak bloğa çevirir; okunamayan alan null kalır (kural uydurmaz). */
export function rawToDraft(row: RawRow, modelFlagged = false): DraftBlock {
  const range = row.time !== undefined ? parseTimeRange(cleanText(row.time)) : null;
  const start = range?.start ?? parseTime(cleanText(row.start));
  const end = range?.end ?? parseTime(cleanText(row.end));
  return {
    spaceCode: normalizeRoomCode(row.room),
    weekday: parseWeekday(typeof row.day === "string" ? cleanText(row.day) : row.day),
    startMinute: start,
    endMinute: end,
    courseCode: cleanText(row.courseCode)?.toLocaleUpperCase("tr").replace(/\s+/g, "") ?? null,
    courseName: cleanText(row.courseName),
    sourceRef: row.sourceRef,
    needsReview: modelFlagged,
    issues: modelFlagged ? ["MODEL_FLAGGED"] : [],
  };
}
