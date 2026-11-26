import { MASTERY_STREAK, studyStreak } from "@/lib/stats";
import { sql } from "drizzle-orm";
import type { Db } from "./client";
import type { OptionLetter } from "./schema";

/** Latest graded (non-skipped) answer per question. */
const LATEST = sql.raw(`
  SELECT question_id, is_correct FROM (
    SELECT question_id, is_correct,
           ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY answered_at DESC, id DESC) AS rn
    FROM answers WHERE selected IS NOT NULL
  ) WHERE rn = 1`);

/**
 * Review deck: questions answered wrong at least once that have not since
 * been answered correctly MASTERY_STREAK times. Skipped questions are not
 * mistakes.
 */
const ACTIVE_MISTAKES = sql`
  SELECT * FROM (
    SELECT lw.question_id AS questionId,
           lw.wrong_at AS wrongAt,
           (SELECT COUNT(*) FROM answers g
             WHERE g.question_id = lw.question_id AND g.selected IS NOT NULL
               AND g.is_correct = 1 AND g.answered_at > lw.wrong_at) AS streak,
           (SELECT g.selected FROM answers g
             WHERE g.question_id = lw.question_id AND g.answered_at = lw.wrong_at
               AND g.is_correct = 0 LIMIT 1) AS lastWrongOption,
           (SELECT COUNT(*) FROM answers g
             WHERE g.question_id = lw.question_id AND g.selected IS NOT NULL
               AND g.is_correct = 0) AS wrongCount
    FROM (
      SELECT question_id, MAX(answered_at) AS wrong_at FROM answers
      WHERE selected IS NOT NULL AND is_correct = 0
      GROUP BY question_id
    ) lw
  ) WHERE streak < ${MASTERY_STREAK}`;

export type Mistake = {
  questionId: number;
  wrongAt: number;
  streak: number;
  wrongCount: number;
  lastWrongOption: OptionLetter;
  questionText: string;
  answer: OptionLetter;
  topicTitle: string;
  subject: string;
  topicId: number;
};

export function getMistakes(db: Db) {
  return db.all<Mistake>(sql`
    SELECT m.*, q.question_text AS questionText, q.answer AS answer,
           t.title AS topicTitle, t.subject AS subject, t.id AS topicId
    FROM (${ACTIVE_MISTAKES}) m
    JOIN questions q ON q.id = m.questionId
    JOIN topics t ON t.id = q.topic_id
    ORDER BY m.wrongAt DESC`);
}

export function getMistakeIds(db: Db, limit: number) {
  const rows = db.all<{ questionId: number }>(sql`
    SELECT questionId FROM (${ACTIVE_MISTAKES}) ORDER BY wrongAt DESC LIMIT ${limit}`);
  return rows.map((r) => r.questionId);
}

export type Overview = {
  answered: number;
  correct: number;
  accuracy: number;
  studySeconds: number;
  finishedTests: number;
  averageScore: number;
  answeredToday: number;
  activeMistakes: number;
  streakDays: number;
};

export function getOverview(db: Db): Overview {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [row] = db.all<Omit<Overview, "accuracy" | "streakDays">>(sql`
    SELECT
      (SELECT COUNT(*) FROM answers WHERE selected IS NOT NULL) AS answered,
      (SELECT COUNT(*) FROM answers WHERE selected IS NOT NULL AND is_correct = 1) AS correct,
      (SELECT COALESCE(SUM(seconds_spent), 0) FROM answers) AS studySeconds,
      (SELECT COUNT(*) FROM test_sessions WHERE status IN ('completed', 'timed_out')) AS finishedTests,
      (SELECT COALESCE(AVG(score * 1.0 / question_count), 0) FROM test_sessions
        WHERE status IN ('completed', 'timed_out') AND question_count > 0) AS averageScore,
      (SELECT COUNT(*) FROM answers
        WHERE selected IS NOT NULL AND answered_at >= ${startOfToday.getTime()}) AS answeredToday,
      (SELECT COUNT(*) FROM (${ACTIVE_MISTAKES})) AS activeMistakes`);

  const days = db.all<{ day: string }>(sql`
    SELECT DISTINCT date(answered_at / 1000, 'unixepoch', 'localtime') AS day
    FROM answers WHERE selected IS NOT NULL AND answered_at IS NOT NULL
    ORDER BY day DESC LIMIT 400`);

  return {
    ...row,
    accuracy: row.answered > 0 ? row.correct / row.answered : 0,
    streakDays: studyStreak(days.map((d) => d.day)),
  };
}

export type TopicProgress = {
  id: number;
  subject: string;
  title: string;
  position: number;
  total: number;
  /** Distinct questions answered at least once. */
  seen: number;
  /** Distinct questions whose latest answer is correct. */
  mastered: number;
};

export function getTopicProgress(db: Db) {
  return db.all<TopicProgress>(sql`
    SELECT t.id, t.subject, t.title, t.position,
           COUNT(q.id) AS total,
           COUNT(l.question_id) AS seen,
           COALESCE(SUM(l.is_correct), 0) AS mastered
    FROM topics t
    JOIN questions q ON q.topic_id = t.id
    LEFT JOIN (${LATEST}) l ON l.question_id = q.id
    GROUP BY t.id
    ORDER BY t.position`);
}

export type SubjectProgress = {
  subject: string;
  total: number;
  seen: number;
  mastered: number;
  topics: TopicProgress[];
};

export function groupBySubject(topics: TopicProgress[]): SubjectProgress[] {
  const subjects = new Map<string, SubjectProgress>();
  for (const topic of topics) {
    const entry = subjects.get(topic.subject) ?? {
      subject: topic.subject,
      total: 0,
      seen: 0,
      mastered: 0,
      topics: [],
    };
    entry.total += topic.total;
    entry.seen += topic.seen;
    entry.mastered += topic.mastered;
    entry.topics.push(topic);
    subjects.set(topic.subject, entry);
  }
  return [...subjects.values()];
}

export type QuestionStatus = "correct" | "wrong";

/** Latest result per question of a topic, for list indicators. */
export function getQuestionStatuses(db: Db, topicId: number) {
  const rows = db.all<{ id: number; isCorrect: number }>(sql`
    SELECT q.id AS id, l.is_correct AS isCorrect
    FROM questions q JOIN (${LATEST}) l ON l.question_id = q.id
    WHERE q.topic_id = ${topicId}`);
  return new Map<number, QuestionStatus>(
    rows.map((r) => [r.id, r.isCorrect ? "correct" : "wrong"]),
  );
}

/**
 * Questions for practice that the user has seen least, so Arena does not
 * keep repeating the same ones. Random among equally-seen questions.
 */
export function getPracticeQuestionId(
  db: Db,
  { topicIds, excludeIds }: { topicIds?: number[]; excludeIds: number[] },
) {
  const topicFilter = topicIds?.length
    ? sql`AND q.topic_id IN (${sql.join(
        topicIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``;
  const exclude = excludeIds.length
    ? sql`AND q.id NOT IN (${sql.join(
        excludeIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``;
  const [row] = db.all<{ id: number }>(sql`
    SELECT q.id AS id FROM questions q
    LEFT JOIN (SELECT question_id, COUNT(*) AS n FROM answers
               WHERE selected IS NOT NULL GROUP BY question_id) c
      ON c.question_id = q.id
    WHERE 1 = 1 ${topicFilter} ${exclude}
    ORDER BY COALESCE(c.n, 0) ASC, RANDOM()
    LIMIT 1`);
  return row?.id ?? null;
}
