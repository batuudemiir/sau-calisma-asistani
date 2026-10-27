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

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (process.env.FIRESTORE_EMULATOR_HOST && projectId) return initializeApp({ projectId });

  // Değeri değil, yalnızca eksik olduğunu bildir (kural 7).
  throw new Error("FIREBASE_SERVICE_ACCOUNT tanımlı değil (emulator için FIRESTORE_EMULATOR_HOST ve proje kimliği gerekir).");
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
