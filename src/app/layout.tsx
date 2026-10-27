import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAÜ Çalışma Asistanı",
  description: "Şimdi nerede çalışabilirsin? Seçtiğin süre boyunca uygun görünen çalışma alanları, kaynağı ve güven etiketiyle.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
