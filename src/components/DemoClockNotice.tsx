"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CLOSE_MINUTE, OPEN_MINUTE } from "@/domain/config";
import { MEMORY_BACKEND } from "@/lib/session";
import { carryQuery } from "@/lib/use-api";

/** Sunumda gösterilecek saat: öğle arası, derslerin bir kısmı dolu, bir kısmı boş. */
export const DEMO_CLOCK = "13:00";

/**
 * Bina saatleri dışındaysa nedenini söyler. Firebase'siz sunum prototipinde ayrıca tek dokunuşla demo saatine
 * (bugün 13.00) geçirir ve demo saatinden gerçek saate döndürür; demo saati her zaman ekranda belirtilir.
 */
export function DemoClockNotice({
  now,
  basePath,
  durationMin,
}: {
  now: { dateISO: string; minute: number; isDemoClock: boolean };
  basePath: string;
  durationMin: number;
}) {
  const params = useSearchParams();
  const link = "inline-flex min-h-11 items-center font-semibold underline";

  if (now.isDemoClock) {
    if (!MEMORY_BACKEND) return null;
    const real = new URLSearchParams(carryQuery(params));
    real.delete("at");
    return (
      <p className="text-sm text-fg-2">
        Sunum için demo saati gösteriliyor.{" "}
        <Link href={`${basePath}?${real.toString()}`} className={link}>
          Gerçek saate dön
        </Link>
      </p>
    );
  }

  const closed = now.minute < OPEN_MINUTE || now.minute + durationMin > CLOSE_MINUTE;
  if (!closed) return null;
  return (
    <div className="rounded-md border border-line bg-sunken p-3 text-sm">
      <p>Binalar 08.00–22.00 arası açık kabul edilir; bu saatte derslik önerilmez. Çalışma yerleri aşağıda.</p>
      {MEMORY_BACKEND && (
        <Link href={`${basePath}?${carryQuery(params, { at: `${now.dateISO}T${DEMO_CLOCK}` })}`} className={link}>
          Sunum için bugün 13.00&apos;e göre göster
        </Link>
      )}
    </div>
  );
}
