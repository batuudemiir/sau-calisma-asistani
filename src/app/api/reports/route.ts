import { verifyUid } from "@/server/auth";
import { writeStore } from "@/server/backend";
import { submitReport } from "@/server/report-service";

export async function POST(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı, sayfayı yenileyip tekrar dene" }, { status: 401 });

  const body = await request.json().catch(() => null);
  try {
    const result = await submitReport(writeStore(), uid, body, Date.now(), process.env.QR_SECRET || null);
    if (result.ok) {
      return Response.json({ id: result.id, points: result.points ?? 0, qrLimited: result.qrLimited ?? false }, { status: 201 });
    }
    if ("retryAfterSec" in result) {
      return Response.json({ error: result.error }, { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } });
    }
    return Response.json({ error: result.error }, { status: result.status });
  } catch (e) {
    console.error("report failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Bildirim şu an kaydedilemedi" }, { status: 500 });
  }
}
