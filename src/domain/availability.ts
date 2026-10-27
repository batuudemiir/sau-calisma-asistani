import { BUFFER_MIN, DEFAULT_HOURS, isDuration, type BuildingHours } from "./config";
import type { LocalTime, NextClass, ScheduleBlock, Space, Term, UnknownReason } from "./types";

export interface ProgramCheckInput {
  now: LocalTime;
  durationMin: number;
  term: Term | null;
  space: Space;
  /** Günün blokları; motor oda, gün, dönem ve PUBLISHED durumuna göre kendisi süzer. */
  blocks: readonly ScheduleBlock[];
  /** En az bir PUBLISHED kaynakta geçen oda kimlikleri. */
  publishedSpaceIds: ReadonlySet<string>;
  hours?: BuildingHours;
}

export type ProgramCheck =
  | { kind: "EXCLUDED"; why: "BUILDING_CLOSED" | "CLASS_CONFLICT" }
  | { kind: "UNKNOWN"; reason: UnknownReason }
  | { kind: "FREE"; freeUntil: number; nextClass: NextClass | null };

export function isTermValid(term: Term | null, dateISO: string): term is Term {
  return term !== null && term.isActive && term.startsOn <= dateISO && dateISO <= term.endsOn;
}

export function checkProgram(input: ProgramCheckInput): ProgramCheck {
  const { now, durationMin, term, space, blocks, publishedSpaceIds } = input;
  const hours = input.hours ?? DEFAULT_HOURS;
  if (!isDuration(durationMin)) throw new RangeError(`Geçersiz süre: ${durationMin}`);

  // Yarı açık aralık [wStart, wEnd)
  const wStart = now.minute;
  const wEnd = now.minute + durationMin;

  if (wStart < hours.openMinute || wEnd > hours.closeMinute) return { kind: "EXCLUDED", why: "BUILDING_CLOSED" };
  if (!isTermValid(term, now.dateISO)) return { kind: "UNKNOWN", reason: "STALE_SOURCE" };
  if (!publishedSpaceIds.has(space.id)) return { kind: "UNKNOWN", reason: "NO_SOURCE" };
  if (space.dataQuality === "INCOMPLETE") return { kind: "UNKNOWN", reason: "DATA_INCOMPLETE" };

  const today = blocks.filter(
    (b) =>
      b.spaceId === space.id && b.weekday === now.weekday && b.termId === term.id && b.sourceStatus === "PUBLISHED",
  );

  const conflict = today.some((b) => b.startMinute - BUFFER_MIN < wEnd && b.endMinute + BUFFER_MIN > wStart);
  if (conflict) return { kind: "EXCLUDED", why: "CLASS_CONFLICT" };

  const next = today
    .filter((b) => b.startMinute > now.minute)
    .reduce<ScheduleBlock | null>((min, b) => (min === null || b.startMinute < min.startMinute ? b : min), null);

  return {
    kind: "FREE",
    freeUntil: next ? next.startMinute - BUFFER_MIN : hours.closeMinute,
    nextClass: next
      ? {
          courseCode: next.courseCode,
          courseName: next.courseName,
          startMinute: next.startMinute,
          endMinute: next.endMinute,
          sourceId: next.sourceId,
          sourceRef: next.sourceRef,
        }
      : null,
  };
}
