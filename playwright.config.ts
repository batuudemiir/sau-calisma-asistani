import { defineConfig, devices } from "@playwright/test";

// Uçtan uca testler: production build + Firebase Emulator + örnek veri. Her çalıştırmada emulator boş başlar.
// (next dev, API'yi ilk istekte derlediği için zaman aşımına yol açıyordu.)
// Testler aynı veritabanını paylaştığı için sırayla çalışır.
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Pixel 7"],
  },
  webServer: {
    command:
      'npm run build && firebase emulators:exec --only firestore,auth --project demo-sau-calisma "npm run seed-campus && npm run seed-demo && next start -p 3000"',
    url: "http://127.0.0.1:3000",
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-sau-calisma.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-sau-calisma",
      NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
      NEXT_PUBLIC_USE_EMULATOR: "true",
      DEMO_MODE: "true",
      QR_SECRET: "e2e-qr-anahtari",
      // Google girişi uygulamada varsayılan kapalı; testler emulator'un sahte Google hesaplarıyla açık çalışır
      NEXT_PUBLIC_GOOGLE_LOGIN: process.env.E2E_GOOGLE_LOGIN ?? "true",
    },
  },
});
