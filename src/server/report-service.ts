import { z } from "zod";
import { awardReport } from "@/domain/points";
import { toLocalTime } from "@/domain/time";
import { verifyQrToken } from "./qr";
import { checkReportRate } from "./rate-limit";
import { DEFAULT_LIBRARY } from "./search-service";
import type { WriteResult, WriteStore } from "./write-store";

export const ReportBodySchema = z.object({
  spaceId: z.string().min(1).max(200),
  type: z.enum(["AVAILABLE", "BUSY", "UNUSABLE", "OUTDATED"]),
  /** Sınıftaki QR'dan gelen kod; yalnızca check-in ile. */
  qr: z.string().min(1).max(64).optional(),
});

export type SubmitResult = WriteResult | { ok: false; error: string; status: 400 | 404 | 503 };

const HOUR_MS = 60 * 60_000;

export async function submitReport(
  store: WriteStore,
  uid: string,
  body: unknown,
  nowMs: number,
  qrSecret: string | null = null,
): Promise<SubmitResult> {
  const parsed = ReportBodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Geçersiz bildirim", status: 400 };
  const { spaceId, type } = parsed.data;
  let qr = false;
  if (parsed.data.qr !== undefined) {
    if (type !== "AVAILABLE") return { ok: false, error: "QR yalnızca check-in için kullanılır", status: 400 };
    if (!qrSecret) return { ok: false, error: "QR doğrulaması şu an kullanılamıyor", status: 503 };
    if (!verifyQrToken(spaceId, parsed.data.qr, qrSecret))
      return { ok: false, error: "QR kod bu alana ait değil veya geçersiz", status: 400 };
    qr = true;
  }
  if (spaceId !== DEFAULT_LIBRARY.id && !(await store.spaceExists(spaceId))) {
    return { ok: false, error: "Alan bulunamadı", status: 404 };
  }
  const dayKey = toLocalTime(nowMs).dateISO;
  return store.addReport(
    { spaceId, type, uid, createdAtMs: nowMs, qr },
    nowMs - HOUR_MS,
    (recent) => checkReportRate(spaceId, recent, nowMs),
    (user, recentOnSpace) => awardReport(user, { uid, spaceId, type, nowMs, dayKey, recentOnSpace, qr }),
  );
}
