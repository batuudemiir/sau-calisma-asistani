import "server-only";

import { MEMORY_BACKEND } from "@/lib/backend-mode";
import type { DataSource } from "./data-source";
import { memoryBackend } from "./memory-backend";
import type { WriteStore } from "./write-store";

/**
 * Arka uç seçimi. MEMORY_BACKEND (lib/backend-mode): Firebase'siz prototip (örnek veri bellekte, kalıcı değil).
 * Aksi hâlde Firestore (canlı proje veya emulator).
 * Firebase modülleri yalnızca Firestore dalında dinamik yüklenir: bellek modunda firebase-admin hiç yüklenmez.
 * (Vercel paketinde firebase-admin'in harici modül bağlantısı çözülemeyip her API isteğini 500'e düşürüyordu.)
 */
export const isMemoryBackend = () => MEMORY_BACKEND;

export async function dataSource(): Promise<DataSource> {
  if (isMemoryBackend()) return memoryBackend().source;
  return (await import("./firestore-source")).sharedSource();
}

export async function writeStore(): Promise<WriteStore> {
  if (isMemoryBackend()) return memoryBackend().store;
  return (await import("./firestore-write-store")).firestoreWriteStore();
}

/** Firebase Admin Auth (yalnızca Firebase modunda çağrılır). */
export async function adminAuth() {
  return (await import("./firebase-admin")).adminAuth();
}
