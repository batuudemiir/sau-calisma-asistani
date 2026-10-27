import type { Metadata } from "next";
import { Suspense } from "react";
import { QrCheckin } from "@/components/QrCheckin";

// Adres QR imzası içerir: arama motorlarında dizinlenmesin
export const metadata: Metadata = { title: "QR ile check-in", robots: { index: false, follow: false } };

export default function QrPage() {
  return (
    <Suspense
      fallback={
        <p className="p-4" role="status">
          Yükleniyor…
        </p>
      }
    >
      <QrCheckin />
    </Suspense>
  );
}
