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
          className={`flex min-h-11 flex-1 items-center justify-center rounded-md border px-2 text-sm no-underline transition-colors duration-[var(--dur-fast)] ${x === d ? "border-ink-900 bg-ink-900 font-bold text-lime-500 dark:border-lime-500 dark:bg-lime-500 dark:text-ink-900" : "border-line-strong bg-card font-semibold text-fg-1 hover:bg-sunken"}`}
        >
          {x} dk
        </Link>
      ))}
    </nav>
  );
}
