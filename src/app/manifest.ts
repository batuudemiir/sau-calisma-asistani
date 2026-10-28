import type { MetadataRoute } from "next";

// "Ana ekrana ekle" ile uygulama gibi açılır. Simgeler tasarım paketinden (assets/app-icon*).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "neredeçalışalım",
    short_name: "neredeçalışalım",
    description:
      "Şimdi nerede çalışabilirsin? Seçtiğin süre boyunca uygun görünen çalışma alanları, kaynağı ve güven etiketiyle.",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#1f3fd8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
