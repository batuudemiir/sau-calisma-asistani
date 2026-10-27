// Kural parametreleri. Değerler hipotezdir; bkz. docs/AVAILABILITY_RULES.md.

export const BUFFER_MIN = 10;
export const OPEN_MINUTE = 480; // 08.00
export const CLOSE_MINUTE = 1320; // 22.00
export const REPORT_TTL_MIN = 30;
export const NEGATIVE_TTL_MIN = 20;
export const CONFLICT_WINDOW_MIN = 10;

export const DURATIONS = [30, 60, 90, 120] as const;
export type Duration = (typeof DURATIONS)[number];

export interface BuildingHours {
  openMinute: number;
  closeMinute: number;
}

export const DEFAULT_HOURS: BuildingHours = { openMinute: OPEN_MINUTE, closeMinute: CLOSE_MINUTE };

export function isDuration(n: number): n is Duration {
  return (DURATIONS as readonly number[]).includes(n);
}
