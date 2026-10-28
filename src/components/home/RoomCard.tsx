import Link from "next/link";
import { STATUS_ICON, STATUS_STYLE, statusTitle, untilText } from "@/lib/labels";
import type { PlaceDTO, ResultDTO } from "@/server/search-service";
import { PlaceGlyph } from "../ui/PlaceGlyph";

const shown = (r: ResultDTO["rating"]) => r.real.overall ?? r.simulated.overall;

/** Durum hapı: ikon + metin (renk tek başına anlam taşımaz). */
export function StatusPill({ status, isLibrary = false }: { status: ResultDTO["status"]; isLibrary?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${STATUS_STYLE[status.code]}`}
    >
      <span aria-hidden="true">{STATUS_ICON[status.code]}</span>
      {statusTitle(status, isLibrary)}
    </span>
  );
}

/** Ana sayfadaki sınıf kartı: tek bakışta oda, bina, durum ve ne zamana kadar boş olduğu. */
export function RoomCard({ r, href }: { r: ResultDTO; href: string }) {
  const rating = shown(r.rating);
  const free = r.status.code === "PROGRAM_FREE" || r.status.code === "VERIFIED_FREE";
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-20 items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 no-underline transition-colors duration-[var(--dur-fast)] hover:border-fg-1"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] leading-7 font-bold">{r.code}</p>
          <p className="truncate text-sm text-fg-2">{r.buildingName}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <StatusPill status={r.status} />
          <span className="text-sm">
            {free && r.freeUntil !== null && untilText(r.freeUntil)}
            {rating !== null && (
              <span className="ml-2 text-fg-2">
                <span aria-hidden="true">★</span> {rating.toFixed(1)}
              </span>
            )}
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Kütüphane / kafe satırı. */
export function PlaceRow({ place, href }: { place: PlaceDTO; href: string }) {
  const rating = shown(place.rating);
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-16 items-center gap-3 rounded-lg border border-line bg-card px-4 py-2.5 no-underline transition-colors duration-[var(--dur-fast)] hover:border-fg-1"
      >
        <PlaceGlyph kind={place.kind} size={26} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold leading-5">{place.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-2">
            <StatusPill status={place.status} isLibrary />
            {place.openingHours === "24/7" && <span>7/24 açık</span>}
            {rating !== null && (
              <span>
                <span aria-hidden="true">★</span> {rating.toFixed(1)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}
