import type { DataQuality, ScheduleBlock, SourceStatus, Space, Term } from "../../src/domain/types";
import type { Draft } from "../ingest/schema";

export interface ExistingSource {
  id: string;
  termId: string;
  department: string;
  status: SourceStatus;
  publishedAt?: string;
}

export interface SourceDoc {
  id: string;
  termId: string;
  department: string;
  url: string;
  format: "PDF" | "XLSX" | "CSV";
  fetchedAt: string;
  sha256: string;
  parseMethod: "GEMINI" | "DETERMINISTIC" | "MANUAL";
  coverage: "FULL" | "PARTIAL";
  status: SourceStatus;
  blockCount: number;
  flaggedCount: number;
  reviewedBy: string;
  publishedAt: string;
  /** Bu kaynağın kapsadığı odalar (dersi olmasa da). Motor "oda yayımlanmış kaynakta var mı?" sorusunu buradan yanıtlar. */
  spaceIds: string[];
}

export interface PublishPlan {
  source: SourceDoc;
  blocks: { id: string; data: ScheduleBlock }[];
  spaces: Space[];
  supersede: string[]; // aynı bölüm + dönemin önceki PUBLISHED kaynakları
}

export const spaceIdFor = (buildingId: string, code: string) => `${buildingId}-${code}`;

/**
 * Onaylı taslaktan Firestore yazma planı üretir. Yalnızca needsReview=false kayıtlar yayımlanır.
 * İşaretli kaydı olan oda dataQuality=INCOMPLETE olur: programı eksik yayımlandığı için "boş" denmemeli.
 */
export function planPublish(draft: Draft, existing: readonly ExistingSource[], reviewedBy: string, nowISO: string): PublishPlan {
  if (!reviewedBy.trim()) throw new Error("reviewedBy gerekli: insan kontrolü yapılmadan yayın yok");
  if (existing.some((s) => s.id === draft.source.id)) throw new Error(`Kaynak zaten var: ${draft.source.id} (--version artır)`);

  const { source } = draft;
  const clean = draft.blocks.filter((b) => !b.needsReview);
  const flaggedRooms = new Set(draft.blocks.filter((b) => b.needsReview && b.spaceCode).map((b) => b.spaceCode!));

  const blocks = clean.map((b, i) => ({
    id: `${source.id}-${String(i).padStart(4, "0")}`,
    data: {
      termId: source.termId,
      sourceId: source.id,
      sourceStatus: "PUBLISHED" as const,
      spaceId: spaceIdFor(source.buildingId, b.spaceCode!),
      weekday: b.weekday as ScheduleBlock["weekday"],
      startMinute: b.startMinute!,
      endMinute: b.endMinute!,
      courseCode: b.courseCode ?? "",
      courseName: b.courseName ?? "",
      sourceRef: b.sourceRef,
    },
  }));

  const spaces: Space[] = draft.rooms.map((code) => ({
    id: spaceIdFor(source.buildingId, code),
    buildingId: source.buildingId,
    code,
    kind: "CLASSROOM",
    accessStatus: "UNKNOWN",
    dataQuality: (flaggedRooms.has(code) ? "INCOMPLETE" : "OK") as DataQuality,
    isSimulated: false,
  }));

  return {
    source: {
      id: source.id,
      termId: source.termId,
      department: source.department,
      url: source.url,
      format: source.format,
      fetchedAt: source.fetchedAt,
      sha256: source.sha256,
      parseMethod: source.parseMethod,
      coverage: source.coverage,
      status: "PUBLISHED",
      blockCount: blocks.length,
      flaggedCount: draft.blocks.length - clean.length,
      reviewedBy,
      publishedAt: nowISO,
      spaceIds: spaces.map((s) => s.id),
    },
    blocks,
    spaces,
    supersede: existing
      .filter((s) => s.status === "PUBLISHED" && s.termId === source.termId && s.department === source.department)
      .map((s) => s.id),
  };
}

/** Geri dönüş: hedef kaynak SUPERSEDED olur, aynı bölüm+dönemin en son SUPERSEDED kaynağı yeniden PUBLISHED. */
export function planRollback(sourceId: string, existing: readonly ExistingSource[]) {
  const current = existing.find((s) => s.id === sourceId);
  if (!current) throw new Error(`Kaynak bulunamadı: ${sourceId}`);
  if (current.status !== "PUBLISHED") throw new Error(`Kaynak yayında değil: ${sourceId}`);
  const previous = existing
    .filter((s) => s.id !== sourceId && s.status === "SUPERSEDED" && s.termId === current.termId && s.department === current.department)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0];
  if (!previous) throw new Error(`Geri dönülecek önceki kaynak yok: ${sourceId}`);
  return { supersede: current.id, republish: previous.id };
}

/** Dönem kaydı yoksa oluşturulacak belge; tarihler elle verilir (uydurulmaz). */
export function planTerm(termId: string, label?: string, startsOn?: string, endsOn?: string): Term {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!label || !startsOn || !endsOn || !iso.test(startsOn) || !iso.test(endsOn)) {
    throw new Error(`terms/${termId} yok: --term-label "2026-2027 Güz" --starts-on YYYY-AA-GG --ends-on YYYY-AA-GG ver`);
  }
  if (startsOn > endsOn) throw new Error("--starts-on, --ends-on'dan sonra olamaz");
  return { id: termId, label, startsOn, endsOn, isActive: true };
}
