import { Suspense } from "react";
import { ResultsView } from "@/components/ResultsView";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-4" role="status">Yükleniyor…</p>}>
      <ResultsView />
    </Suspense>
  );
}
