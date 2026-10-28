import type { RatingSummary } from "@/domain/ratings";
import { isOpenDuring } from "@/domain/opening-hours";
import type { SpaceKind, Status } from "@/domain/types";

/** Liste/harita filtreleri. Bilinmeyen hiçbir zaman olumlu sayılmaz: puanı olmayan yer "Sessiz" filtresine girmez. */
export const FILTERS = ["quiet", "power", "open", "verified", "classroom", "library", "cafe"] as const;
export type Filter = (typeof FILTERS)[number];

export const FILTER_LABELS: Record<Filter, string> = {
  quiet: "Sessiz",
  power: "Priz var",
  open: "Bu saatte açık",
  verified: "Öğrenci doğruladı",
  classroom: "Derslik",
  library: "Kütüphane",
  cafe: "Kafe / çalışma alanı",
};

/** Puan eşiği (1-5 ortalama); yeterli değerlendirme yoksa filtreye girmez. */
export const GOOD_SCORE = 4;

export interface Filterable {
  kind: SpaceKind;
  status: Status;
  rating: { real: RatingSummary; simulated: RatingSummary };
  /** Yalnızca çalışma yerlerinde; kaynaklı açılış saati. */
  openingHours?: string | null;
}

export function parseFilters(param: string | null): Filter[] {
  if (!param) return [];
  const set = new Set(param.split(","));
  return FILTERS.filter((f) => set.has(f));
}

/** Gösterilen puan: gerçek yeterliyse o, yoksa (yalnızca demo modunda gelen) simüle. */
const averages = (r: Filterable["rating"]) => r.real.averages ?? r.simulated.averages;

/** Seçilen aralık (haftanın günü, başlangıç ve bitiş dakikası). */
export interface Window {
  weekday: number;
  start: number;
  end: number;
}

function matches(x: Filterable, f: Filter, w?: Window): boolean {
  switch (f) {
    case "quiet":
      return (averages(x.rating)?.quiet ?? 0) >= GOOD_SCORE;
    case "power":
      return (averages(x.rating)?.power ?? 0) >= GOOD_SCORE;
    case "open":
      // Derslikler zaten bina saatlerine göre süzülür. Çalışma yeri: saati seçilen aralığın tamamını kapsamalı;
      // yorumlanamayan ya da bilinmeyen saat açık sayılmaz (aralık verilmezse yalnızca 7/24)
      if (x.kind === "CLASSROOM") return true;
      return w ? isOpenDuring(x.openingHours, w.weekday, w.start, w.end) : x.openingHours === "24/7";
    case "verified":
      return x.status.code === "VERIFIED_FREE";
    default:
      return true;
  }
}

const KIND_FILTER: Record<SpaceKind, Filter> = { CLASSROOM: "classroom", LIBRARY: "library", STUDY_AREA: "cafe" };

/** Tür filtreleri kendi aralarında "veya", diğerleri "ve" ile birleşir. */
export function applyFilters<T extends Filterable>(items: readonly T[], filters: readonly Filter[], w?: Window): T[] {
  const kinds: Filter[] = filters.filter((f) => f === "classroom" || f === "library" || f === "cafe");
  const others = filters.filter((f) => !kinds.includes(f));
  return items.filter((x) => (kinds.length === 0 || kinds.includes(KIND_FILTER[x.kind])) && others.every((f) => matches(x, f, w)));
}
