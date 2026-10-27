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

    async addRating(rating, sinceMs, decide) {
      return db.runTransaction(async (tx) => {
        const since = Timestamp.fromMillis(sinceMs);
        const [reportSnap, ratingSnap] = await Promise.all([
          tx.get(db.collection("spaceReports").where("uid", "==", rating.uid).where("createdAt", ">=", since)),
          tx.get(db.collection("spaceRatings").where("uid", "==", rating.uid).where("createdAt", ">=", since)),
        ]);
        const checkins = reportSnap.docs
          .filter((d) => d.get("type") === "AVAILABLE")
          .map((d) => ({ id: d.id, spaceId: d.get("spaceId"), uid: rating.uid, createdAtMs: d.get("createdAt").toMillis() }));
        const ratings = ratingSnap.docs.map((d) => ({
          uid: rating.uid,
          spaceId: d.get("spaceId"),
          checkinReportId: d.get("checkinReportId"),
          createdAtMs: d.get("createdAt").toMillis(),
        }));
        const decision = decide({ checkins, ratings });
        if (!decision.ok) return decision;
        const ref = db.collection("spaceRatings").doc();
        tx.create(ref, {
          spaceId: rating.spaceId,
          uid: rating.uid,
          checkinReportId: decision.checkinId,
          scores: rating.scores,
          createdAt: Timestamp.fromMillis(rating.createdAtMs),
          isSimulated: false,
        });
        return { ...decision, id: ref.id };
      });
    },
  };
}
