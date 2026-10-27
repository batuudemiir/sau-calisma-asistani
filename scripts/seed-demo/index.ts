// Kullanım: DEMO_MODE=true npm run seed-demo [-- --clear]
// Örnek bina, odalar, program ve kütüphane simülasyonu yazar. --clear yalnızca isSimulated kayıtları siler.

import { Timestamp } from "firebase-admin/firestore";
import { parseArgs } from "node:util";
import { scriptDb } from "../lib/admin";
import { DEMO_SOURCE_ID, demoPlan } from "./plan";

const { values } = parseArgs({ options: { clear: { type: "boolean", default: false } } });

async function clear(db: ReturnType<typeof scriptDb>) {
  for (const col of ["spaces", "buildings", "scheduleBlocks", "scheduleSources", "spaceReports", "spaceRatings"]) {
    const snap = await db.collection(col).where("isSimulated", "==", true).get();
    for (let i = 0; i < snap.docs.length; i += 450) {
      const batch = db.batch();
      snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`${col}: ${snap.size} örnek kayıt silindi`);
  }
  await db.collection("simulations").doc("library").delete();
}

async function main() {
  if (process.env.DEMO_MODE !== "true") throw new Error("seed-demo yalnızca DEMO_MODE=true iken çalışır");
  const db = scriptDb();
  if (values.clear) return clear(db);

  const p = demoPlan();
  const batch = db.batch();
  // Aktif dönem zaten varsa dokunma (gerçek yayın tarafından oluşturulmuş olabilir)
  const termRef = db.collection("terms").doc(p.term.id);
  if (!(await termRef.get()).exists) batch.set(termRef, p.term);
  batch.set(db.collection("buildings").doc(p.building.id), p.building);
  const libRef = db.collection("spaces").doc(p.library.id);
  if (!(await libRef.get()).exists) batch.set(libRef, p.library);
  for (const s of p.spaces) batch.set(db.collection("spaces").doc(s.id), s);
  batch.set(db.collection("scheduleSources").doc(DEMO_SOURCE_ID), p.source);
  p.blocks.forEach((b, i) => batch.set(db.collection("scheduleBlocks").doc(`${DEMO_SOURCE_ID}-${String(i).padStart(4, "0")}`), b));
  batch.set(db.collection("simulations").doc("library"), {
    spaceId: p.library.id,
    level: "BUSY",
    updatedAt: Timestamp.now(),
    isSimulated: true,
  });
  await batch.commit();
  console.log(`Örnek veri yazıldı: ${p.spaces.length} oda, ${p.blocks.length} ders bloğu, kütüphane simülasyonu (BUSY).`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
