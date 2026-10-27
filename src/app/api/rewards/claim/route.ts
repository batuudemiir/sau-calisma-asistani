import { verifyUid } from "@/server/auth";
import { firestoreWriteStore } from "@/server/firestore-write-store";
import { isDemoMode } from "@/server/request";
import { claimRewardFor } from "@/server/reward-service";

export async function POST(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı" }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    const res = await claimRewardFor(firestoreWriteStore(), uid, body, Date.now(), isDemoMode());
    if (res.ok) return Response.json({ code: res.code }, { status: 201 });
    return Response.json({ error: res.error }, { status: res.status });
  } catch (e) {
    console.error("reward claim failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Ödül şu an alınamadı" }, { status: 500 });
  }
}
