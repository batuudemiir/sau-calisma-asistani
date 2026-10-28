import osm from "../../data/campus/esentepe-osm.json";

// Esentepe kampüsü kataloğu. Konum ve bina sınırları OpenStreetMap'ten (data/campus/esentepe-osm.json),
// hangi binada ne olduğu aşağıdaki kaynaklardan. Kaynağı olmayan bilgi yazılmaz; konumu bulunamayanlar
// MISSING_LOCATIONS listesindedir (docs/CAMPUS_RESEARCH.md).

export type LatLng = [lat: number, lng: number];

export interface OsmBuilding {
  osm: string; // "way/389702261" → https://www.openstreetmap.org/way/389702261
  name: string | null;
  building: string | null;
  amenity: string | null;
  openingHours: string | null;
  levels: number | null;
  center: LatLng;
  outline: LatLng[];
}

export const CAMPUS = osm as unknown as {
  source: string;
  attribution: string;
  license: string;
  boundary: LatLng[];
  buildings: OsmBuilding[];
};

export const OSM_ATTRIBUTION = "© OpenStreetMap katkıda bulunanlar (ODbL)";

export type PlaceCategory = "FACULTY" | "LIBRARY" | "CAFE" | "LAB" | "OTHER";

export interface CampusPlace {
  id: string; // uygulamadaki kimlik (Firestore buildings/spaces)
  name: string;
  category: PlaceCategory;
  osm: string;
  /** Çalışma yeri olarak listelenir (kütüphane, kafe vb.); doluluk yalnızca öğrenci bildirimiyle bilinir. */
  studyPlace?: boolean;
  /** Başka bir üniversiteye ait (ör. SUBÜ) — uygulamada belirtilir. */
  operator?: string;
  /** Haritadaki kısa etiket; tam adın içinde geçer (erişilebilir adla tutarlı). */
  short?: string;
  /** Kaynaklı kısa bilgiler. */
  facts?: { text: string; source: string }[];
}

const OSM = (id: string) => `https://www.openstreetmap.org/${id}`;
const LIB_INFO = "https://adayogrenci.sakarya.edu.tr/v2/?lang=en&pg=syf&sayfa=kutuphaneler&id=58";
const LIB_QUIET = "https://kutuphane.sakarya.edu.tr/tr/duyuru/goster/124101/sessiz-calisma-salonu-akademik-personel-ve-lisansustu-ogrencilere-ozel";

export const CAMPUS_PLACES: CampusPlace[] = [
  // Çalışma yerleri
  {
    id: "kutuphane-merkez",
    name: "Süleyman Demirel Kütüphanesi (Merkez Kütüphane)",
    short: "Merkez Kütüphane",
    category: "LIBRARY",
    osm: "way/389702261",
    studyPlace: true,
    facts: [
      { text: "A Blok 7/24 hizmet verir; yaklaşık 10.000 m², eş zamanlı 1.650 kişi kapasite", source: LIB_INFO },
      { text: "A ve B Blok 1. katlarda çalışma salonları", source: LIB_INFO },
      { text: "B Blok 2. kat sessiz çalışma salonu yalnızca akademik personel ve lisansüstü öğrenciler için (hafta içi 09.00-17.00)", source: LIB_QUIET },
    ],
  },
  { id: "kutuphane-ek-bina", short: "Kütüphane Ek Bina", name: "Kütüphane Ek Bina", category: "LIBRARY", osm: "way/389702294", studyPlace: true },
  { id: "kampus-kafeterya", short: "Kafeterya", name: "Kampüs Kafeterya", category: "CAFE", osm: "way/389702253", studyPlace: true },
  { id: "kantin", short: "Kantin", name: "Kantin", category: "CAFE", osm: "way/389850269", studyPlace: true },
  { id: "tas-kafe", short: "Taş Kafe", name: "Taş Kafe", category: "CAFE", osm: "way/389850270", studyPlace: true },
  { id: "lumo-coffee", short: "Lumo Coffee", name: "Lumo Coffee Sakarya Kampüs", category: "CAFE", osm: "way/1490211563", studyPlace: true },

  // Fakülteler ve öğretim binaları
  { id: "bilisim-fakultesi", short: "Bilişim", name: "Bilgisayar ve Bilişim Bilimleri Fakültesi", category: "FACULTY", osm: "way/1216863645" },
  { id: "fen-edebiyat-fakultesi", short: "Fen Edebiyat", name: "Fen Edebiyat Fakültesi", category: "FACULTY", osm: "way/478724066" },
  { id: "hukuk-fakultesi", short: "Hukuk", name: "Hukuk Fakültesi", category: "FACULTY", osm: "way/1414501693" },
  { id: "ilahiyat-fakultesi", short: "İlahiyat", name: "İlahiyat Fakültesi", category: "FACULTY", osm: "way/1413495022" },
  { id: "sanat-tasarim-mimarlik", short: "Sanat, Tasarım ve Mimarlık", name: "Sanat, Tasarım ve Mimarlık Fakültesi", category: "FACULTY", osm: "way/389712331" },
  { id: "insan-toplum-bilimleri", short: "İnsan ve Toplum", name: "İnsan ve Toplum Bilimleri Fakültesi", category: "FACULTY", osm: "way/389702295" },
  { id: "devlet-konservatuvari", name: "Devlet Konservatuvarı", category: "FACULTY", osm: "way/389702270" },
  { id: "muhendislik-dekanlik", name: "Mühendislik Fakültesi Dekanlığı", category: "FACULTY", osm: "way/389702254" },
  { id: "muhendislik-m2", short: "M2", name: "Mühendislik M2 Binası", category: "FACULTY", osm: "way/389702256" },
  { id: "muhendislik-m4", short: "M4", name: "Mühendislik M4 Binası", category: "FACULTY", osm: "way/389702257" },
  { id: "muhendislik-m6", short: "M6", name: "Mühendislik M6 Binası", category: "FACULTY", osm: "way/389702258" },
  { id: "muhendislik-m7", short: "M7", name: "M7 Makine Mühendisliği", category: "FACULTY", osm: "way/378605210" },
  { id: "insaat-muhendisligi", short: "İnşaat", name: "İnşaat Mühendisliği", category: "FACULTY", osm: "way/389712380" },
  { id: "fen-bilimleri-enstitusu", short: "Fen Bilimleri", name: "Fen Bilimleri Enstitüsü", category: "FACULTY", osm: "way/389702266" },
  { id: "subu-t1", name: "T1", category: "FACULTY", osm: "way/389702269", operator: "Sakarya Uygulamalı Bilimler Üniversitesi" },
  { id: "subu-t3", name: "T3", category: "FACULTY", osm: "way/389712329", operator: "Sakarya Uygulamalı Bilimler Üniversitesi" },
  { id: "subu-t4", name: "T4", category: "FACULTY", osm: "way/505214770", operator: "Sakarya Uygulamalı Bilimler Üniversitesi" },
  {
    id: "subu-spor-bilimleri",
    name: "Spor Bilimleri Fakültesi",
    category: "FACULTY",
    osm: "way/389712325",
    operator: "Sakarya Uygulamalı Bilimler Üniversitesi",
  },

  // Laboratuvar ve araştırma merkezleri
  { id: "baum", name: "Bilgisayar Araştırma ve Uygulama Merkezi", category: "LAB", osm: "way/384965403" },
  { id: "malzeme-yuzey-lab", name: "Malzeme Yüzey Teknolojileri Laboratuvarı", category: "LAB", osm: "way/389702286" },
  { id: "termal-sprey-lab", name: "Termal Sprey Araştırma ve Uygulama Laboratuvarı", category: "LAB", osm: "way/389702273" },

  // Diğer
  { id: "rektorluk", name: "Rektörlük Binası", category: "OTHER", osm: "way/389702260" },
  { id: "kultur-kongre", name: "Kültür ve Kongre Merkezi", category: "OTHER", osm: "way/369677538" },
  { id: "ogrenci-yemekhanesi", name: "Öğrenci Yemekhanesi", category: "OTHER", osm: "way/389702264" },
];

/** Kampüste olduğu bilinen ama konumu açık kaynakta bulunamayanlar — uygulamada konum uydurulmaz. */
export const MISSING_LOCATIONS = [
  "İşletme Fakültesi",
  "Siyasal Bilgiler Fakültesi",
  "İletişim Fakültesi",
  "Sağlık Bilimleri Fakültesi",
  "Mühendislik M1, M3, M5, M8, M9 binaları",
  "Kitap Keyfi (kitap-kahve) — kampüs merkezinde olduğu haberlerde geçiyor, konumu yok",
];

export const osmUrl = OSM;

const byOsm = new Map(CAMPUS.buildings.map((b) => [b.osm, b]));
export const osmBuilding = (osmId: string) => byOsm.get(osmId) ?? null;
export const placeById = (id: string) => CAMPUS_PLACES.find((p) => p.id === id) ?? null;
/** Haritadaki kısa ad; yoksa tam ad. */
export const shortName = (id: string, fallback: string) => placeById(id)?.short ?? fallback;

/** Haritada çizilecek bina şekli (OSM kaydı); kaydı yoksa null. */
export function buildingShape(b: { osm: string | null }) {
  return b.osm ? osmBuilding(b.osm) : null;
}
