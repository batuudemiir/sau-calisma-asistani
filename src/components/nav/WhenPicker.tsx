"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { time } from "@/lib/labels";
import { carryQuery } from "@/lib/use-api";
import { dayOptions, endOptions, startOptions, whenFrom, whenQuery, type When } from "@/lib/when";

const NOW = "simdi";

/**
 * Ne zaman çalışacaksın: gün düğmeleri + başlangıç ve bitiş saati. Seçim URL'de (at, d) tutulur, sayfalar arası
 * taşınır. Saatler sunucu render'ında değil tarayıcıda hesaplanır (hidrasyon farkı olmasın diye).
 */
export function WhenPicker({ compact = false }: { compact?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [nowMs, setNowMs] = useState<number | null>(null);
  // Haritada yer kaplamasın diye kapalı başlar: tek satırlık özet düğmesi
  const [open, setOpen] = useState(!compact);
  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    const i = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, []);

  if (nowMs === null) return <div className={compact ? "h-11" : "h-[6.5rem]"} aria-hidden="true" />;

  const w = whenFrom(params, nowMs);
  const go = (next: Pick<When, "dateISO" | "start" | "end">) =>
    router.replace(`${pathname}?${carryQuery(params, whenQuery({ ...next, nowMinute: w.nowMinute }))}`, { scroll: false });
  const duration = w.end - (w.start ?? w.nowMinute);
  const isToday = w.dateISO === w.todayISO;
  const starts = startOptions(w.dateISO, w);
  const from = w.start ?? w.nowMinute;
  const ends = endOptions(from);
  const fit = (start: number) => {
    const opts = endOptions(start);
    return opts.find((e) => e >= start + duration) ?? opts.at(-1) ?? start + 60;
  };

  const pickDay = (dateISO: string) => {
    if (dateISO === w.todayISO) return go({ dateISO, start: null, end: w.nowMinute + duration });
    const start = w.start ?? 9 * 60;
    go({ dateISO, start, end: fit(start) });
  };
  const pickStart = (v: string) => {
    if (v === NOW) return go({ dateISO: w.todayISO, start: null, end: w.nowMinute + duration });
    const start = Number(v);
    go({ dateISO: w.dateISO, start, end: fit(start) });
  };
  const pickEnd = (v: string) => go({ dateISO: w.dateISO, start: w.start, end: Number(v) });

  const days = dayOptions(nowMs);
  const dayLabel = days.find((d) => d.dateISO === w.dateISO)?.label ?? w.dateISO.split("-").reverse().slice(0, 2).join(".");
  const summary = `${dayLabel} · ${w.start === null ? "Şimdi" : time(w.start)}–${time(Math.min(w.end, 24 * 60 - 1))}`;
  if (compact && !open)
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between rounded-md border border-line-strong bg-card px-3 text-left font-semibold"
      >
        <span>
          <span className="sr-only">Ne zaman: </span>
          {summary}
        </span>
        <span className="text-sm text-fg-2" aria-hidden="true">
          Değiştir ▾
        </span>
      </button>
    );

  const select =
    "min-h-11 w-full rounded-md border border-line-strong bg-card px-2 font-semibold focus:border-ink-900 focus:outline-2 focus:outline-[var(--focus-ring)]";
  return (
    <div role="group" aria-label="Ne zaman" className="space-y-2">
      <div role="group" aria-label="Gün" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {days.map((d) => {
          const on = d.dateISO === w.dateISO;
          return (
            <button
              key={d.dateISO}
              type="button"
              aria-pressed={on}
              onClick={() => pickDay(d.dateISO)}
              className={`min-h-11 shrink-0 rounded-md border px-3 text-sm whitespace-nowrap transition-colors duration-[var(--dur-fast)] ${on ? "border-ink-900 bg-ink-900 font-bold text-lime-500 dark:border-lime-500 dark:bg-lime-500 dark:text-ink-900" : "border-line-strong bg-card font-semibold text-fg-1 hover:bg-sunken"}`}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold text-fg-2">
          Başlangıç
          <select className={select} value={w.start === null ? NOW : String(w.start)} onChange={(e) => pickStart(e.target.value)}>
            {isToday && <option value={NOW}>Şimdi ({time(w.nowMinute)})</option>}
            {w.start !== null && !starts.includes(w.start) && <option value={w.start}>{time(w.start)}</option>}
            {starts.map((m) => (
              <option key={m} value={m}>
                {time(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-fg-2">
          Bitiş
          <select className={select} value={String(w.end)} onChange={(e) => pickEnd(e.target.value)}>
            {!ends.includes(w.end) && <option value={w.end}>{time(Math.min(w.end, 24 * 60 - 1))}</option>}
            {ends.map((m) => (
              <option key={m} value={m}>
                {time(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {compact && (
        <button type="button" aria-expanded={true} onClick={() => setOpen(false)} className="min-h-11 w-full text-sm font-semibold underline">
          Tamam
        </button>
      )}
    </div>
  );
}
