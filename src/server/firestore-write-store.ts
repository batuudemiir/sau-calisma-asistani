import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import type { RecentWrite } from "./rate-limit";
import type { WriteStore } from "./write-store";

export function firestoreWriteStore(db: Firestore = adminDb()): WriteStore {
  return {
    async spaceExists(spaceId) {
      return (await db.collection("spaces").doc(spaceId).get()).exists;
    },

    async addReport(report, sinceMs, decide) {
      return db.runTransaction(async (tx) => {
        const q = db.collection("spaceReports").where("uid", "==", report.uid).where("createdAt", ">=", Timestamp.fromMillis(sinceMs));
        const snap = await tx.get(q);
        const recent: RecentWrite[] = snap.docs.map((d) => ({ spaceId: d.get("spaceId"), createdAtMs: d.get("createdAt").toMillis() }));
        const decision = decide(recent);
        if (!decision.ok) return decision;
        const ref = db.collection("spaceReports").doc();
        tx.create(ref, {
          spaceId: report.spaceId,
          type: report.type,
          uid: report.uid,
          createdAt: Timestamp.fromMillis(report.createdAtMs),
          isSimulated: false,
        });
        return { ok: true as const, id: ref.id };
      });
    },
  };
}
