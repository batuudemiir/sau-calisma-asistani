"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CLOSE_MINUTE } from "@/domain/config";
import { time } from "@/lib/labels";
import { carryQuery } from "@/lib/use-api";
import {
  DURATION_CHOICES,
  dayOptions,
  dayPercent,
  durationLabel,
  durationText,
  startOptions,
  whenFrom,
  whenQuery,
  type When,
} from "@/lib/when";

/** Seçili: lacivert/limon; değil: kart. Gün, başlangıç ve süre çipleri aynı biçimde. */
const chip = (on: boolean) =>
  `min-h-11 shrink-0 rounded-md border px-3 text-sm whitespace-nowrap transition-colors duration-[var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-40 ${
    on
      ? "border-ink-900 bg-ink-900 font-bold text-lime-500 dark:border-lime-500 dark:bg-lime-500 dark:text-ink-900"
      : "border-line-strong bg-card font-semibold text-fg-1 hover:bg-sunken"
  }`;

/** Çizelge etiketleri (saat). */
const TICKS = [8, 10, 12, 14, 16, 18, 20, 22];

/**
 * Ne zaman çalışacaksın: gün, başlangıç saati (kaydırılan çipler) ve süre; altında gün çizelgesi (08.00–22.00) ve
 * "13.00 → 15.00 · 2 saat" özeti. Seçim URL'de (at, d). Saat tarayıcıda hesaplanır (hidrasyon farkı olmasın diye).
 * compact: haritada kapalı başlar, tek satırlık özet düğmesi.
 */
export function WhenPicker({ compact = false }: { compact?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [open, setOpen] = useState(!compact);
  const startsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    const i = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, []);

  const w = nowMs === null ? null : whenFrom(params, nowMs);
  const selectedKey = w ? `${w.dateISO}-${w.start ?? "simdi"}` : "";
  // Seçili başlangıç çipi görünür olsun (yalnızca yatay kaydırma; sayfa kaymaz)
  useEffect(() => {
    const box = startsRef.current;
    const btn = box?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (box && btn) box.scrollTo({ left: btn.offsetLeft - box.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
  }, [selectedKey, open]);

  if (nowMs === null || w === null) return <div className={compact ? "h-11" : "h-[13rem]"} aria-hidden="true" />;

  const go = (next: Pick<When, "dateISO" | "start" | "end">) =>
    router.replace(`${pathname}?${carryQuery(params, whenQuery({ ...next, nowMinute: w.nowMinute }))}`, { scroll: false });
  const from = w.start ?? w.nowMinute;
  const duration = w.end - from;
  const isToday = w.dateISO === w.todayISO;
  const starts = startOptions(w.dateISO, w);
  const days = dayOptions(nowMs);
  const dayLabel = days.find((d) => d.dateISO === w.dateISO)?.label ?? w.dateISO.split("-").reverse().slice(0, 2).join(".");
  const fits = (start: number, d: number) => start + d <= CLOSE_MINUTE;
  /** Başlangıç değişince süre korunur; kapanışa sığmıyorsa sığan en uzun süre. */
  const keep = (start: number) => (fits(start, duration) ? duration : Math.max(30, CLOSE_MINUTE - start));

  const pickDay = (dateISO: string) => {
    if (dateISO === w.todayISO) return go({ dateISO, start: null, end: w.nowMinute + duration });
    const start = w.start ?? 9 * 60;
    go({ dateISO, start, end: start + keep(start) });
  };
  const pickStart = (start: number | null) => {
    if (start === null) return go({ dateISO: w.todayISO, start: null, end: w.nowMinute + duration });
    go({ dateISO: w.dateISO, start, end: start + keep(start) });
  };
  const pickDuration = (d: number) => go({ dateISO: w.dateISO, start: w.start, end: from + d });

  const summary = `${dayLabel} · ${w.start === null ? "Şimdi" : time(w.start)}–${time(Math.min(w.end, 24 * 60 - 1))}`;
  if (compact && !open)
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-card px-3 text-left font-semibold"
      >
        <span className="flex items-center gap-2">
          <ClockIcon />
          <span>
            <span className="sr-only">Ne zaman: </span>
            {summary}
          </span>
        </span>
        <span className="text-sm text-fg-2" aria-hidden="true">
          Değiştir ▾
        </span>
      </button>
    );

  const now = isToday ? w.nowMinute : null;
  return (
    <div role="group" aria-label="Ne zaman" className="space-y-3">
      <div role="group" aria-label="Gün" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {days.map((d) => (
          <button key={d.dateISO} type="button" aria-pressed={d.dateISO === w.dateISO} onClick={() => pickDay(d.dateISO)} className={chip(d.dateISO === w.dateISO)}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <p id="baslangic" className="text-xs font-bold tracking-wide text-fg-2 uppercase">
          Başlangıç
        </p>
        <div ref={startsRef} role="group" aria-labelledby="baslangic" className="-mx-1 flex gap-1.5 overflow-x-auto scroll-smooth px-1 pb-0.5">
          {isToday && (
            <button type="button" aria-pressed={w.start === null} onClick={() => pickStart(null)} className={chip(w.start === null)}>
              Şimdi <span className="font-mono text-xs opacity-80">{time(w.nowMinute)}</span>
            </button>
          )}
          {w.start !== null && !starts.includes(w.start) && (
            <button type="button" aria-pressed={true} className={chip(true)}>
              {time(w.start)}
            </button>
          )}
          {starts.map((m) => (
            <button key={m} type="button" aria-pressed={w.start === m} onClick={() => pickStart(m)} className={`${chip(w.start === m)} font-mono`}>
              {time(m)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p id="sure" className="text-xs font-bold tracking-wide text-fg-2 uppercase">
          Süre
        </p>
        <div role="group" aria-labelledby="sure" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {!(DURATION_CHOICES as readonly number[]).includes(duration) && (
            <button type="button" aria-pressed={true} className={chip(true)}>
              {durationLabel(duration)}
            </button>
          )}
          {DURATION_CHOICES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={duration === d}
              disabled={!fits(from, d) && duration !== d}
              onClick={() => pickDuration(d)}
              className={chip(duration === d)}
            >
              {durationLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Gün çizelgesi: bina saatleri içinde seçilen aralık; bugünse şimdiki saat çizgisi */}
      <div aria-hidden="true" className="pt-1">
        <div className="relative h-3 rounded-full bg-sunken">
          <div
            className="absolute inset-y-0 rounded-full bg-accent"
            style={{ left: `${dayPercent(from)}%`, width: `${Math.max(1.5, dayPercent(w.end) - dayPercent(from))}%` }}
          />
          {now !== null && <div className="absolute -inset-y-1 w-0.5 rounded-full bg-fg-1" style={{ left: `${dayPercent(now)}%` }} />}
        </div>
        <div className="relative mt-1 h-4 text-[11px] text-fg-3">
          {TICKS.map((h) => (
            <span key={h} className="absolute -translate-x-1/2 font-mono" style={{ left: `${dayPercent(h * 60)}%` }}>
              {String(h).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="flex items-center gap-2 text-sm">
        <ClockIcon />
        <span>
          <strong className="font-mono">{time(from)}</strong> → <strong className="font-mono">{time(Math.min(w.end, 24 * 60 - 1))}</strong>
          <span className="text-fg-2"> · {durationText(duration)}</span>
        </span>
      </p>

      {compact && (
        <button type="button" aria-expanded={true} onClick={() => setOpen(false)} className={`${chip(false)} w-full`}>
          Tamam
        </button>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-fg-2">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2" />
    </svg>
  );
}
