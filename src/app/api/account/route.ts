import { verifyUid } from "@/server/auth";
import { adminAuth, isMemoryBackend, writeStore } from "@/server/backend";

/**
 * Hesabı ve kişisel verileri siler: puanlar ve kullanıcı belgesi silinir, bildirim/değerlendirmelerin kişiyle
 * bağı koparılır, Firebase Auth kaydı (varsa e-posta dahil) silinir.
 */
export async function DELETE(request: Request) {
  const uid = await verifyUid(request);
  if (!uid)
    return Response.json({ error: "Oturum doğrulanamadı" }, { status: 401 });
  try {
    await (await writeStore()).deleteAccountData(uid);
    // Bellek arka ucunda Firebase Auth kaydı yok (cihaz kimliği istemcide silinir)
    if (!isMemoryBackend()) await (await adminAuth()).deleteUser(uid);
    return Response.json({ deleted: true });
  } catch (e) {
    console.error(
      "account delete failed:",
      e instanceof Error ? e.message : "unknown",
    );
    return Response.json(
      { error: "Hesap şu an silinemedi, tekrar dene" },
      { status: 500 },
    );
  }
}
