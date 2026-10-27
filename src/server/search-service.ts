import { REPORT_TTL_MIN } from "@/domain/config";
import { simulatedLibraryLevel } from "@/domain/library-simulation";
import { checkProgram } from "@/domain/availability";
import { searchSpaces } from "@/domain/search";
import { toLocalTime } from "@/domain/time";
import { summarizeSpaceRatings, type Rating, type RatingSummary } from "@/domain/ratings";
import { CLASSROOM_BASE, evaluateTrust, LIBRARY_BASE, PARTIAL_BASE } from "@/domain/trust";
import type { AccessStatus, LibrarySimulation, NextClass, ReportType, Space, SpaceKind, Status } from "@/domain/types";
import type { DataSource, SourceSummary } from "./data-source";

export interface SearchOptions {
  /** Ders programı saati (demo saati olabilir). */
  nowMs: number;
  /** Bildirimlerin değerlendirildiği gerçek saat; verilmezse nowMs. Demo saati bildirimleri kaydırmaz. */
  reportNowMs?: number;
  durationMin: number;
  demoMode: boolean;
  isDemoClock?: boolean;
}

export interface SourceDTO {
  department: string;
  termLabel: string;
  url: string;
  isSimulated: boolean;
  isManual: boolean;
  isPartial: boolean;
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
  rating: { real: RatingSummary; simulated: RatingSummary };
}

/** Çalışma yeri (kütüphane, kafe, çalışma alanı): ders programı yok, durum yalnızca bildirimden. */
export interface PlaceDTO {
  spaceId: string;
  name: string;
  kind: SpaceKind;
  isSimulated: boolean;
  status: Status;
  /** Yalnızca merkez kütüphanede ve DEMO_MODE'da. */
  simulation: LibrarySimulation | null;
  rating: { real: RatingSummary; simulated: RatingSummary };
  openingHours: string | null;
  osm: string | null;
}

export interface SearchResponse {
  /** nowMs: gerçek saat ("x dk önce" hesapları için); dateISO/minute/weekday: program saati. */
  now: { dateISO: string; minute: number; weekday: number; isDemoClock: boolean; nowMs: number };
  durationMin: number;
  termLabel: string | null;
  /** İlki her zaman merkez kütüphane. */
  places: PlaceDTO[];
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
  osm: "way/389702261",
};

export const isPlace = (s: Space) => s.kind === "LIBRARY" || s.kind === "STUDY_AREA";

const reportNow = (opts: SearchOptions) => opts.reportNowMs ?? opts.nowMs;

async function load(ds: DataSource, opts: SearchOptions) {
  const now = toLocalTime(opts.nowMs);
  const term = await ds.activeTerm();
  const [spaces, buildings, sources, blocks, fetchedReports, storedSimulation, ratings] = await Promise.all([
    ds.spaces(),
    ds.buildings(),
    term ? ds.publishedSources(term.id) : Promise.resolve([] as SourceSummary[]),
    term ? ds.blocks(term.id, now.weekday) : Promise.resolve([]),
    ds.reportsSince(reportNow(opts) - REPORT_TTL_MIN * 60_000),
    opts.demoMode ? ds.librarySimulation() : Promise.resolve(null),
    ds.ratings(),
  ]);
  const simulation = storedSimulation?.pattern === "DAILY"
    ? { ...storedSimulation, level: simulatedLibraryLevel(now.minute), updatedAtMs: reportNow(opts) }
    : storedSimulation;
  // Demo modu kapalıyken örnek (simüle) bildirimler hiç hesaba katılmaz
  const reports = opts.demoMode ? fetchedReports : fetchedReports.filter((r) => !r.isSimulated);
  const buildingName = new Map(buildings.map((b) => [b.id, b.name]));
  const sourceOf = (spaceId: string) => sources.find((s) => s.spaceIds.includes(spaceId)) ?? null;
  const toSourceDTO = (s: SourceSummary | null): SourceDTO | null =>
    s && term
      ? { department: s.department, termLabel: term.label, url: s.url, isSimulated: s.isSimulated, isManual: s.parseMethod === "MANUAL", isPartial: s.coverage === "PARTIAL" }
      : null;
  // Merkez kütüphane her zaman ilk sırada; kaydı yoksa "Doluluk verisi yok" diyen varsayılan kart
  const storedPlaces = spaces.filter(isPlace);
  const library = storedPlaces.find((s) => s.id === DEFAULT_LIBRARY.id) ?? storedPlaces.find((s) => s.kind === "LIBRARY") ?? DEFAULT_LIBRARY;
  const places = [library, ...storedPlaces.filter((s) => s.id !== library.id).sort((a, b) => a.code.localeCompare(b.code, "tr"))];
  // Demo modu kapalıyken simüle puanlar hiç gösterilmez
  const visibleRatings = opts.demoMode ? ratings : ratings.filter((r) => !r.isSimulated);
  const ratingOf = (spaceId: string) => summarizeSpaceRatings(visibleRatings.filter((r: Rating) => r.spaceId === spaceId));
  // Tam kaynak varsa o geçerli; yalnızca kısmi kaynakta geçen oda "Program kısmi" olur
  const publishedSpaceIds = new Set(sources.filter((s) => s.coverage !== "PARTIAL").flatMap((s) => s.spaceIds));
  const partialSpaceIds = new Set(sources.filter((s) => s.coverage === "PARTIAL").flatMap((s) => s.spaceIds));
  return { now, term, spaces, sources, blocks, reports, simulation, buildings, buildingName, sourceOf, toSourceDTO, library, places, ratingOf, publishedSpaceIds, partialSpaceIds };
}

export async function runSearch(ds: DataSource, opts: SearchOptions): Promise<SearchResponse> {
  const d = await load(ds, opts);
  return {
    now: { ...d.now, isDemoClock: opts.isDemoClock ?? false, nowMs: reportNow(opts) },
    durationMin: opts.durationMin,
    termLabel: d.term?.label ?? null,
    places: placeDTOs(d, opts),
    results: resultDTOs(d, opts),
  };
}

/** Uygun görünen derslikler, sıralı (liste ve haritanın alt paneli aynı sırayı kullanır). */
function resultDTOs(d: Loaded, opts: SearchOptions): ResultDTO[] {
  const out = searchSpaces({
    now: d.now,
    nowMs: reportNow(opts),
    durationMin: opts.durationMin,
    term: d.term,
    spaces: d.spaces,
    blocks: d.blocks,
    publishedSpaceIds: d.publishedSpaceIds,
    partialSpaceIds: d.partialSpaceIds,
    reports: d.reports,
  });
  return out.results.map((r) => ({
    spaceId: r.space.id,
    code: r.space.code,
    buildingName: d.buildingName.get(r.space.buildingId) ?? r.space.buildingId,
    kind: r.space.kind,
    accessStatus: r.space.accessStatus,
    isSimulated: r.space.isSimulated,
    status: r.status,
    freeUntil: r.freeUntil,
    nextClass: r.nextClass,
    source: d.toSourceDTO((r.nextClass && d.sources.find((s) => s.id === r.nextClass!.sourceId)) || d.sourceOf(r.space.id)),
    rating: d.ratingOf(r.space.id),
  }));
}

export interface SpaceDetailResponse {
  now: SearchResponse["now"];
  durationMin: number;
  space: ResultDTO & { excludedBecause: "BUILDING_CLOSED" | "CLASS_CONFLICT" | null };
  today: { startMinute: number; endMinute: number; courseCode: string; courseName: string; sourceRef: string }[];
  /** Son 30 dk bildirim sayıları; uid içermez. */
  recentReports: { type: ReportType; minutesAgo: number }[];
  simulation: LibrarySimulation | null;
  place: { openingHours: string | null; osm: string | null } | null;
}

export async function spaceDetail(ds: DataSource, spaceId: string, opts: SearchOptions): Promise<SpaceDetailResponse | null> {
  const d = await load(ds, opts);
  const space = d.places.find((s) => s.id === spaceId) ?? d.spaces.find((s) => s.id === spaceId);
  const isLibrary = space ? isPlace(space) : false;
  if (!space) return null;

  const reports = d.reports.filter((r) => r.spaceId === spaceId);
  const today = d.term
    ? d.blocks.filter((b) => b.spaceId === spaceId && b.termId === d.term!.id).sort((a, b) => a.startMinute - b.startMinute)
    : [];

  const { status, freeUntil, nextClass, excludedBecause } = evaluateSpace(d, space, isLibrary, opts);

  return {
    now: { ...d.now, isDemoClock: opts.isDemoClock ?? false, nowMs: reportNow(opts) },
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
      rating: d.ratingOf(space.id),
      excludedBecause,
    },
    today: today.map(({ startMinute, endMinute, courseCode, courseName, sourceRef }) => ({ startMinute, endMinute, courseCode, courseName, sourceRef })),
    recentReports: reports
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map((r) => ({ type: r.type, minutesAgo: Math.floor((reportNow(opts) - r.createdAtMs) / 60_000) })),
    simulation: space.id === d.library.id ? d.simulation : null,
    place: isLibrary ? { openingHours: space.openingHours ?? null, osm: space.osm ?? null } : null,
  };
}

type Loaded = Awaited<ReturnType<typeof load>>;
type Excluded = "BUILDING_CLOSED" | "CLASS_CONFLICT";

/** Tek bir alanın durumu; elenen oda da (neden açıkça belirtilerek) değerlendirilir. Ayrıntı ve harita için. */
function evaluateSpace(d: Loaded, space: Space, isLibrary: boolean, opts: SearchOptions) {
  const reports = d.reports.filter((r) => r.spaceId === space.id);
  const nowMs = reportNow(opts);
  if (isLibrary) {
    return { status: evaluateTrust({ base: LIBRARY_BASE, reports, nowMs }), freeUntil: null, nextClass: null, excludedBecause: null };
  }
  const program = checkProgram({
    now: d.now,
    durationMin: opts.durationMin,
    term: d.term,
    space,
    blocks: d.blocks,
    publishedSpaceIds: d.publishedSpaceIds,
    partialSpaceIds: d.partialSpaceIds,
  });
  if (program.kind === "UNKNOWN") {
    return { status: { code: "UNKNOWN", reason: program.reason } as Status, freeUntil: null, nextClass: null, excludedBecause: null };
  }
  const status = evaluateTrust({ base: program.kind === "PARTIAL" ? PARTIAL_BASE : CLASSROOM_BASE, reports, nowMs });
  if (program.kind === "EXCLUDED") return { status, freeUntil: null, nextClass: null, excludedBecause: program.why as Excluded };
  return { status, freeUntil: program.freeUntil as number | null, nextClass: program.nextClass, excludedBecause: null as Excluded | null };
}

export interface MapSpaceDTO {
  spaceId: string;
  code: string;
  isSimulated: boolean;
  status: Status;
  excludedBecause: Excluded | null;
  rating: { real: RatingSummary; simulated: RatingSummary };
}

export interface MapResponse {
  now: SearchResponse["now"];
  durationMin: number;
  places: PlaceDTO[];
  /** Uygun görünen derslikler, /api/search ile aynı sırada (alt panel). */
  results: ResultDTO[];
  /** Odası olan binalar (ders programından). osm varsa haritada gerçek konumunda çizilir. */
  buildings: { id: string; name: string; isSimulated: boolean; osm: string | null; spaces: MapSpaceDTO[] }[];
}

/** Haritadaki her oda: elenenler dahil, durum + puan özeti. */
export async function mapView(ds: DataSource, opts: SearchOptions): Promise<MapResponse> {
  const d = await load(ds, opts);
  const buildingIds = [...new Set(d.spaces.filter((s) => !isPlace(s)).map((s) => s.buildingId))].sort();
  return {
    now: { ...d.now, isDemoClock: opts.isDemoClock ?? false, nowMs: reportNow(opts) },
    durationMin: opts.durationMin,
    places: placeDTOs(d, opts),
    results: resultDTOs(d, opts),
    buildings: buildingIds.map((id) => ({
      id,
      name: d.buildingName.get(id) ?? id,
      isSimulated: d.spaces.some((s) => s.buildingId === id && s.isSimulated),
      osm: d.buildings.find((b) => b.id === id)?.osm ?? null,
      spaces: d.spaces
        .filter((s) => s.buildingId === id && !isPlace(s))
        .sort((a, b) => a.code.localeCompare(b.code, "tr", { numeric: true }))
        .map((s) => {
          const e = evaluateSpace(d, s, false, opts);
          return { spaceId: s.id, code: s.code, isSimulated: s.isSimulated, status: e.status, excludedBecause: e.excludedBecause, rating: d.ratingOf(s.id) };
        }),
    })),
  };
}

function placeDTOs(d: Loaded, opts: SearchOptions): PlaceDTO[] {
  return d.places.map((p) => ({
    spaceId: p.id,
    name: p.code,
    kind: p.kind,
    isSimulated: p.isSimulated,
    status: evaluateSpace(d, p, true, opts).status,
    simulation: p.id === d.library.id ? d.simulation : null,
    rating: d.ratingOf(p.id),
    openingHours: p.openingHours ?? null,
    osm: p.osm ?? null,
  }));
}
