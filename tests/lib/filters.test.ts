import { describe, expect, it } from "vitest";
import type { RatingSummary } from "../../src/domain/ratings";
import { applyFilters, parseFilters, type Filterable } from "../../src/lib/filters";

const none: RatingSummary = { count: 0, averages: null, overall: null };
const rated = (quiet: number, power: number): RatingSummary => ({
  count: 3,
  averages: { quiet, power, wifi: 3, light: 3 },
  overall: 3,
});

const item = (id: string, over: Partial<Filterable> = {}) => ({
  id,
  kind: "CLASSROOM" as const,
  status: { code: "PROGRAM_FREE" } as Filterable["status"],
  rating: { real: none, simulated: none },
  ...over,
});

const quietRoom = item("sessiz", { rating: { real: rated(4.5, 2), simulated: none } });
const loudRoom = item("gurultulu", { rating: { real: rated(2, 5), simulated: none } });
const unrated = item("puansiz");
const demoQuiet = item("demo", { rating: { real: none, simulated: rated(4, 4) } });
const library = item("kutuphane", {
  kind: "LIBRARY",
  openingHours: "24/7",
  status: { code: "UNKNOWN", reason: "NO_SOURCE" } as Filterable["status"],
});
const cafe = item("kafe", { kind: "STUDY_AREA", openingHours: "Mo-Fr 08:00-17:00" });
const verified = item("dogrulandi", { status: { code: "VERIFIED_FREE" } as Filterable["status"] });
const all = [quietRoom, loudRoom, unrated, demoQuiet, library, cafe, verified];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("filtreler", () => {
  it("Sessiz: puanı ≥4 olanlar; puansız dışarıda (bilinmeyen olumlu sayılmaz)", () => {
    expect(ids(applyFilters(all, ["quiet"]))).toEqual(["sessiz", "demo"]);
  });

  it("Priz ve Sessiz birlikte: ikisi de sağlanmalı", () => {
    expect(ids(applyFilters(all, ["quiet", "power"]))).toEqual(["demo"]);
  });

  it("Şu an açık: yalnızca kaynakta 7/24 yazanlar; yorumlanmayan saat dışarıda", () => {
    expect(ids(applyFilters(all, ["open"]))).toEqual(["kutuphane"]);
  });

  it("türler kendi aralarında veya", () => {
    expect(ids(applyFilters(all, ["library", "cafe"]))).toEqual(["kutuphane", "kafe"]);
  });

  it("Öğrenci doğruladı", () => {
    expect(ids(applyFilters(all, ["verified"]))).toEqual(["dogrulandi"]);
  });

  it("URL değeri: bilinmeyen anahtarlar yok sayılır", () => {
    expect(parseFilters("quiet,x,open")).toEqual(["quiet", "open"]);
    expect(parseFilters(null)).toEqual([]);
  });
});
