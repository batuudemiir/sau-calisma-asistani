import { describe, expect, it } from "vitest";
import { untilText } from "../../src/lib/labels";

describe("untilText", () => {
  it("saatin okunuşuna göre doğru ek", () => {
    expect(untilText(17 * 60)).toBe("17.00'ye kadar");
    expect(untilText(15 * 60)).toBe("15.00'e kadar");
    expect(untilText(16 * 60)).toBe("16.00'ya kadar");
    expect(untilText(19 * 60)).toBe("19.00'a kadar");
    expect(untilText(22 * 60)).toBe("22.00'ye kadar");
    expect(untilText(15 * 60 + 10)).toBe("15.10'a kadar");
    expect(untilText(12 * 60 + 50)).toBe("12.50'ye kadar");
    expect(untilText(13 * 60 + 5)).toBe("13.05'e kadar");
  });
});
