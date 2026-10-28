import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsView } from "@/components/ResultsView";

export const metadata: Metadata = {
  title: "Liste",
  description: "Seçtiğin süre boyunca uygun görünen derslikler ve çalışma yerleri; arama ve filtrelerle.",
};

export default function ResultsPage() {
  return (
    <Suspense fallback={<p className="p-4" role="status">Yükleniyor…</p>}>
      <ResultsView />
    </Suspense>
  );
}
