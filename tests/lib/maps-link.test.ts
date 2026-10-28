import { describe, expect, it } from "vitest";
import { directionsUrl } from "../../src/lib/maps-link";

describe("Google Haritalar yol tarifi", () => {
  it("yürüyerek, hedef koordinatla", () => {
    expect(directionsUrl([40.7425, 30.3325])).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=40.742500,30.332500&travelmode=walking",
    );
  });
});
