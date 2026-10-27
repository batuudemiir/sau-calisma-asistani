"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { LIBRARY_LEVEL_LABELS, REPORT_LABELS, WEEKDAY_NAMES, ago, time } from "@/lib/labels";
import { carryQuery, useApi } from "@/lib/use-api";
import type { SpaceDetailResponse } from "@/server/search-service";
import { POLL_MS } from "./ResultsView";
import { SpaceFacts } from "./SpaceCard";
import { SimulatedBadge, StatusBadge } from "./StatusBadge";

const EXCLUDED_TEXT = {
  BUILDING_CLOSED: "Seçilen süre bina saatlerinin (08.00-22.00) dışına taşıyor.",
  CLASS_CONFLICT: "Seçilen süre içinde (10 dk geçiş payıyla) programda ders var.",
} as const;

export function SpaceView() {
  // useParams kodlanmış değeri döndürür ("Ö" → "%C3%96"); tekrar kodlamamak için önce çöz.
  const id = decodeURIComponent(useParams<{ id: string }>().id);
  const params = useSearchParams();
  const query = carryQuery(params);
  const { data, error, loading, reload } = useApi<SpaceDetailResponse>(`/api/spaces/${encodeURIComponent(id)}?${query}`, POLL_MS);

  const s = data?.space;
  const isLibrary = s?.kind === "LIBRARY";

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <Link href={`/results?${query}`} className="text-sm underline">
        ← Sonuçlara dön
      </Link>

      {loading && !data && <p role="status">Yükleniyor…</p>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-700 p-3 text-sm">
          {error}.{" "}
          <button type="button" onClick={() => void reload()} className="font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {data && s && (
        <>
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">{s.code}</h1>
            {!isLibrary && <p className="opacity-80">{s.buildingName}</p>}
            {s.excludedBecause ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-100">
                  <span aria-hidden="true">–</span>
                  {data.durationMin} dakika için uygun değil
                </span>
                <p className="text-sm font-semibold">{EXCLUDED_TEXT[s.excludedBecause]}</p>
              </>
            ) : (
              <StatusBadge status={s.status} isLibrary={isLibrary} />
            )}
          </header>

          {!isLibrary && <SpaceFacts r={s} />}

          {data.simulation && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              Yoğunluk: <strong>{LIBRARY_LEVEL_LABELS[data.simulation.level]}</strong>
              <SimulatedBadge />
            </p>
          )}

          {!isLibrary && (
            <section aria-labelledby="today-title" className="space-y-2">
              <h2 id="today-title" className="text-lg font-bold">
                Bugünkü program ({WEEKDAY_NAMES[data.now.weekday]})
              </h2>
              {data.today.length === 0 ? (
                <p className="text-sm">Yayımlanmış programda bugün bu odada ders yok.</p>
              ) : (
                <ul className="divide-y divide-zinc-300 rounded-lg border border-zinc-300 text-sm dark:divide-zinc-700 dark:border-zinc-700">
                  {data.today.map((b) => (
                    <li key={`${b.startMinute}-${b.courseCode}`} className="flex gap-3 p-2">
                      <span className="font-mono">
                        {time(b.startMinute)}–{time(b.endMinute)}
                      </span>
                      <span>
                        {b.courseCode} {b.courseName}
                        <span className="block text-xs opacity-70">Belgedeki yeri: {b.sourceRef}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {s.source?.url && (
                <a href={s.source.url} target="_blank" rel="noreferrer" className="inline-block text-sm underline">
                  Kaynak belgeyi aç
                </a>
              )}
            </section>
          )}

          <section aria-labelledby="reports-title" className="space-y-2">
            <h2 id="reports-title" className="text-lg font-bold">
              Son 30 dakikadaki bildirimler
            </h2>
            {data.recentReports.length === 0 ? (
              <p className="text-sm">Henüz bildirim yok.</p>
            ) : (
              <ul className="text-sm">
                {data.recentReports.map((r, i) => (
                  <li key={i}>
                    {REPORT_LABELS[r.type]} · {ago(r.minutesAgo)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
