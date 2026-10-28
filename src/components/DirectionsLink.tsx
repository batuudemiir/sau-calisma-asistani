import { osmBuilding, placeById } from "@/data/campus";
import { directionsUrl } from "@/lib/maps-link";

/** Bina ya da yer kimliğinden (CAMPUS_PLACES) veya OSM kaydından konum; bilinmiyorsa null (uydurulmaz). */
export function locationOf({ placeId, osm }: { placeId?: string | null; osm?: string | null }) {
  const o = osm ?? (placeId ? placeById(placeId)?.osm : null);
  return o ? (osmBuilding(o)?.center ?? null) : null;
}

/** "Google Haritalar'da yol tarifi" — yeni sekmede, yürüyerek. Konum bilinmiyorsa hiç gösterilmez. */
export function DirectionsLink(props: { placeId?: string | null; osm?: string | null }) {
  const at = locationOf(props);
  if (!at) return null;
  return (
    <a
      href={directionsUrl(at)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 font-semibold underline"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Lucide navigation */}
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
      </svg>
      Google Haritalar&apos;da yol tarifi
      <span className="sr-only"> (yeni sekmede açılır)</span>
    </a>
  );
}
