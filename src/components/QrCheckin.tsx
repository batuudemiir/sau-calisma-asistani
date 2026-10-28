"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { postWithSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import type { SpaceDetailResponse } from "@/server/search-service";
import { RatingForm } from "./Ratings";
import { PointsEarned } from "./ui/PointsEarned";
import { buttonClass } from "./ui/Button";

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
        <p className="text-sm text-fg-2">QR ile check-in</p>
        <h1 className="text-[40px] leading-[44px] font-bold">{name}</h1>
        {data && data.space.kind === "CLASSROOM" && <p className="text-fg-2">{data.space.buildingName}</p>}
      </header>

      {!done && (
        <section aria-labelledby="qr-title" className="space-y-3">
          <h2 id="qr-title" className="text-xl font-bold">
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
            className={`${buttonClass("primary", "lg", true)} shadow-[inset_0_-4px_0_#d9ff3f]`}
          >
            {sending ? "Gönderiliyor…" : "Buradayım, uygun (QR ile check-in)"}
          </button>
          <p aria-live="polite" className="text-sm font-semibold text-danger-fg">
            {error}
          </p>
        </section>
      )}

      {done && (
        <section aria-labelledby="qr-done" className="space-y-2">
          <h2 id="qr-done" className="text-xl font-bold" aria-live="polite">
            QR ile check-in yapıldı, teşekkürler!
          </h2>
          {done.points > 0 && <PointsEarned points={done.points} />}
          {done.points === 0 && <p className="text-sm">Bu yer için puanı yakın zamanda almıştın veya günlük sınıra ulaştın.</p>}
          {done.qrLimited && (
            <p className="text-sm">
              Bu QR kısa sürede çok sayıda hesaptan kullanıldığı için check-in&apos;in normal check-in olarak sayıldı.
            </p>
          )}
        </section>
      )}

      {done && !rated && (
        <div className="rounded-lg border border-line bg-card p-4">
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
