// Kullanım (yalnızca DEMO_MODE=true):
//   npm run demo-report -- Ö-102 dolu            → "Dolu bildirildi · az önce · Örnek demo verisi"
//   npm run demo-report -- A204 uygun --ago 5     → 5 dk önce yapılmış gibi
//   npm run demo-report -- kutuphane-merkez dolu
// Bildirimler 30 dk sonra etkisini kaybeder; temizlemek için: npm run seed-demo -- --clear

import { Timestamp } from "firebase-admin/firestore";
import { parseArgs } from "node:util";
import type { Space } from "../../src/domain/types";
import { scriptDb } from "../lib/admin";
import { demoReport } from "./plan";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { ago: { type: "string", default: "0" } } });

async function main() {
  if (process.env.DEMO_MODE !== "true") throw new Error("demo-report yalnızca DEMO_MODE=true iken çalışır");
  const [codeOrId, typeArg] = positionals;
  if (!codeOrId || !typeArg) throw new Error("Kullanım: npm run demo-report -- <oda kodu> <uygun|dolu|kullanilamiyor|guncel_degil> [--ago dk]");
  const db = scriptDb();
  const spaces = (await db.collection("spaces").get()).docs.map((d) => ({ ...d.data(), id: d.id }) as Space);
  const r = demoReport(spaces, codeOrId, typeArg, Date.now(), Number(values.ago));
  await db.collection("spaceReports").add({
    spaceId: r.spaceId,
    type: r.type,
    uid: r.uid,
    createdAt: Timestamp.fromMillis(r.createdAtMs),
    isSimulated: true,
  });
  console.log(`Örnek bildirim eklendi: ${r.code} → ${r.type} (${values.ago} dk önce). Ekran 4 sn içinde güncellenir.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
