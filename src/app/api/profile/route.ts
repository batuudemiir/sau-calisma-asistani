import { levelOf } from "@/domain/points";
import { toLocalTime } from "@/domain/time";
import { verifyUid } from "@/server/auth";
import { dataSource, writeStore } from "@/server/backend";
import { DEFAULT_LIBRARY } from "@/server/search-service";

/** Kişisel puan durumu ve son katkılar. Yalnızca kullanıcının kendisine; herkese açık sıralama yok. */
export async function GET(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) return Response.json({ error: "Oturum doğrulanamadı" }, { status: 401 });
  try {
    const [profile, spaces] = await Promise.all([writeStore().profile(uid, 20), dataSource().spaces()]);
    const name = new Map(spaces.map((s) => [s.id, s.code]));
    name.set(DEFAULT_LIBRARY.id, name.get(DEFAULT_LIBRARY.id) ?? DEFAULT_LIBRARY.code);
    const today = toLocalTime(Date.now()).dateISO;
    const { user } = profile;
    return Response.json(
      {
        student: profile.student,
        points: user.points,
        level: levelOf(user.points),
        todayPoints: user.dayKey === today ? user.dayPoints : 0,
        counts: user.counts,
        events: profile.events.map((e) => ({ ...e, spaceName: name.get(e.spaceId) ?? null })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("profile failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Profil şu an yüklenemedi" }, { status: 500 });
  }
}
