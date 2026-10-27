"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { postWithSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import type { SpaceDetailResponse } from "@/server/search-service";
import { RatingForm } from "./Ratings";

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

type Done = { points: number; qrLimited: boolean };

/** Sınıftaki QR okutulunca açılır: tek dokunuşla doğrulanmış check-in, ardından geri bildirim. */
export function QrCheckin() {
  const params = useParams<{ spaceId: string; token: string }>();
  const spaceId = safeDecode(params.spaceId);
  const token = safeDecode(params.token);
  const { data } = useApi<SpaceDetailResponse>(`/api/spaces/${encodeURIComponent(spaceId)}`);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rated, setRated] = useState(false);
  const name = data?.space.code ?? spaceId;

  async function checkin() {
    setSending(true);
    setError(null);
    const res = await postWithSession<Done>("/api/reports", { spaceId, type: "AVAILABLE", qr: token });
    setSending(false);
    if (res.ok) setDone(res.data);
    else setError(res.error);
  }

  return (
    <div className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6 lg:py-10">
      <header className="space-y-1">
        <p className="text-sm opacity-80">QR ile check-in</p>
        <h1 className="text-3xl font-bold">{name}</h1>
        {data && data.space.kind === "CLASSROOM" && <p className="opacity-80">{data.space.buildingName}</p>}
      </header>

      {!done && (
        <section aria-labelledby="qr-title" className="space-y-3">
          <h2 id="qr-title" className="text-lg font-bold">
            Şu an burada mısın?
          </h2>
          <p className="text-sm">
            Bu sayfayı kapıdaki QR kodu okutarak açtın. Check-in yaparsan diğer öğrenciler burayı &quot;Öğrenci doğruladı&quot;
            olarak görür.
          </p>
          <button
            type="button"
            onClick={() => void checkin()}
            disabled={sending}
            className="min-h-12 w-full rounded-lg border-2 border-green-700 px-3 py-2 font-semibold disabled:opacity-50 dark:border-green-400"
          >
            {sending ? "Gönderiliyor…" : "Buradayım, uygun (QR ile check-in)"}
          </button>
          <p aria-live="polite" className="text-sm font-semibold text-red-800 dark:text-red-300">
            {error}
          </p>
        </section>
      )}

      {done && (
        <section aria-labelledby="qr-done" className="space-y-2">
          <h2 id="qr-done" className="text-lg font-bold" aria-live="polite">
            QR ile check-in yapıldı, teşekkürler!
          </h2>
          {done.points > 0 && <p className="font-semibold">+{done.points} puan kazandın</p>}
          {done.points === 0 && <p className="text-sm">Bu yer için puanı yakın zamanda almıştın veya günlük sınıra ulaştın.</p>}
          {done.qrLimited && (
            <p className="text-sm">
              Bu QR kısa sürede çok sayıda hesaptan kullanıldığı için check-in&apos;in normal check-in olarak sayıldı.
            </p>
          )}
        </section>
      )}

      {done && !rated && (
        <div className="rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
          <RatingForm spaceId={spaceId} onRated={() => setRated(true)} />
        </div>
      )}
      {rated && <p className="font-semibold">Geri bildirimin kaydedildi. Teşekkürler!</p>}

      <Link href={`/yer/${encodeURIComponent(spaceId)}`} className="inline-flex min-h-11 items-center underline">
        {name} ayrıntısı
      </Link>
    </div>
  );
}
