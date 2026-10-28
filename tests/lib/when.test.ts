import { describe, expect, it } from "vitest";
import { dayOptions, endOptions, nextOpenWindow, startOptions, whenFrom, whenQuery, windowText } from "../../src/lib/when";

const at = (h: number, m = 0) => Date.UTC(2026, 9, 28, h - 3, m); // Çarşamba 28 Ekim, İstanbul saati

describe("arama zamanı (gün + saat aralığı)", () => {
  it("URL'den okunur; at yoksa başlangıç şimdi", () => {
    const now = at(10, 20);
    expect(whenFrom(new URLSearchParams("d=90"), now)).toMatchObject({ dateISO: "2026-10-28", start: null, end: 710, nowMinute: 620 });
    expect(whenFrom(new URLSearchParams("at=2026-10-29T13:00&d=120"), now)).toMatchObject({ dateISO: "2026-10-29", start: 780, end: 900 });
  });

  it("URL'ye yazılır: şimdi için at silinir, süre bitişten hesaplanır", () => {
    expect(whenQuery({ dateISO: "2026-10-28", start: null, end: 720, nowMinute: 620 })).toEqual({ at: "", d: "100" });
    expect(whenQuery({ dateISO: "2026-10-29", start: 780, end: 900, nowMinute: 620 })).toEqual({ at: "2026-10-29T13:00", d: "120" });
  });

  it("günler: Bugün, Yarın, sonra kısa gün adı", () => {
    expect(dayOptions(at(10), 4).map((d) => d.label)).toEqual(["Bugün", "Yarın", "Cum 30", "Cmt 31"]);
  });

  it("başlangıç bugün geçmiş saatleri içermez; bitiş başlangıçtan sonra ve en geç 22.00", () => {
    const w = { todayISO: "2026-10-28", nowMinute: 620 };
    expect(startOptions("2026-10-28", w)[0]).toBe(630); // 10.30
    expect(startOptions("2026-10-29", w)[0]).toBe(480); // 08.00
    expect(startOptions("2026-10-29", w).at(-1)).toBe(1290); // 21.30
    expect(endOptions(780)).toEqual(expect.arrayContaining([810, 840, 1320]));
    expect(endOptions(780)[0]).toBe(810);
    expect(endOptions(625)[0]).toBe(660); // şimdi 10.25 → ilk bitiş 11.00
  });

  it("aralık metni ve kapalıyken önerilen aralık", () => {
    expect(windowText("2026-10-29", "Perşembe", 780, 900)).toBe("Perşembe 29 Ekim · 13.00–15.00");
    expect(nextOpenWindow(at(23))).toEqual({ at: "2026-10-29T09:00", d: "120", label: "Yarın 09.00–11.00" });
    expect(nextOpenWindow(at(6))).toEqual({ at: "2026-10-28T09:00", d: "120", label: "Bugün 09.00–11.00" });
  });
});
