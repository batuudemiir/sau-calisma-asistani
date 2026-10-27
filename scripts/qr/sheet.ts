/** Basılabilir QR sayfası (A4, kesip kapıya yapıştırmak için). Saf: girdi → HTML. */
export interface QrItem {
  code: string;
  building: string;
  url: string;
  /** qrcode paketinin ürettiği SVG. */
  svg: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function qrSheetHtml(items: readonly QrItem[], generatedAt: string): string {
  const cards = items
    .map(
      (i) => `<figure class="card">
  ${i.svg}
  <figcaption><strong>${esc(i.code)}</strong><br>${esc(i.building)}<br><small>Okut → "Buradayım" de, geri bildirim bırak, puan kazan</small></figcaption>
</figure>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>SAÜ Çalışma Asistanı — sınıf QR kodları</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 12mm; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
  .card { border: 1px dashed #888; padding: 4mm; margin: 0; text-align: center; break-inside: avoid; }
  .card svg { width: 45mm; height: 45mm; }
  p.note { font-size: 10pt; color: #444; }
</style>
</head>
<body>
<p class="note">Oluşturma: ${esc(generatedAt)}. Bu sayfa gizli imzalı bağlantılar içerir; paylaşma, depoya ekleme. QR_SECRET değişirse kodlar geçersiz olur.</p>
<div class="grid">
${cards}
</div>
</body>
</html>
`;
}
