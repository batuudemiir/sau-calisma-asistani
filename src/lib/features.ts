/**
 * Özellik anahtarları (derlemede pakete gömülür; gizli değildir).
 * Google ile SAÜ öğrenci girişi şimdilik kapalı: canlı projede doğrulanana kadar arayüzde gösterilmez.
 * Açmak için NEXT_PUBLIC_GOOGLE_LOGIN=true (e2e testleri emulator'la açık çalışır).
 */
export const GOOGLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "true";

export const LOGIN_SOON_TEXT = "SAÜ öğrenci hesabıyla giriş yakında açılacak";
