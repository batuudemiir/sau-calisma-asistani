import { verifyUid } from "@/server/auth";
import { firestoreWriteStore } from "@/server/firestore-write-store";
import { isDemoMode } from "@/server/request";
import { rewardsView } from "@/server/reward-service";

/** Bu ayın ödülleri, kullanıcının aylık puanı ve aldığı kuponlar. */
export async function GET(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı" }, { status: 401 });
  try {
    const body = await rewardsView(firestoreWriteStore(), uid, Date.now(), isDemoMode());
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("rewards failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Ödüller şu an yüklenemedi" }, { status: 500 });
  }
}
