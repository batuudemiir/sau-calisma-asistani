import type { Metadata } from "next";
import { Suspense } from "react";
import { SpaceView } from "@/components/SpaceView";

export const metadata: Metadata = { title: "Çalışma alanı" };

export default function SpacePage() {
  return (
    <Suspense fallback={<p className="p-4" role="status">Yükleniyor…</p>}>
      <SpaceView />
    </Suspense>
  );
}
