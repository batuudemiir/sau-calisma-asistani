import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { TabBar } from "@/components/nav/TabBar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "neredeçalışalım", template: "%s · neredeçalışalım" },
  description: "Şimdi nerede çalışabilirsin? Seçtiğin süre boyunca uygun görünen çalışma alanları, kaynağı ve güven etiketiyle.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f3fd8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <a
          href="#icerik"
          className="sr-only z-30 rounded-md bg-cobalt-500 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          İçeriğe atla
        </a>
        <main id="icerik" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
        <Suspense>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
