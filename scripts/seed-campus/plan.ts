import { CAMPUS_PLACES, osmBuilding } from "../../src/data/campus";
import type { Building, Space } from "../../src/domain/types";

// Kampüs kataloğu → Firestore belgeleri. Gerçek veri (OpenStreetMap + kaynaklı bilgiler); isSimulated=false.
// Çalışma yerleri "spaces" (LIBRARY / STUDY_AREA), diğerleri "buildings" olarak yazılır; derslikler
// ders programı yayımlanınca bu binalara bağlanır (publish --building <id>).

export function campusPlan() {
  const spaces: Space[] = CAMPUS_PLACES.filter((p) => p.studyPlace).map((p) => ({
    id: p.id,
    buildingId: p.id,
    code: p.name,
    kind: p.category === "LIBRARY" ? "LIBRARY" : "STUDY_AREA",
    accessStatus: "UNKNOWN",
    dataQuality: "OK",
    isSimulated: false,
    osm: p.osm,
    openingHours: osmBuilding(p.osm)?.openingHours ?? null,
  }));
  const buildings: Building[] = CAMPUS_PLACES.map((p) => ({
    id: p.id,
    name: p.operator ? `${p.name} (${p.operator})` : p.name,
    campus: "Esentepe",
    isSimulated: false,
    osm: p.osm,
  }));
  return { spaces, buildings };
}
