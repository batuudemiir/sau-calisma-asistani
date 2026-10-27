"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DURATIONS } from "@/domain/config";
import { carryQuery, durationParam } from "@/lib/use-api";

/** Süre seçimi (30/60/90/120). Diğer sorgu değerleri (demo saati) korunur. */
export function DurationChips({ basePath }: { basePath: string }) {
  const params = useSearchParams();
  const d = durationParam(params);
  return (
    <nav aria-label="Çalışma süresi" className="flex gap-2 lg:max-w-xl">
      {DURATIONS.map((x) => (
        <Link
          key={x}
          href={`${basePath}?${carryQuery(params, { d: String(x) })}`}
          aria-current={x === d ? "page" : undefined}
          className={`min-h-11 flex-1 rounded-lg border px-2 py-2 text-center text-sm font-semibold ${x === d ? "border-current bg-foreground text-background" : "border-zinc-400"}`}
        >
          {x} dk
        </Link>
      ))}
    </nav>
  );
}
