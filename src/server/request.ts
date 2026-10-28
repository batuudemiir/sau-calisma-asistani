import { z } from "zod";
import { MEMORY_BACKEND } from "@/lib/backend-mode";
import { isDuration } from "@/domain/config";
import { istanbulLocalToMs } from "@/lib/clock";

// Firebase'siz prototip (bellek arka ucu) yalnızca örnek veriyle çalışır; demo modu onda her zaman açık
export const isDemoMode = () => process.env.DEMO_MODE === "true" || MEMORY_BACKEND;

const QuerySchema = z.object({
  d: z.coerce.number().refine(isDuration, "Süre 15 dakika ile 14 saat arasında olmalı"),
  // Seçilen başlangıç: "2026-10-29T13:00" (Europe/Istanbul). Yoksa şimdi. Demo modunda bu saat "şimdi" sayılır.
  at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .optional(),
});

export type ParsedQuery =
  | { ok: true; durationMin: number; nowMs: number; reportNowMs: number; isDemoClock: boolean }
  | { ok: false; error: string };

export function parseQuery(params: URLSearchParams, realNowMs: number): ParsedQuery {
  const parsed = QuerySchema.safeParse({ d: params.get("d") ?? "60", at: params.get("at") ?? undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz istek" };
  const { d, at } = parsed.data;
  const nowMs = at ? istanbulLocalToMs(at) : realNowMs;
  if (Number.isNaN(nowMs)) return { ok: false, error: "Geçersiz tarih veya saat" };
  return { ok: true, durationMin: d, nowMs, reportNowMs: realNowMs, isDemoClock: Boolean(at) };
}
