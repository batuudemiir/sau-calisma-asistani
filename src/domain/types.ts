// Domain tipleri. Firestore/React bilmez; zamanlar epoch ms veya gece yarısından itibaren dakika.

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Pazartesi=1 … Pazar=7

export type SpaceKind = "CLASSROOM" | "LIBRARY" | "STUDY_AREA";
export type AccessStatus = "OPEN" | "RESTRICTED" | "UNKNOWN";
export type DataQuality = "OK" | "INCOMPLETE";
export type SourceStatus = "PUBLISHED" | "SUPERSEDED";
export type ReportType = "AVAILABLE" | "BUSY" | "UNUSABLE" | "OUTDATED";

export interface Term {
  id: string;
  label: string;
  startsOn: string; // YYYY-MM-DD, dahil
  endsOn: string; // YYYY-MM-DD, dahil
  isActive: boolean;
}

export interface Building {
  id: string;
  name: string;
  campus: string;
  isSimulated: boolean;
  /** OpenStreetMap kaydı ("way/123"); konum ve bina sınırı buradan çizilir. */
  osm?: string | null;
}

export interface Space {
  id: string;
  buildingId: string;
  code: string;
  kind: SpaceKind;
  accessStatus: AccessStatus;
  dataQuality: DataQuality;
  isSimulated: boolean;
  /** Çalışma yerleri (LIBRARY, STUDY_AREA) için OSM kaydı ve açılış saatleri (kaynağında yazdığı gibi). */
  osm?: string | null;
  openingHours?: string | null;
}

export interface ScheduleBlock {
  termId: string;
  sourceId: string;
  sourceStatus: SourceStatus;
  spaceId: string;
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
  courseCode: string;
  courseName: string;
  sourceRef: string;
}

export interface SpaceReport {
  spaceId: string;
  type: ReportType;
  uid: string;
  createdAtMs: number;
  isSimulated: boolean;
}

/** Europe/Istanbul'a göre "şimdi". Motor saati kendisi okumaz. */
export interface LocalTime {
  dateISO: string; // YYYY-MM-DD
  weekday: Weekday;
  minute: number; // gece yarısından itibaren
}

export type StatusCode = "VERIFIED_FREE" | "PROGRAM_FREE" | "UNKNOWN" | "REPORTED_BUSY";

export type UnknownReason =
  | "NO_SOURCE"
  | "STALE_SOURCE"
  | "DATA_INCOMPLETE"
  | "CONFLICTING_REPORTS"
  | "REPORTED_OUTDATED"
  /** Oda yalnızca kısmi bir kaynakta (ör. ekibin kişisel programları) geçiyor: bilinen dersler dışında durum bilinmiyor. */
  | "PARTIAL_SOURCE";

export type Status =
  // simulated: kararı veren bildirim "Örnek demo verisi" ise true (yalnızca DEMO_MODE'da oluşabilir)
  | { code: "VERIFIED_FREE"; minutesAgo: number; reportCount: number; simulated?: true }
  | { code: "PROGRAM_FREE" }
  | { code: "UNKNOWN"; reason: UnknownReason }
  | { code: "REPORTED_BUSY"; minutesAgo: number; reportType: "BUSY" | "UNUSABLE"; simulated?: true };

export interface NextClass {
  courseCode: string;
  courseName: string;
  startMinute: number;
  endMinute: number;
  sourceId: string;
  sourceRef: string;
}

export interface SpaceResult {
  space: Space;
  status: Status;
  freeUntil: number | null; // UNKNOWN için null
  nextClass: NextClass | null;
}

export type LibraryLevel = "LOW" | "MEDIUM" | "BUSY";

export interface LibrarySimulation {
  level: LibraryLevel;
  /** DAILY: seviye kayıttan değil, örnek gün içi desenden (program saatine göre) hesaplanır. */
  pattern?: "DAILY";
  updatedAtMs: number;
  isSimulated: true;
}

export interface LibraryResult {
  space: Space;
  status: Status;
  simulation: LibrarySimulation | null; // yalnızca DEMO_MODE açıkken
}

export const STATUS_LABELS: Record<StatusCode, string> = {
  VERIFIED_FREE: "Öğrenci doğruladı",
  PROGRAM_FREE: "Programda boş",
  UNKNOWN: "Durum bilinmiyor",
  REPORTED_BUSY: "Dolu bildirildi",
};

export const UNKNOWN_REASON_LABELS: Record<UnknownReason, string> = {
  NO_SOURCE: "Program kaynağı yok",
  STALE_SOURCE: "Program dönemi güncel değil",
  DATA_INCOMPLETE: "Program verisi eksik",
  CONFLICTING_REPORTS: "Bildirimler çelişkili",
  REPORTED_OUTDATED: "Bilgi güncel değil bildirildi",
  PARTIAL_SOURCE: "Program kısmi: yalnızca bilinen dersler",
};

export const LIBRARY_NO_DATA_LABEL = "Doluluk verisi yok";
export const SIMULATED_LABEL = "Örnek demo verisi";
export const ACCESS_UNVERIFIED_LABEL = "Erişim durumu doğrulanmadı";
