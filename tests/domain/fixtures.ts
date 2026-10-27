import type { LocalTime, ReportType, ScheduleBlock, Space, SpaceReport, Term } from "../../src/domain/types";

// Tüm örneklerde gün Salı (2), 27 Ekim 2026.
export const TERM: Term = {
  id: "2026-guz",
  label: "2026-2027 Güz",
  startsOn: "2026-09-21",
  endsOn: "2027-01-15",
  isActive: true,
};

export const hm = (h: number, m = 0) => h * 60 + m;

export const at = (h: number, m = 0, dateISO = "2026-10-27"): LocalTime => ({ dateISO, weekday: 2, minute: hm(h, m) });

/** Salı 27 Ekim 2026 hh:mm Istanbul (UTC+3) → epoch ms */
export const nowMsAt = (h: number, m = 0) => Date.UTC(2026, 9, 27, h - 3, m);

export function space(code: string, over: Partial<Space> = {}): Space {
  return {
    id: `isletme-a-${code}`,
    buildingId: "isletme-a",
    code,
    kind: "CLASSROOM",
    accessStatus: "UNKNOWN",
    dataQuality: "OK",
    isSimulated: false,
    ...over,
  };
}

export const LIBRARY: Space = space("KUTUPHANE", { id: "kutuphane-merkez", buildingId: "kutuphane", kind: "LIBRARY" });

export function block(s: Space, start: number, end: number, over: Partial<ScheduleBlock> = {}): ScheduleBlock {
  return {
    termId: TERM.id,
    sourceId: "isletme-2026-guz-v1",
    sourceStatus: "PUBLISHED",
    spaceId: s.id,
    weekday: 2,
    startMinute: start,
    endMinute: end,
    courseCode: "UTC425",
    courseName: "Kültürlerarası Pazarlama",
    sourceRef: "s.2, satır 14",
    ...over,
  };
}

/** nowMs'ten `minutesAgo` dakika önce yapılmış bildirim */
export function report(
  s: Space,
  type: ReportType,
  minutesAgo: number,
  nowMs: number,
  uid = "u1",
): SpaceReport {
  return { spaceId: s.id, type, uid, createdAtMs: nowMs - minutesAgo * 60_000, isSimulated: false };
}
