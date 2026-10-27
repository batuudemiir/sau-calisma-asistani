"use client";

import { useCallback, useEffect, useState } from "react";
import { CLAIM_MESSAGES } from "@/domain/rewards";
import { getWithSession, postWithSession } from "@/lib/session";
import type { RewardsResponse } from "@/server/reward-service";
import { SimulatedBadge } from "./StatusBadge";

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
    <section aria-labelledby="oduller" className="space-y-3 rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
      <h2 id="oduller" className="text-lg font-semibold">
        Aylık ödüller
      </h2>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p className="text-sm">
            {monthName(data.monthKey)}: <strong>{data.monthPoints} puan</strong>. Eşiğe ulaşınca ödülü alabilirsin; her ödülden
            ayda bir kez, stok bitene kadar. Çekiliş değildir.
          </p>
          {!data.student && <p className="text-sm font-semibold">{CLAIM_MESSAGES.NOT_STUDENT}.</p>}
          {data.rewards.length === 0 ? (
            <p className="text-sm">Henüz ödül sponsoru yok. Puanların birikmeye devam eder.</p>
          ) : (
            <ul className="space-y-3">
              {data.rewards.map((r) => (
                <li key={r.id} className="space-y-2 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{r.title}</h3>
                    {r.isSimulated && <SimulatedBadge />}
                  </div>
                  <p className="text-xs opacity-80">
                    {r.partner} · {r.threshold} puan · bu ay kalan: {r.remaining}
                  </p>
                  <label className="block text-xs" htmlFor={`odul-${r.id}`}>
                    {Math.min(data.monthPoints, r.threshold)}/{r.threshold} puan
                  </label>
                  <progress
                    id={`odul-${r.id}`}
                    className="h-2 w-full"
                    max={r.threshold}
                    value={Math.min(data.monthPoints, r.threshold)}
                  />
                  {r.coupon ? (
                    <div className="rounded-lg bg-zinc-100 p-2 text-sm dark:bg-zinc-800">
                      Kuponun: <strong className="font-mono">{r.coupon}</strong>
                      {r.isSimulated && <span className="block text-xs">Örnek demo kuponu — hiçbir yerde geçerli değildir.</span>}
                    </div>
                  ) : r.block ? (
                    <p className="text-sm opacity-80">{CLAIM_MESSAGES[r.block]}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void claim(r.id)}
                      disabled={busy !== null}
                      className="min-h-11 rounded-lg border-2 border-current px-4 font-semibold disabled:opacity-50"
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
