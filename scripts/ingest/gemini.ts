import { z } from "zod";
import type { RawRow } from "./schema";

// Düzensiz PDF → Gemini (yapılandırılmış JSON). Yalnızca geliştiricinin makinesinde, betik içinde çalışır.
// Model çıktısı kesin kabul edilmez: rawToDraft + applyQualityRules + insan kontrolünden geçer.

export const GEMINI_PROMPT = `Bu belge bir üniversite haftalık ders programıdır.
Her ders oturumu için bir satır çıkar: gün, başlangıç saati, bitiş saati, ders kodu, ders adı, derslik ve
satırın belgede bulunduğu yer (sourceRef: "s.<sayfa>, satır <n>" biçiminde).
Kurallar:
- Belgede açıkça yazmayan hiçbir değeri üretme. Okuyamadığın veya emin olmadığın alanı null bırak ve uncertain=true yap.
- Saatleri belgedeki gibi "HH:MM" yaz. Gün adlarını belgedeki gibi yaz.
- Belgenin hangi akademik dönem için olduğu yazıyorsa documentTerm alanına aynen yaz, yazmıyorsa null.`;

/** Gemini'ye gönderilen JSON Schema (responseJsonSchema). */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    documentTerm: { type: ["string", "null"] },
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: ["string", "null"] },
          start: { type: ["string", "null"] },
          end: { type: ["string", "null"] },
          courseCode: { type: ["string", "null"] },
          courseName: { type: ["string", "null"] },
          room: { type: ["string", "null"] },
          sourceRef: { type: "string" },
          uncertain: { type: "boolean" },
        },
        required: ["day", "start", "end", "courseCode", "courseName", "room", "sourceRef", "uncertain"],
      },
    },
  },
  required: ["documentTerm", "rows"],
} as const;

const nullableStr = z.string().nullable();
export const GeminiResponseSchema = z.object({
  documentTerm: nullableStr,
  rows: z.array(
    z.object({
      day: nullableStr,
      start: nullableStr,
      end: nullableStr,
      courseCode: nullableStr,
      courseName: nullableStr,
      room: nullableStr,
      sourceRef: z.string().min(1),
      uncertain: z.boolean(),
    }),
  ),
});

export interface GeminiParseResult {
  documentTerm: string | null;
  rows: { raw: RawRow; uncertain: boolean }[];
}

/** Model yanıtını (JSON metni) doğrular ve ham satırlara çevirir. Şemaya uymayan yanıt hata fırlatır. */
export function mapGeminiResponse(jsonText: string): GeminiParseResult {
  const parsed = GeminiResponseSchema.parse(JSON.parse(jsonText));
  return {
    documentTerm: parsed.documentTerm,
    rows: parsed.rows.map((r) => ({
      raw: {
        day: r.day,
        start: r.start,
        end: r.end,
        courseCode: r.courseCode,
        courseName: r.courseName,
        room: r.room,
        sourceRef: r.sourceRef,
      },
      uncertain: r.uncertain,
    })),
  };
}

export async function parsePdfWithGemini(pdf: Uint8Array, opts: { apiKey: string; model: string }): Promise<GeminiParseResult> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const response = await ai.models.generateContent({
    model: opts.model,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: "application/pdf", data: Buffer.from(pdf).toString("base64") } }, { text: GEMINI_PROMPT }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini boş yanıt döndürdü.");
  return mapGeminiResponse(text);
}
