"use client";

import { useState } from "react";
import type { ReportType } from "@/domain/types";
import { postWithSession } from "@/lib/session";

const BUTTONS: { type: ReportType; label: string; style: string }[] = [
  { type: "AVAILABLE", label: "Buradayım, uygun (check-in)", style: "border-green-700 dark:border-green-400 col-span-2" },
  { type: "BUSY", label: "Dolu", style: "border-red-700 dark:border-red-400" },
  { type: "UNUSABLE", label: "Kullanılamıyor", style: "border-red-700 dark:border-red-400" },
  { type: "OUTDATED", label: "Bilgi güncel değil", style: "border-zinc-500 col-span-2" },
];

export function ReportButtons({ spaceId, onReported }: { spaceId: string; onReported: (type: ReportType) => void }) {
  const [sending, setSending] = useState<ReportType | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function send(type: ReportType) {
    setSending(type);
    setMessage(null);
    const res = await postWithSession("/api/reports", { spaceId, type });
    setSending(null);
    if (res.ok) {
      setMessage({ kind: "ok", text: type === "AVAILABLE" ? "Check-in yapıldı, teşekkürler!" : "Bildirimin kaydedildi, teşekkürler!" });
      onReported(type);
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  }

  return (
    <section aria-labelledby="report-title" className="space-y-3">
      <h2 id="report-title" className="text-lg font-bold">
        Şu an burada mısın?
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.type}
            type="button"
            disabled={sending !== null}
            onClick={() => void send(b.type)}
            className={`min-h-12 rounded-lg border-2 px-3 py-2 font-semibold disabled:opacity-50 ${b.style}`}
          >
            {sending === b.type ? "Gönderiliyor…" : b.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className={`text-sm ${message?.kind === "error" ? "font-semibold text-red-800 dark:text-red-300" : ""}`}>
        {message?.text}
      </p>
      <p className="text-xs opacity-70">Bildirimler anonimdir; ad, e-posta veya konum saklanmaz.</p>
    </section>
  );
}
