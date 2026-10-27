"use client";

import { useState } from "react";
import { MIN_RATINGS_TO_SHOW } from "@/domain/config";
import { CRITERIA, CRITERION_LABELS, type Criterion, type RatingSummary } from "@/domain/ratings";
import { postWithSession } from "@/lib/session";
import { SimulatedBadge } from "./StatusBadge";

type Pair = { real: RatingSummary; simulated: RatingSummary };

/** Kartta kısa gösterim: "★ 4.2 (5 değerlendirme)" veya yetersizse hiçbir şey. */
export function RatingChip({ rating }: { rating: Pair }) {
  const show = rating.real.overall !== null ? rating.real : rating.simulated.overall !== null ? rating.simulated : null;
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span>
        <span aria-hidden="true">★</span> {show.overall!.toFixed(1)}/5 ({show.count} değerlendirme)
      </span>
      {show === rating.simulated && <SimulatedBadge />}
    </span>
  );
}

export function RatingSummaryView({ rating }: { rating: Pair }) {
  return (
    <section aria-labelledby="rating-title" className="space-y-2">
      <h2 id="rating-title" className="text-lg font-bold">
        Öğrenci değerlendirmeleri
      </h2>
      <SummaryBlock s={rating.real} />
      {rating.simulated.count > 0 && (
        <div className="space-y-1 rounded-lg border border-dashed border-amber-700 p-2 dark:border-amber-400">
          <SimulatedBadge />
          <SummaryBlock s={rating.simulated} />
        </div>
      )}
    </section>
  );
}

function SummaryBlock({ s }: { s: RatingSummary }) {
  if (!s.averages) {
    return (
      <p className="text-sm">
        Henüz yeterli değerlendirme yok ({s.count}/{MIN_RATINGS_TO_SHOW}).
      </p>
    );
  }
  return (
    <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
      {CRITERIA.map((c) => (
        <div key={c} className="contents">
          <dt>{CRITERION_LABELS[c]}</dt>
          <dd aria-hidden="true" className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-2 rounded-full bg-foreground" style={{ width: `${(s.averages![c] / 5) * 100}%` }} />
          </dd>
          <dd>{s.averages![c].toFixed(1)}/5</dd>
        </div>
      ))}
      <div className="contents font-semibold">
        <dt>Genel</dt>
        <dd />
        <dd>
          {s.overall!.toFixed(1)}/5 · {s.count} değerlendirme
        </dd>
      </div>
    </dl>
  );
}

export function RatingForm({ spaceId, onRated }: { spaceId: string; onRated: () => void }) {
  const [scores, setScores] = useState<Partial<Record<Criterion, number>>>({});
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const complete = CRITERIA.every((c) => scores[c]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    setSending(true);
    setMessage(null);
    setEarned(null);
    const res = await postWithSession("/api/ratings", { spaceId, scores });
    setSending(false);
    if (res.ok) {
      setMessage({ kind: "ok", text: "Değerlendirmen kaydedildi, teşekkürler!" });
      setEarned(res.data.points ?? 0);
      setScores({});
      onRated();
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-labelledby="rate-title">
      <h2 id="rate-title" className="text-lg font-bold">
        Burayı değerlendir
      </h2>
      <p className="text-xs opacity-70">Check-in yaptıktan sonraki 3 saat içinde, her check-in için bir kez.</p>
      {CRITERIA.map((c) => (
        <fieldset key={c} className="space-y-1">
          <legend className="text-sm font-semibold">{CRITERION_LABELS[c]}</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex-1">
                <input
                  type="radio"
                  name={c}
                  value={n}
                  checked={scores[c] === n}
                  onChange={() => setScores((s) => ({ ...s, [c]: n }))}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-zinc-400 font-semibold peer-checked:border-current peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2">
                  {n}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button
        type="submit"
        disabled={!complete || sending}
        className="min-h-12 w-full rounded-lg border-2 border-current font-semibold disabled:opacity-50"
      >
        {sending ? "Gönderiliyor…" : complete ? "Değerlendirmeyi gönder" : "Dört kriteri de puanla"}
      </button>
      <p aria-live="polite" className={`text-sm ${message?.kind === "error" ? "font-semibold text-red-800 dark:text-red-300" : ""}`}>
        {message?.text}
      </p>
      {earned !== null && earned > 0 && <p className="text-sm font-semibold">+{earned} puan kazandın</p>}
    </form>
  );
}
