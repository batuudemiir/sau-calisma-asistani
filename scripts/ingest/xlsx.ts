import ExcelJS from "exceljs";
import type { RawRow } from "./schema";

// Deterministik XLSX ayrıştırma. Sütun adları eşleme tablosuyla normalize edilir, birleştirilmiş hücreler
// üst-sol değerle doldurulur, her sayfa ayrı işlenir.

type Field = "day" | "time" | "start" | "end" | "courseCode" | "courseName" | "room";

const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const COLUMN_ALIASES: Record<Field, string[]> = {
  day: ["gun", "gunler", "day"],
  time: ["saat", "ders saati", "saatler", "zaman"],
  start: ["baslangic", "baslangic saati", "baslama"],
  end: ["bitis", "bitis saati"],
  courseCode: ["ders kodu", "kod", "kodu", "dersin kodu"],
  courseName: ["ders adi", "ders", "dersin adi", "ders ismi"],
  room: ["derslik", "sinif", "salon", "mekan", "oda", "yer"],
};

function headerField(text: string): Field | null {
  const f = fold(text);
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [Field, string[]][]) {
    if (aliases.includes(f)) return field;
  }
  return null;
}

const hhmm = (totalMin: number) =>
  `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(Math.round(totalMin) % 60).padStart(2, "0")}`;

/** ExcelJS hücre değerini metne çevirir; saat hücreleri (Date veya gün kesri) "HH:MM" olur. */
export function cellText(cell: ExcelJS.Cell, asTime = false): string | null {
  const v = (cell.isMerged ? cell.master : cell).value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return asTime ? hhmm(v.getUTCHours() * 60 + v.getUTCMinutes()) : v.toISOString();
  if (typeof v === "number") return asTime && v > 0 && v < 1 ? hhmm(Math.round(v * 1440)) : String(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if ("richText" in v) return v.richText.map((r) => r.text).join("");
  if ("result" in v && v.result !== undefined && v.result !== null) return String(v.result);
  if ("text" in v) return String(v.text);
  return null;
}

export interface XlsxParseResult {
  rows: RawRow[];
  skippedSheets: string[];
  documentText: string;
}

export async function parseXlsx(data: ArrayBuffer | Uint8Array): Promise<XlsxParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as ArrayBuffer);
  const rows: RawRow[] = [];
  const skippedSheets: string[] = [];
  const text: string[] = [];

  wb.eachSheet((sheet) => {
    // Başlık satırını ilk 15 satırda ara: gün, oda ve ders sütunlarından en az birer tane olmalı
    let header: { row: number; cols: Partial<Record<Field, number>> } | null = null;
    for (let r = 1; r <= Math.min(15, sheet.rowCount) && !header; r++) {
      const cols: Partial<Record<Field, number>> = {};
      sheet.getRow(r).eachCell((cell, col) => {
        const t = cellText(cell);
        const field = t ? headerField(t) : null;
        if (field && cols[field] === undefined) cols[field] = col;
      });
      const hasTime = cols.time !== undefined || (cols.start !== undefined && cols.end !== undefined);
      if (cols.day && cols.room && (cols.courseCode || cols.courseName) && hasTime) header = { row: r, cols };
    }
    if (!header) {
      skippedSheets.push(sheet.name);
      return;
    }

    const { cols } = header;
    const get = (row: ExcelJS.Row, f: Field, asTime = false) => (cols[f] ? cellText(row.getCell(cols[f]), asTime) : null);

    for (let r = header.row + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const values = [get(row, "day"), get(row, "courseCode"), get(row, "courseName"), get(row, "room")];
      if (values.every((v) => v === null || v.trim() === "")) continue;
      text.push(values.filter(Boolean).join(" "));
      rows.push({
        day: get(row, "day"),
        time: cols.time ? get(row, "time", true) : undefined,
        start: cols.start ? get(row, "start", true) : undefined,
        end: cols.end ? get(row, "end", true) : undefined,
        courseCode: get(row, "courseCode"),
        courseName: get(row, "courseName"),
        room: get(row, "room"),
        sourceRef: `${sheet.name}!satır ${r}`,
      });
    }
  });

  return { rows, skippedSheets, documentText: text.join("\n") };
}
