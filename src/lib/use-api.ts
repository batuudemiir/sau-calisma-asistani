"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDuration } from "@/domain/config";

type State<T> = { data: T | null; error: string | null; loading: boolean };

/** GET isteği + isteğe bağlı periyodik yenileme. Sekme gizliyken yenilemez. */
export function useApi<T>(url: string, pollMs?: number) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    try {
      const res = await fetch(url, { cache: "no-store", signal: ac.signal });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Bir sorun oluştu");
      setState({ data: body as T, error: null, loading: false });
    } catch (e) {
      if (ac.signal.aborted) return;
      setState((s) => ({ data: s.data, error: e instanceof Error ? e.message : "Bir sorun oluştu", loading: false }));
    }
  }, [url]);

  useEffect(() => {
    // İlk yükleme bir sonraki tick'te; effect içinde eşzamanlı setState yapılmaz.
    const first = setTimeout(load, 0);
    const timer = pollMs
      ? setInterval(() => {
          if (document.visibilityState === "visible") void load();
        }, pollMs)
      : null;
    return () => {
      clearTimeout(first);
      if (timer) clearInterval(timer);
      controller.current?.abort();
    };
  }, [load, pollMs]);

  return { ...state, reload: load };
}

/** Sayfalar arası taşınan sorgu: süre ve (yalnızca demo modunda) demo saati. */
export function carryQuery(params: URLSearchParams, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  q.set("d", String(durationParam(params)));
  const at = params.get("at");
  if (at) q.set("at", at);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}

/** URL'deki süre; geçersizse 60. */
export function durationParam(params: URLSearchParams): number {
  const d = Number(params.get("d"));
  return isDuration(d) ? d : 60;
}
