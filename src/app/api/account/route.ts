import { verifyUid } from "@/server/auth";
import { adminAuth } from "@/server/firebase-admin";
import { firestoreWriteStore } from "@/server/firestore-write-store";

/**
 * Hesabı ve kişisel verileri siler: puanlar ve kullanıcı belgesi silinir, bildirim/değerlendirmelerin kişiyle
 * bağı koparılır, Firebase Auth kaydı (varsa e-posta dahil) silinir.
 */
export async function DELETE(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı" }, { status: 401 });
  try {
    await firestoreWriteStore().deleteAccountData(uid);
    await adminAuth().deleteUser(uid);
    return Response.json({ deleted: true });
  } catch (e) {
    console.error("account delete failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Hesap şu an silinemedi, tekrar dene" }, { status: 500 });
  }
}
