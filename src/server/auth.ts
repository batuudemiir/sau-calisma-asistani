import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, isMemoryBackend } from "./backend";

/** "Authorization: Bearer <Firebase ID token>" doğrular. Token, uid veya e-posta loglanmaz. */
async function verifyToken(request: Request): Promise<DecodedIdToken | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return await (await adminAuth()).verifyIdToken(token);
  } catch {
    return null;
  }
}

/** Bellek arka ucu (Firebase'siz prototip): istemcinin ürettiği rastgele cihaz kimliği. Doğrulama değildir; yalnızca demo. */
const DEVICE_ID = /^[a-f0-9-]{16,64}$/;
function deviceUid(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const id = header.startsWith("Device ") ? header.slice(7) : "";
  return DEVICE_ID.test(id) ? `cihaz-${id}` : null;
}

export async function verifyUid(request: Request): Promise<string | null> {
  if (isMemoryBackend()) return deviceUid(request);
  return (await verifyToken(request))?.uid ?? null;
}
