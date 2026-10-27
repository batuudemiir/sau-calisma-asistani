import { z } from "zod";
import { checkReportRate } from "./rate-limit";
import { DEFAULT_LIBRARY } from "./search-service";
import type { WriteResult, WriteStore } from "./write-store";

export const ReportBodySchema = z.object({
  spaceId: z.string().min(1).max(200),
  type: z.enum(["AVAILABLE", "BUSY", "UNUSABLE", "OUTDATED"]),
});

export type SubmitResult = WriteResult | { ok: false; error: string; status: 400 | 404 };

const HOUR_MS = 60 * 60_000;

export async function submitReport(store: WriteStore, uid: string, body: unknown, nowMs: number): Promise<SubmitResult> {
  const parsed = ReportBodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Geçersiz bildirim", status: 400 };
  const { spaceId, type } = parsed.data;
  if (spaceId !== DEFAULT_LIBRARY.id && !(await store.spaceExists(spaceId))) {
    return { ok: false, error: "Alan bulunamadı", status: 404 };
  }
  return store.addReport({ spaceId, type, uid, createdAtMs: nowMs }, nowMs - HOUR_MS, (recent) =>
    checkReportRate(spaceId, recent, nowMs),
  );
}
