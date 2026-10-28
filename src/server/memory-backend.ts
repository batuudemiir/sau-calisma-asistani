import { CONFIRM_WINDOW_MIN, awardConfirmBonus, emptyUser, type Award, type UserPoints } from "@/domain/points";
import type { Rating } from "@/domain/ratings";
import type { Building, LibrarySimulation, ScheduleBlock, Space, SpaceReport, Term } from "@/domain/types";
import { toLocalTime } from "@/domain/time";
import { campusPlan } from "../../scripts/seed-campus/plan";
import { DEMO_REWARDS, demoPlan } from "../../scripts/seed-demo/plan";
import type { DataSource, SourceSummary } from "./data-source";
import { DELETED_UID, type PointEventDTO, type WriteStore } from "./write-store";

/**
 * Firebase'siz prototip arka ucu (NEXT_PUBLIC_DEMO_BACKEND=memory): örnek veri sunucunun belleğinde.
 * Kalıcı değildir: sunucu örneği yeniden başlayınca bildirim, puan ve kuponlar sıfırlanır; Vercel gibi sunucusuz
 * ortamlarda iki istek farklı örneklere düşerse birbirinin bildirimini görmeyebilir. Yalnızca sunum içindir.
 * Veri, seed-campus ve seed-demo betiklerinin yazdığıyla aynıdır (örnekler isSimulated=true).
 */

type StoredReport = SpaceReport & { id: string; qr: boolean };
type StoredUser = UserPoints & { student: boolean };
type StoredEvent = PointEventDTO & { uid: string };
type Claim = { uid: string; rewardId: string; monthKey: string; code: string };

interface State {
  term: Term;
  spaces: Space[];
  buildings: Building[];
  sources: (SourceSummary & { termId: string })[];
  blocks: ScheduleBlock[];
  reports: StoredReport[];
  ratings: Rating[];
  users: Map<string, StoredUser>;
  events: StoredEvent[];
  bonusFor: Set<string>;
  claims: Claim[];
  stock: Map<string, number>;
  nextId: number;
}

/**
 * Sunumda her durum türü görünsün diye etiketli örnek bildirimler (uid "ornek-veri", isSimulated=true).
 * Saatleri okunduğu ana göre "x dk önce"dir; böylece 30 dakikalık geçerlilik hiç dolmaz. Puan hesabına katılmaz.
 */
export const DEMO_REPORTS: { spaceId: string; type: SpaceReport["type"]; agoMin: number }[] = [
  { spaceId: "lumo-coffee", type: "AVAILABLE", agoMin: 6 },
  { spaceId: "demo-blok-Ö-104", type: "AVAILABLE", agoMin: 4 },
  { spaceId: "demo-blok-Ö-203", type: "BUSY", agoMin: 11 },
];

function demoReports(nowMs: number): StoredReport[] {
  return DEMO_REPORTS.map((r, i) => ({
    id: `ornek-${i}`,
    spaceId: r.spaceId,
    type: r.type,
    uid: "ornek-veri",
    createdAtMs: nowMs - r.agoMin * 60_000,
    isSimulated: true,
    qr: false,
  }));
}

/** Bildirimler 30 dk sonra hesaba katılmaz; bellek büyümesin diye 1 günden eskiler atılır. */
const KEEP_MS = 24 * 60 * 60_000;

function initialState(nowMs: number): State {
  const campus = campusPlan();
  const demo = demoPlan();
  const spaces = [...campus.spaces];
  if (!spaces.some((s) => s.id === demo.library.id)) spaces.unshift(demo.library);
  spaces.push(...demo.spaces);
  return {
    term: demo.term,
    spaces,
    buildings: [...campus.buildings, demo.building],
    sources: [
      {
        id: demo.source.id,
        termId: demo.source.termId,
        department: demo.source.department,
        url: demo.source.url,
        spaceIds: demo.source.spaceIds,
        isSimulated: true,
        parseMethod: "MANUAL",
        coverage: "FULL",
      },
    ],
    blocks: demo.blocks,
    reports: [],
    ratings: demo.ratings.map((r) => ({ ...r, createdAtMs: nowMs })),
    users: new Map(),
    events: [],
    bonusFor: new Set(),
    claims: [],
    stock: new Map(),
    nextId: 1,
  };
}

const userOf = (s: State, uid: string): StoredUser => s.users.get(uid) ?? { ...emptyUser(), student: false };

function savePoints(s: State, uid: string, user: UserPoints, awards: Award[], spaceId: string, atMs: number) {
  const prev = userOf(s, uid);
  s.users.set(uid, { ...user, student: prev.student });
  for (const a of awards) s.events.push({ uid, kind: a.kind, points: a.points, spaceId, createdAtMs: atMs });
}

export function createMemoryBackend(nowMs = Date.now()): { source: DataSource; store: WriteStore } {
  const s = initialState(nowMs);

  const source: DataSource = {
    activeTerm: async () => s.term,
    spaces: async () => s.spaces,
    buildings: async () => s.buildings,
    publishedSources: async (termId) => s.sources.filter((x) => x.termId === termId),
    blocks: async (termId, weekday) =>
      s.blocks.filter((b) => b.termId === termId && b.weekday === weekday && b.sourceStatus === "PUBLISHED"),
    reportsSince: async (sinceMs, spaceId) =>
      [...demoReports(Date.now()), ...s.reports].filter((r) => r.createdAtMs >= sinceMs && (!spaceId || r.spaceId === spaceId)),
    // seed-demo ile aynı: gün içi örnek desen (okunurken saate göre hesaplanır)
    librarySimulation: async (): Promise<LibrarySimulation> => ({
      level: "BUSY",
      pattern: "DAILY",
      updatedAtMs: Date.now(),
      isSimulated: true,
    }),
    ratings: async () => s.ratings,
  };

  const store: WriteStore = {
    spaceExists: async (spaceId) => s.spaces.some((x) => x.id === spaceId),

    async addReport(report, sinceMs, decide, award) {
      s.reports = s.reports.filter((r) => report.createdAtMs - r.createdAtMs < KEEP_MS);
      const recent = s.reports.filter((r) => r.uid === report.uid && r.createdAtMs >= sinceMs);
      const decision = decide(recent.map((r) => ({ spaceId: r.spaceId, createdAtMs: r.createdAtMs })));
      if (!decision.ok) return decision;
      const windowStart = report.createdAtMs - CONFIRM_WINDOW_MIN * 60_000;
      const onSpace = [...demoReports(report.createdAtMs), ...s.reports]
        .filter((r) => r.spaceId === report.spaceId && r.createdAtMs >= windowStart)
        .map((r) => ({ id: r.id, uid: r.uid, type: r.type, createdAtMs: r.createdAtMs, isSimulated: r.isSimulated, qr: r.qr }));
      const id = `m${s.nextId++}`;
      s.reports.push({ ...report, id, qr: report.qr ?? false, isSimulated: false });
      const result = award?.(userOf(s, report.uid), onSpace);
      if (!result) return { ok: true, id };
      savePoints(s, report.uid, result.user, result.awards, report.spaceId, report.createdAtMs);
      // Doğrulama bonusu diğer kullanıcının bildirimi başına bir kez
      const bonus = result.confirms;
      if (bonus && !s.bonusFor.has(bonus.id)) {
        s.bonusFor.add(bonus.id);
        const other = awardConfirmBonus(userOf(s, bonus.uid), toLocalTime(report.createdAtMs).dateISO);
        savePoints(s, bonus.uid, other.user, [other.award], report.spaceId, report.createdAtMs);
      }
      return { ok: true, id, points: result.awards.reduce((n, a) => n + a.points, 0), qrLimited: result.qrLimited };
    },

    async addRating(rating, sinceMs, decide, award) {
      const checkins = s.reports
        .filter((r) => r.uid === rating.uid && r.type === "AVAILABLE" && r.createdAtMs >= sinceMs)
        .map((r) => ({ id: r.id, spaceId: r.spaceId, uid: r.uid, createdAtMs: r.createdAtMs }));
      const mine = s.ratings
        .filter((r) => r.uid === rating.uid && (r.createdAtMs ?? 0) >= sinceMs)
        .map((r) => ({ uid: r.uid, spaceId: r.spaceId, checkinReportId: r.checkinReportId, createdAtMs: r.createdAtMs ?? 0 }));
      const decision = decide({ checkins, ratings: mine });
      if (!decision.ok) return decision;
      const id = `m${s.nextId++}`;
      s.ratings.push({ ...rating, checkinReportId: decision.checkinId, isSimulated: false });
      if (!award) return { ...decision, id };
      const r = award(userOf(s, rating.uid));
      savePoints(s, rating.uid, r.user, [r.award], rating.spaceId, rating.createdAtMs);
      return { ...decision, id, points: r.award.points };
    },

    async profile(uid, limit) {
      const u = userOf(s, uid);
      const { student, ...user } = u;
      const events = s.events
        .filter((e) => e.uid === uid)
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, limit)
        .map(({ kind, points, spaceId, createdAtMs }) => ({ kind, points, spaceId, createdAtMs }));
      return { user, student, events };
    },

    async markStudent(uid) {
      s.users.set(uid, { ...userOf(s, uid), student: true });
    },

    async deleteAccountData(uid) {
      s.users.delete(uid);
      s.events = s.events.filter((e) => e.uid !== uid);
      s.claims = s.claims.filter((c) => c.uid !== uid);
      s.reports = s.reports.map((r) => (r.uid === uid ? { ...r, uid: DELETED_UID } : r));
      s.ratings = s.ratings.map((r) => (r.uid === uid ? { ...r, uid: DELETED_UID } : r));
    },

    rewards: async () => DEMO_REWARDS,

    async rewardState(uid, monthKey, rewardIds) {
      const u = userOf(s, uid);
      const { student, ...user } = u;
      const mine = s.claims.filter((c) => c.uid === uid && c.monthKey === monthKey);
      return {
        user,
        student,
        claimed: Object.fromEntries(mine.map((c) => [c.rewardId, c.code])),
        claimedCount: Object.fromEntries(rewardIds.map((id) => [id, s.stock.get(`${id}_${monthKey}`) ?? 0])),
      };
    },

    async claimReward(uid, rewardId, monthKey, makeCode, decide) {
      const reward = DEMO_REWARDS.find((r) => r.id === rewardId);
      if (!reward) return { ok: false, block: "NOT_FOUND" };
      const key = `${rewardId}_${monthKey}`;
      const claimedCount = s.stock.get(key) ?? 0;
      const u = userOf(s, uid);
      const { student, ...user } = u;
      const alreadyClaimed = s.claims.some((c) => c.uid === uid && c.rewardId === rewardId && c.monthKey === monthKey);
      const block = decide({ reward, user, student, alreadyClaimed, claimedCount });
      if (block) return { ok: false, block };
      const code = makeCode(reward);
      s.claims.push({ uid, rewardId, monthKey, code });
      s.stock.set(key, claimedCount + 1);
      return { ok: true, code };
    },
  };

  return { source, store };
}

// Sunucu örneği başına tek durum (geliştirmede modül yeniden yüklense de korunur)
const g = globalThis as unknown as { __neredecalisalimMemory?: ReturnType<typeof createMemoryBackend> };
export function memoryBackend() {
  g.__neredecalisalimMemory ??= createMemoryBackend();
  return g.__neredecalisalimMemory;
}
