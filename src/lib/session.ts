"use client";

import { signInAnonymously } from "firebase/auth";
import { firebaseClient } from "./firebase-client";

/** Anonim oturum açar (gerekirse) ve API istekleri için ID token döndürür. Kayıt veya kişisel veri yok. */
export async function idToken(): Promise<string> {
  const { auth } = firebaseClient();
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return user.getIdToken();
}

/** Oturumlu POST. Hata mesajı API'den gelir. */
export async function postWithSession(url: string, body: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await idToken();
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return { ok: false, error: data?.error ?? "Bir sorun oluştu" };
  } catch {
    return { ok: false, error: "Bağlantı kurulamadı" };
  }
}
