import { describe, expect, it } from "vitest";
import { hoursText, openingHoursText } from "../../src/lib/opening-hours";

describe("açılış saatleri metni", () => {
  it("Türkçe, ardışık günler gruplanır", () => {
    expect(hoursText("Mo-Fr 08:00-20:00")).toBe("Pzt–Cum 08.00–20.00");
    expect(hoursText("Mo-Fr 08:00-20:00; Sa 10:00-16:00")).toBe("Pzt–Cum 08.00–20.00, Cmt 10.00–16.00");
    expect(hoursText("24/7")).toBe("7/24 açık");
    expect(hoursText("sunrise-sunset")).toBe("sunrise-sunset");
  });
  it("kaynak yalnızca OSM kaydında", () => {
    expect(openingHoursText("24/7")).toBe("7/24 açık (OpenStreetMap)");
    expect(openingHoursText("Mo-Fr 08:30-19:00", false)).toBe("Açılış saatleri: Pzt–Cum 08.30–19.00");
    expect(openingHoursText(null)).toBeNull();
  });
});
