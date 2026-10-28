// Kullanım: DEMO_MODE=true npm run seed-demo [-- --clear | --only-library]
// Gerçek fakülte binalarına bağlı örnek derslikler, program ve kütüphane simülasyonu yazar
// (binalar seed-campus'tan gelir; önce o çalışmalı). --clear yalnızca isSimulated kayıtları siler.
// --only-library: örnek binayı yazmadan yalnızca dönem (yoksa), kütüphane kartı, simülasyonu ve örnek puanlarını yazar
// (kendi programınızla yapılan demo için).

import { Timestamp } from "firebase-admin/firestore";
import { parseArgs } from "node:util";
import { scriptDb } from "../lib/admin";
import { DEMO_REWARDS, DEMO_SOURCE_ID, demoPlan } from "./plan";

const { values } = parseArgs({
  options: { clear: { type: "boolean", default: false }, "only-library": { type: "boolean", default: false } },
});

async function clear(db: ReturnType<typeof scriptDb>) {
  for (const col of [
    "spaces",
    "buildings",
    "scheduleBlocks",
    "scheduleSources",
    "spaceReports",
    "spaceRatings",
    "rewards",
    "rewardClaims",
    "rewardStock",
  ]) {
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
  const onlyLibrary = values["only-library"];
  const libRef = db.collection("spaces").doc(p.library.id);
  if (!(await libRef.get()).exists) batch.set(libRef, p.library);
  if (!onlyLibrary) {
    for (const s of p.spaces) batch.set(db.collection("spaces").doc(s.id), s);
    batch.set(db.collection("scheduleSources").doc(DEMO_SOURCE_ID), p.source);
    p.blocks.forEach((b, i) =>
      batch.set(db.collection("scheduleBlocks").doc(`${DEMO_SOURCE_ID}-${String(i).padStart(4, "0")}`), b),
    );
  }
  const ratings = onlyLibrary ? p.ratings.filter((r) => r.spaceId === p.library.id) : p.ratings;
  ratings.forEach((r, i) =>
    batch.set(db.collection("spaceRatings").doc(`${DEMO_SOURCE_ID}-puan-${i}`), { ...r, createdAt: Timestamp.now() }),
  );
  batch.set(db.collection("simulations").doc("library"), {
    spaceId: p.library.id,
    level: "BUSY", // pattern=DAILY iken okunurken gün içi örnek desenle değiştirilir
    pattern: "DAILY",
    updatedAt: Timestamp.now(),
    isSimulated: true,
  });
  for (const r of DEMO_REWARDS) batch.set(db.collection("rewards").doc(r.id), r);
  await batch.commit();
  console.log(
    onlyLibrary
      ? `Yalnızca kütüphane örnek verisi yazıldı: simülasyon (gün içi örnek desen), ${ratings.length} örnek puan.`
      : `Örnek veri yazıldı: ${p.spaces.length} oda, ${p.blocks.length} ders bloğu, ${ratings.length} örnek puan, kütüphane simülasyonu (gün içi örnek desen).`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
