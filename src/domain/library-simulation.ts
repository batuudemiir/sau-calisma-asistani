import type { LibraryLevel } from "./types";

// Yalnızca DEMO_MODE'da kullanılan, ölçüme dayanmayan örnek gün içi doluluk deseni.
// Arayüzde her zaman "Örnek demo verisi" etiketiyle gösterilir; gerçek veri gibi sunulmaz.
const PATTERN: [fromMinute: number, level: LibraryLevel][] = [
  [0, "LOW"],
  [9 * 60, "MEDIUM"],
  [11 * 60, "BUSY"],
  [17 * 60, "MEDIUM"],
  [20 * 60, "LOW"],
];

export function simulatedLibraryLevel(minute: number): LibraryLevel {
  let level: LibraryLevel = PATTERN[0][1];
  for (const [from, l] of PATTERN) if (minute >= from) level = l;
  return level;
}
