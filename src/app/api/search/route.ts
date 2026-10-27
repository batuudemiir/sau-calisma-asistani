import type { NextRequest } from "next/server";
import { sharedSource } from "@/server/firestore-source";
import { isDemoMode, parseQuery } from "@/server/request";
import { runSearch } from "@/server/search-service";

export async function GET(request: NextRequest) {
  const demoMode = isDemoMode();
  const q = parseQuery(request.nextUrl.searchParams, demoMode, Date.now());
  if (!q.ok) return Response.json({ error: q.error }, { status: 400 });

  try {
    const body = await runSearch(sharedSource(), { ...q, demoMode });
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("search failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Sonuçlar şu an yüklenemedi" }, { status: 500 });
  }
}
