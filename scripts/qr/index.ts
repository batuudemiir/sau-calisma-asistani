// Sınıf kapıları için basılabilir QR sayfası üretir.
// Kullanım:
//   npm run qr -- --base https://<uygulama-adresi> [--building demo-blok] [--out data/qr/sayfa.html]
//   Yerel demo (emulator açıkken): npm run qr -- --base http://<dizüstü-ip>:3000 --emulator
// QR_SECRET sunucudakiyle aynı olmalı (.env.local; yerel demo için .env.development'taki değer kullanılır).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import QRCode from "qrcode";
import { qrUrl } from "../../src/server/qr";
import { scriptDb } from "../lib/admin";
import { qrSheetHtml } from "./sheet";

const { values } = parseArgs({
  options: {
    base: { type: "string" },
    building: { type: "string" },
    out: { type: "string" },
    emulator: { type: "boolean", default: false },
  },
});

async function main() {
  const secret = process.env.QR_SECRET;
  if (!secret) throw new Error("QR_SECRET tanımlı değil (.env.local)");
  if (!values.base) throw new Error("--base <uygulama adresi> gerekli, ör. https://ornek.web.app");
  if (values.emulator) process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  const db = scriptDb();
  const [spaces, buildings] = await Promise.all([db.collection("spaces").get(), db.collection("buildings").get()]);
  const name = new Map(buildings.docs.map((d) => [d.id, String(d.get("name"))]));
  const rows = spaces.docs
    .map((d) => ({ id: d.id, code: String(d.get("code")), buildingId: String(d.get("buildingId")), kind: d.get("kind") }))
    .filter((s) => s.kind === "CLASSROOM" && (!values.building || s.buildingId === values.building))
    .sort((a, b) => a.code.localeCompare(b.code, "tr", { numeric: true }));
  if (rows.length === 0) throw new Error("Derslik bulunamadı");

  const items = await Promise.all(
    rows.map(async (s) => {
      const url = qrUrl(values.base!, s.id, secret);
      return {
        code: s.code,
        building: name.get(s.buildingId) ?? s.buildingId,
        url,
        svg: await QRCode.toString(url, { type: "svg", margin: 1 }),
      };
    }),
  );
  const out = values.out ?? `data/qr/qr-${values.building ?? "tum"}.html`;
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, qrSheetHtml(items, new Date().toISOString()));
  // Bağlantılar gizli imza içerir; konsola yalnızca sayı ve dosya yazılır
  console.log(`${items.length} QR kodu yazıldı: ${out} (yazdır, kes, kapılara yapıştır)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
