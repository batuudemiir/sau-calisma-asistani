import { floorRows } from "@/lib/map-geometry";
import type { MapSpaceDTO } from "@/server/search-service";
import { FILL, SHORT, ariaFor, isSimStatus, ratingText, toneOf } from "./map-style";

/** Bina kat görünümü (şematik): her oda durum + puanla, bağlantı ayrıntı sayfasına. */
export function BuildingMap({ spaces, query }: { spaces: MapSpaceDTO[]; query: string }) {
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
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full lg:max-w-3xl" role="group" aria-label="Bina odaları, katlara göre">
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
                <a key={s.spaceId} href={`/yer/${encodeURIComponent(s.spaceId)}?${query}`} aria-label={ariaFor(s.code, s)}>
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
                    {`${SHORT[tone]}${isSimStatus(s) ? "*" : ""}`.split(/ (?=boş\*?$)/).map((line, li) => (
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
