import type { DataSource, SourceSummary } from "../../src/server/data-source";
import type { Building, LibrarySimulation, ScheduleBlock, Space, SpaceReport, Term } from "../../src/domain/types";

export interface FakeData {
  term: Term | null;
  spaces: Space[];
  buildings: Building[];
  sources: (SourceSummary & { termId: string })[];
  blocks: ScheduleBlock[];
  reports: SpaceReport[];
  simulation: LibrarySimulation | null;
}

export function fakeSource(data: FakeData): DataSource {
  return {
    activeTerm: async () => data.term,
    spaces: async () => data.spaces,
    buildings: async () => data.buildings,
    publishedSources: async (termId) => data.sources.filter((s) => s.termId === termId),
    blocks: async (termId, weekday) =>
      data.blocks.filter((b) => b.termId === termId && b.weekday === weekday && b.sourceStatus === "PUBLISHED"),
    reportsSince: async (since, spaceId) =>
      data.reports.filter((r) => r.createdAtMs >= since && (!spaceId || r.spaceId === spaceId)),
    librarySimulation: async () => data.simulation,
  };
}
