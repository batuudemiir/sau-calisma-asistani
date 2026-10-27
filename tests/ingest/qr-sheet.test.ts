import { describe, expect, it } from "vitest";
import { qrSheetHtml } from "../../scripts/qr/sheet";

describe("QR baskı sayfası", () => {
  it("her derslik için kart; metin kaçışlı", () => {
    const html = qrSheetHtml(
      [{ code: "Ö-102", building: "Örnek <Blok>", url: "https://x/qr/a/b", svg: "<svg></svg>" }],
      "2026-10-27T20:00:00Z",
    );
    expect(html).toContain("<strong>Ö-102</strong>");
    expect(html).toContain("Örnek &lt;Blok&gt;");
    expect(html.match(/<figure/g)).toHaveLength(1);
  });
});
