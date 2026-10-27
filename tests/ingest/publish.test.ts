import { describe, expect, it } from "vitest";
import type { Draft, DraftBlock } from "../../scripts/ingest/schema";
import { planPublish, planRollback, planTerm, type ExistingSource } from "../../scripts/publish/plan";

const block = (over: Partial<DraftBlock> = {}): DraftBlock => ({
  spaceCode: "A204",
  weekday: 2,
  startMinute: 780,
  endMinute: 890,
  courseCode: "UTC425",
  courseName: "Kültürlerarası Pazarlama",
  sourceRef: "s.1",
  needsReview: false,
  issues: [],
  ...over,
});

const draft = (blocks: DraftBlock[], id = "isletme-2026-guz-v2"): Draft => ({
  source: {
    id,
    termId: "2026-guz",
    department: "İşletme",
    buildingId: "isletme-a",
    url: "https://example.invalid/program.xlsx",
    format: "XLSX",
    fetchedAt: "2026-10-27T18:30:00+03:00",
    sha256: "a".repeat(64),
    parseMethod: "DETERMINISTIC",
    coverage: "FULL",
    documentTerm: "2026-2027 Güz",
  },
  rooms: ["A204", "A205"],
  blocks,
});

const existing: ExistingSource[] = [
  { id: "isletme-2026-guz-v1", termId: "2026-guz", department: "İşletme", status: "PUBLISHED", publishedAt: "2026-10-27T19:00:00Z" },
  { id: "iktisat-2026-guz-v1", termId: "2026-guz", department: "İktisat", status: "PUBLISHED" },
];

describe("planPublish", () => {
  it("yalnızca needsReview=false kayıtları yayımlar, işaretli odayı INCOMPLETE yapar, önceki sürümü SUPERSEDED", () => {
    const plan = planPublish(
      draft([block(), block({ spaceCode: "A205", needsReview: true, issues: ["OVERLAP"] })]),
      existing,
      "ekip",
      "2026-10-27T20:00:00Z",
    );
    expect(plan.blocks).toHaveLength(1);
    expect(plan.blocks[0].data).toMatchObject({ spaceId: "isletme-a-A204", sourceStatus: "PUBLISHED", termId: "2026-guz" });
    expect(plan.source).toMatchObject({ status: "PUBLISHED", blockCount: 1, flaggedCount: 1, reviewedBy: "ekip" });
    expect(plan.spaces.map((s) => [s.id, s.dataQuality, s.accessStatus])).toEqual([
      ["isletme-a-A204", "OK", "UNKNOWN"],
      ["isletme-a-A205", "INCOMPLETE", "UNKNOWN"],
    ]);
    expect(plan.source.coverage).toBe("FULL");
    expect(plan.source.spaceIds).toEqual(["isletme-a-A204", "isletme-a-A205"]);
    expect(plan.supersede).toEqual(["isletme-2026-guz-v1"]);
  });

  it("inceleyen olmadan veya aynı kimlikle yayın yok", () => {
    expect(() => planPublish(draft([block()]), existing, " ", "x")).toThrow();
    expect(() => planPublish(draft([block()], "isletme-2026-guz-v1"), existing, "ekip", "x")).toThrow();
  });
});

describe("planRollback", () => {
  it("en son SUPERSEDED kaynağa geri döner", () => {
    const sources: ExistingSource[] = [
      { id: "v1", termId: "t", department: "d", status: "SUPERSEDED", publishedAt: "2026-10-27T18:00:00Z" },
      { id: "v2", termId: "t", department: "d", status: "SUPERSEDED", publishedAt: "2026-10-27T19:00:00Z" },
      { id: "v3", termId: "t", department: "d", status: "PUBLISHED", publishedAt: "2026-10-27T20:00:00Z" },
    ];
    expect(planRollback("v3", sources)).toEqual({ supersede: "v3", republish: "v2" });
    expect(() => planRollback("v1", sources)).toThrow();
    expect(() => planRollback("yok", sources)).toThrow();
  });
});

describe("planTerm", () => {
  it("eksik/hatalı tarih reddedilir, geçerli dönem aktif oluşturulur", () => {
    expect(() => planTerm("2026-guz")).toThrow(/--term-label/);
    expect(() => planTerm("2026-guz", "2026-2027 Güz", "2027-01-15", "2026-09-21")).toThrow();
    expect(planTerm("2026-guz", "2026-2027 Güz", "2026-09-21", "2027-01-15")).toEqual({
      id: "2026-guz", label: "2026-2027 Güz", startsOn: "2026-09-21", endsOn: "2027-01-15", isActive: true,
    });
  });
});
