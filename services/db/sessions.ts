import { shuffle, stratifiedSample } from "@/lib/sampling";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "./client";
import { getQuestionIndex, getQuestionsByIds, type QuestionWithTopic } from "./content";
import { getMistakeIds } from "./progress";
import {
  answers,
  questions,
  testSessions,
  type Answer,
  type AnswerSource,
  type OptionLetter,
  type SessionKind,
  type TestSession,
} from "./schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Conn = Db | Tx;

export type FinishStatus = "completed" | "timed_out" | "abandoned";

// ── Picking questions ──────────────────────────────────────────────────

/** Mock exam: proportional to each topic's share of the bank. */
export function pickMockQuestions(db: Db, count: number): number[] {
  return stratifiedSample(getQuestionIndex(db), count, (q) => q.topicId).map((q) => q.id);
}

export function pickTopicQuestions(db: Db, topicIds: number[], count: number): number[] {
  return shuffle(getQuestionIndex(db, topicIds))
    .slice(0, count)
    .map((q) => q.id);
}

export function pickMistakeQuestions(db: Db, count: number): number[] {
  return shuffle(getMistakeIds(db, count));
}

/** Questions of an earlier test, optionally only those not answered correctly. */
export function pickRetestQuestions(db: Db, sessionId: number, onlyMissed: boolean): number[] {
  return db
    .select({ questionId: answers.questionId })
    .from(answers)
    .where(
      and(eq(answers.sessionId, sessionId), onlyMissed ? eq(answers.isCorrect, false) : undefined),
    )
    .orderBy(asc(answers.position))
    .all()
    .map((r) => r.questionId);
}

// ── Lifecycle ──────────────────────────────────────────────────────────

export type NewSession = {
  kind: SessionKind;
  questionIds: number[];
  timeLimitSeconds: number;
  label?: string | null;
  retestOf?: number | null;
};

/**
 * Creates a test with one answer row per question. The clock does not start
 * until the test screen calls `resumeSession`, so loading time is free.
 * Only one test can be open at a time: older open tests are abandoned.
 */
export function createSession(db: Db, input: NewSession, now = Date.now()): number {
  if (input.questionIds.length === 0) throw new Error("A test needs questions");

  return db.transaction((tx) => {
    for (const open of getOpenSessions(tx)) finishSession(tx, open.id, "abandoned", now);

    const correct = new Map(
      tx
        .select({ id: questions.id, answer: questions.answer })
        .from(questions)
        .where(inArray(questions.id, input.questionIds))
        .all()
        .map((q) => [q.id, q.answer]),
    );
    const ids = input.questionIds.filter((id) => correct.has(id));

    const { id } = tx
      .insert(testSessions)
      .values({
        kind: input.kind,
        label: input.label ?? null,
        retestOf: input.retestOf ?? null,
        questionCount: ids.length,
        timeLimitSeconds: input.timeLimitSeconds,
        remainingSeconds: input.timeLimitSeconds,
        createdAt: new Date(now),
      })
      .returning({ id: testSessions.id })
      .get();

    tx.insert(answers)
      .values(
        ids.map((questionId, position) => ({
          sessionId: id,
          position,
          source: "test" as const,
          questionId,
          correctOption: correct.get(questionId)!,
        })),
      )
      .run();

    return id;
  });
}

function getOpenSessions(db: Conn) {
  return db.select().from(testSessions).where(eq(testSessions.status, "in_progress")).all();
}

export function secondsLeft(
  session: Pick<TestSession, "endsAt" | "remainingSeconds">,
  now: number,
) {
  if (!session.endsAt) return session.remainingSeconds;
  return Math.max(0, Math.ceil((session.endsAt.getTime() - now) / 1000));
}

/** Starts or continues the clock. Returns the deadline. */
export function resumeSession(db: Db, sessionId: number, now = Date.now()): Date {
  const session = getSession(db, sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (session.endsAt) return session.endsAt;
  const endsAt = new Date(now + session.remainingSeconds * 1000);
  db.update(testSessions).set({ endsAt }).where(eq(testSessions.id, sessionId)).run();
  return endsAt;
}

/** Stops the clock so the test can be continued later. */
export function pauseSession(db: Db, sessionId: number, now = Date.now()) {
  const session = getSession(db, sessionId);
  if (!session || session.status !== "in_progress" || !session.endsAt) return;
  db.update(testSessions)
    .set({ endsAt: null, remainingSeconds: secondsLeft(session, now) })
    .where(eq(testSessions.id, sessionId))
    .run();
}

export function finishSession(db: Conn, sessionId: number, status: FinishStatus, now = Date.now()) {
  const session = db.select().from(testSessions).where(eq(testSessions.id, sessionId)).get();
  if (!session || session.status !== "in_progress") return;

  const { score } = db
    .select({ score: sql<number>`COUNT(*)` })
    .from(answers)
    .where(and(eq(answers.sessionId, sessionId), eq(answers.isCorrect, true)))
    .get()!;

  db.update(testSessions)
    .set({
      status,
      score,
      endsAt: null,
      remainingSeconds: status === "timed_out" ? 0 : secondsLeft(session, now),
      finishedAt: new Date(now),
    })
    .where(eq(testSessions.id, sessionId))
    .run();
}

/** Times out tests whose deadline passed while the app was closed. */
export function expireOverdueSessions(db: Db, now = Date.now()) {
  for (const session of getOpenSessions(db)) {
    if (session.endsAt && session.endsAt.getTime() <= now) {
      finishSession(db, session.id, "timed_out", now);
    }
  }
}

// ── Answers ────────────────────────────────────────────────────────────

const atPosition = (sessionId: number, position: number) =>
  and(eq(answers.sessionId, sessionId), eq(answers.position, position));

export function answerInSession(
  db: Db,
  sessionId: number,
  position: number,
  selected: OptionLetter | null,
  now = Date.now(),
) {
  db.update(answers)
    .set({
      selected,
      isCorrect: sql`${selected} IS NOT NULL AND ${selected} = ${answers.correctOption}`,
      answeredAt: selected ? new Date(now) : null,
    })
    .where(atPosition(sessionId, position))
    .run();
}

export function setFlag(db: Db, sessionId: number, position: number, flagged: boolean) {
  db.update(answers).set({ flagged }).where(atPosition(sessionId, position)).run();
}

export function addTimeSpent(db: Db, sessionId: number, position: number, seconds: number) {
  if (seconds <= 0) return;
  db.update(answers)
    .set({ secondsSpent: sql`${answers.secondsSpent} + ${Math.round(seconds)}` })
    .where(atPosition(sessionId, position))
    .run();
}

export function setCurrentIndex(db: Db, sessionId: number, index: number) {
  db.update(testSessions).set({ currentIndex: index }).where(eq(testSessions.id, sessionId)).run();
}

/** Answers given outside a test (Arena, question bank). */
export function recordPracticeAnswer(
  db: Db,
  input: {
    questionId: number;
    selected: OptionLetter;
    correctOption: OptionLetter;
    source: Exclude<AnswerSource, "test">;
    secondsSpent: number;
  },
  now = Date.now(),
) {
  db.insert(answers)
    .values({
      source: input.source,
      questionId: input.questionId,
      selected: input.selected,
      correctOption: input.correctOption,
      isCorrect: input.selected === input.correctOption,
      secondsSpent: Math.round(input.secondsSpent),
      answeredAt: new Date(now),
    })
    .run();
}

// ── Reads ──────────────────────────────────────────────────────────────

export function getSession(db: Conn, sessionId: number): TestSession | null {
  return db.select().from(testSessions).where(eq(testSessions.id, sessionId)).get() ?? null;
}

/** The test the user can continue, if any (expired ones are timed out first). */
export function getOpenSession(db: Db, now = Date.now()): TestSession | null {
  expireOverdueSessions(db, now);
  return (
    db
      .select()
      .from(testSessions)
      .where(eq(testSessions.status, "in_progress"))
      .orderBy(desc(testSessions.createdAt))
      .get() ?? null
  );
}

export type SessionItem = Answer & { question: QuestionWithTopic };
export type SessionDetail = TestSession & { items: SessionItem[] };

export function getSessionDetail(db: Db, sessionId: number): SessionDetail | null {
  const session = getSession(db, sessionId);
  if (!session) return null;
  const rows = db
    .select()
    .from(answers)
    .where(eq(answers.sessionId, sessionId))
    .orderBy(asc(answers.position))
    .all();
  const byId = new Map(
    getQuestionsByIds(
      db,
      rows.map((r) => r.questionId),
    ).map((q) => [q.id, q]),
  );
  return {
    ...session,
    items: rows.flatMap((row) => {
      const question = byId.get(row.questionId);
      return question ? [{ ...row, question }] : [];
    }),
  };
}

export function listFinishedSessions(db: Db, limit = 200) {
  return db
    .select()
    .from(testSessions)
    .where(ne(testSessions.status, "in_progress"))
    .orderBy(desc(testSessions.createdAt))
    .limit(limit)
    .all();
}

export function deleteSession(db: Db, sessionId: number) {
  db.delete(testSessions).where(eq(testSessions.id, sessionId)).run();
}

/** Wipes all history and progress. The question bank is untouched. */
export function resetProgress(db: Db) {
  db.transaction((tx) => {
    tx.delete(answers).run();
    tx.delete(testSessions).run();
  });
}
