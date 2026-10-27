import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sınıf QR'ları: her alan için tahmin edilemeyen, sunucunun gizli anahtarıyla imzalı bir kod. Basılı QR'ın fotoğrafı
 * paylaşılabilir; bu yüzden QR "orada olma" için güçlü ama kesin olmayan bir kanıttır (bkz. points.qrOverused).
 * Gizli anahtar yalnızca sunucuda ve baskı betiğinde (QR_SECRET); istemci paketine girmez.
 */
export function qrToken(spaceId: string, secret: string): string {
  return createHmac("sha256", secret).update(`qr:v1:${spaceId}`).digest("base64url").slice(0, 22);
}

export function verifyQrToken(spaceId: string, token: string, secret: string): boolean {
  const expected = Buffer.from(qrToken(spaceId, secret));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Basılacak adres: telefon kamerası okutunca doğrudan check-in sayfası açılır. */
export function qrUrl(baseUrl: string, spaceId: string, secret: string): string {
  return `${baseUrl.replace(/\/$/, "")}/qr/${encodeURIComponent(spaceId)}/${qrToken(spaceId, secret)}`;
}
