"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DAILY_CAP, LEVELS, POINTS, type PointKind } from "@/domain/points";
import { deleteAccount, getWithSession, signInWithGoogle, signOutUser, useAuthUser } from "@/lib/session";

interface ProfileResponse {
  student: boolean;
  points: number;
  level: { index: number; name: string; next: { name: string; min: number; remaining: number } | null };
  todayPoints: number;
  counts: { checkins: number; reports: number; ratings: number };
  events: { kind: PointKind; points: number; spaceId: string; spaceName: string | null; createdAtMs: number }[];
}

const KIND_LABEL: Record<PointKind, string> = {
  CHECKIN: "Check-in",
  REPORT: "Bildirim",
  RATING: "Değerlendirme",
  CONFIRM_BONUS: "Doğrulama bonusu",
};

const dateTime = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

export function ProfileView() {
  const { ready, user } = useAuthUser();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getWithSession<ProfileResponse>("/api/profile");
    if (res.ok) {
      setProfile(res.data);
      setError(null);
    } else setError(res.error);
  }, []);

  // Oturum değişince (giriş/çıkış) profil yeniden yüklenir
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [ready, uid, load]);

  async function signIn() {
    setBusy(true);
    setNotice(null);
    const res = await signInWithGoogle();
    setBusy(false);
    setNotice(res.ok ? "SAÜ öğrenci hesabınla giriş yaptın." : res.error);
    void load();
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  async function removeAccount() {
    setBusy(true);
    const res = await deleteAccount();
    setBusy(false);
    setConfirmDelete(false);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }
    setProfile(null);
    setNotice("Hesabın ve kişisel verilerin silindi. Bildirimlerin anonim topluluk verisi olarak kaldı.");
  }

  async function signOut() {
    await signOutUser();
    setProfile(null);
    setNotice("Çıkış yaptın. Yeni katkıların yeni bir anonim oturumla kaydedilir.");
  }

  const student = profile?.student && user && !user.isAnonymous;
  // Üst düzey e-posta, geri alınmış eski bir bağlantıdan kalmış olabilir; Google sağlayıcısınınki gösterilir
  const google = user?.providerData.find((p) => p.providerId === "google.com");
  const next = profile?.level.next;
  const levelStart = profile ? LEVELS[profile.level.index].min : 0;

  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6 lg:max-w-3xl lg:px-8 lg:py-10">
      <h1 className="text-2xl font-bold">Profil</h1>

      <section aria-labelledby="hesap" className="space-y-3 rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 id="hesap" className="text-lg font-semibold">
          {student ? "SAÜ öğrenci hesabı" : "Katkıların bu cihazda anonim"}
        </h2>
        {student ? (
          <>
            <p className="text-sm">
              {google?.displayName && <strong className="block">{google.displayName}</strong>}
              {google?.email}
            </p>
            <p className="text-xs opacity-70">E-posta adresin yalnızca bu cihazda gösterilir; sunucuda saklanmaz.</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-11 rounded-lg border border-zinc-400 px-4 font-semibold"
            >
              Çıkış yap
            </button>
          </>
        ) : (
          <>
            <p className="text-sm opacity-80">
              Check-in ve değerlendirme için giriş gerekmez. SAÜ öğrenci hesabınla giriş yaparsan puanların ve katkı geçmişin
              cihaz değişse de korunur; şimdiye kadarki puanların hesabına aktarılır.
            </p>
            <button
              type="button"
              onClick={() => void signIn()}
              disabled={busy}
              className="min-h-12 w-full rounded-lg border-2 border-current px-4 font-semibold disabled:opacity-50"
            >
              {busy ? "Giriş yapılıyor…" : "SAÜ hesabıyla giriş yap (Google)"}
            </button>
            <p className="text-xs opacity-70">Yalnızca @ogr.sakarya.edu.tr adresleri kabul edilir.</p>
          </>
        )}
        <p aria-live="polite" className="text-sm font-semibold">
          {notice}
        </p>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-red-700 p-3 text-sm">
          {error}.{" "}
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Tekrar dene
          </button>
        </div>
      )}

      {profile && (
        <section aria-labelledby="puan" className="space-y-3 rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
          <h2 id="puan" className="text-lg font-semibold">
            Puanların
          </h2>
          <p>
            <span className="text-3xl font-bold">{profile.points}</span> puan ·{" "}
            <strong data-testid="level">{profile.level.name}</strong>
          </p>
          {next ? (
            <div className="space-y-1">
              <label htmlFor="level-progress" className="text-sm">
                {next.name} seviyesine {next.remaining} puan kaldı
              </label>
              <progress
                id="level-progress"
                className="h-2 w-full"
                max={next.min - levelStart}
                value={profile.points - levelStart}
              />
            </div>
          ) : (
            <p className="text-sm">En yüksek seviyedesin.</p>
          )}
          <p className="text-sm opacity-80">
            Bugün {profile.todayPoints}/{DAILY_CAP} puan · {profile.counts.checkins} check-in · {profile.counts.reports} bildirim
            · {profile.counts.ratings} değerlendirme
          </p>
          <details className="text-sm">
            <summary className="min-h-11 cursor-pointer content-center font-semibold">Puanlar nasıl kazanılır?</summary>
            <ul className="list-disc space-y-1 pl-5">
              <li>Check-in: +{POINTS.CHECKIN} (aynı yer için 3 saatte bir)</li>
              <li>Dolu / kullanılamıyor / güncel değil bildirimi: +{POINTS.REPORT}</li>
              <li>Değerlendirme: +{POINTS.RATING}</li>
              <li>Başka bir öğrenci 30 dakika içinde aynı yeri aynı şekilde bildirirse ikinize de +{POINTS.CONFIRM_BONUS}</li>
              <li>
                Günde en fazla {DAILY_CAP} puan. Puanlar yalnızca sana görünür; sonuçların sırasını ve güven etiketlerini
                etkilemez.
              </li>
            </ul>
          </details>
        </section>
      )}

      {profile && (
        <section aria-labelledby="gecmis" className="space-y-2">
          <h2 id="gecmis" className="text-lg font-semibold">
            Son katkıların
          </h2>
          {profile.events.length === 0 ? (
            <p className="text-sm">Henüz katkın yok. Bir çalışma yerinde &quot;Buradayım&quot; diyerek başlayabilirsin.</p>
          ) : (
            <ul className="divide-y divide-zinc-300 rounded-lg border border-zinc-300 text-sm dark:divide-zinc-700 dark:border-zinc-700">
              {profile.events.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-2">
                  <span>
                    <strong>{KIND_LABEL[e.kind]}</strong> · {e.spaceName ?? "Silinmiş alan"}
                    <span className="block text-xs opacity-70">{dateTime.format(e.createdAtMs)}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{e.points > 0 ? `+${e.points}` : "0 (sınır)"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {profile && (
        <section aria-labelledby="sil" className="space-y-2 rounded-xl border border-red-700 p-4 dark:border-red-400">
          <h2 id="sil" className="text-lg font-semibold">
            Hesabımı ve verilerimi sil
          </h2>
          <p className="text-sm">
            Puanların, katkı geçmişin ve hesabın silinir. Yaptığın bildirim ve değerlendirmeler diğer öğrencilere yardımcı olmaya
            devam eder ama artık seninle ilişkilendirilmez. Bu işlem geri alınamaz.
          </p>
          {confirmDelete ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void removeAccount()}
                disabled={busy}
                className="min-h-11 rounded-lg border-2 border-red-700 px-4 font-semibold text-red-800 disabled:opacity-50 dark:border-red-400 dark:text-red-300"
              >
                {busy ? "Siliniyor…" : "Evet, kalıcı olarak sil"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-11 rounded-lg border border-zinc-400 px-4"
              >
                Vazgeç
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="min-h-11 rounded-lg border border-red-700 px-4 font-semibold text-red-800 dark:border-red-400 dark:text-red-300"
            >
              Hesabımı sil
            </button>
          )}
        </section>
      )}

      <Link href="/hakkinda" className="inline-flex min-h-11 items-center underline">
        Hakkında, veri kaynakları ve gizlilik
      </Link>
    </div>
  );
}
