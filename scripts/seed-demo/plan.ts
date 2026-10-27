import type { Reward } from "../../src/domain/rewards";
import type { Scores } from "../../src/domain/ratings";
import type { Building, ScheduleBlock, Space, Term, Weekday } from "../../src/domain/types";

// Demo verisi: gerçek bir binayı veya programı temsil etmez. Her kayıt isSimulated=true taşır ve
// arayüzde "Örnek demo verisi" etiketiyle görünür. Oda kodları gerçek dersliklerle karışmasın diye "Ö-" önekli.

export const DEMO_BUILDING: Building = { id: "demo-blok", name: "Örnek Blok", campus: "Esentepe", isSimulated: true };
/** Örnek ödüller: sponsor yok; "Örnek demo verisi" etiketiyle gösterilir, kuponları geçersizdir (ORNEK-). */
export const DEMO_REWARDS: Reward[] = [
  {
    id: "ornek-cay",
    title: "Kampüs kafesinde çay",
    partner: "Örnek sponsor (henüz anlaşma yok)",
    description: "Demo için düşük eşikli örnek ödül.",
    threshold: 10,
    stockPerMonth: 50,
    isSimulated: true,
  },
  {
    id: "ornek-kahve",
    title: "Kampüs kafesinde kahve",
    partner: "Örnek sponsor (henüz anlaşma yok)",
    description: "Ay içinde 100 puana ulaşan öğrenciye bir kahve.",
    threshold: 100,
    stockPerMonth: 20,
    isSimulated: true,
  },
  {
    id: "ornek-kitap",
    title: "Kitap hediye çeki",
    partner: "Örnek sponsor (henüz anlaşma yok)",
    description: "Ay içinde 250 puana ulaşan öğrenciye kitap çeki.",
    threshold: 250,
    stockPerMonth: 5,
    isSimulated: true,
  },
];

export const DEMO_SOURCE_ID = "ornek-demo-2026-guz";

export const DEMO_TERM: Term = {
  id: "2026-guz",
  label: "2026-2027 Güz",
  startsOn: "2026-09-21",
  endsOn: "2027-01-15",
  isActive: true,
};

export const DEMO_LIBRARY: Space = {
  id: "kutuphane-merkez",
  buildingId: "kutuphane",
  code: "Merkez Kütüphane",
  kind: "LIBRARY",
  accessStatus: "UNKNOWN",
  dataQuality: "OK",
  isSimulated: false,
};

const ROOMS = ["Ö-101", "Ö-102", "Ö-103", "Ö-104", "Ö-201", "Ö-202", "Ö-203", "Ö-204"];

export function demoPlan() {
  const spaces: Space[] = ROOMS.map((code, i) => ({
    id: `${DEMO_BUILDING.id}-${code}`,
    buildingId: DEMO_BUILDING.id,
    code,
    kind: "CLASSROOM",
    accessStatus: "UNKNOWN",
    // Bir oda kasıtlı olarak eksik veri: UNKNOWN(DATA_INCOMPLETE) durumunu demoda göstermek için
    dataQuality: i === ROOMS.length - 1 ? "INCOMPLETE" : "OK",
    isSimulated: true,
  }));

  // Deterministik desen: her oda her iş günü farklı saatlerde 1-3 ders. Gerçek programla ilgisi yoktur.
  const SLOTS: [number, number][] = [
    [540, 650], // 09.00-10.50
    [660, 770], // 11.00-12.50
    [790, 900], // 13.10-15.00
    [910, 1020], // 15.10-17.00
    [1030, 1140], // 17.10-19.00
  ];
  const blocks: (ScheduleBlock & { isSimulated: true })[] = [];
  spaces.slice(0, -1).forEach((s, ri) => {
    for (let day = 1; day <= 5; day++) {
      SLOTS.forEach(([start, end], si) => {
        if ((ri + day * 2 + si) % 3 !== 0) return;
        blocks.push({
          termId: DEMO_TERM.id,
          sourceId: DEMO_SOURCE_ID,
          sourceStatus: "PUBLISHED",
          spaceId: s.id,
          weekday: day as Weekday,
          startMinute: start,
          endMinute: end,
          courseCode: `ORN${100 + ri * 10 + si}`,
          courseName: "Örnek ders",
          sourceRef: "örnek veri",
          isSimulated: true,
        });
      });
    }
  });

  const source = {
    id: DEMO_SOURCE_ID,
    termId: DEMO_TERM.id,
    department: "Örnek demo",
    url: "",
    format: "XLSX",
    fetchedAt: "2026-10-27T18:00:00+03:00",
    sha256: "0".repeat(64),
    parseMethod: "MANUAL",
    status: "PUBLISHED",
    blockCount: blocks.length,
    flaggedCount: 0,
    reviewedBy: "örnek veri",
    publishedAt: "2026-10-27T18:00:00+03:00",
    spaceIds: spaces.map((s) => s.id),
    isSimulated: true,
  };

  // Örnek puanlar: bazı odalarda 3+ (ortalama görünür), birinde 2 ("yetersiz" durumu görünür)
  const S = (q: number, p: number, w: number, l: number) => ({ quiet: q, power: p, wifi: w, light: l }) as Scores;
  const RATINGS: [string, Scores[]][] = [
    ["Ö-102", [S(5, 3, 4, 4), S(4, 2, 4, 5), S(5, 3, 3, 4), S(4, 2, 4, 4)]],
    ["Ö-103", [S(3, 5, 5, 3), S(2, 4, 5, 3), S(3, 5, 4, 4)]],
    ["Ö-201", [S(4, 4, 4, 4), S(5, 5, 4, 4)]],
    ["Merkez Kütüphane", [S(2, 4, 5, 5), S(3, 3, 5, 5), S(2, 4, 4, 5)]],
  ];
  const ratings = RATINGS.flatMap(([code, list]) =>
    list.map((scores, i) => ({
      spaceId: code === DEMO_LIBRARY.code ? DEMO_LIBRARY.id : `${DEMO_BUILDING.id}-${code}`,
      uid: "ornek-veri",
      checkinReportId: `ornek-${code}-${i}`,
      scores,
      isSimulated: true as const,
    })),
  );

  return { building: DEMO_BUILDING, term: DEMO_TERM, library: DEMO_LIBRARY, spaces, blocks, source, ratings };
}
