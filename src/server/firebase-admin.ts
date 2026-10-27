import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Emulator'da FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST tanımlıysa servis hesabı gerekmez.
function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return initializeApp({ credential: cert(JSON.parse(raw)) });

  // GCLOUD_PROJECT: `firebase emulators:exec` tarafından tanımlanır (.env.local olmadan da çalışsın)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  if (process.env.FIRESTORE_EMULATOR_HOST && projectId) return initializeApp({ projectId });

  // Firebase App Hosting / Cloud Run: varsayılan uygulama kimliği (servis hesabı JSON'u gerekmez)
  if (process.env.K_SERVICE || process.env.FIREBASE_CONFIG) return initializeApp();

  // Değeri değil, yalnızca eksik olduğunu bildir (kural 7).
  throw new Error("FIREBASE_SERVICE_ACCOUNT tanımlı değil (emulator için FIRESTORE_EMULATOR_HOST ve proje kimliği gerekir).");
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
