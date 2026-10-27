import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";

/** "Authorization: Bearer <Firebase ID token>" doğrular. Token, uid veya e-posta loglanmaz. */
async function verifyToken(request: Request): Promise<DecodedIdToken | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function verifyUid(request: Request): Promise<string | null> {
  return (await verifyToken(request))?.uid ?? null;
}
