import { describe, expect, it } from "vitest";
import {
  CHECKIN_POINT_COOLDOWN_MIN,
  DAILY_CAP,
  QR_ABUSE_MAX_ACCOUNTS,
  QR_ABUSE_WINDOW_MIN,
  awardConfirmBonus,
  awardRating,
  awardReport,
  emptyUser,
  levelOf,
  type OtherReport,
  type ReportAwardInput,
} from "../../src/domain/points";

const T0 = Date.UTC(2026, 9, 27, 10, 0);
const DAY = "2026-10-27";
const MIN = 60_000;

const input = (over: Partial<ReportAwardInput> = {}): ReportAwardInput => ({
  uid: "me",
  spaceId: "oda-1",
  type: "AVAILABLE",
  nowMs: T0,
  dayKey: DAY,
  recentOnSpace: [],
  ...over,
});
const other = (over: Partial<OtherReport> = {}): OtherReport => ({
  id: "r1",
  uid: "sen",
  type: "AVAILABLE",
  createdAtMs: T0 - 10 * MIN,
  isSimulated: false,
  ...over,
});

describe("puanlar", () => {
  it("check-in +5, diğer bildirim +3, değerlendirme +5", () => {
    const a = awardReport(emptyUser(), input());
    expect(a.awards).toEqual([{ kind: "CHECKIN", points: 5 }]);
    expect(a.user.points).toBe(5);
    expect(a.user.counts.checkins).toBe(1);
    const b = awardReport(a.user, input({ type: "BUSY", spaceId: "oda-2" }));
    expect(b.awards).toEqual([{ kind: "REPORT", points: 3 }]);
    expect(awardRating(b.user, DAY).user.points).toBe(13);
  });

  it(`aynı yere check-in puanı ${CHECKIN_POINT_COOLDOWN_MIN} dakikada bir; süre dolunca yine verilir`, () => {
    const a = awardReport(emptyUser(), input());
    const again = awardReport(a.user, input({ nowMs: T0 + 60 * MIN }));
    expect(again.awards).toEqual([{ kind: "CHECKIN", points: 0 }]);
    expect(again.user.counts.checkins).toBe(2); // katkı sayılır, puan yok
    expect(awardReport(a.user, input({ spaceId: "oda-2", nowMs: T0 + 60 * MIN })).awards[0].points).toBe(5);
    const later = awardReport(again.user, input({ nowMs: T0 + CHECKIN_POINT_COOLDOWN_MIN * MIN }));
    expect(later.awards[0].points).toBe(5);
  });

  it(`günlük üst sınır ${DAILY_CAP}; ertesi gün sıfırlanır`, () => {
    let user = emptyUser();
    for (let i = 0; i < 15; i++) user = awardReport(user, input({ spaceId: `oda-${i}` })).user;
    expect(user.points).toBe(DAILY_CAP);
    expect(user.counts.checkins).toBe(15);
    const nextDay = awardReport(user, input({ spaceId: "yeni", dayKey: "2026-10-28" }));
    expect(nextDay.user.points).toBe(DAILY_CAP + 5);
    expect(nextDay.user.dayPoints).toBe(5);
  });

  it("başka kullanıcı 30 dk içinde aynı yönde bildirdiyse doğrulama bonusu, en yeni bildirime", () => {
    const a = awardReport(
      emptyUser(),
      input({ recentOnSpace: [other(), other({ id: "r2", uid: "o", createdAtMs: T0 - 5 * MIN })] }),
    );
    expect(a.awards).toEqual([
      { kind: "CHECKIN", points: 5 },
      { kind: "CONFIRM_BONUS", points: 2 },
    ]);
    expect(a.confirms?.id).toBe("r2");
    expect(awardConfirmBonus(emptyUser(), DAY).user.points).toBe(2);
  });

  it("bonus yok: kendi bildirimi, örnek demo verisi, süresi geçmiş, çelişkili veya yönsüz bildirim", () => {
    const none = (recentOnSpace: OtherReport[], type: ReportAwardInput["type"] = "AVAILABLE") =>
      awardReport(emptyUser(), input({ recentOnSpace, type })).confirms;
    expect(none([other({ uid: "me" })])).toBeNull();
    expect(none([other({ isSimulated: true })])).toBeNull();
    expect(none([other({ createdAtMs: T0 - 31 * MIN })])).toBeNull();
    expect(none([other(), other({ id: "r3", uid: "x", type: "BUSY" })])).toBeNull();
    expect(none([other({ type: "OUTDATED" })], "OUTDATED")).toBeNull();
    // Dolu ve Kullanılamıyor aynı yöndedir
    expect(none([other({ type: "UNUSABLE" })], "BUSY")?.id).toBe("r1");
  });

  it("seviyeler: 0 / 50 / 200 / 500", () => {
    expect(levelOf(0)).toMatchObject({ name: "Yeni", next: { name: "Kampüs Gezgini", remaining: 50 } });
    expect(levelOf(50).name).toBe("Kampüs Gezgini");
    expect(levelOf(499)).toMatchObject({ name: "Çalışma Rehberi", next: { remaining: 1 } });
    expect(levelOf(900)).toMatchObject({ name: "Kampüs Uzmanı", next: null });
  });

  it("QR ile check-in +10; aynı yer bekleme süresi QR için de geçerli", () => {
    const a = awardReport(emptyUser(), input({ qr: true }));
    expect(a.awards).toEqual([{ kind: "QR_CHECKIN", points: 10 }]);
    expect(awardReport(a.user, input({ qr: true, nowMs: T0 + 30 * MIN })).awards).toEqual([{ kind: "QR_CHECKIN", points: 0 }]);
  });

  it(`aynı QR ${QR_ABUSE_WINDOW_MIN} dk içinde ${QR_ABUSE_MAX_ACCOUNTS} başka hesaptan kullanıldıysa QR bonusu yok, normal check-in`, () => {
    const used = (n: number) =>
      Array.from({ length: n }, (_, i) => other({ id: `q${i}`, uid: `u${i}`, qr: true, createdAtMs: T0 - 5 * MIN }));
    expect(awardReport(emptyUser(), input({ qr: true, recentOnSpace: used(QR_ABUSE_MAX_ACCOUNTS - 1) })).qrLimited).toBe(false);
    const limited = awardReport(emptyUser(), input({ qr: true, recentOnSpace: used(QR_ABUSE_MAX_ACCOUNTS) }));
    expect(limited.qrLimited).toBe(true);
    expect(limited.awards[0]).toEqual({ kind: "CHECKIN", points: 5 });
    // Pencere dışındaki QR kullanımları sayılmaz
    const old = used(QR_ABUSE_MAX_ACCOUNTS).map((r) => ({ ...r, createdAtMs: T0 - 11 * MIN }));
    expect(awardReport(emptyUser(), input({ qr: true, recentOnSpace: old })).qrLimited).toBe(false);
  });

  it("aylık puan: ay değişince sıfırlanır, toplam puan sürer", () => {
    const oct = awardReport(emptyUser(), input({ dayKey: "2026-10-31" }));
    expect(oct.user.monthKey).toBe("2026-10");
    expect(oct.user.monthPoints).toBe(5);
    const nov = awardReport(oct.user, input({ spaceId: "oda-2", dayKey: "2026-11-01" }));
    expect(nov.user.monthKey).toBe("2026-11");
    expect(nov.user.monthPoints).toBe(5);
    expect(nov.user.points).toBe(10);
  });
});
