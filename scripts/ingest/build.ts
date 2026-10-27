import { createHash } from "node:crypto";
import { normalizeRoomCode } from "./normalize";
import { rawToDraft, type Draft, type DraftSource, type RawRow } from "./schema";
import { applyQualityRules } from "./validate";

export const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

const foldTerm = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/[^a-z0-9]/g, "");

/** Belgede yazan dönem, aktif dönemin etiketiyle aynı mı? Belgeden okunamadıysa doğrulanamaz → false. */
export function termMatches(documentTerm: string | null, termLabel: string): boolean {
  return documentTerm !== null && foldTerm(documentTerm) === foldTerm(termLabel);
}

export interface BuildDraftInput {
  source: Omit<DraftSource, "documentTerm" | "coverage"> & { coverage?: DraftSource["coverage"] };
  documentTerm: string | null;
  termLabel: string;
  rooms: readonly string[];
  rows: readonly { raw: RawRow; uncertain?: boolean }[];
  sourceText?: string | null;
}

export function buildDraft(input: BuildDraftInput): Draft {
  const rooms = input.rooms.map((r) => normalizeRoomCode(r)).filter((r): r is string => r !== null);
  const blocks = applyQualityRules(
    input.rows.map((r) => rawToDraft(r.raw, r.uncertain ?? false)),
    { rooms: new Set(rooms), termMatches: termMatches(input.documentTerm, input.termLabel), sourceText: input.sourceText },
  );
  return { source: { coverage: "FULL", ...input.source, documentTerm: input.documentTerm }, rooms, blocks };
}
