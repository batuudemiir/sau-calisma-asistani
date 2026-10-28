"use client";

import { ShareButton } from "./ShareButton";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { LIBRARY_LEVEL_LABELS, REPORT_LABELS, WEEKDAY_NAMES, ago, time, untilText } from "@/lib/labels";
import { carryQuery, useApi } from "@/lib/use-api";
import type { SpaceDetailResponse } from "@/server/search-service";
import { placeById, osmUrl } from "@/data/campus";
import { openingHoursText } from "@/lib/opening-hours";
import { RatingForm, RatingSummaryView } from "./Ratings";
import { ReportButtons } from "./ReportButtons";
import { POLL_MS } from "./ResultsView";
import { SpaceFacts } from "./SpaceFacts";
import { StatusBadge } from "./StatusBadge";

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

  const free = s && !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE");

  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pt-4 pb-28 lg:max-w-5xl lg:px-8 lg:py-10">
      <Link href={`/?${query}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
        ← Geri
      </Link>

      {loading && !data && <p role="status">Yükleniyor…</p>}
      {error && (
        <div role="alert" className="rounded-md border border-danger p-3 text-sm">
          {error}.{" "}
          <button type="button" onClick={() => void reload()} className="font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {data && s && (
        <>
          <header className="space-y-2">
            <h1 className="text-[40px] leading-[44px] font-bold">{s.code}</h1>
            {!isLibrary && <p className="text-lg text-fg-2">{s.buildingName}</p>}
            {s.excludedBecause ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 dark:border-line-strong dark:bg-zinc-800 dark:text-zinc-100">
                  <span aria-hidden="true">–</span>
                  {data.durationMin} dakika için uygun değil
                </span>
                <p className="text-sm font-semibold">{EXCLUDED_TEXT[s.excludedBecause]}</p>
              </>
            ) : (
              <StatusBadge status={s.status} isLibrary={isLibrary} />
            )}
            {!isLibrary && free && s.freeUntil !== null && (
              <p className="text-lg font-semibold">{untilText(s.freeUntil)} boş</p>
            )}
            {data.simulation && (
              <p className="text-sm">
                Yoğunluk: <strong>{LIBRARY_LEVEL_LABELS[data.simulation.level]}</strong>
              </p>
            )}
          </header>

          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
            <div className="space-y-6">
              <ReportButtons spaceId={s.spaceId} onReported={() => void reload()} />

              {!isLibrary && (
                <section aria-labelledby="today-title" className="space-y-2">
                  <h2 id="today-title" className="text-xl font-bold">
                    Bugünkü dersler ({WEEKDAY_NAMES[data.now.weekday]})
                  </h2>
                  {data.today.length === 0 ? (
                    <p className="text-sm">Bugün bu sınıfta ders yok.</p>
                  ) : (
                    <ul className="divide-y divide-zinc-300 rounded-md border border-line text-sm dark:divide-zinc-700">
                      {data.today.map((b) => (
                        <li key={`${b.startMinute}-${b.courseCode}`} className="flex gap-3 p-2.5">
                          <span className="font-mono">
                            {time(b.startMinute)}–{time(b.endMinute)}
                          </span>
                          <span>{b.courseName}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {data.place && <PlaceInfo spaceId={s.spaceId} openingHours={data.place.openingHours} osm={data.place.osm} />}
            </div>

            <div className="space-y-6">
              <RatingSummaryView rating={s.rating} />
              <details className="rounded-lg border border-line bg-card p-3">
                <summary className="min-h-11 cursor-pointer content-center font-semibold">Burayı puanla</summary>
                <div className="mt-3">
                  <RatingForm spaceId={s.spaceId} onRated={() => void reload()} />
                </div>
              </details>

              <details className="rounded-lg border border-line bg-card p-3 text-sm">
                <summary className="min-h-11 cursor-pointer content-center font-semibold">Bilgi kaynağı ve son bildirimler</summary>
                <div className="mt-2 space-y-3">
                  {!isLibrary && <SpaceFacts r={s} />}
                  {!isLibrary && data.today.length > 0 && (
                    <ul className="text-fg-2">
                      {data.today.map((b) => (
                        <li key={`${b.startMinute}-${b.courseCode}-ref`}>
                          {time(b.startMinute)} {b.courseCode}: {b.sourceRef}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.source?.url && (
                    <a href={s.source.url} target="_blank" rel="noreferrer" className="inline-block underline">
                      Kaynak belgeyi aç
                    </a>
                  )}
                  <h2 id="reports-title" className="font-bold">
                    Son 30 dakikadaki bildirimler
                  </h2>
                  {data.recentReports.length === 0 ? (
                    <p>Henüz bildirim yok.</p>
                  ) : (
                    <ul>
                      {data.recentReports.map((r, i) => (
                        <li key={i}>
                          {REPORT_LABELS[r.type]} · {ago(r.minutesAgo)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <ShareButton title={s.code} />
                </div>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PlaceInfo({ spaceId, openingHours, osm }: { spaceId: string; openingHours: string | null; osm: string | null }) {
  const facts = placeById(spaceId)?.facts ?? [];
  return (
    <section aria-labelledby="place-title" className="space-y-2 text-sm">
      <h2 id="place-title" className="text-xl font-bold">
        Bu yer hakkında
      </h2>
      <p>{openingHoursText(openingHours) ?? "Açılış saatleri bilinmiyor."}</p>
      <p className="text-fg-2">Doluluk yalnızca öğrenci bildirimleriyle bilinir; ölçüm yoktur.</p>
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
