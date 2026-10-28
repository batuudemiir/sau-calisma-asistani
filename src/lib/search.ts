/** İstemci araması: Türkçe karakter katlamalı, ek paket yok. "o102" → Ö-102, "kutuphane" → Kütüphane. */
const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

export function fold(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/i̇|[çğıöşüâîû]/g, (c) => FOLD[c] ?? c)
    .replace(/[^a-z0-9]+/g, "");
}

export interface SearchItem {
  id: string;
  label: string;
  /** Aramaya katılan ek metin (bina adı vb.). */
  context?: string;
}

/**
 * Eşleşenler, en iyi eşleşme önce: ad tam eşleşme > ad başı > ad içinde > bağlamda.
 * Sorgunun her kelimesi ad + bağlamda geçmelidir ("örnek 102" → Örnek Blok Ö-102).
 */
export function searchItems<T extends SearchItem>(query: string, items: readonly T[], limit = 8): T[] {
  const words = query.split(/\s+/).map(fold).filter(Boolean);
  if (words.length === 0) return [];
  const whole = words.join("");
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const label = fold(item.label);
    const all = label + fold(item.context ?? "");
    if (!words.every((w) => all.includes(w))) continue;
    const score = label === whole ? 0 : label.startsWith(whole) ? 1 : label.includes(whole) ? 2 : 3;
    scored.push({ item, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label, "tr", { numeric: true }))
    .slice(0, limit)
    .map((s) => s.item);
}

/** Listeyi süzmek için: sorgunun her kelimesi metinlerden birinde geçmeli (Türkçe katlamalı). Boş sorgu her şeyi geçirir. */
export function matchesQuery(query: string, ...texts: (string | null | undefined)[]): boolean {
  const words = query.split(/\s+/).map(fold).filter(Boolean);
  if (words.length === 0) return true;
  const all = texts.map((t) => fold(t ?? "")).join(" ");
  return words.every((w) => all.includes(w));
}
