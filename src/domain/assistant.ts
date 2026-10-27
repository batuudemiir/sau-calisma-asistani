import { REPORT_TTL_MIN } from "./config";
import type { Criterion } from "./ratings";
import { formatMinute } from "./time";
import type { SpaceKind, Status } from "./types";

/**
 * Asistanın öneri motoru: kural tabanlı, yapay zekâ API'si yok. Her öneri gerekçeleriyle ve bilinmeyenler
 * açıkça yazılarak döner; bilinmeyen bir özellik asla olumlu sayılmaz.
 */

export type LatLng = readonly [lat: number, lng: number];

export const CRITERION_LABELS: Record<Criterion, string> = { quiet: "Sessizlik", power: "Priz", wifi: "İnternet", light: "Işık" };

export interface Candidate {
  id: string;
  name: string;
  /** Bina adı vb. */
  context?: string;
  kind: SpaceKind;
  status: Status;
  /** Programa göre boş kalacağı dakika (gece yarısından); yalnızca derslikler. */
  freeUntil: number | null;
  /** Yeterli değerlendirme yoksa null. */
  averages: Record<Criterion, number> | null;
  location: LatLng | null;
  openingHours: string | null;
  isSimulated: boolean;
}

export type KindPreference = SpaceKind | "ANY";

export interface Needs {
  criteria: readonly Criterion[];
  kind: KindPreference;
  /** Kullanıcının konumu; yalnızca cihazda kullanılır, sunucuya gönderilmez. */
  here: LatLng | null;
}

export interface Recommendation {
  candidate: Candidate;
  score: number;
  /** Olumlu gerekçeler (neden önerildi). */
  reasons: string[];
  /** Dikkat edilmesi gerekenler ve bilinmeyenler. */
  cautions: string[];
  distanceM: number | null;
}

/** Yürüme hızı (m/dk), kaba tahmin. */
export const WALK_M_PER_MIN = 80;

/** İki nokta arası mesafe (metre, haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const STATUS_SCORE: Record<Status["code"], number> = { VERIFIED_FREE: 40, PROGRAM_FREE: 30, UNKNOWN: 10, REPORTED_BUSY: 0 };

function evaluate(c: Candidate, needs: Needs): Recommendation {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = STATUS_SCORE[c.status.code];

  // Çalışma yerinin (kütüphane/kafe) ders programı yoktur; UNKNOWN orada "doluluk bilinmiyor" demektir
  const isPlace = c.kind !== "CLASSROOM";
  switch (c.status.code) {
    case "VERIFIED_FREE":
      reasons.push(`Son ${REPORT_TTL_MIN} dakikada öğrenci "uygun" dedi`);
      break;
    case "PROGRAM_FREE":
      reasons.push(
        c.freeUntil !== null ? `Programa göre ${formatMinute(c.freeUntil)} saatine kadar boş` : "Programda boş görünüyor",
      );
      cautions.push("Gerçekten boş olduğu doğrulanmadı");
      break;
    case "UNKNOWN":
      if (isPlace) {
        score += 10; // çalışma yeri zaten çalışmak için var; yalnızca doluluğu bilinmiyor
        cautions.push("Doluluk bilgisi yok");
      } else cautions.push("Program verisi eksik; durumu bilinmiyor");
      break;
  }

  if (isPlace) {
    if (c.openingHours === "24/7") reasons.push("7/24 açık (OpenStreetMap)");
    else if (c.openingHours) cautions.push(`Açılış saatleri: ${c.openingHours} — gitmeden kontrol et`);
    else cautions.push("Açılış saatleri bilinmiyor");
  }

  for (const k of needs.criteria) {
    const label = CRITERION_LABELS[k];
    const v = c.averages?.[k];
    if (v === undefined) {
      cautions.push(`${label} bilgisi yok (yeterli değerlendirme yok)`);
    } else if (v >= 4) {
      score += 12;
      reasons.push(`${label} iyi: ${v.toFixed(1)}/5`);
    } else if (v >= 3) {
      score += 4;
      reasons.push(`${label} orta: ${v.toFixed(1)}/5`);
    } else {
      score -= 10;
      cautions.push(`${label} zayıf: ${v.toFixed(1)}/5`);
    }
  }

  let dist: number | null = null;
  if (needs.here) {
    if (c.location) {
      dist = Math.round(distanceM(needs.here, c.location));
      score -= dist / 50; // 500 m ≈ 10 puan
      const walk = Math.max(1, Math.round(dist / WALK_M_PER_MIN));
      reasons.push(
        `Yaklaşık ${dist < 1000 ? `${Math.round(dist / 10) * 10} m` : `${(dist / 1000).toFixed(1)} km`} (${walk} dk yürüme)`,
      );
    } else {
      score -= 5; // mesafesi bilinmeyen, ~250 m uzaktaki kadar geride
      cautions.push("Konumu haritada yok; mesafe hesaplanamadı");
    }
  }

  if (c.isSimulated) cautions.push("Örnek demo verisi");
  return { candidate: c, score, reasons, cautions, distanceM: dist };
}

/** Uygun adayları puanlar ve en iyi `limit` tanesini döndürür. Dolu bildirilenler önerilmez. */
export function recommend(candidates: readonly Candidate[], needs: Needs, limit = 3): Recommendation[] {
  return candidates
    .filter((c) => c.status.code !== "REPORTED_BUSY")
    .filter((c) => needs.kind === "ANY" || c.kind === needs.kind)
    .map((c) => evaluate(c, needs))
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, "tr", { numeric: true }))
    .slice(0, limit);
}
