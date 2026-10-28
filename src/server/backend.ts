import "server-only";

import { MEMORY_BACKEND } from "@/lib/backend-mode";
import type { DataSource } from "./data-source";
import { sharedSource } from "./firestore-source";
import { firestoreWriteStore } from "./firestore-write-store";
import { memoryBackend } from "./memory-backend";
import type { WriteStore } from "./write-store";

/**
 * Arka uç seçimi. MEMORY_BACKEND (lib/backend-mode): Firebase'siz prototip (örnek veri bellekte, kalıcı değil).
 * Aksi hâlde Firestore (canlı proje veya emulator).
 */
export const isMemoryBackend = () => MEMORY_BACKEND;

export const dataSource = (): DataSource => (isMemoryBackend() ? memoryBackend().source : sharedSource());
export const writeStore = (): WriteStore => (isMemoryBackend() ? memoryBackend().store : firestoreWriteStore());
