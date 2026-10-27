import type { RawRow } from "./schema";
import { headerField, type Field } from "./xlsx";

// Plan B: ekibin elle derlediği program (CSV). Sütun adları XLSX ile aynı eşleme tablosundan okunur.
// Ayraç virgül veya noktalı virgül (Türkçe Excel CSV'si); çift tırnaklı alanlar desteklenir.

export function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export interface CsvParseResult {
  rows: RawRow[];
  documentText: string;
}

export function parseCsv(text: string, fileLabel = "csv"): CsvParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.trim() && !l.trim().startsWith("#"));
  if (headerIdx < 0) throw new Error("CSV boş");
  const sep = (lines[headerIdx].match(/;/g)?.length ?? 0) > (lines[headerIdx].match(/,/g)?.length ?? 0) ? ";" : ",";

  const cols: Partial<Record<Field, number>> = {};
  parseCsvLine(lines[headerIdx], sep).forEach((h, i) => {
    const f = headerField(h);
    if (f && cols[f] === undefined) cols[f] = i;
  });
  const hasTime = cols.time !== undefined || (cols.start !== undefined && cols.end !== undefined);
  if (cols.day === undefined || cols.room === undefined || (cols.courseCode === undefined && cols.courseName === undefined) || !hasTime) {
    throw new Error("CSV başlığında gün, saat (veya başlangıç+bitiş), ders kodu/adı ve derslik sütunları olmalı");
  }

  const rows: RawRow[] = [];
  const text_: string[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const v = parseCsvLine(line, sep);
    const get = (f: Field) => (cols[f] !== undefined ? (v[cols[f]!] ?? null) : null);
    text_.push(v.join(" "));
    rows.push({
      day: get("day"),
      time: cols.time !== undefined ? get("time") : undefined,
      start: cols.start !== undefined ? get("start") : undefined,
      end: cols.end !== undefined ? get("end") : undefined,
      courseCode: get("courseCode"),
      courseName: get("courseName"),
      room: get("room"),
      sourceRef: `${fileLabel}!satır ${i + 1}`,
    });
  }
  return { rows, documentText: text_.join("\n") };
}
