import { verifyUid } from "@/server/auth";
import { writeStore } from "@/server/backend";
import { submitRating } from "@/server/rating-service";

export async function POST(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı, sayfayı yenileyip tekrar dene" }, { status: 401 });

  const body = await request.json().catch(() => null);
  try {
    const result = await submitRating(writeStore(), uid, body, Date.now());
    if (result.ok) return Response.json({ id: result.id, points: result.points ?? 0 }, { status: 201 });
    if ("status" in result) return Response.json({ error: result.error }, { status: result.status });
    const headers = result.retryAfterSec ? { "Retry-After": String(result.retryAfterSec) } : undefined;
    return Response.json({ error: result.error }, { status: result.retryAfterSec ? 429 : 409, headers });
  } catch (e) {
    console.error("rating failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Değerlendirme şu an kaydedilemedi" }, { status: 500 });
  }
}
