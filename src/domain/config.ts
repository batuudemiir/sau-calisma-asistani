// Kural parametreleri. Değerler hipotezdir; bkz. docs/AVAILABILITY_RULES.md.

export const BUFFER_MIN = 10;
export const OPEN_MINUTE = 480; // 08.00
export const CLOSE_MINUTE = 1320; // 22.00
export const REPORT_TTL_MIN = 30;
export const NEGATIVE_TTL_MIN = 20;
export const CONFLICT_WINDOW_MIN = 10;

/** Asistanın ve hızlı seçimin önerdiği süreler. */
export const DURATIONS = [30, 60, 90, 120] as const;
/** Arama aralığı: en az 15 dk, en çok bina açık kaldığı süre (14 saat); tam dakika. */
export const MIN_WINDOW_MIN = 15;
export const MAX_WINDOW_MIN = CLOSE_MINUTE - OPEN_MINUTE;

export interface BuildingHours {
  openMinute: number;
  closeMinute: number;
}

export const DEFAULT_HOURS: BuildingHours = { openMinute: OPEN_MINUTE, closeMinute: CLOSE_MINUTE };

export function isDuration(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_WINDOW_MIN && n <= MAX_WINDOW_MIN;
}

export const RATING_WINDOW_MIN = 180; // check-in'den sonra değerlendirme süresi
export const MIN_RATINGS_TO_SHOW = 3; // altında ortalama gösterilmez
