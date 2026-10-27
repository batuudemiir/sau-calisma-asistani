import { describe, expect, it } from "vitest";
import { simulatedLibraryLevel } from "../../src/domain/library-simulation";
import { hm } from "./fixtures";

describe("örnek kütüphane deseni", () => {
  it("gün içi seviyeler, sınırlar dahil", () => {
    expect(simulatedLibraryLevel(hm(8, 59))).toBe("LOW");
    expect(simulatedLibraryLevel(hm(9))).toBe("MEDIUM");
    expect(simulatedLibraryLevel(hm(13))).toBe("BUSY");
    expect(simulatedLibraryLevel(hm(17))).toBe("MEDIUM");
    expect(simulatedLibraryLevel(hm(21))).toBe("LOW");
  });
});
