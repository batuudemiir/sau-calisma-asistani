// Kullanım:
//   npm run publish-schedule -- data/drafts/<id>.json --reviewed-by ekip --building-name "İşletme Fakültesi A Blok" --campus Esentepe
//   npm run publish-schedule -- --rollback <sourceId>
// Aktif dönem kaydı (terms/<termId>) yoksa --term-label --starts-on --ends-on ile oluşturulur.
// Kimlik: FIREBASE_SERVICE_ACCOUNT veya FIRESTORE_EMULATOR_HOST (+ NEXT_PUBLIC_FIREBASE_PROJECT_ID).

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { DraftSchema } from "../ingest/schema";
import { scriptDb } from "../lib/admin";
import { executePublish, listSources, setSourceStatus } from "./firestore";
import { planPublish, planRollback, planTerm } from "./plan";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "reviewed-by": { type: "string" },
    "building-name": { type: "string" },
    campus: { type: "string", default: "Esentepe" },
    rollback: { type: "string" },
    "term-label": { type: "string" },
    "starts-on": { type: "string" },
    "ends-on": { type: "string" },
  },
});

async function main() {
  const db = scriptDb();
  const existing = await listSources(db);

  if (values.rollback) {
    const { supersede, republish } = planRollback(values.rollback, existing);
    await setSourceStatus(db, republish, "PUBLISHED");
    await setSourceStatus(db, supersede, "SUPERSEDED");
    console.log(`Geri dönüldü: ${supersede} → SUPERSEDED, ${republish} → PUBLISHED`);
    return;
  }

  const file = positionals[0];
  if (!file) throw new Error("Taslak dosya yolu gerekli");
  const buildingName = values["building-name"];
  if (!buildingName) throw new Error("--building-name gerekli");
  const draft = DraftSchema.parse(JSON.parse(await readFile(file, "utf8")));
  const plan = planPublish(draft, existing, values["reviewed-by"] ?? "", new Date().toISOString());

  const termRef = db.collection("terms").doc(draft.source.termId);
  if (!(await termRef.get()).exists) {
    const term = planTerm(draft.source.termId, values["term-label"], values["starts-on"], values["ends-on"]);
    await termRef.set(term);
    console.log(`Dönem oluşturuldu: ${term.label} (${term.startsOn} – ${term.endsOn})`);
  }

  await executePublish(db, plan, { id: draft.source.buildingId, name: buildingName, campus: values.campus! });
  console.log(`Yayımlandı: ${plan.source.id} — ${plan.blocks.length} blok, ${plan.source.flaggedCount} işaretli kayıt yayın dışı.`);
  const incomplete = plan.spaces.filter((s) => s.dataQuality === "INCOMPLETE").map((s) => s.code);
  if (incomplete.length) console.log(`Veri eksik (UNKNOWN gösterilecek) odalar: ${incomplete.join(", ")}`);
  if (plan.supersede.length) console.log(`Önceki sürüm(ler) SUPERSEDED: ${plan.supersede.join(", ")}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
