import { checkProgram } from "./availability";
import type { BuildingHours } from "./config";
import { rankResults } from "./ranking";
import { CLASSROOM_BASE, LIBRARY_BASE, PARTIAL_BASE, evaluateTrust } from "./trust";
import type {
  LibraryResult,
  LibrarySimulation,
  LocalTime,
  ScheduleBlock,
  Space,
  SpaceReport,
  SpaceResult,
  Term,
} from "./types";

export interface SearchInput {
  now: LocalTime;
  nowMs: number;
  durationMin: number;
  term: Term | null;
  spaces: readonly Space[]; // derslikler ve çalışma alanları (kütüphane hariç)
  blocks: readonly ScheduleBlock[];
  publishedSpaceIds: ReadonlySet<string>;
  partialSpaceIds?: ReadonlySet<string>;
  reports: readonly SpaceReport[];
  hours?: BuildingHours;
  library?: { space: Space; simulation: LibrarySimulation | null } | null;
}

export interface SearchOutput {
  library: LibraryResult | null;
  results: SpaceResult[];
}

/** API'nin çağırdığı tek giriş noktası: program kontrolü → güven → sıralama. */
export function searchSpaces(input: SearchInput): SearchOutput {
  const reportsFor = (spaceId: string) => input.reports.filter((r) => r.spaceId === spaceId);

  const results: SpaceResult[] = [];
  for (const space of input.spaces) {
    // Kütüphane ve çalışma alanlarının ders programı yoktur; ayrı "çalışma yerleri" olarak değerlendirilir
    if (space.kind === "LIBRARY" || space.kind === "STUDY_AREA") continue;
    const program = checkProgram({ ...input, space });
    if (program.kind === "EXCLUDED") continue;
    if (program.kind === "UNKNOWN") {
      results.push({ space, status: { code: "UNKNOWN", reason: program.reason }, freeUntil: null, nextClass: null });
      continue;
    }
    // Kısmi kaynakta taban "Program kısmi"dir; yalnızca yerinde yapılan bildirim etiketi değiştirebilir
    const base = program.kind === "PARTIAL" ? PARTIAL_BASE : CLASSROOM_BASE;
    results.push({
      space,
      status: evaluateTrust({ base, reports: reportsFor(space.id), nowMs: input.nowMs }),
      freeUntil: program.freeUntil,
      nextClass: program.nextClass,
    });
  }

  const library = input.library
    ? {
        space: input.library.space,
        status: evaluateTrust({ base: LIBRARY_BASE, reports: reportsFor(input.library.space.id), nowMs: input.nowMs }),
        simulation: input.library.simulation,
      }
    : null;

  return { library, results: rankResults(results) };
}
