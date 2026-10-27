import type { MetadataRoute } from "next";

// "Ana ekrana ekle" ile uygulama gibi açılır. Simgeler src/app/icon.svg'den üretildi (public/icon-*.png).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAÜ Çalışma Asistanı",
    short_name: "SAÜ Çalışma",
    description: "Şimdi nerede çalışabilirsin? Seçtiğin süre boyunca uygun görünen çalışma alanları, kaynağı ve güven etiketiyle.",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b3d91",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
