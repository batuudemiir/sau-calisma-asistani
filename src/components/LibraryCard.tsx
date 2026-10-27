import Link from "next/link";
import { LIBRARY_LEVEL_LABELS, ago } from "@/lib/labels";
import type { LibraryDTO } from "@/server/search-service";
import { RatingChip } from "./Ratings";
import { SimulatedBadge, StatusBadge } from "./StatusBadge";

export function LibraryCard({ lib, href, nowMs }: { lib: LibraryDTO; href: string; nowMs: number }) {
  return (
    <section aria-labelledby="library-title">
      <Link href={href} className="block rounded-xl border-2 border-zinc-400 p-4 dark:border-zinc-500">
        <h2 id="library-title" className="text-xl font-bold">
          {lib.name}
        </h2>
        <div className="mt-2">
          <StatusBadge status={lib.status} isLibrary />
        </div>
        {lib.simulation && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span>
              Yoğunluk: <strong>{LIBRARY_LEVEL_LABELS[lib.simulation.level]}</strong> ·{" "}
              {lib.simulation.pattern === "DAILY"
                ? "gün içi örnek desen"
                : ago(Math.max(0, Math.floor((nowMs - lib.simulation.updatedAtMs) / 60_000)))}
            </span>
            <SimulatedBadge />
          </p>
        )}
        <div className="mt-2">
          <RatingChip rating={lib.rating} />
        </div>
      </Link>
    </section>
  );
}
