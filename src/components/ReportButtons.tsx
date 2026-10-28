"use client";

import { useState } from "react";
import type { ReportType } from "@/domain/types";
import { postWithSession } from "@/lib/session";
import { PointsEarned } from "./ui/PointsEarned";

const BUTTONS: { type: ReportType; label: string; style: string }[] = [
  {
    type: "AVAILABLE",
    label: "Buradayım, uygun (check-in)",
    style: "col-span-2 border-accent bg-accent text-white shadow-[inset_0_-4px_0_#d9ff3f] hover:bg-accent-hover",
  },
  { type: "BUSY", label: "Dolu", style: "border-danger bg-card hover:bg-danger-soft" },
  { type: "UNUSABLE", label: "Kullanılamıyor", style: "border-danger bg-card hover:bg-danger-soft" },
  { type: "OUTDATED", label: "Bilgi güncel değil", style: "col-span-2 border-line-strong bg-card hover:bg-sunken" },
];

export function ReportButtons({ spaceId, onReported }: { spaceId: string; onReported: (type: ReportType) => void }) {
  const [sending, setSending] = useState<ReportType | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [earned, setEarned] = useState<number | null>(null);

  async function send(type: ReportType) {
    setSending(type);
    setMessage(null);
    setEarned(null);
    const res = await postWithSession("/api/reports", { spaceId, type });
    setSending(null);
    if (res.ok) {
      setMessage({
        kind: "ok",
        text:
          type === "AVAILABLE"
            ? "Check-in yapıldı. Teşekkürler, birlikte daha iyi biliyoruz."
            : "Bildirimin kaydedildi, teşekkürler!",
      });
      setEarned(res.data.points ?? 0);
      onReported(type);
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  }

  return (
    <section aria-labelledby="report-title" className="space-y-3">
      <h2 id="report-title" className="text-xl font-bold">
        Şu an burada mısın?
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.type}
            type="button"
            disabled={sending !== null}
            onClick={() => void send(b.type)}
            className={`min-h-12 rounded-md border-2 px-3 py-2 font-semibold transition-colors duration-[var(--dur-fast)] active:translate-y-px disabled:opacity-50 ${b.style}`}
          >
            {sending === b.type ? "Gönderiliyor…" : b.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className={`text-sm ${message?.kind === "error" ? "font-semibold text-danger-fg" : ""}`}>
        {message?.text}
      </p>
      {earned !== null && earned > 0 && <PointsEarned points={earned} />}
      <p className="text-xs text-fg-3">Bildirimler anonimdir; ad, e-posta veya konum saklanmaz.</p>
    </section>
  );
}
