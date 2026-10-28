"use client";

import { useCallback, useEffect, useState } from "react";
import { CLAIM_MESSAGES } from "@/domain/rewards";
import { getWithSession, postWithSession } from "@/lib/session";
import type { RewardsResponse } from "@/server/reward-service";
import { SimulatedBadge } from "./StatusBadge";
import { buttonClass } from "./ui/Button";
import { GOOGLE_LOGIN_ENABLED, LOGIN_SOON_TEXT } from "@/lib/features";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const monthName = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/** Aylık ödüller: eşik + stok (çekiliş değil). `version` değişince (giriş, çıkış) yeniden yüklenir. */
export function RewardsSection({ version }: { version: string }) {
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getWithSession<RewardsResponse>("/api/rewards");
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res.error);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, version]);

  async function claim(id: string) {
    setBusy(id);
    setMessage(null);
    const res = await postWithSession<{ code: string }>("/api/rewards/claim", { rewardId: id });
    setBusy(null);
    setMessage(res.ok ? "Ödül alındı. Kuponun aşağıda." : res.error);
    void load();
  }

  return (
    <section aria-labelledby="oduller" className="space-y-3 rounded-lg border border-line bg-card p-4">
      <h2 id="oduller" className="text-xl font-bold">
        Aylık ödüller
      </h2>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p className="text-sm">
            {monthName(data.monthKey)}: <strong>{data.monthPoints} puan</strong>. Eşiğe ulaşınca ödülü alabilirsin; her ödülden
            ayda bir kez, stok bitene kadar. Çekiliş değildir.
          </p>
          {!data.student && (
            <p className="text-sm font-semibold">
              {GOOGLE_LOGIN_ENABLED ? `${CLAIM_MESSAGES.NOT_STUDENT}.` : `Ödüller öğrenci hesabıyla alınır. ${LOGIN_SOON_TEXT}.`}
            </p>
          )}
          {data.rewards.length === 0 ? (
            <p className="text-sm">Henüz ödül sponsoru yok. Puanların birikmeye devam eder.</p>
          ) : (
            <ul className="space-y-3">
              {data.rewards.map((r) => (
                <li key={r.id} className="space-y-2 rounded-md border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{r.title}</h3>
                    {r.isSimulated && <SimulatedBadge />}
                  </div>
                  <p className="text-sm text-fg-2">
                    {r.partner} · {r.threshold} puan · bu ay kalan: {r.remaining}
                  </p>
                  <label className="block text-sm" htmlFor={`odul-${r.id}`}>
                    {Math.min(data.monthPoints, r.threshold)}/{r.threshold} puan
                  </label>
                  <progress
                    id={`odul-${r.id}`}
                    className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-ink-900 [&::-webkit-progress-bar]:bg-zinc-200 [&::-webkit-progress-value]:bg-ink-900 dark:[&::-moz-progress-bar]:bg-lime-500 dark:[&::-webkit-progress-bar]:bg-zinc-800 dark:[&::-webkit-progress-value]:bg-lime-500"
                    max={r.threshold}
                    value={Math.min(data.monthPoints, r.threshold)}
                  />
                  {r.coupon ? (
                    <div className="rounded-md bg-zinc-100 p-2 text-sm dark:bg-zinc-800">
                      Kuponun: <strong className="font-mono">{r.coupon}</strong>
                      {r.isSimulated && <span className="block text-sm">Örnek demo kuponu — hiçbir yerde geçerli değildir.</span>}
                    </div>
                  ) : r.block ? (
                    <p className="text-sm text-fg-2">
                      {r.block === "NOT_STUDENT" && !GOOGLE_LOGIN_ENABLED
                        ? "Eşiğe ulaştın; ödül öğrenci girişi açılınca alınabilir"
                        : CLAIM_MESSAGES[r.block]}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void claim(r.id)}
                      disabled={busy !== null}
                      className={buttonClass("primary", "md")}
                    >
                      {busy === r.id ? "Alınıyor…" : `${r.title} — ödülü al`}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p aria-live="polite" className="text-sm font-semibold">
            {message}
          </p>
        </>
      )}
    </section>
  );
}
