"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FILTERS, FILTER_LABELS, parseFilters, type Filter } from "@/lib/filters";

/** Aç/kapa filtreler; durum URL'de (f) tutulur, bağlantı paylaşılabilir. */
export function FilterChips({ only = FILTERS }: { only?: readonly Filter[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = parseFilters(params.get("f"));

  const toggle = (f: Filter) => {
    const next = active.includes(f) ? active.filter((x) => x !== f) : [...active, f];
    const q = new URLSearchParams(params);
    if (next.length) q.set("f", next.join(","));
    else q.delete("f");
    router.replace(`${pathname}?${q}`, { scroll: false });
  };

  return (
    <div role="group" aria-label="Filtreler" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
      {only.map((f) => {
        const on = active.includes(f);
        return (
          <button
            key={f}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(f)}
            className={`min-h-11 shrink-0 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-[var(--dur-fast)] ${on ? "border-ink-900 bg-ink-900 text-white dark:border-lime-500 dark:bg-lime-500 dark:text-ink-900" : "border-line-strong bg-card hover:bg-sunken"}`}
          >
            {on && (
              <span aria-hidden="true" className="text-lime-500 dark:text-ink-900">
                ✓{" "}
              </span>
            )}
            {FILTER_LABELS[f]}
          </button>
        );
      })}
    </div>
  );
}
