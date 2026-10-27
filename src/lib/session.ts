"use client";

import {
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut,
  unlink,
  type User,
  type UserCredential,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useEffect, useState } from "react";
import { firebaseClient } from "./firebase-client";

/** Anonim oturum açar (gerekirse) ve API istekleri için ID token döndürür. Kayıt gerekmez. */
export async function idToken(forceRefresh = false): Promise<string> {
  const { auth } = firebaseClient();
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return user.getIdToken(forceRefresh);
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

async function withSession<T>(url: string, init: RequestInit = {}, forceRefresh = false): Promise<ApiResult<T>> {
  try {
    const token = await idToken(forceRefresh);
    const res = await fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` }, cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: data as T };
    return { ok: false, error: data?.error ?? "Bir sorun oluştu", status: res.status };
  } catch {
    return { ok: false, error: "Bağlantı kurulamadı" };
  }
}

/** Oturumlu POST. Hata mesajı API'den gelir; başarıda yanıt gövdesi (ör. kazanılan puan) döner. */
export function postWithSession<T = { points?: number }>(url: string, body: unknown) {
  return withSession<T>(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function getWithSession<T>(url: string) {
  return withSession<T>(url);
}

/** Oturumdaki kullanıcı (yoksa null). Yalnızca ekranda göstermek için; e-posta hiçbir yere gönderilmez. */
export function useAuthUser() {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({ ready: false, user: null });
  useEffect(() => onAuthStateChanged(firebaseClient().auth, (user) => setState({ ready: true, user })), []);
  return state;
}

declare global {
  interface Window {
    /** Yalnızca emulator testleri: Google penceresi yerine bu e-postayla sahte Google kimliği. */
    __fakeGoogleEmail?: string;
  }
}

function googleCredential(user: User): Promise<UserCredential> {
  const fake = process.env.NEXT_PUBLIC_USE_EMULATOR === "true" ? window.__fakeGoogleEmail : undefined;
  if (fake) {
    // Auth Emulator imzasız JSON kimliği kabul eder (gerçek projede bu yol derlenmiş pakette çalışmaz)
    const cred = GoogleAuthProvider.credential(JSON.stringify({ sub: `test-${fake}`, email: fake, email_verified: true }));
    return linkWithCredential(user, cred);
  }
  const provider = new GoogleAuthProvider();
  // hd yalnızca Google'a ipucudur; asıl kontrol sunucuda (/api/profile/student)
  provider.setCustomParameters({ hd: "ogr.sakarya.edu.tr", prompt: "select_account" });
  return linkWithPopup(user, provider);
}

/**
 * Anonim hesabı Google hesabına bağlar (uid korunur, önceki katkılar ve puanlar kaybolmaz), sonra sunucuda
 * SAÜ öğrenci hesabı olduğu doğrulanır. Doğrulanmazsa bağlantı geri alınır ve hesap anonim kalır.
 */
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { auth } = firebaseClient();
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  let linkedHere = true;
  try {
    await googleCredential(user);
  } catch (e) {
    if (e instanceof FirebaseError && e.code === "auth/credential-already-in-use") {
      // Bu Google hesabı daha önce başka bir cihazda bağlanmış: o hesaba geç
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (!cred) return { ok: false, error: "Giriş tamamlanamadı" };
      await signInWithCredential(auth, cred);
      linkedHere = false;
    } else if (
      e instanceof FirebaseError &&
      (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")
    ) {
      return { ok: false, error: "Giriş penceresi kapatıldı" };
    } else {
      return { ok: false, error: "Google ile giriş yapılamadı" };
    }
  }

  const res = await withSession<{ student: boolean }>("/api/profile/student", { method: "POST" }, true);
  if (res.ok) return { ok: true };
  // Öğrenci hesabı değil: bağlantıyı geri al (anonim kalır) veya geçilen hesaptan çık
  const current = auth.currentUser;
  if (current) {
    if (linkedHere) await unlink(current, "google.com").catch(() => signOut(auth));
    else await signOut(auth);
  }
  return { ok: false, error: res.error };
}

/** Çıkış: sonraki katkı yeni bir anonim oturumla yapılır. */
export async function signOutUser() {
  await signOut(firebaseClient().auth);
}
