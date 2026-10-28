import type { SpaceKind } from "@/domain/types";

/** Çalışma yeri işareti: lacivert daire + limon Zilla Slab "K" (kütüphane) / "C" (kafe, çalışma alanı). */
export function PlaceGlyph({ kind, size = 28 }: { kind: SpaceKind; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink-900 font-display font-bold text-lime-500"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {kind === "LIBRARY" ? "K" : "C"}
    </span>
  );
}
