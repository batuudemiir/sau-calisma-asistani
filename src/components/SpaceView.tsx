"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { LIBRARY_LEVEL_LABELS, REPORT_LABELS, WEEKDAY_NAMES, ago, time } from "@/lib/labels";
import { carryQuery, useApi } from "@/lib/use-api";
import type { SpaceDetailResponse } from "@/server/search-service";
import { placeById, osmUrl } from "@/data/campus";
import { openingHoursText } from "./PlaceCard";
import { RatingForm, RatingSummaryView } from "./Ratings";
import { ReportButtons } from "./ReportButtons";
import { POLL_MS } from "./ResultsView";
import { SpaceFacts } from "./SpaceCard";
import { SimulatedBadge, StatusBadge } from "./StatusBadge";

const EXCLUDED_TEXT = {
  BUILDING_CLOSED: "Seçilen süre bina saatlerinin (08.00-22.00) dışına taşıyor.",
  CLASS_CONFLICT: "Seçilen süre içinde (10 dk geçiş payıyla) programda ders var.",
} as const;

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // bozuk kodlama: olduğu gibi gönder, API "bulunamadı" der
  }
}

export function SpaceView() {
  // useParams kodlanmış değeri döndürür ("Ö" → "%C3%96"); tekrar kodlamamak için önce çöz.
  const rawId = useParams<{ id: string }>().id;
  const id = safeDecode(rawId);
  const params = useSearchParams();
  const query = carryQuery(params);
  const { data, error, loading, reload } = useApi<SpaceDetailResponse>(`/api/spaces/${encodeURIComponent(id)}?${query}`, POLL_MS);

  const s = data?.space;
  // Kütüphane ve çalışma alanlarının ders programı yok; durum yalnızca bildirimden
  const isLibrary = s?.kind === "LIBRARY" || s?.kind === "STUDY_AREA";

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6 lg:max-w-5xl lg:px-8 lg:py-10">
      <Link href={`/results?${query}`} className="inline-flex min-h-11 items-center text-sm underline">
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
            <h1 className="text-3xl font-bold lg:text-4xl">{s.code}</h1>
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

          <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
            <div className="space-y-5">
              {!isLibrary && <SpaceFacts r={s} />}

              {data.simulation && (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  Yoğunluk: <strong>{LIBRARY_LEVEL_LABELS[data.simulation.level]}</strong>
                  <SimulatedBadge />
                </p>
              )}

              {data.place && <PlaceInfo spaceId={s.spaceId} openingHours={data.place.openingHours} osm={data.place.osm} />}

              {!isLibrary && (
                <section aria-labelledby="today-title" className="space-y-2">
                  <h2 id="today-title" className="text-lg font-bold">
                    {s.source?.isPartial ? "Bugün bilinen dersler" : "Bugünkü program"} ({WEEKDAY_NAMES[data.now.weekday]})
                  </h2>
                  {data.today.length === 0 ? (
                    <p className="text-sm">
                      {s.source?.isPartial
                        ? "Bugün bu odada bilinen ders yok."
                        : "Yayımlanmış programda bugün bu odada ders yok."}
                    </p>
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
            </div>

            <div className="space-y-5 lg:rounded-2xl lg:border lg:border-zinc-300 lg:p-6 lg:dark:border-zinc-700">
              <ReportButtons spaceId={s.spaceId} onReported={() => void reload()} />

              <RatingSummaryView rating={s.rating} />
              <RatingForm spaceId={s.spaceId} onRated={() => void reload()} />

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
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function PlaceInfo({ spaceId, openingHours, osm }: { spaceId: string; openingHours: string | null; osm: string | null }) {
  const facts = placeById(spaceId)?.facts ?? [];
  return (
    <section aria-labelledby="place-title" className="space-y-2 text-sm">
      <h2 id="place-title" className="text-lg font-bold">
        Bu yer hakkında
      </h2>
      <p>{openingHoursText(openingHours) ?? "Açılış saatleri bilinmiyor."}</p>
      <p className="opacity-80">Doluluk yalnızca öğrenci bildirimleriyle bilinir; ölçüm yoktur.</p>
      {facts.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {facts.map((f) => (
            <li key={f.text}>
              {f.text}{" "}
              <a href={f.source} target="_blank" rel="noreferrer" className="underline">
                (kaynak)
              </a>
            </li>
          ))}
        </ul>
      )}
      {osm && (
        <a href={osmUrl(osm)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline">
          Konumu OpenStreetMap&apos;te aç
        </a>
      )}
    </section>
  );
}
