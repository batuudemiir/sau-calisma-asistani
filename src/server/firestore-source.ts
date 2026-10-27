import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { Rating } from "@/domain/ratings";
import type { Building, LibrarySimulation, ScheduleBlock, Space, SpaceReport, Term } from "@/domain/types";
import { cachedSource } from "./cached-source";
import type { DataSource, SourceSummary } from "./data-source";
import { adminDb } from "./firebase-admin";

const toMs = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === "number" ? v : Date.parse(String(v)));

export function firestoreSource(db: Firestore = adminDb()): DataSource {
  return {
    async activeTerm() {
      const snap = await db.collection("terms").where("isActive", "==", true).limit(1).get();
      return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Term);
    },

    async spaces() {
      const snap = await db.collection("spaces").get();
      return snap.docs.map((d) => ({ dataQuality: "OK", ...d.data(), id: d.id }) as Space);
    },

    async buildings() {
      const snap = await db.collection("buildings").get();
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Building);
    },

    async publishedSources(termId) {
      const snap = await db.collection("scheduleSources").where("termId", "==", termId).where("status", "==", "PUBLISHED").get();
      return snap.docs.map((d) => {
        const s = d.data();
        return {
          id: d.id,
          department: s.department,
          url: s.url,
          spaceIds: s.spaceIds ?? [],
          isSimulated: s.isSimulated === true,
          parseMethod: s.parseMethod ?? "DETERMINISTIC",
          coverage: s.coverage === "PARTIAL" ? "PARTIAL" : "FULL",
        } satisfies SourceSummary;
      });
    },

    async blocks(termId, weekday) {
      const snap = await db
        .collection("scheduleBlocks")
        .where("termId", "==", termId)
        .where("sourceStatus", "==", "PUBLISHED")
        .where("weekday", "==", weekday)
        .get();
      return snap.docs.map((d) => d.data() as ScheduleBlock);
    },

    async reportsSince(sinceMs, spaceId) {
      let q = db.collection("spaceReports").where("createdAt", ">=", Timestamp.fromMillis(sinceMs));
      if (spaceId)
        q = db.collection("spaceReports").where("spaceId", "==", spaceId).where("createdAt", ">=", Timestamp.fromMillis(sinceMs));
      const snap = await q.get();
      return snap.docs.map((d) => {
        const r = d.data();
        return {
          spaceId: r.spaceId,
          type: r.type,
          uid: r.uid,
          createdAtMs: toMs(r.createdAt),
          isSimulated: r.isSimulated === true,
        } as SpaceReport;
      });
    },

    async librarySimulation() {
      const doc = await db.collection("simulations").doc("library").get();
      if (!doc.exists) return null;
      const s = doc.data()!;
      return {
        level: s.level,
        pattern: s.pattern === "DAILY" ? "DAILY" : undefined,
        updatedAtMs: toMs(s.updatedAt),
        isSimulated: true,
      } as LibrarySimulation;
    },

    async ratings() {
      const snap = await db.collection("spaceRatings").get();
      return snap.docs.map((d) => {
        const r = d.data();
        return {
          spaceId: r.spaceId,
          uid: r.uid,
          checkinReportId: r.checkinReportId,
          scores: r.scores,
          createdAtMs: toMs(r.createdAt),
          isSimulated: r.isSimulated === true,
        } as Rating;
      });
    },
  };
}

let shared: DataSource | null = null;

/** Route handler'ların kullandığı, statik veriyi önbelleğe alan tekil kaynak (sunucu örneği başına). */
export function sharedSource(): DataSource {
  shared ??= cachedSource(firestoreSource());
  return shared;
}
