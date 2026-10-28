"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// NEXT_PUBLIC_ değerleri gizli değildir; istemci paketine girer.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function firebaseClient() {
  if (cached) return cached;
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (process.env.NEXT_PUBLIC_USE_EMULATOR === "true") {
    // Sayfanın açıldığı makine: telefon dizüstüne yerel ağ IP'siyle bağlandığında emulator da orada
    const host = window.location.hostname;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  }
  cached = { app, auth, db };
  return cached;
}
