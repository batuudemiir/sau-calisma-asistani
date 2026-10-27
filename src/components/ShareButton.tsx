"use client";

import { useState } from "react";

/** Bu sayfanın bağlantısını paylaşır (Web Share API); yoksa panoya kopyalar. */
export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Bağlantı kopyalandı");
    } catch (e) {
      // Kullanıcı paylaşımı iptal ettiyse sessiz kal
      if (e instanceof DOMException && e.name === "AbortError") return;
      setMessage("Bağlantı kopyalanamadı");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void share()}
        className="min-h-11 rounded-lg border border-zinc-400 px-3 text-sm font-semibold"
      >
        Bu yeri paylaş
      </button>
      <span aria-live="polite" className="text-sm">
        {message}
      </span>
    </span>
  );
}
