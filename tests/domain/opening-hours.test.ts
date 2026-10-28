import { describe, expect, it } from "vitest";
import { hoursOn, isOpenDuring, parseOpeningHours } from "../../src/domain/opening-hours";

describe("açılış saatleri (OSM basit biçim)", () => {
  it("7/24 ve gün aralıkları okunur; bilinmeyen biçim null", () => {
    expect(parseOpeningHours("24/7")).toBe("ALWAYS");
    const h = parseOpeningHours("Mo-Fr 08:00-20:00; Sa 10:00-16:00");
    expect(h).not.toBe("ALWAYS");
    expect((h as Map<number, [number, number]>).get(5)).toEqual([480, 1200]);
    expect((h as Map<number, [number, number]>).get(6)).toEqual([600, 960]);
    expect((h as Map<number, [number, number]>).has(7)).toBe(false);
    expect(parseOpeningHours("Mo-Fr 08:00-20:00 off")).toBeNull();
    expect(parseOpeningHours("Fr-Mo 08:00-12:00")).not.toBeNull(); // haftayı saran aralık
    expect(parseOpeningHours(null)).toBeNull();
  });

  it("seçilen aralığın tamamında açık mı; bilinmiyorsa açık sayılmaz", () => {
    expect(isOpenDuring("Mo-Fr 08:00-20:00", 3, 780, 900)).toBe(true);
    expect(isOpenDuring("Mo-Fr 08:00-20:00", 3, 1140, 1260)).toBe(false); // 19.00-21.00 kapanışı aşar
    expect(isOpenDuring("Mo-Fr 08:00-20:00", 6, 780, 900)).toBe(false); // cumartesi
    expect(isOpenDuring("24/7", 7, 0, 1439)).toBe(true);
    expect(isOpenDuring("sunrise-sunset", 3, 780, 900)).toBe(false);
    expect(isOpenDuring(null, 3, 780, 900)).toBe(false);
  });

  it("o günün saatleri metin olarak", () => {
    expect(hoursOn("Mo-Fr 08:30-19:00", 2)).toBe("08.30–19.00");
    expect(hoursOn("Mo-Fr 08:30-19:00", 7)).toBe("kapalı");
    expect(hoursOn("24/7", 7)).toBe("7/24");
    expect(hoursOn("garip", 1)).toBeNull();
  });
});
