import { describe, expect, it } from "vitest";
import { distanceM, recommend, type Candidate, type Needs } from "../../src/domain/assistant";
import type { Status } from "../../src/domain/types";

const LIB: [number, number] = [40.7425, 30.3325];
const FAR: [number, number] = [40.7425, 30.3445]; // ~1 km doğuda

const c = (over: Partial<Candidate> & { id: string }): Candidate => ({
  name: over.id,
  kind: "CLASSROOM",
  status: { code: "PROGRAM_FREE" } as Status,
  freeUntil: 17 * 60,
  averages: null,
  location: null,
  openingHours: null,
  isSimulated: false,
  ...over,
});
const needs = (over: Partial<Needs> = {}): Needs => ({ criteria: [], kind: "ANY", here: null, ...over });
const ids = (r: { candidate: Candidate }[]) => r.map((x) => x.candidate.id);
const avg = (quiet: number, power: number) => ({ quiet, power, wifi: 3, light: 3 });

describe("asistan öneri motoru", () => {
  it("dolu bildirilen önerilmez; doğrulanan programda boştan önce", () => {
    const r = recommend(
      [
        c({ id: "program" }),
        c({ id: "dolu", status: { code: "REPORTED_BUSY" } as Status }),
        c({ id: "dogrulandi", status: { code: "VERIFIED_FREE" } as Status }),
      ],
      needs(),
    );
    expect(ids(r)).toEqual(["dogrulandi", "program"]);
    expect(r[1].reasons).toContain("Programa göre 17.00 saatine kadar boş");
    expect(r[1].cautions).toContain("Gerçekten boş olduğu doğrulanmadı");
  });

  it("istenen kriterde iyi puanlı yer öne geçer; puansız yer bilinmeyen olarak belirtilir, olumlu sayılmaz", () => {
    const r = recommend(
      [c({ id: "puansiz" }), c({ id: "prizli", averages: avg(3, 4.5) }), c({ id: "prizsiz", averages: avg(3, 1.5) })],
      needs({ criteria: ["power"] }),
    );
    expect(ids(r)).toEqual(["prizli", "puansiz", "prizsiz"]);
    expect(r[0].reasons).toContain("Priz iyi: 4.5/5");
    expect(r[1].cautions).toContain("Priz bilgisi yok (yeterli değerlendirme yok)");
    expect(r[2].cautions).toContain("Priz zayıf: 1.5/5");
  });

  it("tür tercihi süzer; çalışma yerinde açılış saati gerekçe ya da uyarı olur", () => {
    const lib = c({
      id: "kutuphane",
      kind: "LIBRARY",
      status: { code: "UNKNOWN", reason: "NO_SOURCE" } as Status,
      openingHours: "24/7",
      freeUntil: null,
    });
    const cafe = c({
      id: "kafe",
      kind: "STUDY_AREA",
      status: { code: "UNKNOWN", reason: "NO_SOURCE" } as Status,
      freeUntil: null,
    });
    const r = recommend([c({ id: "derslik" }), lib, cafe], needs({ kind: "LIBRARY" }));
    expect(ids(r)).toEqual(["kutuphane"]);
    expect(r[0].reasons).toContain("7/24 açık (OpenStreetMap)");
    expect(r[0].cautions).toContain("Doluluk bilgisi yok");
    expect(recommend([cafe], needs())[0].cautions).toContain("Açılış saatleri bilinmiyor");
  });

  it("konum verilince yakın olan öne geçer ve mesafe yazılır; konumu olmayan için uyarı", () => {
    const r = recommend(
      [c({ id: "uzak", location: FAR }), c({ id: "yakin", location: LIB }), c({ id: "konumsuz" })],
      needs({ here: LIB }),
    );
    expect(ids(r)).toEqual(["yakin", "konumsuz", "uzak"]);
    expect(r[0].distanceM).toBe(0);
    expect(r[2].reasons.some((x) => /km|m \(/.test(x))).toBe(true);
    expect(r[1].cautions).toContain("Konumu haritada yok; mesafe hesaplanamadı");
  });

  it("mesafe hesabı (haversine) ~1 km", () => {
    expect(distanceM(LIB, FAR)).toBeGreaterThan(950);
    expect(distanceM(LIB, FAR)).toBeLessThan(1050);
  });

  it("örnek demo verisi uyarıyla belirtilir; en fazla 3 öneri", () => {
    const r = recommend(
      [1, 2, 3, 4].map((i) => c({ id: `o${i}`, isSimulated: true })),
      needs(),
    );
    expect(r).toHaveLength(3);
    expect(r[0].cautions).toContain("Örnek demo verisi");
  });
});
