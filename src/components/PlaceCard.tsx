import Link from "next/link";
import { LIBRARY_LEVEL_LABELS, ago } from "@/lib/labels";
import type { PlaceDTO } from "@/server/search-service";
import { RatingChip } from "./Ratings";
import { PlaceGlyph } from "./ui/PlaceGlyph";
import { SimulatedBadge, StatusBadge } from "./StatusBadge";

/** OSM opening_hours değerini kaynağıyla birlikte gösterir; bilinmiyorsa uydurmaz. */
export function openingHoursText(h: string | null): string | null {
  if (!h) return null;
  return h === "24/7" ? "7/24 açık (OpenStreetMap)" : `Açılış saatleri: ${h} (OpenStreetMap)`;
}

export function PlaceCard({
  place,
  href,
  nowMs,
  compact = false,
}: {
  place: PlaceDTO;
  href: string;
  nowMs: number;
  compact?: boolean;
}) {
  const hours = openingHoursText(place.openingHours);
  return (
    <Link
      href={href}
      className={`block rounded-lg bg-card p-4 transition-colors duration-[var(--dur-fast)] hover:border-fg-1 ${compact ? "border border-line" : "border-2 border-ink-900 dark:border-fg-1"}`}
    >
      <div className="flex items-center gap-3">
        <PlaceGlyph kind={place.kind} size={compact ? 24 : 28} />
        <h3 className={compact ? "text-lg leading-6 font-bold" : "text-xl leading-7 font-bold"}>{place.name}</h3>
      </div>
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
