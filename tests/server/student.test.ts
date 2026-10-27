import { describe, expect, it } from "vitest";
import { checkStudent } from "../../src/server/student";

const google = (email?: string) => [{ providerId: "google.com", email }];

describe("öğrenci hesabı kontrolü", () => {
  it("@ogr.sakarya.edu.tr Google hesabı kabul (büyük/küçük harf fark etmez)", () => {
    expect(checkStudent(google("b123@ogr.sakarya.edu.tr"))).toEqual({ ok: true });
    expect(checkStudent(google("B123@OGR.SAKARYA.EDU.TR"))).toEqual({ ok: true });
  });

  it("başka alan, personel alanı, benzer alan, e-postasız ve Google'sız hesap reddedilir", () => {
    expect(checkStudent(google("a@gmail.com"))).toMatchObject({ ok: false, error: expect.stringContaining("SAÜ öğrenci") });
    expect(checkStudent(google("a@sakarya.edu.tr")).ok).toBe(false);
    expect(checkStudent(google("a@ogr.sakarya.edu.tr.evil.com")).ok).toBe(false);
    expect(checkStudent(google("a@xogr.sakarya.edu.tr")).ok).toBe(false);
    expect(checkStudent(google()).ok).toBe(false);
    expect(checkStudent([]).ok).toBe(false);
    // Başka sağlayıcıdaki SAÜ adresi yetmez
    expect(checkStudent([{ providerId: "password", email: "a@ogr.sakarya.edu.tr" }]).ok).toBe(false);
  });
});
