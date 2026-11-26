/** Correct answers needed in a row before a mistake leaves the review deck. */
export const MASTERY_STREAK = 2;

export type ScoreTone = "low" | "mid" | "high";

export function scoreTone(score: number, total: number): ScoreTone {
  const ratio = total > 0 ? score / total : 0;
  if (ratio < 0.6) return "low";
  if (ratio < 0.8) return "mid";
  return "high";
}

export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Local calendar day key, e.g. "2026-11-26". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Consecutive days with at least one answer, ending today (or yesterday, so
 * the streak does not look broken before the user has studied today).
 */
export function studyStreak(activeDays: Iterable<string>, today = new Date()): number {
  const days = new Set(activeDays);
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
