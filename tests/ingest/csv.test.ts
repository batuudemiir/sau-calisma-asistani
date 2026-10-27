import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvLine } from "../../scripts/ingest/csv";
import { rawToDraft } from "../../scripts/ingest/schema";

describe("elle derlenmiş CSV (Plan B)", () => {
  it("tırnaklı alan, kaçış tırnağı, noktalı virgül", () => {
    expect(parseCsvLine('Salı,"13:00-14:50","Muhasebe, ""Giriş""",A204', ",")).toEqual(["Salı", "13:00-14:50", 'Muhasebe, "Giriş"', "A204"]);
    expect(parseCsvLine("Salı;13:00-14:50;ISL101;A204", ";")).toEqual(["Salı", "13:00-14:50", "ISL101", "A204"]);
  });

  it("yorum satırlarını atlar, sütun sırasından bağımsız okur, satır numarasını kaynak olarak yazar", () => {
    const csv = "﻿# not\nDerslik;Gün;Başlangıç;Bitiş;Ders Kodu\nA-204;Salı;13:00;14:50;UTC425\n\n# ara not\nA205;Çarşamba;09:00;10:50;ISL101\n";
    const { rows } = parseCsv(csv, "elle.csv");
    expect(rows.map((r) => rawToDraft(r)).map((d) => [d.spaceCode, d.weekday, d.startMinute, d.endMinute, d.courseCode, d.sourceRef])).toEqual([
      ["A204", 2, 780, 890, "UTC425", "elle.csv!satır 3"],
      ["A205", 3, 540, 650, "ISL101", "elle.csv!satır 6"],
    ]);
  });

  it("eksik sütunlu başlık reddedilir", () => {
    expect(() => parseCsv("Gün,Ders Kodu,Derslik\nSalı,UTC425,A204")).toThrow(/saat/);
  });

  it("repodaki şablonun başlığı geçerli ve şablonda veri yok", () => {
    const template = readFileSync(join(__dirname, "../../data/sources/elle-giris-sablonu.csv"), "utf8");
    expect(parseCsv(template).rows).toEqual([]);
  });
});
