import { describe, expect, it } from "vitest";
import { claimBlock, couponCode, monthPointsFor, type ClaimInput, type Reward } from "../../src/domain/rewards";

const coffee: Reward = {
  id: "kahve",
  title: "Kahve",
  partner: "Örnek sponsor",
  description: "",
  threshold: 100,
  stockPerMonth: 2,
  isSimulated: true,
};
const input = (over: Partial<ClaimInput> = {}): ClaimInput => ({
  reward: coffee,
  student: true,
  monthPoints: 120,
  alreadyClaimed: false,
  claimedCount: 0,
  ...over,
});

describe("aylık ödüller", () => {
  it("eşiğe ulaşan öğrenci alabilir", () => {
    expect(claimBlock(input())).toBeNull();
    expect(claimBlock(input({ monthPoints: 100 }))).toBeNull();
  });

  it("puan yetmezse, öğrenci değilse, bu ay aldıysa veya stok bittiyse alamaz", () => {
    expect(claimBlock(input({ monthPoints: 99 }))).toBe("NOT_ENOUGH_POINTS");
    expect(claimBlock(input({ student: false }))).toBe("NOT_STUDENT");
    expect(claimBlock(input({ alreadyClaimed: true }))).toBe("ALREADY_CLAIMED");
    expect(claimBlock(input({ claimedCount: 2 }))).toBe("OUT_OF_STOCK");
  });

  it("aylık puan yalnızca aynı ay için geçerli", () => {
    expect(monthPointsFor({ monthKey: "2026-10", monthPoints: 80 }, "2026-10")).toBe(80);
    expect(monthPointsFor({ monthKey: "2026-09", monthPoints: 80 }, "2026-10")).toBe(0);
  });

  it("örnek ödülün kuponu ORNEK- ile başlar; biçim sabit", () => {
    expect(couponCode("a1b2c3d4e5", true)).toBe("ORNEK-A1B2-C3D4");
    expect(couponCode("ff", false)).toBe("SAU-FF00-0000");
  });
});
