import "server-only";

import type { DataSource } from "./data-source";
import { sharedSource } from "./firestore-source";
import { firestoreWriteStore } from "./firestore-write-store";
import { memoryBackend } from "./memory-backend";
import type { WriteStore } from "./write-store";

/**
 * Arka uç seçimi. NEXT_PUBLIC_DEMO_BACKEND=memory: Firebase'siz prototip (örnek veri bellekte, kalıcı değil).
 * Aksi hâlde Firestore (canlı proje veya emulator).
 */
export const isMemoryBackend = () => process.env.NEXT_PUBLIC_DEMO_BACKEND === "memory";

export const dataSource = (): DataSource => (isMemoryBackend() ? memoryBackend().source : sharedSource());
export const writeStore = (): WriteStore => (isMemoryBackend() ? memoryBackend().store : firestoreWriteStore());
