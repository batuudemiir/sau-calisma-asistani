import { Suspense } from "react";
import { SpaceView } from "@/components/SpaceView";

export default function SpacePage() {
  return (
    <Suspense fallback={<p className="p-4" role="status">Yükleniyor…</p>}>
      <SpaceView />
    </Suspense>
  );
}
