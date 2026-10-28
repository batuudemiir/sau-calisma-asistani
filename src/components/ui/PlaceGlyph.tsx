import type { SpaceKind } from "@/domain/types";
import { ICON_BOOK, ICON_COFFEE } from "./icons";

/** Çalışma yeri işareti: lacivert daire + limon simge (kitap: kütüphane, fincan: kafe/çalışma alanı). Haritadakiyle aynı. */
export function PlaceGlyph({ kind, size = 28 }: { kind: SpaceKind; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink-900 text-lime-500"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={kind === "LIBRARY" ? ICON_BOOK : ICON_COFFEE} />
      </svg>
    </span>
  );
}
