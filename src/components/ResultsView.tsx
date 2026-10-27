"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DURATIONS } from "@/domain/config";
import { WEEKDAY_NAMES, time } from "@/lib/labels";
import { carryQuery, durationParam, useApi } from "@/lib/use-api";
import type { SearchResponse } from "@/server/search-service";
import { LibraryCard } from "./LibraryCard";
import { SpaceCard } from "./SpaceCard";

export const POLL_MS = 4000;

export function ResultsView() {
  const params = useSearchParams();
  const query = carryQuery(params);
  const { data, error, loading, reload } = useApi<SearchResponse>(`/api/search?${query}`, POLL_MS);
  const d = durationParam(params);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <header className="space-y-3">
        <Link href="/" className="text-sm underline">
          ← Başa dön
        </Link>
        <h1 className="text-2xl font-bold">{d} dakika çalışabileceğin yerler</h1>
        <nav aria-label="Süreyi değiştir" className="flex gap-2">
          {DURATIONS.map((x) => (
            <Link
              key={x}
              href={`/results?${carryQuery(params, { d: String(x) })}`}
              aria-current={x === d ? "page" : undefined}
              className={`min-h-11 flex-1 rounded-lg border px-2 py-2 text-center text-sm font-semibold ${x === d ? "border-current bg-foreground text-background" : "border-zinc-400"}`}
            >
              {x} dk
            </Link>
          ))}
        </nav>
        {data && (
          <p className="text-sm opacity-80">
            {WEEKDAY_NAMES[data.now.weekday]} {time(data.now.minute)}
            {data.termLabel ? ` · ${data.termLabel}` : ""}
            {data.now.isDemoClock && <strong className="ml-1">(demo saati)</strong>}
          </p>
        )}
        <Link href={`/map?${query}`} className="inline-block text-sm font-semibold underline">
          Haritada gör →
        </Link>
      </header>

      {loading && !data && <p role="status">Yükleniyor…</p>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-700 p-3 text-sm">
          {error}.{" "}
          <button type="button" onClick={() => void reload()} className="font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {data && (
        <>
          <LibraryCard
            lib={data.library}
            href={`/spaces/${encodeURIComponent(data.library.spaceId)}?${query}`}
            nowMs={data.now.nowMs}
          />
          {data.results.length === 0 ? (
            <p className="rounded-lg border border-zinc-400 p-4">
              Bu süre için programda uygun görünen derslik yok. Daha kısa bir süre deneyebilirsin.
              {data.now.minute + d > 1320 && " Bina kapanış saatine (22.00) yakın olabilir."}
            </p>
          ) : (
            <ul className="space-y-3" aria-label="Uygun görünen alanlar">
              {data.results.map((r) => (
                <SpaceCard key={r.spaceId} r={r} href={`/spaces/${encodeURIComponent(r.spaceId)}?${query}`} />
              ))}
            </ul>
          )}
          <p className="text-xs opacity-70">
            Sınav, tatil, ders iptali ve program dışı etkinlik bilgisi yok. Programda boş görünen derslik gerçekten boş
            olmayabilir; gördüğünü bildirerek diğer öğrencilere yardım edebilirsin.
          </p>
        </>
      )}
    </main>
  );
}
