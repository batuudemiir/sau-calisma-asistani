import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildDraft, termMatches } from "../../scripts/ingest/build";
import { mapGeminiResponse } from "../../scripts/ingest/gemini";
import { normalizeRoomCode, parseTime, parseTimeRange, parseWeekday } from "../../scripts/ingest/normalize";
import { rawToDraft, type DraftBlock, type RawRow } from "../../scripts/ingest/schema";
import { applyQualityRules, reviewSample } from "../../scripts/ingest/validate";
import { parseXlsx } from "../../scripts/ingest/xlsx";

const raw = (over: Partial<RawRow> = {}): RawRow => ({
  day: "Salı",
  time: "13:00-14:50",
  courseCode: "UTC 425",
  courseName: "Kültürlerarası Pazarlama",
  room: "A-204",
  sourceRef: "s.1, satır 1",
  ...over,
});

const validate = (blocks: DraftBlock[], over: Partial<Parameters<typeof applyQualityRules>[1]> = {}) =>
  applyQualityRules(blocks, { rooms: new Set(["A204", "A205"]), termMatches: true, ...over });

describe("normalize", () => {
  it("Türkçe gün adları, kısaltmalar, aksansız yazım", () => {
    expect(parseWeekday("Pazartesi")).toBe(1);
    expect(parseWeekday("SALI")).toBe(2);
    expect(parseWeekday("Carsamba")).toBe(3);
    expect(parseWeekday("Per.")).toBe(4);
    expect(parseWeekday("Cumartesi")).toBe(6);
    expect(parseWeekday("Pazar")).toBe(7);
    expect(parseWeekday("Bayram")).toBeNull();
    expect(parseWeekday(9)).toBeNull();
  });

  it("saat ve saat aralığı", () => {
    expect(parseTime("13:00")).toBe(780);
    expect(parseTime("9.05")).toBe(545);
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("1300")).toBeNull();
    expect(parseTimeRange("13.00 – 14.50")).toEqual({ start: 780, end: 890 });
    expect(parseTimeRange("13:00")).toBeNull();
  });

  it("oda kodu", () => {
    expect(normalizeRoomCode(" a-204 ")).toBe("A204");
    expect(normalizeRoomCode("")).toBeNull();
  });

  it("rawToDraft okunamayan alanı null bırakır", () => {
    const d = rawToDraft(raw({ time: "öğleden sonra", room: null }));
    expect(d).toMatchObject({ spaceCode: null, startMinute: null, endMinute: null, weekday: 2, courseCode: "UTC425" });
  });
});

describe("kalite kuralları", () => {
  it("temiz kayıt işaretlenmez", () => {
    expect(validate([rawToDraft(raw())])[0]).toMatchObject({ needsReview: false, issues: [] });
  });

  it("oda boş / listede yok, saat eksik / ters, gün geçersiz, dönem uyuşmuyor", () => {
    const out = validate(
      [
        rawToDraft(raw({ room: "" })),
        rawToDraft(raw({ room: "Z999" })),
        rawToDraft(raw({ time: undefined, start: "13:00" })),
        rawToDraft(raw({ time: "15:00-14:00" })),
        rawToDraft(raw({ day: "Bayram" })),
      ],
      { termMatches: false },
    );
    expect(out.map((b) => b.issues.filter((i) => i !== "TERM_MISMATCH"))).toEqual([
      ["ROOM_MISSING"],
      ["ROOM_UNKNOWN"],
      ["TIME_MISSING"],
      ["TIME_ORDER"],
      ["WEEKDAY_INVALID"],
    ]);
    expect(out.every((b) => b.needsReview && b.issues.includes("TERM_MISMATCH"))).toBe(true);
  });

  it("tekrar eden satır ikincisinden itibaren, çakışma her iki tarafta işaretlenir", () => {
    const out = validate([
      rawToDraft(raw()),
      rawToDraft(raw({ sourceRef: "s.1, satır 2" })),
      rawToDraft(raw({ courseCode: "ISL101", time: "14:00-15:00", sourceRef: "s.1, satır 3" })),
      rawToDraft(raw({ courseCode: "ISL102", time: "15:00-16:00", sourceRef: "s.1, satır 4" })),
    ]);
    expect(out.map((b) => b.issues)).toEqual([["OVERLAP"], ["DUPLICATE"], ["OVERLAP"], []]);
  });

  it("ders kodu belge metninde geçmiyorsa işaretlenir", () => {
    const out = validate([rawToDraft(raw()), rawToDraft(raw({ courseCode: "UYDURMA1", room: "A205" }))], {
      sourceText: "Salı UTC425 Kültürlerarası Pazarlama A-204",
    });
    expect(out.map((b) => b.issues)).toEqual([[], ["COURSE_NOT_IN_TEXT"]]);
  });

  it("model belirsiz dediyse işaretli kalır", () => {
    expect(validate([rawToDraft(raw(), true)])[0]).toMatchObject({ needsReview: true, issues: ["MODEL_FLAGGED"] });
  });

  it("inceleme örneği: tüm işaretliler + en fazla n işaretsiz, tekrarlanabilir", () => {
    const blocks = validate([
      rawToDraft(raw({ room: "" })),
      ...Array.from({ length: 20 }, (_, i) => rawToDraft(raw({ time: `${8 + (i % 12)}:00-${8 + (i % 12)}:50`, room: i < 12 ? "A204" : "A205", sourceRef: `r${i}` }))),
    ]);
    const sample = reviewSample(blocks, 10, 42);
    expect(sample.filter((b) => b.needsReview).length).toBe(blocks.filter((b) => b.needsReview).length);
    expect(sample.filter((b) => !b.needsReview).length).toBe(10);
    expect(reviewSample(blocks, 10, 42)).toEqual(sample);
  });
});

describe("dönem eşleşmesi", () => {
  it("belgedeki dönem etiketiyle karşılaştırılır; okunamadıysa doğrulanamaz", () => {
    expect(termMatches("2026-2027 GÜZ", "2026-2027 Güz")).toBe(true);
    expect(termMatches("2025-2026 Güz", "2026-2027 Güz")).toBe(false);
    expect(termMatches(null, "2026-2027 Güz")).toBe(false);
  });
});

describe("XLSX ayrıştırma", () => {
  async function workbook() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("1. Sınıf");
    ws.addRow(["İŞLETME BÖLÜMÜ 2026-2027 GÜZ DÖNEMİ HAFTALIK DERS PROGRAMI"]);
    ws.addRow(["Gün", "Saat", "Ders Kodu", "Ders Adı", "Derslik"]);
    ws.addRow(["Salı", "13:00-14:50", "UTC425", "Kültürlerarası Pazarlama", "A-204"]);
    ws.addRow([null, "15:00-16:50", "ISL201", "Muhasebe", "A205"]);
    ws.mergeCells("A3:A4"); // gün birleştirilmiş hücre
    ws.addRow([]);
    const ws2 = wb.addWorksheet("Başlangıç-Bitiş");
    ws2.addRow(["GÜN", "Başlangıç", "Bitiş", "Kod", "Sınıf"]);
    // Excel saat değeri: gün kesri
    ws2.addRow(["Çarşamba", 9 / 24, 10.5 / 24, "ISL101", "A204"]);
    wb.addWorksheet("Notlar").addRow(["Açıklama"]);
    return new Uint8Array(await wb.xlsx.writeBuffer());
  }

  it("başlık satırını bulur, birleştirilmiş hücreyi doldurur, saat kesirlerini çevirir, başlıksız sayfayı atlar", async () => {
    const { rows, skippedSheets } = await parseXlsx(await workbook());
    expect(skippedSheets).toEqual(["Notlar"]);
    const drafts = rows.map((r) => rawToDraft(r));
    expect(drafts.map((d) => [d.weekday, d.startMinute, d.endMinute, d.courseCode, d.spaceCode, d.sourceRef])).toEqual([
      [2, 780, 890, "UTC425", "A204", "1. Sınıf!satır 3"],
      [2, 900, 1010, "ISL201", "A205", "1. Sınıf!satır 4"],
      [3, 540, 630, "ISL101", "A204", "Başlangıç-Bitiş!satır 2"],
    ]);
  });

  it("buildDraft uçtan uca: dönem doğrulanınca temiz, oda listesi dışı işaretli", async () => {
    const { rows, documentText } = await parseXlsx(await workbook());
    const draft = buildDraft({
      source: {
        id: "isletme-2026-guz-v1",
        termId: "2026-guz",
        department: "İşletme",
        buildingId: "isletme-a",
        url: "test.xlsx",
        format: "XLSX",
        fetchedAt: "2026-10-27T18:30:00+03:00",
        sha256: "0".repeat(64),
        parseMethod: "DETERMINISTIC",
      },
      documentTerm: "2026-2027 Güz",
      termLabel: "2026-2027 Güz",
      rooms: ["A-204"],
      rows: rows.map((raw) => ({ raw })),
      sourceText: documentText,
    });
    expect(draft.rooms).toEqual(["A204"]);
    expect(draft.blocks.map((b) => b.issues)).toEqual([[], ["ROOM_UNKNOWN"], []]);
  });
});

describe("Gemini yanıt eşleme", () => {
  it("şemaya uyan yanıtı ham satırlara çevirir, belirsiz satırı işaretler", () => {
    const res = mapGeminiResponse(
      JSON.stringify({
        documentTerm: "2026-2027 Güz",
        rows: [
          { day: "Salı", start: "13:00", end: "14:50", courseCode: "UTC425", courseName: "X", room: "A204", sourceRef: "s.2, satır 14", uncertain: false },
          { day: "Salı", start: null, end: null, courseCode: "ISL1?", courseName: null, room: "A204", sourceRef: "s.2, satır 15", uncertain: true },
        ],
      }),
    );
    expect(res.documentTerm).toBe("2026-2027 Güz");
    const drafts = res.rows.map((r) => rawToDraft(r.raw, r.uncertain));
    expect(drafts[0]).toMatchObject({ startMinute: 780, needsReview: false });
    expect(drafts[1]).toMatchObject({ startMinute: null, needsReview: true, issues: ["MODEL_FLAGGED"] });
  });

  it("şemaya uymayan yanıt reddedilir", () => {
    expect(() => mapGeminiResponse(JSON.stringify({ rows: [{ day: "Salı" }] }))).toThrow();
    expect(() => mapGeminiResponse("bu json değil")).toThrow();
  });
});
