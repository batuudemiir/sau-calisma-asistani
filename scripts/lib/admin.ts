import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Betikler için Admin SDK (src/server "server-only" olduğundan betikler kendi başlatmasını yapar).
export function scriptDb(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (raw) initializeApp({ credential: cert(JSON.parse(raw)) });
    else if (process.env.FIRESTORE_EMULATOR_HOST && projectId) initializeApp({ projectId });
    else throw new Error("FIREBASE_SERVICE_ACCOUNT veya FIRESTORE_EMULATOR_HOST + NEXT_PUBLIC_FIREBASE_PROJECT_ID gerekli");
  }
  return getFirestore();
}
