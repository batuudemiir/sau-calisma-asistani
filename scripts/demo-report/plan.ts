import type { ReportType, Space } from "../../src/domain/types";

// Demo sırasında etiketli yapay bildirim. uid sabit "ornek-veri"; isSimulated=true olduğu için arayüzde
// "Örnek demo verisi" görünür ve DEMO_MODE kapalıyken hiç hesaba katılmaz.

export const REPORT_TYPES: Record<string, ReportType> = {
  uygun: "AVAILABLE",
  available: "AVAILABLE",
  dolu: "BUSY",
  busy: "BUSY",
  kullanilamiyor: "UNUSABLE",
  unusable: "UNUSABLE",
  guncel_degil: "OUTDATED",
  outdated: "OUTDATED",
};

export function resolveSpace(spaces: readonly Space[], codeOrId: string): Space {
  const norm = (s: string) => s.toLocaleUpperCase("tr").replace(/[\s\-_.]/g, "");
  const byId = spaces.find((s) => s.id === codeOrId);
  if (byId) return byId;
  const matches = spaces.filter((s) => norm(s.code) === norm(codeOrId));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`"${codeOrId}" birden fazla binada var; oda kimliğini yaz: ${matches.map((s) => s.id).join(", ")}`);
  throw new Error(`Oda bulunamadı: ${codeOrId}. Mevcut: ${spaces.map((s) => s.code).join(", ")}`);
}

export function demoReport(spaces: readonly Space[], codeOrId: string, typeArg: string, nowMs: number, agoMin = 0) {
  const type = REPORT_TYPES[typeArg.toLocaleLowerCase("tr").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ı/g, "i").replace(/[\s-]/g, "_")];
  if (!type) throw new Error(`Bilinmeyen tür: ${typeArg} (uygun | dolu | kullanilamiyor | guncel_degil)`);
  if (!Number.isFinite(agoMin) || agoMin < 0 || agoMin > 30) throw new Error("--ago 0-30 dk arası olmalı");
  const space = resolveSpace(spaces, codeOrId);
  return { spaceId: space.id, code: space.code, type, uid: "ornek-veri", createdAtMs: nowMs - agoMin * 60_000, isSimulated: true as const };
}
