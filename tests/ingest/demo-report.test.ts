import { describe, expect, it } from "vitest";
import { demoReport, resolveSpace } from "../../scripts/demo-report/plan";
import { space } from "../domain/fixtures";

const spaces = [space("A204"), space("Ö-102"), { ...space("A204"), id: "baska-bina-A204", buildingId: "baska-bina" }];

describe("demo-report", () => {
  it("oda kodu esnek eşleşir; Türkçe tür adları; her zaman isSimulated", () => {
    const r = demoReport(spaces, "ö 102", "Dolu", 1_000_000, 2);
    expect(r).toEqual({ spaceId: "isletme-a-Ö-102", code: "Ö-102", type: "BUSY", uid: "ornek-veri", createdAtMs: 1_000_000 - 120_000, isSimulated: true });
    expect(demoReport(spaces, "isletme-a-Ö-102", "güncel değil", 0).type).toBe("OUTDATED");
    expect(demoReport(spaces, "isletme-a-Ö-102", "kullanılamıyor", 0).type).toBe("UNUSABLE");
  });

  it("belirsiz kod, bilinmeyen oda/tür ve 30 dk'dan eski zaman reddedilir", () => {
    expect(() => resolveSpace(spaces, "A204")).toThrow(/birden fazla/);
    expect(() => resolveSpace(spaces, "Z9")).toThrow(/bulunamadı/);
    expect(() => demoReport(spaces, "Ö-102", "belki", 0)).toThrow(/Bilinmeyen tür/);
    expect(() => demoReport(spaces, "Ö-102", "dolu", 0, 45)).toThrow(/0-30/);
  });
});
