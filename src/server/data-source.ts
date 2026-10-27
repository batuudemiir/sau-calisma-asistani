import type { Building, LibrarySimulation, ScheduleBlock, Space, SpaceReport, Term } from "@/domain/types";

/** Yayımlanmış bir program kaynağının arayüzde gösterilen özeti. */
export interface SourceSummary {
  id: string;
  department: string;
  url: string;
  spaceIds: string[];
  isSimulated: boolean;
}

/** Arama servisinin ihtiyaç duyduğu okuma işlemleri. Firestore uygulaması ve testlerde bellek içi sahte uygulama vardır. */
export interface DataSource {
  activeTerm(): Promise<Term | null>;
  spaces(): Promise<Space[]>;
  buildings(): Promise<Building[]>;
  publishedSources(termId: string): Promise<SourceSummary[]>;
  blocks(termId: string, weekday: number): Promise<ScheduleBlock[]>;
  reportsSince(sinceMs: number, spaceId?: string): Promise<SpaceReport[]>;
  librarySimulation(): Promise<LibrarySimulation | null>;
}
