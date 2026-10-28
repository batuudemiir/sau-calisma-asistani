import type { NextRequest } from "next/server";
import { dataSource } from "@/server/backend";
import { isDemoMode, parseQuery } from "@/server/request";
import { spaceDetail } from "@/server/search-service";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/spaces/[id]">,
) {
  const { id } = await ctx.params;
  const demoMode = isDemoMode();
  const q = parseQuery(request.nextUrl.searchParams, Date.now());
  if (!q.ok) return Response.json({ error: q.error }, { status: 400 });

  try {
    const body = await spaceDetail(await dataSource(), id, { ...q, demoMode });
    if (!body)
      return Response.json({ error: "Alan bulunamadı" }, { status: 404 });
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(
      "space detail failed:",
      e instanceof Error ? e.message : "unknown",
    );
    return Response.json(
      { error: "Alan bilgisi şu an yüklenemedi" },
      { status: 500 },
    );
  }
}
