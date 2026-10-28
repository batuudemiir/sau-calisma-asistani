import { verifyUid } from "@/server/auth";
import { adminAuth } from "@/server/firebase-admin";
import { isMemoryBackend, writeStore } from "@/server/backend";
import { checkStudent } from "@/server/student";

/** Google bağlantısından sonra çağrılır: hesabı SAÜ öğrenci hesabı olarak işaretler. E-posta saklanmaz. */
export async function POST(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı" }, { status: 401 });
  // Firebase'siz prototip: Google doğrulaması yok; cihaz "örnek öğrenci hesabı" olarak işaretlenir (yalnızca sunum)
  if (isMemoryBackend()) {
    await writeStore().markStudent(uid);
    return Response.json({ student: true, demo: true });
  }
  try {
    const user = await adminAuth().getUser(uid);
    const check = checkStudent(user.providerData);
    if (!check.ok) return Response.json({ error: check.error }, { status: 403 });
    await writeStore().markStudent(uid);
    return Response.json({ student: true });
  } catch (e) {
    console.error("student check failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Hesap şu an doğrulanamadı" }, { status: 500 });
  }
}
