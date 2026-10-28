"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CLOSE_MINUTE, OPEN_MINUTE } from "@/domain/config";
import { WEEKDAY_NAMES } from "@/lib/labels";
import { carryQuery } from "@/lib/use-api";
import { nextOpenWindow, windowText } from "@/lib/when";
import type { SearchResponse } from "@/server/search-service";

/** Arama sonuçlarının hangi aralığa ait olduğu; ileri saatte bildirim kullanılmadığı; bina kapalıysa öneri. */
export function WindowSummary({
  now,
  durationMin,
  basePath,
  showWindow = true,
}: {
  now: SearchResponse["now"];
  durationMin: number;
  basePath: string;
  /** Aralık metni (seçici zaten gösteriyorsa kapatılır). */
  showWindow?: boolean;
}) {
  const params = useSearchParams();
  const end = now.minute + durationMin;
  const closed = now.minute < OPEN_MINUTE || end > CLOSE_MINUTE;
  const open = nextOpenWindow(now.nowMs);
  return (
    <div className="space-y-2 text-sm">
      {showWindow && (
        <p className="text-fg-2">
          <strong className="text-fg-1">{windowText(now.dateISO, WEEKDAY_NAMES[now.weekday], now.minute, end)}</strong>
          {now.live && !now.isDemoClock && " · şu an"}
        </p>
      )}
      {!now.live && (
        <p className="text-fg-2">İleri bir saat seçtin: öğrenci bildirimleri değil, ders programı gösteriliyor.</p>
      )}
      {closed && (
        <div className="rounded-md border border-line bg-sunken p-3">
          <p>Binalar 08.00–22.00 arası açık; bu aralıkta sınıf önerilmez. Kütüphane ve kafeler aşağıda.</p>
          <Link
            href={`${basePath}?${carryQuery(params, { at: open.at, d: open.d })}`}
            className="inline-flex min-h-11 items-center font-semibold underline"
          >
            {open.label} aralığına bak
          </Link>
        </div>
      )}
    </div>
  );
}
