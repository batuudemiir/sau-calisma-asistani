import { REPORT_TTL_MIN } from "@/domain/config";
import { checkProgram } from "@/domain/availability";
import { searchSpaces } from "@/domain/search";
import { toLocalTime } from "@/domain/time";
import { CLASSROOM_BASE, evaluateTrust, LIBRARY_BASE } from "@/domain/trust";
import type { AccessStatus, LibrarySimulation, NextClass, ReportType, Space, SpaceKind, Status } from "@/domain/types";
import type { DataSource, SourceSummary } from "./data-source";

export interface SearchOptions {
  nowMs: number;
  durationMin: number;
  demoMode: boolean;
  isDemoClock?: boolean;
}

export interface SourceDTO {
  department: string;
  termLabel: string;
  url: string;
  isSimulated: boolean;
}

export interface ResultDTO {
  spaceId: string;
  code: string;
  buildingName: string;
  kind: SpaceKind;
  accessStatus: AccessStatus;
  isSimulated: boolean;
  status: Status;
  freeUntil: number | null;
  nextClass: NextClass | null;
  source: SourceDTO | null;
}

export interface LibraryDTO {
  spaceId: string;
  name: string;
  isSimulated: boolean;
  status: Status;
  simulation: LibrarySimulation | null;
}

export interface SearchResponse {
  now: { dateISO: string; minute: number; weekday: number; isDemoClock: boolean; nowMs: number };
  durationMin: number;
  termLabel: string | null;
  library: LibraryDTO;
  results: ResultDTO[];
}

/** Firestore'da kütüphane kaydı yoksa kullanılan kart; doluluk verisi yok demektir, uydurma bilgi içermez. */
export const DEFAULT_LIBRARY: Space = {
  id: "kutuphane-merkez",
  buildingId: "kutuphane",
  code: "Merkez Kütüphane",
  kind: "LIBRARY",
  accessStatus: "UNKNOWN",
  dataQuality: "OK",
  isSimulated: false,
};

async function load(ds: DataSource, opts: SearchOptions) {
  const now = toLocalTime(opts.nowMs);
  const term = await ds.activeTerm();
  const [spaces, buildings, sources, blocks, reports, simulation] = await Promise.all([
    ds.spaces(),
    ds.buildings(),
    term ? ds.publishedSources(term.id) : Promise.resolve([] as SourceSummary[]),
    term ? ds.blocks(term.id, now.weekday) : Promise.resolve([]),
    ds.reportsSince(opts.nowMs - REPORT_TTL_MIN * 60_000),
    opts.demoMode ? ds.librarySimulation() : Promise.resolve(null),
  ]);
  const buildingName = new Map(buildings.map((b) => [b.id, b.name]));
  const sourceOf = (spaceId: string) => sources.find((s) => s.spaceIds.includes(spaceId)) ?? null;
  const toSourceDTO = (s: SourceSummary | null): SourceDTO | null =>
    s && term ? { department: s.department, termLabel: term.label, url: s.url, isSimulated: s.isSimulated } : null;
  const library = spaces.find((s) => s.kind === "LIBRARY") ?? DEFAULT_LIBRARY;
  return { now, term, spaces, sources, blocks, reports, simulation, buildingName, sourceOf, toSourceDTO, library };
}

export async function runSearch(ds: DataSource, opts: SearchOptions): Promise<SearchResponse> {
  const d = await load(ds, opts);
  const out = searchSpaces({
    now: d.now,
    nowMs: opts.nowMs,
    durationMin: opts.durationMin,
    term: d.term,
    spaces: d.spaces,
    blocks: d.blocks,
    publishedSpaceIds: new Set(d.sources.flatMap((s) => s.spaceIds)),
    reports: d.reports,
    library: { space: d.library, simulation: d.simulation },
  });

  return {
    now: { ...d.now, isDemoClock: opts.isDemoClock ?? false, nowMs: opts.nowMs },
    durationMin: opts.durationMin,
    termLabel: d.term?.label ?? null,
    library: {
      spaceId: d.library.id,
      name: d.library.code,
      isSimulated: d.library.isSimulated,
      status: out.library!.status,
      simulation: out.library!.simulation,
    },
    results: out.results.map((r) => ({
      spaceId: r.space.id,
      code: r.space.code,
      buildingName: d.buildingName.get(r.space.buildingId) ?? r.space.buildingId,
      kind: r.space.kind,
      accessStatus: r.space.accessStatus,
      isSimulated: r.space.isSimulated,
      status: r.status,
      freeUntil: r.freeUntil,
      nextClass: r.nextClass,
      source: d.toSourceDTO(r.nextClass ? (d.sources.find((s) => s.id === r.nextClass!.sourceId) ?? null) : d.sourceOf(r.space.id)),
    })),
  };
}

export interface SpaceDetailResponse {
  now: SearchResponse["now"];
  durationMin: number;
  space: ResultDTO & { excludedBecause: "BUILDING_CLOSED" | "CLASS_CONFLICT" | null };
  today: { startMinute: number; endMinute: number; courseCode: string; courseName: string; sourceRef: string }[];
  /** Son 30 dk bildirim sayıları; uid içermez. */
  recentReports: { type: ReportType; minutesAgo: number }[];
  simulation: LibrarySimulation | null;
}

export async function spaceDetail(ds: DataSource, spaceId: string, opts: SearchOptions): Promise<SpaceDetailResponse | null> {
  const d = await load(ds, opts);
  const isLibrary = spaceId === d.library.id;
  const space = isLibrary ? d.library : d.spaces.find((s) => s.id === spaceId);
  if (!space) return null;

  const reports = d.reports.filter((r) => r.spaceId === spaceId);
  const today = d.term
    ? d.blocks.filter((b) => b.spaceId === spaceId && b.termId === d.term!.id).sort((a, b) => a.startMinute - b.startMinute)
    : [];

  let status: Status;
  let freeUntil: number | null = null;
  let nextClass: NextClass | null = null;
  let excludedBecause: SpaceDetailResponse["space"]["excludedBecause"] = null;

  if (isLibrary) {
    status = evaluateTrust({ base: LIBRARY_BASE, reports, nowMs: opts.nowMs });
  } else {
    const program = checkProgram({
      now: d.now,
      durationMin: opts.durationMin,
      term: d.term,
      space,
      blocks: d.blocks,
      publishedSpaceIds: new Set(d.sources.flatMap((s) => s.spaceIds)),
    });
    if (program.kind === "UNKNOWN") status = { code: "UNKNOWN", reason: program.reason };
    else if (program.kind === "EXCLUDED") {
      // Ayrıntı sayfasında elenmiş oda da gösterilir; etiket "bilinmiyor" değil, neden açıkça yazılır.
      excludedBecause = program.why;
      status = evaluateTrust({ base: CLASSROOM_BASE, reports, nowMs: opts.nowMs });
    } else {
      status = evaluateTrust({ base: CLASSROOM_BASE, reports, nowMs: opts.nowMs });
      freeUntil = program.freeUntil;
      nextClass = program.nextClass;
    }
  }

  return {
    now: { ...d.now, isDemoClock: opts.isDemoClock ?? false, nowMs: opts.nowMs },
    durationMin: opts.durationMin,
    space: {
      spaceId: space.id,
      code: space.code,
      buildingName: d.buildingName.get(space.buildingId) ?? space.buildingId,
      kind: space.kind,
      accessStatus: space.accessStatus,
      isSimulated: space.isSimulated,
      status,
      freeUntil,
      nextClass,
      source: isLibrary ? null : d.toSourceDTO(d.sourceOf(space.id)),
      excludedBecause,
    },
    today: today.map(({ startMinute, endMinute, courseCode, courseName, sourceRef }) => ({ startMinute, endMinute, courseCode, courseName, sourceRef })),
    recentReports: reports
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map((r) => ({ type: r.type, minutesAgo: Math.floor((opts.nowMs - r.createdAtMs) / 60_000) })),
    simulation: isLibrary ? d.simulation : null,
  };
}
