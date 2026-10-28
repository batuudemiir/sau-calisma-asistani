import type { NextRequest } from "next/server";
import { dataSource } from "@/server/backend";
import { isDemoMode, parseQuery } from "@/server/request";
import { mapView } from "@/server/search-service";

export async function GET(request: NextRequest) {
  const demoMode = isDemoMode();
  const q = parseQuery(request.nextUrl.searchParams, demoMode, Date.now());
  if (!q.ok) return Response.json({ error: q.error }, { status: 400 });

  try {
    const body = await mapView(dataSource(), { ...q, demoMode });
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("map failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Harita şu an yüklenemedi" }, { status: 500 });
  }
}
