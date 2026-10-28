import { ACCESS_UNVERIFIED_LABEL } from "@/domain/types";
import { time } from "@/lib/labels";
import type { ResultDTO } from "@/server/search-service";
import { SimulatedBadge } from "./StatusBadge";

export function SpaceFacts({ r }: { r: ResultDTO }) {
  // Kısmi kaynakta (kişisel programlar) yalnızca bilinen dersler var: "boş" denmez, "bilinen ders yok" denir
  const partial = r.source?.isPartial ?? false;
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {r.freeUntil !== null &&
        (partial ? (
          <li>{time(r.freeUntil)} saatine kadar bilinen ders yok</li>
        ) : (
          <li>{time(r.freeUntil)} saatine kadar boş (programa göre)</li>
        ))}
      {r.freeUntil !== null &&
        (r.nextClass ? (
          <li>
            {partial ? "Bilinen sonraki ders" : "Sonraki ders"}: {time(r.nextClass.startMinute)} · {r.nextClass.courseCode}{" "}
            {r.nextClass.courseName}
          </li>
        ) : (
          <li>{partial ? "Bugün bilinen başka ders yok" : "Bugün başka ders yok (programa göre)"}</li>
        ))}
      {r.source && (
        <li className="text-fg-2">
          Kaynak: {r.source.department} · {r.source.termLabel}
          {partial ? " · ekibin kişisel programları (kısmi)" : " programı"}
          {r.source.isManual && !r.source.isSimulated && !partial && " (ekip tarafından elle derlenmiş)"}
        </li>
      )}
      {r.accessStatus !== "OPEN" && <li className="text-fg-2">{ACCESS_UNVERIFIED_LABEL}</li>}
      {(r.isSimulated || r.source?.isSimulated) && (
        <li>
          <SimulatedBadge />
        </li>
      )}
    </ul>
  );
}
