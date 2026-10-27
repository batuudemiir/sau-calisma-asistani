import type { Firestore, WriteBatch } from "firebase-admin/firestore";
import type { SourceStatus } from "../../src/domain/types";
import type { ExistingSource, PublishPlan } from "./plan";

const BATCH_LIMIT = 450;

async function inBatches<T>(db: Firestore, items: readonly T[], write: (batch: WriteBatch, item: T) => void) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const item of items.slice(i, i + BATCH_LIMIT)) write(batch, item);
    await batch.commit();
  }
}

export async function listSources(db: Firestore): Promise<ExistingSource[]> {
  const snap = await db.collection("scheduleSources").get();
  return snap.docs.map((d) => {
    const s = d.data();
    return { id: d.id, termId: s.termId, department: s.department, status: s.status, publishedAt: s.publishedAt };
  });
}

/** Kaynağın ve tüm bloklarının durumunu değiştirir (bloklarda sourceStatus denormalize tutulur). */
export async function setSourceStatus(db: Firestore, sourceId: string, status: SourceStatus) {
  const blocks = await db.collection("scheduleBlocks").where("sourceId", "==", sourceId).get();
  await inBatches(db, blocks.docs, (b, d) => b.update(d.ref, { sourceStatus: status }));
  await db.collection("scheduleSources").doc(sourceId).update({ status });
}

export async function executePublish(db: Firestore, plan: PublishPlan, building: { id: string; name: string; campus: string }) {
  await db.collection("buildings").doc(building.id).set({ ...building, isSimulated: false }, { merge: true });
  await inBatches(db, plan.spaces, (b, s) => b.set(db.collection("spaces").doc(s.id), s, { merge: true }));
  // Önce bloklar, sonra kaynak: kaynak PUBLISHED görünmeden önce blokları hazır olsun
  await inBatches(db, plan.blocks, (b, blk) => b.set(db.collection("scheduleBlocks").doc(blk.id), blk.data));
  await db.collection("scheduleSources").doc(plan.source.id).set(plan.source);
  for (const old of plan.supersede) await setSourceStatus(db, old, "SUPERSEDED");
}
