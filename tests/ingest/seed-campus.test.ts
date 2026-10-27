import { describe, expect, it } from "vitest";
import { campusPlan } from "../../scripts/seed-campus/plan";

describe("seed-campus planı", () => {
  it("çalışma yerleri gerçek veri, kütüphaneler LIBRARY; açılış saati yalnızca OSM'de varsa", () => {
    const { spaces, buildings } = campusPlan();
    expect(spaces.every((s) => !s.isSimulated && s.osm)).toBe(true);
    const lib = spaces.find((s) => s.id === "kutuphane-merkez")!;
    expect(lib).toMatchObject({ kind: "LIBRARY", openingHours: "24/7", osm: "way/389702261" });
    expect(spaces.find((s) => s.id === "tas-kafe")).toMatchObject({ kind: "STUDY_AREA", openingHours: null });
    expect(buildings.find((b) => b.id === "subu-t1")?.name).toContain("Sakarya Uygulamalı Bilimler Üniversitesi");
  });
});
