// Sınıf kapıları için basılabilir QR sayfası üretir.
// Kullanım:
//   npm run qr -- --base https://<uygulama-adresi> [--building demo-blok] [--out data/qr/sayfa.html]
//   Yerel demo (emulator açıkken): npm run qr -- --base http://<dizüstü-ip>:3000 --emulator
//   Firebase'siz prototip (Vercel): npm run qr -- --base https://<vercel-adresi> --demo  (QR_SECRET yoksa demo anahtarı)
// QR_SECRET sunucudakiyle aynı olmalı (.env.local; yerel demo için .env.development'taki değer kullanılır).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import QRCode from "qrcode";
import { createMemoryBackend } from "../../src/server/memory-backend";
import { DEMO_QR_SECRET, qrUrl } from "../../src/server/qr";
import { scriptDb } from "../lib/admin";
import { qrSheetHtml } from "./sheet";

const { values } = parseArgs({
  options: {
    base: { type: "string" },
    building: { type: "string" },
    out: { type: "string" },
    emulator: { type: "boolean", default: false },
    demo: { type: "boolean", default: false },
  },
});

async function main() {
  // --demo: Vercel'de QR_SECRET girilmediyse sunucu da aynı açık demo anahtarını kullanır
  const secret = process.env.QR_SECRET || (values.demo ? DEMO_QR_SECRET : undefined);
  if (!secret) throw new Error("QR_SECRET tanımlı değil (.env.local)");
  if (!values.base) throw new Error("--base <uygulama adresi> gerekli, ör. https://ornek.web.app");
  const { spaces, buildings } = values.demo ? await memorySpaces() : await firestoreSpaces();
  const name = new Map(buildings.map((b) => [b.id, b.name]));
  const rows = spaces
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

type Row = { id: string; code: string; buildingId: string; kind: string };

/** Bellek arka ucunun odaları (Firestore'a bağlanmaz; Vercel'deki prototiple aynı veri). */
async function memorySpaces() {
  const { source } = createMemoryBackend();
  const [spaces, buildings] = await Promise.all([source.spaces(), source.buildings()]);
  return { spaces: spaces as Row[], buildings };
}

async function firestoreSpaces() {
  if (values.emulator) process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  const db = scriptDb();
  const [spaces, buildings] = await Promise.all([db.collection("spaces").get(), db.collection("buildings").get()]);
  return {
    spaces: spaces.docs.map((d): Row => ({
      id: d.id,
      code: String(d.get("code")),
      buildingId: String(d.get("buildingId")),
      kind: String(d.get("kind")),
    })),
    buildings: buildings.docs.map((d) => ({ id: d.id, name: String(d.get("name")) })),
  };
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
