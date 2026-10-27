import type { DraftBlock, Issue } from "./schema";

export interface ValidateContext {
  rooms: ReadonlySet<string>; // normalize edilmiş oda kodları
  termMatches: boolean;
  /** Metin çıkarılabildiyse belgenin metni; ders kodu karşılaştırması için. */
  sourceText?: string | null;
}

/** docs/ARCHITECTURE.md §5.4 kalite kuralları. Her ihlal kaydı needsReview=true yapar. Girdiyi değiştirmez. */
export function applyQualityRules(blocks: readonly DraftBlock[], ctx: ValidateContext): DraftBlock[] {
  const out = blocks.map((b) => ({ ...b, issues: [...b.issues] }));
  const add = (b: DraftBlock, issue: Issue) => {
    if (!b.issues.includes(issue)) b.issues.push(issue);
  };
  const foldedText = ctx.sourceText ? ctx.sourceText.toLocaleUpperCase("tr").replace(/\s+/g, "") : null;

  for (const b of out) {
    if (!b.spaceCode) add(b, "ROOM_MISSING");
    else if (!ctx.rooms.has(b.spaceCode)) add(b, "ROOM_UNKNOWN");
    if (b.startMinute === null || b.endMinute === null) add(b, "TIME_MISSING");
    else if (b.startMinute >= b.endMinute) add(b, "TIME_ORDER");
    if (b.weekday === null) add(b, "WEEKDAY_INVALID");
    if (!ctx.termMatches) add(b, "TERM_MISMATCH");
    if (foldedText && b.courseCode && !foldedText.includes(b.courseCode)) add(b, "COURSE_NOT_IN_TEXT");
  }

  // Tekrar eden satır: aynı oda, gün, saat ve ders → ikinci ve sonrakiler işaretlenir
  const seen = new Set<string>();
  for (const b of out) {
    const key = [b.spaceCode, b.weekday, b.startMinute, b.endMinute, b.courseCode].join("|");
    if (seen.has(key)) add(b, "DUPLICATE");
    else seen.add(key);
  }

  // Çakışma: aynı oda ve günde kesişen iki farklı ders → ikisi de işaretlenir
  const timed = out.filter(
    (b) => b.spaceCode && b.weekday !== null && b.startMinute !== null && b.endMinute !== null && !b.issues.includes("DUPLICATE"),
  );
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const c = timed[j];
      if (a.spaceCode === c.spaceCode && a.weekday === c.weekday && a.startMinute! < c.endMinute! && c.startMinute! < a.endMinute!) {
        add(a, "OVERLAP");
        add(c, "OVERLAP");
      }
    }
  }

  for (const b of out) b.needsReview = b.issues.length > 0;
  return out;
}

export function summarize(blocks: readonly DraftBlock[]) {
  const byIssue: Partial<Record<Issue, number>> = {};
  for (const b of blocks) for (const i of b.issues) byIssue[i] = (byIssue[i] ?? 0) + 1;
  return { blockCount: blocks.length, flaggedCount: blocks.filter((b) => b.needsReview).length, byIssue };
}

/** İnsan kontrolü için: tüm işaretli kayıtlar + işaretsizlerden rastgele n tanesi (tohumlu, tekrarlanabilir). */
export function reviewSample(blocks: readonly DraftBlock[], n = 10, seed = 1): DraftBlock[] {
  const clean = blocks.filter((b) => !b.needsReview);
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const shuffled = [...clean];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return [...blocks.filter((b) => b.needsReview), ...shuffled.slice(0, n)];
}
