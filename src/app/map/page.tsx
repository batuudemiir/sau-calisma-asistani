import { Suspense } from "react";
import { MapView } from "@/components/map/MapView";

export default function MapPage() {
  return (
    <Suspense fallback={<p className="p-4" role="status">Yükleniyor…</p>}>
      <MapView />
    </Suspense>
  );
}
