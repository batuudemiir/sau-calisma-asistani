import Link from "next/link";
import { LIBRARY_LEVEL_LABELS, ago } from "@/lib/labels";
import type { PlaceDTO } from "@/server/search-service";
import { RatingChip } from "./Ratings";
import { SimulatedBadge, StatusBadge } from "./StatusBadge";

/** OSM opening_hours değerini kaynağıyla birlikte gösterir; bilinmiyorsa uydurmaz. */
export function openingHoursText(h: string | null): string | null {
  if (!h) return null;
  return h === "24/7" ? "7/24 açık (OpenStreetMap)" : `Açılış saatleri: ${h} (OpenStreetMap)`;
}

export function PlaceCard({ place, href, nowMs, compact = false }: { place: PlaceDTO; href: string; nowMs: number; compact?: boolean }) {
  const hours = openingHoursText(place.openingHours);
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 ${compact ? "border-zinc-300 dark:border-zinc-700" : "border-2 border-zinc-400 dark:border-zinc-500"}`}
    >
      <h3 className={compact ? "text-lg font-bold" : "text-xl font-bold"}>{place.name}</h3>
      <div className="mt-2">
        <StatusBadge status={place.status} isLibrary />
      </div>
      {hours && <p className="mt-2 text-sm">{hours}</p>}
      {place.simulation && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Yoğunluk: <strong>{LIBRARY_LEVEL_LABELS[place.simulation.level]}</strong> ·{" "}
            {place.simulation.pattern === "DAILY"
              ? "gün içi örnek desen"
              : ago(Math.max(0, Math.floor((nowMs - place.simulation.updatedAtMs) / 60_000)))}
          </span>
          <SimulatedBadge />
        </p>
      )}
      <div className="mt-2">
        <RatingChip rating={place.rating} />
      </div>
    </Link>
  );
}
