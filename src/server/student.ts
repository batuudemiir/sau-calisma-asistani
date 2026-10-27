/** SAÜ öğrenci hesabı: Google ile bağlanmış ve Google hesabının e-postası @ogr.sakarya.edu.tr. */
export const STUDENT_EMAIL_DOMAIN = "ogr.sakarya.edu.tr";

/** Firebase Auth kullanıcı kaydındaki bağlı sağlayıcılar (firebase-admin UserRecord.providerData). */
export interface LinkedProvider {
  providerId: string;
  email?: string;
}

export type StudentCheck = { ok: true } | { ok: false; error: string };

/**
 * Asıl güvenlik kontrolü sunucudadır; istemcideki "hd" ipucu yalnızca kolaylıktır.
 * Kullanıcının üst düzey e-postası değil, bağlı Google sağlayıcısının e-postası kullanılır: reddedilen bir hesabın
 * bağlantısı geri alındığında üst düzey e-posta kayıtta kalabilir. Google hesap e-postaları Google tarafından doğrulanmıştır.
 */
export function checkStudent(providers: readonly LinkedProvider[]): StudentCheck {
  const google = providers.find((p) => p.providerId === "google.com");
  if (!google) return { ok: false, error: "Google ile giriş yapılmamış" };
  const domain = google.email?.toLowerCase().split("@")[1];
  if (domain !== STUDENT_EMAIL_DOMAIN) {
    return { ok: false, error: `Yalnızca SAÜ öğrenci hesabı (@${STUDENT_EMAIL_DOMAIN}) ile giriş yapılabilir` };
  }
  return { ok: true };
}
