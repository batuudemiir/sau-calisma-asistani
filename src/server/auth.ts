import "server-only";

import { adminAuth } from "./firebase-admin";

/** "Authorization: Bearer <Firebase ID token>" doğrular, uid döndürür. Token veya uid loglanmaz. */
export async function verifyUid(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
