import { describe, expect, it } from "vitest";
import { fold, matchesQuery, searchItems } from "../../src/lib/search";

const items = [
  { id: "1", label: "Ö-102", context: "Örnek Blok" },
  { id: "2", label: "Ö-201", context: "Örnek Blok" },
  { id: "3", label: "Süleyman Demirel Kütüphanesi (Merkez Kütüphane)" },
  { id: "4", label: "Kütüphane Ek Bina" },
  { id: "5", label: "Taş Kafe" },
  { id: "6", label: "Işık Salonu" },
];

describe("arama", () => {
  it("Türkçe karakterleri katlar", () => {
    expect(fold("Ö-102")).toBe("o102");
    expect(fold("ŞIĞÜÇİ ı")).toBe("sigucii");
  });

  it('"o102" Ö-102 odasını bulur', () => {
    expect(searchItems("o102", items).map((i) => i.id)).toEqual(["1"]);
  });

  it('"kutuphane" iki kütüphaneyi bulur, adı sorguyla başlayan önce', () => {
    expect(searchItems("kutuphane", items).map((i) => i.id)).toEqual(["4", "3"]);
  });

  it("bağlam (bina adı) ve çok kelimeli sorgu", () => {
    expect(searchItems("örnek 201", items).map((i) => i.id)).toEqual(["2"]);
    expect(searchItems("ornek", items).map((i) => i.id)).toEqual(["1", "2"]);
  });

  it("büyük I ve ı doğru katlanır; boş sorgu sonuç vermez", () => {
    expect(searchItems("isik", items).map((i) => i.id)).toEqual(["6"]);
    expect(searchItems("  ", items)).toEqual([]);
  });
});

describe("liste süzme", () => {
  it("her kelime metinlerden birinde geçmeli; Türkçe katlama; boş sorgu her şeyi geçirir", () => {
    expect(matchesQuery("o102", "Ö-102", "Örnek Blok")).toBe(true);
    expect(matchesQuery("ornek 201", "Ö-201", "Örnek Blok")).toBe(true);
    expect(matchesQuery("ornek 301", "Ö-201", "Örnek Blok")).toBe(false);
    expect(matchesQuery("kutuphane", "Kütüphane Ek Bina")).toBe(true);
    expect(matchesQuery("  ", "x")).toBe(true);
    expect(matchesQuery("kafe", null, undefined)).toBe(false);
  });
});
