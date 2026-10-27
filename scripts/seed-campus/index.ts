// Kullanım: npm run seed-campus
// Esentepe kampüs kataloğunu (çalışma yerleri + bina konumları) Firestore'a yazar. Tekrar çalıştırmak güvenlidir (merge).

import { scriptDb } from "../lib/admin";
import { campusPlan } from "./plan";

async function main() {
  const db = scriptDb();
  const { spaces, buildings } = campusPlan();
  const batch = db.batch();
  for (const b of buildings) batch.set(db.collection("buildings").doc(b.id), b, { merge: true });
  for (const s of spaces) batch.set(db.collection("spaces").doc(s.id), s, { merge: true });
  await batch.commit();
  console.log(`Kampüs kataloğu yazıldı: ${buildings.length} bina konumu, ${spaces.length} çalışma yeri (kaynak: OpenStreetMap).`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
