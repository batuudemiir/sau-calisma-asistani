import { describe, expect, it } from "vitest";
import { qrToken, qrUrl, verifyQrToken } from "../../src/server/qr";

describe("sınıf QR kodu", () => {
  it("aynı alan ve anahtar aynı kodu üretir; doğrulanır", () => {
    const t = qrToken("demo-blok-Ö-102", "gizli");
    expect(t).toHaveLength(22);
    expect(verifyQrToken("demo-blok-Ö-102", t, "gizli")).toBe(true);
  });

  it("başka alanın kodu, başka anahtar ve bozuk kod reddedilir", () => {
    const t = qrToken("demo-blok-Ö-102", "gizli");
    expect(verifyQrToken("demo-blok-Ö-103", t, "gizli")).toBe(false);
    expect(verifyQrToken("demo-blok-Ö-102", t, "baska")).toBe(false);
    expect(verifyQrToken("demo-blok-Ö-102", t.slice(0, -1), "gizli")).toBe(false);
    expect(verifyQrToken("demo-blok-Ö-102", "", "gizli")).toBe(false);
  });

  it("basılacak adres", () => {
    expect(qrUrl("https://ornek.app/", "a b", "k")).toBe(`https://ornek.app/qr/a%20b/${qrToken("a b", "k")}`);
  });
});
