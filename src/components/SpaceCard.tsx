import Link from "next/link";
import { ACCESS_UNVERIFIED_LABEL } from "@/domain/types";
import { time } from "@/lib/labels";
import type { ResultDTO } from "@/server/search-service";
import { RatingChip } from "./Ratings";
import { SimulatedBadge, StatusBadge } from "./StatusBadge";

export function SpaceCard({ r, href }: { r: ResultDTO; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border border-zinc-300 p-4 focus-visible:outline-3 focus-visible:outline-offset-2 dark:border-zinc-700"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">{r.code}</h2>
          <span className="text-sm opacity-80">{r.buildingName}</span>
        </div>
        <div className="mt-2">
          <StatusBadge status={r.status} />
        </div>
        <SpaceFacts r={r} />
        <div className="mt-2">
          <RatingChip rating={r.rating} />
        </div>
      </Link>
    </li>
  );
}

export function SpaceFacts({ r }: { r: ResultDTO }) {
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {r.freeUntil !== null && <li>{time(r.freeUntil)} saatine kadar boş (programa göre)</li>}
      {r.freeUntil !== null &&
        (r.nextClass ? (
          <li>
            Sonraki ders: {time(r.nextClass.startMinute)} · {r.nextClass.courseCode} {r.nextClass.courseName}
          </li>
        ) : (
          <li>Bugün başka ders yok (programa göre)</li>
        ))}
      {r.source && (
        <li className="opacity-80">
          Kaynak: {r.source.department} · {r.source.termLabel} programı
          {r.source.isManual && !r.source.isSimulated && " (ekip tarafından elle derlenmiş)"}
        </li>
      )}
      {r.accessStatus !== "OPEN" && <li className="opacity-80">{ACCESS_UNVERIFIED_LABEL}</li>}
      {(r.isSimulated || r.source?.isSimulated) && (
        <li>
          <SimulatedBadge />
        </li>
      )}
    </ul>
  );
}
