import { verifyUid } from "@/server/auth";
import { adminAuth } from "@/server/firebase-admin";
import { firestoreWriteStore } from "@/server/firestore-write-store";
import { checkStudent } from "@/server/student";

/** Google bağlantısından sonra çağrılır: hesabı SAÜ öğrenci hesabı olarak işaretler. E-posta saklanmaz. */
export async function POST(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı" }, { status: 401 });
  try {
    const user = await adminAuth().getUser(uid);
    const check = checkStudent(user.providerData);
    if (!check.ok) return Response.json({ error: check.error }, { status: 403 });
    await firestoreWriteStore().markStudent(uid);
    return Response.json({ student: true });
  } catch (e) {
    console.error("student check failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Hesap şu an doğrulanamadı" }, { status: 500 });
  }
}
