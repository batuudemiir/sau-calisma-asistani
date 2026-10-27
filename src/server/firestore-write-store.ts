import "server-only";

import { Timestamp, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";
import { CONFIRM_WINDOW_MIN, awardConfirmBonus, emptyUser, type Award, type UserPoints } from "@/domain/points";
import { toLocalTime } from "@/domain/time";
import { adminDb } from "./firebase-admin";
import type { RecentWrite } from "./rate-limit";
import type { WriteStore } from "./write-store";

function readUser(data: FirebaseFirestore.DocumentData | undefined): UserPoints {
  const base = emptyUser();
  if (!data) return base;
  return {
    points: data.points ?? 0,
    dayKey: data.dayKey ?? "",
    dayPoints: data.dayPoints ?? 0,
    counts: { ...base.counts, ...data.counts },
    checkinAt: data.checkinAt ?? {},
  };
}

/** Kullanıcı belgesi + puan defteri (yalnızca yazma; okumalar transaction başında yapılmış olmalı). */
function writePoints(
  tx: Transaction,
  db: Firestore,
  ref: DocumentReference,
  exists: boolean,
  uid: string,
  user: UserPoints,
  awards: { award: Award; spaceId: string; refId: string; id?: string }[],
  atMs: number,
) {
  const at = Timestamp.fromMillis(atMs);
  tx.set(ref, { ...user, updatedAt: at, ...(exists ? {} : { createdAt: at, student: false }) }, { merge: true });
  for (const a of awards) {
    const ev = a.id ? db.collection("pointEvents").doc(a.id) : db.collection("pointEvents").doc();
    tx.set(ev, { uid, kind: a.award.kind, points: a.award.points, spaceId: a.spaceId, refId: a.refId, createdAt: at });
  }
}

export function firestoreWriteStore(db: Firestore = adminDb()): WriteStore {
  return {
    async spaceExists(spaceId) {
      return (await db.collection("spaces").doc(spaceId).get()).exists;
    },

    async addReport(report, sinceMs, decide, award) {
      return db.runTransaction(async (tx) => {
        // Firestore transaction'ında tüm okumalar yazmalardan önce yapılır
        const userRef = db.collection("users").doc(report.uid);
        const q = db
          .collection("spaceReports")
          .where("uid", "==", report.uid)
          .where("createdAt", ">=", Timestamp.fromMillis(sinceMs));
        const [snap, userSnap, spaceSnap] = await Promise.all([
          tx.get(q),
          tx.get(userRef),
          award
            ? tx.get(
                db
                  .collection("spaceReports")
                  .where("spaceId", "==", report.spaceId)
                  .where("createdAt", ">=", Timestamp.fromMillis(report.createdAtMs - CONFIRM_WINDOW_MIN * 60_000)),
              )
            : null,
        ]);
        const recent: RecentWrite[] = snap.docs.map((d) => ({
          spaceId: d.get("spaceId"),
          createdAtMs: d.get("createdAt").toMillis(),
        }));
        const decision = decide(recent);
        if (!decision.ok) return decision;
        const ref = db.collection("spaceReports").doc();

        const result = award?.(
          readUser(userSnap.data()),
          (spaceSnap?.docs ?? []).map((d) => ({
            id: d.id,
            uid: d.get("uid"),
            type: d.get("type"),
            createdAtMs: d.get("createdAt").toMillis(),
            isSimulated: d.get("isSimulated") === true,
          })),
        );
        // Doğrulama bonusu diğer kullanıcının bildirimi başına bir kez (defter belgesinin kimliği bunu garanti eder)
        const bonus = result?.confirms ?? null;
        const otherRef = bonus ? db.collection("users").doc(bonus.uid) : null;
        const bonusRef = bonus ? db.collection("pointEvents").doc(`bonus-${bonus.id}`) : null;
        const [otherSnap, bonusSnap] = await Promise.all([
          otherRef ? tx.get(otherRef) : null,
          bonusRef ? tx.get(bonusRef) : null,
        ]);

        tx.create(ref, {
          spaceId: report.spaceId,
          type: report.type,
          uid: report.uid,
          createdAt: Timestamp.fromMillis(report.createdAtMs),
          isSimulated: false,
        });
        if (!result) return { ok: true as const, id: ref.id };

        writePoints(
          tx,
          db,
          userRef,
          userSnap.exists,
          report.uid,
          result.user,
          result.awards.map((a) => ({ award: a, spaceId: report.spaceId, refId: ref.id })),
          report.createdAtMs,
        );
        if (bonus && otherRef && otherSnap && bonusRef && !bonusSnap?.exists) {
          const dayKey = toLocalTime(report.createdAtMs).dateISO;
          const other = awardConfirmBonus(readUser(otherSnap.data()), dayKey);
          writePoints(
            tx,
            db,
            otherRef,
            otherSnap.exists,
            bonus.uid,
            other.user,
            [{ award: other.award, spaceId: report.spaceId, refId: bonus.id, id: bonusRef.id }],
            report.createdAtMs,
          );
        }
        return { ok: true as const, id: ref.id, points: result.awards.reduce((n, a) => n + a.points, 0) };
      });
    },

    async addRating(rating, sinceMs, decide, award) {
      return db.runTransaction(async (tx) => {
        const since = Timestamp.fromMillis(sinceMs);
        const userRef = db.collection("users").doc(rating.uid);
        const [reportSnap, ratingSnap, userSnap] = await Promise.all([
          tx.get(db.collection("spaceReports").where("uid", "==", rating.uid).where("createdAt", ">=", since)),
          tx.get(db.collection("spaceRatings").where("uid", "==", rating.uid).where("createdAt", ">=", since)),
          tx.get(userRef),
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
        if (!award) return { ...decision, id: ref.id };
        const r = award(readUser(userSnap.data()));
        writePoints(
          tx,
          db,
          userRef,
          userSnap.exists,
          rating.uid,
          r.user,
          [{ award: r.award, spaceId: rating.spaceId, refId: ref.id }],
          rating.createdAtMs,
        );
        return { ...decision, id: ref.id, points: r.award.points };
      });
    },

    async profile(uid, limit) {
      const [userSnap, events] = await Promise.all([
        db.collection("users").doc(uid).get(),
        db.collection("pointEvents").where("uid", "==", uid).orderBy("createdAt", "desc").limit(limit).get(),
      ]);
      return {
        user: readUser(userSnap.data()),
        student: userSnap.get("student") === true,
        events: events.docs.map((d) => ({
          kind: d.get("kind"),
          points: d.get("points"),
          spaceId: d.get("spaceId"),
          createdAtMs: d.get("createdAt").toMillis(),
        })),
      };
    },

    async markStudent(uid) {
      const at = Timestamp.now();
      await db.collection("users").doc(uid).set({ student: true, updatedAt: at }, { merge: true });
    },
  };
}
