import type { ReportType } from "@/domain/types";
import type { RateDecision, RecentWrite } from "./rate-limit";

export interface NewReport {
  spaceId: string;
  type: ReportType;
  uid: string;
  createdAtMs: number;
}

export type WriteResult = RateDecision & { id?: string };

/** Sunucu tarafı yazmalar. Okuma + karar + yazma atomiktir (yarış durumunda hız sınırı aşılmaz). */
export interface WriteStore {
  spaceExists(spaceId: string): Promise<boolean>;
  addReport(report: NewReport, sinceMs: number, decide: (recent: RecentWrite[]) => RateDecision): Promise<WriteResult>;
}
