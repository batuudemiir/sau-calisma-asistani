"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RatingSummary } from "@/domain/ratings";
import type { Status, StatusCode } from "@/domain/types";
import { WEEKDAY_NAMES, statusTitle, time } from "@/lib/labels";
import { campusRects, floorRows } from "@/lib/map-geometry";
import { carryQuery, durationParam, useApi } from "@/lib/use-api";
import type { MapResponse, MapSpaceDTO } from "@/server/search-service";
import { POLL_MS } from "../ResultsView";
import { SimulatedBadge } from "../StatusBadge";

type Tone = StatusCode | "EXCLUDED";

const SHORT: Record<Tone, string> = {
  VERIFIED_FREE: "✓ Doğrulandı",
  PROGRAM_FREE: "○ Programda boş",
  UNKNOWN: "? Bilinmiyor",
  REPORTED_BUSY: "✕ Dolu",
  EXCLUDED: "– Uygun değil",
};

const FILL: Record<Tone, string> = {
  VERIFIED_FREE: "fill-green-100 stroke-green-700 dark:fill-green-950 dark:stroke-green-400",
  PROGRAM_FREE: "fill-sky-100 stroke-sky-700 dark:fill-sky-950 dark:stroke-sky-400",
  UNKNOWN: "fill-zinc-100 stroke-zinc-600 dark:fill-zinc-800 dark:stroke-zinc-400",
  REPORTED_BUSY: "fill-red-100 stroke-red-700 dark:fill-red-950 dark:stroke-red-400",
  EXCLUDED: "fill-zinc-200 stroke-zinc-500 dark:fill-zinc-900 dark:stroke-zinc-600",
};

const toneOf = (s: MapSpaceDTO): Tone => (s.excludedBecause ? "EXCLUDED" : s.status.code);

/** Haritada gösterilecek puan: gerçek yeterliyse o, değilse (demo) simüle; ikisi de yoksa null. */
function shownRating(r: { real: RatingSummary; simulated: RatingSummary }) {
  if (r.real.overall !== null) return { value: r.real.overall, simulated: false };
  if (r.simulated.overall !== null) return { value: r.simulated.overall, simulated: true };
  return null;
}

function ratingText(r: { real: RatingSummary; simulated: RatingSummary }) {
  const s = shownRating(r);
  return s ? `★ ${s.value.toFixed(1)}${s.simulated ? "*" : ""}` : "★ –";
}

function ariaFor(code: string, s: MapSpaceDTO) {
  const state = s.excludedBecause ? "seçilen süre için uygun değil" : statusTitle(s.status as Status);
  const r = shownRating(s.rating);
  return `${code}: ${state}. ${r ? `Ortalama puan ${r.value.toFixed(1)}${r.simulated ? ", örnek demo verisi" : ""}` : "Yeterli değerlendirme yok"}`;
}

export function MapView() {
  const params = useSearchParams();
  const query = carryQuery(params);
  const selected = params.get("b");
  const { data, error, loading, reload } = useApi<MapResponse>(`/api/map?${query}`, POLL_MS);
  const d = durationParam(params);

  const building = data?.buildings.find((b) => b.id === selected) ?? null;
  const anySimulatedRating =
    data?.buildings.some((b) => b.spaces.some((s) => shownRating(s.rating)?.simulated)) || (data && shownRating(data.library.rating)?.simulated);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-6">
      <nav className="flex justify-between text-sm">
        {building ? (
          <Link href={`/map?${query}`} className="underline">
            ← Kampüs
          </Link>
        ) : (
          <Link href={`/results?${query}`} className="underline">
            ← Liste görünümü
          </Link>
        )}
        <Link href={`/results?${query}`} className="underline">
          Liste
        </Link>
      </nav>
      <h1 className="text-2xl font-bold">{building ? building.name : "Kampüs haritası"}</h1>
      {data && (
        <p className="text-sm opacity-80">
          {d} dakika · {WEEKDAY_NAMES[data.now.weekday]} {time(data.now.minute)}
          {data.now.isDemoClock && <strong className="ml-1">(demo saati)</strong>}
        </p>
      )}

      {loading && !data && <p role="status">Yükleniyor…</p>}
      {error && (
        <div role="alert" className="rounded-lg border border-red-700 p-3 text-sm">
          {error}.{" "}
          <button type="button" onClick={() => void reload()} className="font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {data && !building && <CampusMap data={data} query={query} />}
      {data && building && <BuildingMap spaces={building.spaces} query={query} />}

      {data && (
        <>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Harita açıklaması">
            {(Object.keys(SHORT) as Tone[]).map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <svg width="14" height="14" aria-hidden="true">
                  <rect x="1" y="1" width="12" height="12" rx="2" className={FILL[t]} strokeWidth="1.5" strokeDasharray={t === "EXCLUDED" ? "3 2" : undefined} />
                </svg>
                {SHORT[t]}
              </li>
            ))}
            <li>★ ortalama puan (3+ değerlendirme)</li>
          </ul>
          {anySimulatedRating && (
            <p className="flex items-center gap-2 text-xs">
              <SimulatedBadge /> * işaretli puanlar örnek demo verisidir.
            </p>
          )}
          <p className="text-xs opacity-70">Şematik çizim, ölçekli değildir. Renk tek başına anlam taşımaz; her odada durum metni yazar.</p>
        </>
      )}
    </main>
  );
}

function CampusMap({ data, query }: { data: MapResponse; query: string }) {
  // Kütüphane kartı her zaman "kutuphane" yerleşim anahtarını kullanır (binalar listesinde kütüphane yer almaz)
  const ids = ["kutuphane", ...data.buildings.map((b) => b.id)];
  const { rects, height } = campusRects(ids);
  const libRect = rects.get(ids[0])!;

  return (
    <svg viewBox={`0 0 360 ${height}`} className="w-full" role="group" aria-label="Kampüs binaları">
      <a href={`/spaces/${encodeURIComponent(data.library.spaceId)}?${query}`} aria-label={`${data.library.name}: ${statusTitle(data.library.status, true)}`}>
        <rect {...rectProps(libRect)} rx="10" className={FILL[data.library.status.code]} strokeWidth="2" />
        <text x={libRect.x + 10} y={libRect.y + 24} className="fill-current text-[13px] font-bold">
          {data.library.name}
        </text>
        <text x={libRect.x + 10} y={libRect.y + 46} className="fill-current text-[11px]">
          {statusTitle(data.library.status, true)}
        </text>
        <text x={libRect.x + 10} y={libRect.y + 66} className="fill-current text-[11px]">
          {ratingText(data.library.rating)}
        </text>
      </a>
      {data.buildings.map((b) => {
        const r = rects.get(b.id)!;
        const free = b.spaces.filter((s) => !s.excludedBecause && (s.status.code === "PROGRAM_FREE" || s.status.code === "VERIFIED_FREE")).length;
        const verified = b.spaces.filter((s) => !s.excludedBecause && s.status.code === "VERIFIED_FREE").length;
        return (
          <a key={b.id} href={`/map?${query}&b=${encodeURIComponent(b.id)}`} aria-label={`${b.name}: ${free} uygun görünen oda, ${verified} öğrenci doğruladı. Odaları gör.`}>
            <rect {...rectProps(r)} rx="10" className="fill-background stroke-current" strokeWidth="2" />
            <text x={r.x + 10} y={r.y + 24} className="fill-current text-[13px] font-bold">
              {b.name.length > 20 ? `${b.name.slice(0, 19)}…` : b.name}
            </text>
            <text x={r.x + 10} y={r.y + 46} className="fill-current text-[11px]">
              {free} uygun görünen oda
            </text>
            <text x={r.x + 10} y={r.y + 64} className="fill-current text-[11px]">
              {verified} öğrenci doğruladı
            </text>
            <text x={r.x + 10} y={r.y + 84} className="fill-current text-[11px] underline">
              Odaları gör →
            </text>
          </a>
        );
      })}
    </svg>
  );
}

function BuildingMap({ spaces, query }: { spaces: MapSpaceDTO[]; query: string }) {
  const rows = floorRows(spaces);
  const perRow = Math.max(1, ...rows.map((r) => r.rooms.length));
  const W = 360;
  const gap = 6;
  const cellW = Math.min(110, (W - 40 - gap * (perRow - 1)) / perRow);
  const cellH = 74;
  const rowH = cellH + 26;
  const height = rows.length * rowH + 10;

  if (spaces.length === 0) return <p className="text-sm">Bu binada kayıtlı oda yok.</p>;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="group" aria-label="Bina odaları, katlara göre">
      {rows.map((row, ri) => {
        const y0 = ri * rowH + 4;
        return (
          <g key={row.floor ?? "x"}>
            <text x="4" y={y0 + 12} className="fill-current text-[11px] font-semibold">
              {row.floor === null ? "Diğer" : row.floor === 0 ? "Zemin kat" : `${row.floor}. kat`}
            </text>
            {row.rooms.map((s, i) => {
              const x = 20 + i * (cellW + gap);
              const y = y0 + 18;
              const tone = toneOf(s);
              return (
                <a key={s.spaceId} href={`/spaces/${encodeURIComponent(s.spaceId)}?${query}`} aria-label={ariaFor(s.code, s)}>
                  <rect
                    x={x}
                    y={y}
                    width={cellW}
                    height={cellH}
                    rx="6"
                    className={FILL[tone]}
                    strokeWidth="1.5"
                    strokeDasharray={tone === "EXCLUDED" ? "4 3" : undefined}
                  />
                  <text x={x + 6} y={y + 18} className="fill-current text-[12px] font-bold">
                    {s.code}
                  </text>
                  <text x={x + 6} y={y + 36} className="fill-current text-[9.5px]">
                    {/* Dar hücrede kesilmesin diye uzun etiket iki satıra bölünür */}
                    {SHORT[tone].split(/ (?=boş$)/).map((line, li) => (
                      <tspan key={li} x={x + 6} dy={li === 0 ? 0 : 11}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                  <text x={x + 6} y={y + 64} className="fill-current text-[11px]">
                    {ratingText(s.rating)}
                  </text>
                </a>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

const rectProps = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x, y: r.y, width: r.w, height: r.h });
