import { z } from "zod";
import { isDuration } from "@/domain/config";
import { istanbulLocalToMs } from "@/lib/clock";

export const isDemoMode = () => process.env.DEMO_MODE === "true";

const QuerySchema = z.object({
  d: z.coerce.number().refine(isDuration, "Süre 30, 60, 90 veya 120 olmalı"),
  // Demo saati: "2026-10-27T13:00" (Europe/Istanbul). Yalnızca DEMO_MODE açıkken kabul edilir.
  at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .optional(),
});

export type ParsedQuery =
  | { ok: true; durationMin: number; nowMs: number; reportNowMs: number; isDemoClock: boolean }
  | { ok: false; error: string };

export function parseQuery(params: URLSearchParams, demoMode: boolean, realNowMs: number): ParsedQuery {
  const parsed = QuerySchema.safeParse({ d: params.get("d") ?? "60", at: params.get("at") ?? undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz istek" };
  const { d, at } = parsed.data;
  if (at && !demoMode) return { ok: false, error: "Demo saati yalnızca demo modunda kullanılabilir" };
  const nowMs = at ? istanbulLocalToMs(at) : realNowMs;
  if (Number.isNaN(nowMs)) return { ok: false, error: "Geçersiz demo saati" };
  return { ok: true, durationMin: d, nowMs, reportNowMs: realNowMs, isDemoClock: Boolean(at) };
}
