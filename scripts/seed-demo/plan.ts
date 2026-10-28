import type { Reward } from "../../src/domain/rewards";
import type { Scores } from "../../src/domain/ratings";
import type { ScheduleBlock, Space, Term, Weekday } from "../../src/domain/types";

// Sunum verisi: gerçek fakülte binalarına (OpenStreetMap konumları, src/data/campus.ts) bağlı derslikler ve ders
// programı. Oda kodları, dersler ve puanlar gerçek SAÜ programından alınmamıştır; her kayıt içte isSimulated=true
// taşır. Firebase modunda arayüzde "Örnek demo verisi" etiketiyle görünür; Firebase'siz sunum prototipinde
// (bellek modu) ekip kararıyla etiketsiz gösterilir (CLAUDE.md kural 6).

export const DEMO_REWARDS: Reward[] = [
  {
    id: "ornek-cay",
    title: "Kampüs kafesinde çay",
    partner: "Kampüs kafesi",
    description: "Ay içinde 10 puana ulaşana bir çay.",
    threshold: 10,
    stockPerMonth: 50,
    isSimulated: true,
  },
  {
    id: "ornek-kahve",
    title: "Kampüs kafesinde kahve",
    partner: "Kampüs kafesi",
    description: "Ay içinde 100 puana ulaşana bir kahve.",
    threshold: 100,
    stockPerMonth: 20,
    isSimulated: true,
  },
  {
    id: "ornek-kitap",
    title: "Kitap hediye çeki",
    partner: "Kampüs kitapçısı",
    description: "Ay içinde 250 puana ulaşana kitap çeki.",
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

/** Bina (CAMPUS_PLACES kimliği) → derslikler ve o binada okutulan dersler. */
const FACULTIES: { building: string; prefix: string; rooms: string[]; courses: [string, string][] }[] = [
  {
    building: "bilisim-fakultesi",
    prefix: "BSM",
    rooms: ["BB-101", "BB-102", "BB-103", "BB-104", "BB-201", "BB-202", "BB-203", "BB-204"],
    courses: [
      ["BSM201", "Veri Yapıları"],
      ["BSM205", "Algoritma Analizi"],
      ["BSM301", "Veritabanı Sistemleri"],
      ["BSM303", "Bilgisayar Ağları"],
      ["BSM307", "İşletim Sistemleri"],
    ],
  },
  {
    building: "muhendislik-m2",
    prefix: "MUH",
    rooms: ["M2-101", "M2-102", "M2-103", "M2-201", "M2-202", "M2-203"],
    courses: [
      ["MUH101", "Matematik I"],
      ["MUH103", "Fizik I"],
      ["MUH203", "Diferansiyel Denklemler"],
      ["MUH205", "Mukavemet"],
      ["MUH207", "Termodinamik"],
    ],
  },
  {
    building: "muhendislik-m4",
    prefix: "MUH",
    rooms: ["M4-101", "M4-102", "M4-201", "M4-202", "M4-301"],
    courses: [
      ["EEM201", "Devre Teorisi"],
      ["EEM203", "Elektronik I"],
      ["EEM301", "Sinyaller ve Sistemler"],
      ["MUH105", "Lineer Cebir"],
    ],
  },
  {
    building: "muhendislik-m6",
    prefix: "MUH",
    rooms: ["M6-101", "M6-102", "M6-201", "M6-202"],
    courses: [
      ["MLZ201", "Malzeme Bilimi"],
      ["MLZ205", "Akışkanlar Mekaniği"],
      ["MUH109", "Teknik Resim"],
    ],
  },
  {
    building: "fen-edebiyat-fakultesi",
    prefix: "FEF",
    rooms: ["FE-101", "FE-102", "FE-103", "FE-201", "FE-202", "FE-203", "FE-301"],
    courses: [
      ["KIM101", "Genel Kimya"],
      ["FIZ101", "Genel Fizik"],
      ["MAT101", "Analiz I"],
      ["BIO101", "Genel Biyoloji"],
      ["TDE101", "Türk Dili"],
    ],
  },
  {
    building: "insan-toplum-bilimleri",
    prefix: "ITB",
    rooms: ["İTB-101", "İTB-102", "İTB-201", "İTB-202"],
    courses: [
      ["SOS101", "Sosyolojiye Giriş"],
      ["PSI101", "Psikolojiye Giriş"],
      ["FEL201", "Felsefe Tarihi"],
    ],
  },
  {
    building: "hukuk-fakultesi",
    prefix: "HUK",
    rooms: ["HF-101", "HF-102", "HF-201"],
    courses: [
      ["HUK101", "Anayasa Hukuku"],
      ["HUK103", "Medeni Hukuk"],
      ["HUK105", "Roma Hukuku"],
    ],
  },
];

/** Programı bilinmeyen oda: "Bilinmiyor" durumunu göstermek için. */
const INCOMPLETE_ROOM = "HF-201";

export const roomId = (building: string, code: string) => `${building}-${code}`;

const SLOTS: [number, number][] = [
  [540, 650], // 09.00-10.50
  [660, 770], // 11.00-12.50
  [790, 900], // 13.10-15.00
  [910, 1020], // 15.10-17.00
  [1030, 1140], // 17.10-19.00
];

// Puanlar (sessizlik, priz, internet, ışık): odadan odaya anlamlı farklar
const S = (q: number, p: number, w: number, l: number) => ({ quiet: q, power: p, wifi: w, light: l }) as Scores;
const RATING_PROFILES: Scores[][] = [
  [S(5, 4, 4, 4), S(4, 4, 5, 4), S(5, 3, 4, 5)], // sessiz, prizli
  [S(3, 5, 5, 4), S(2, 5, 4, 4), S(3, 4, 5, 3)], // gürültülü ama prizli
  [S(4, 2, 4, 5), S(5, 2, 3, 4), S(4, 1, 4, 5)], // sessiz, priz az
  [S(4, 4, 3, 3), S(3, 4, 4, 3), S(4, 5, 3, 4), S(4, 3, 3, 3)],
];

export function demoPlan() {
  const spaces: Space[] = [];
  const blocks: (ScheduleBlock & { isSimulated: true })[] = [];
  let ri = 0;
  for (const f of FACULTIES) {
    for (const code of f.rooms) {
      const id = roomId(f.building, code);
      const incomplete = code === INCOMPLETE_ROOM;
      spaces.push({
        id,
        buildingId: f.building,
        code,
        kind: "CLASSROOM",
        accessStatus: "UNKNOWN",
        dataQuality: incomplete ? "INCOMPLETE" : "OK",
        isSimulated: true,
      });
      // Deterministik desen: her oda her iş günü farklı saatlerde 1-3 ders
      if (!incomplete) {
        for (let day = 1; day <= 5; day++) {
          SLOTS.forEach(([start, end], si) => {
            if ((ri + day * 2 + si) % 3 !== 0) return;
            const [courseCode, courseName] = f.courses[(ri + day + si) % f.courses.length];
            blocks.push({
              termId: DEMO_TERM.id,
              sourceId: DEMO_SOURCE_ID,
              sourceStatus: "PUBLISHED",
              spaceId: id,
              weekday: day as Weekday,
              startMinute: start,
              endMinute: end,
              courseCode,
              courseName,
              sourceRef: `${f.prefix} haftalık program`,
              isSimulated: true,
            });
          });
        }
      }
      ri++;
    }
  }

  const source = {
    id: DEMO_SOURCE_ID,
    termId: DEMO_TERM.id,
    department: "Fakülte ders programları",
    url: "",
    format: "XLSX",
    fetchedAt: "2026-10-27T18:00:00+03:00",
    sha256: "0".repeat(64),
    parseMethod: "MANUAL",
    status: "PUBLISHED",
    blockCount: blocks.length,
    flaggedCount: 0,
    reviewedBy: "ekip",
    publishedAt: "2026-10-27T18:00:00+03:00",
    spaceIds: spaces.map((s) => s.id),
    isSimulated: true,
  };

  // Odaların yaklaşık yarısında ve kütüphanede değerlendirme
  const rated = spaces.filter((_, i) => i % 2 === 0).map((s) => s.id);
  const ratings = [...rated, DEMO_LIBRARY.id].flatMap((spaceId, i) =>
    RATING_PROFILES[i % RATING_PROFILES.length].map((scores, j) => ({
      spaceId,
      uid: "ornek-veri",
      checkinReportId: `ornek-${spaceId}-${j}`,
      scores,
      isSimulated: true as const,
    })),
  );

  return { term: DEMO_TERM, library: DEMO_LIBRARY, spaces, blocks, source, ratings };
}
