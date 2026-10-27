import type { Metadata } from "next";
import { Suspense } from "react";
import { MapHome } from "@/components/map/MapHome";

export const metadata: Metadata = { title: "Kampüs haritası" };

export default function MapPage() {
  return (
    <Suspense fallback={<p className="p-4" role="status">Yükleniyor…</p>}>
      <MapHome />
    </Suspense>
  );
}
