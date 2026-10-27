// Kullanım:
//   npm run ingest -- <dosya.xlsx|dosya.pdf|dosya.csv> --term 2026-guz --term-label "2026-2027 Güz" \
//     --department İşletme --building isletme-a --rooms data/sources/rooms-isletme-a.json \
//     --url <kaynak adresi> [--document-term "2026-2027 Güz"] [--version 1] [--coverage FULL|PARTIAL]
// CSV için --coverage zorunludur; --rooms verilmezse odalar CSV'den çıkarılır (elle girişte oda listesi denetimi yok).
// Çıktı: data/drafts/<sourceId>.json ve özet. Firestore'a hiçbir şey yazmaz.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { buildDraft, sha256 } from "./build";
import { parseCsv } from "./csv";
import { parsePdfWithGemini } from "./gemini";
import { reviewSample, summarize } from "./validate";
import { parseXlsx } from "./xlsx";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    term: { type: "string" },
    "term-label": { type: "string" },
    department: { type: "string" },
    building: { type: "string" },
    rooms: { type: "string" },
    url: { type: "string" },
    "document-term": { type: "string" },
    coverage: { type: "string" },
    version: { type: "string", default: "1" },
  },
});

function required(name: keyof typeof values): string {
  const v = values[name];
  if (typeof v !== "string" || !v) throw new Error(`--${name} gerekli`);
  return v;
}

const slug = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  const file = positionals[0];
  if (!file) throw new Error("Kaynak dosya yolu gerekli");
  // Elle girilen CSV için makul varsayılanlar: aktif dönem ve "Ekip" bölüm adı (belge zaten bu dönem için yazıldı)
  const isCsv = extname(file).toLowerCase() === ".csv";
  if (isCsv) {
    values.term ??= "2026-guz";
    values["term-label"] ??= "2026-2027 Güz";
    values["document-term"] ??= values["term-label"];
    values.department ??= "Ekip";
  }
  const termId = required("term");
  const department = required("department");
  const data = new Uint8Array(await readFile(file));
  const ext = extname(file).toLowerCase();
  const coverage = z.enum(["FULL", "PARTIAL"]).parse(values.coverage ?? (ext === ".csv" ? undefined : "FULL"), {
    error: () => "--coverage FULL veya PARTIAL olmalı (CSV için zorunlu: kişisel programlar PARTIAL, kapı çizelgesi FULL)",
  });
  let rooms: string[] | null = values.rooms ? z.array(z.string()).parse(JSON.parse(await readFile(values.rooms, "utf8"))) : null;
  if (!rooms && ext !== ".csv") throw new Error("--rooms gerekli");

  let rows;
  let documentTerm = values["document-term"] ?? null;
  let sourceText: string | null = null;
  let parseMethod: "GEMINI" | "DETERMINISTIC" | "MANUAL";
  let format: "PDF" | "XLSX" | "CSV";

  if (ext === ".xlsx") {
    const parsed = await parseXlsx(data);
    if (parsed.skippedSheets.length) console.warn(`Başlık bulunamayan sayfalar atlandı: ${parsed.skippedSheets.join(", ")}`);
    rows = parsed.rows.map((raw) => ({ raw }));
    sourceText = parsed.documentText;
    parseMethod = "DETERMINISTIC";
    format = "XLSX";
  } else if (ext === ".csv") {
    // Plan B: ekibin elle derlediği program; arayüzde "elle derlenmiş" etiketiyle görünür
    const parsed = parseCsv(new TextDecoder().decode(data), basename(file));
    rows = parsed.rows.map((raw) => ({ raw }));
    if (!rooms) {
      rooms = [...new Set(parsed.rows.map((r) => String(r.room ?? "").trim()).filter(Boolean))];
      console.warn(`Oda listesi CSV'den çıkarıldı (${rooms.length} oda): ${rooms.join(", ")}`);
    }
    sourceText = parsed.documentText;
    parseMethod = "MANUAL";
    format = "CSV";
  } else if (ext === ".pdf") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil (.env.local)");
    const parsed = await parsePdfWithGemini(data, { apiKey, model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" });
    rows = parsed.rows;
    documentTerm ??= parsed.documentTerm;
    parseMethod = "GEMINI";
    format = "PDF";
  } else {
    throw new Error(`Desteklenmeyen biçim: ${ext}`);
  }

  const id = `${slug(department)}-${termId}-v${values.version}`;
  const draft = buildDraft({
    source: {
      id,
      termId,
      department,
      buildingId: required("building"),
      url: values.url ?? basename(file),
      format,
      fetchedAt: new Date().toISOString(),
      sha256: sha256(data),
      parseMethod,
      coverage,
    },
    documentTerm,
    termLabel: required("term-label"),
    rooms: rooms!,
    rows,
    sourceText,
  });

  await mkdir("data/drafts", { recursive: true });
  const out = join("data/drafts", `${id}.json`);
  await writeFile(out, JSON.stringify(draft, null, 2) + "\n");

  const s = summarize(draft.blocks);
  console.log(`Taslak: ${out}`);
  console.log(`Kayıt: ${s.blockCount}, işaretli (needsReview): ${s.flaggedCount}`, s.byIssue);
  console.log(`\nİnsan kontrolü listesi (işaretliler + rastgele 10):`);
  for (const b of reviewSample(draft.blocks)) {
    console.log(`- [${b.issues.join(",") || "rastgele"}] ${b.sourceRef}: ${b.spaceCode} gün=${b.weekday} ${b.startMinute}-${b.endMinute} ${b.courseCode}`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
