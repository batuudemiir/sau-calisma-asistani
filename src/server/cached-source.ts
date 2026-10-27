import type { DataSource } from "./data-source";

// Nadiren değişen veriyi (dönem, odalar, binalar, kaynaklar, program blokları) kısa süre bellekte tutar.
// Bildirimler ve puanlar önbelleğe alınmaz: ≤5 sn güncelleme ve "puanım göründü mü" beklentisi bunlara bağlı.
// Yeni yayımlanan program en geç ttlMs sonra görünür.

export const STATIC_TTL_MS = 60_000;

type Cached = { at: number; value: Promise<unknown> };

export function cachedSource(inner: DataSource, ttlMs = STATIC_TTL_MS, now: () => number = Date.now): DataSource {
  const cache = new Map<string, Cached>();

  function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value as Promise<T>;
    const value = load();
    cache.set(key, { at: now(), value });
    // Hata önbellekte kalmasın; bir sonraki istek yeniden denesin
    value.catch(() => cache.delete(key));
    return value;
  }

  return {
    activeTerm: () => memo("term", () => inner.activeTerm()),
    spaces: () => memo("spaces", () => inner.spaces()),
    buildings: () => memo("buildings", () => inner.buildings()),
    publishedSources: (termId) => memo(`sources:${termId}`, () => inner.publishedSources(termId)),
    blocks: (termId, weekday) => memo(`blocks:${termId}:${weekday}`, () => inner.blocks(termId, weekday)),
    reportsSince: (sinceMs, spaceId) => inner.reportsSince(sinceMs, spaceId),
    librarySimulation: () => inner.librarySimulation(),
    ratings: () => inner.ratings(),
  };
}
