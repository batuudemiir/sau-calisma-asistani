import type { MetadataRoute } from "next";

// Arama motorları sayfaları dizinleyebilir; API ve imzalı QR bağlantıları dizinlenmez.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/qr/"] } };
}
