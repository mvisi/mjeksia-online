import { collectTex } from "@/lib/rich-text";
import { MASTERY_STREAK } from "@/lib/stats";
import type { Db } from "@/services/db/client";
import { getMathSvgs, getQuestion, getTopics, searchQuestions } from "@/services/db/content";
import {
  getMistakes,
  getOverview,
  getPracticeQuestionId,
  getQuestionStatuses,
  getTopicProgress,
  groupBySubject,
} from "@/services/db/progress";
import * as schema from "@/services/db/schema";
import {
  addTimeSpent,
  answerInSession,
  createSession,
  expireOverdueSessions,
  finishSession,
  getOpenSession,
  getSession,
  getSessionDetail,
  listFinishedSessions,
  pauseSession,
  pickMockQuestions,
  pickRetestQuestions,
  recordPracticeAnswer,
  resetProgress,
  resumeSession,
} from "@/services/db/sessions";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

/** Same setup as the app: empty user DB with the question bank attached. */
function makeDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.prepare("ATTACH DATABASE ? AS content").run(path.join(ROOT, "assets/content.db"));
  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder: path.join(ROOT, "drizzle") });
  return db as unknown as Db;
}

const wrongOption = (answer: schema.OptionLetter): schema.OptionLetter =>
  answer === "A" ? "B" : "A";

describe("content", () => {
  const db = makeDb();

  it("lists topics in display order with subjects", () => {
    const topics = getTopics(db);
    expect(topics).toHaveLength(20);
    expect(new Set(topics.map((t) => t.subject))).toEqual(new Set(["Biologji", "Fizikë", "Kimi"]));
    expect(topics.map((t) => t.position)).toEqual(
      [...topics.map((t) => t.position)].sort((a, b) => a - b),
    );
  });

  it("searches without diacritics", () => {
    const withAccents = searchQuestions(db, "përgjigje");
    const without = searchQuestions(db, "pergjigje");
    expect(without.length).toBeGreaterThan(0);
    expect(without.map((r) => r.id)).toEqual(withAccents.map((r) => r.id));
    expect(searchQuestions(db, "  ")).toEqual([]);
  });

  it("has a pre-rendered SVG (and its glyphs) for every formula in the bank", () => {
    const texts = db
      .select()
      .from(schema.questions)
      .all()
      .flatMap((q) => [
        q.questionText,
        q.optionA,
        q.optionB,
        q.optionC,
        q.optionD,
        q.explanation,
        q.reasoning,
      ]);
    const wanted = [...new Set(texts.flatMap(collectTex))];
    expect(wanted.length).toBeGreaterThan(3000);

    const { rows, glyphs } = getMathSvgs(db, wanted);
    const found = new Set(rows.map((r) => r.tex));
    expect(wanted.filter((tex) => !found.has(tex))).toEqual([]);
    for (const row of rows) {
      for (const id of row.glyphIds.split(" ").filter(Boolean)) {
        expect(glyphs.has(id)).toBe(true);
      }
    }
  });

  it("has every referenced image in the image map", () => {
    const { imageMap } =
      jest.requireActual<typeof import("@/constants/imageMap")>("@/constants/imageMap");
    const images = db
      .select({ image: schema.questions.image })
      .from(schema.questions)
      .all()
      .flatMap((q) => (q.image ? [q.image] : []));
    expect(images.length).toBeGreaterThan(300);
    expect(images.filter((image) => !(image in imageMap))).toEqual([]);
  });

  it("contains no control characters or HTML entities", () => {
    const bad = db
      .select({ id: schema.questions.id, text: schema.questions.reasoning })
      .from(schema.questions)
      .all()
      .filter((q) => /[\b\f\r]|&#?\w+;/.test(q.text));
    expect(bad).toEqual([]);
  });
});

describe("tests and progress", () => {
  it("builds a mock exam covering every topic proportionally", () => {
    const db = makeDb();
    const ids = pickMockQuestions(db, 100);
    expect(new Set(ids).size).toBe(100);
    const topicsHit = new Set(ids.map((id) => getQuestion(db, id)!.topicId));
    expect(topicsHit.size).toBeGreaterThanOrEqual(18);
  });

  it("runs a test end to end: clock, answers, pause, finish", () => {
    const db = makeDb();
    const t0 = 1_700_000_000_000;
    const ids = pickMockQuestions(db, 5);
    const id = createSession(db, { kind: "mock", questionIds: ids, timeLimitSeconds: 300 }, t0);

    // Clock does not run until the screen resumes the session.
    expect(getSession(db, id)!.endsAt).toBeNull();
    resumeSession(db, id, t0 + 10_000);
    expect(getSession(db, id)!.endsAt!.getTime()).toBe(t0 + 310_000);

    const detail = getSessionDetail(db, id)!;
    const [q0, q1] = detail.items.map((i) => i.question);
    answerInSession(db, id, 0, q0.answer, t0 + 20_000);
    answerInSession(db, id, 1, wrongOption(q1.answer), t0 + 30_000);
    addTimeSpent(db, id, 0, 12);

    pauseSession(db, id, t0 + 70_000);
    const paused = getSession(db, id)!;
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingSeconds).toBe(240);

    // Time away while paused does not count.
    resumeSession(db, id, t0 + 1_000_000);
    expect(getSession(db, id)!.endsAt!.getTime()).toBe(t0 + 1_240_000);

    finishSession(db, id, "completed", t0 + 1_100_000);
    const done = getSessionDetail(db, id)!;
    expect(done.status).toBe("completed");
    expect(done.score).toBe(1);
    expect(done.remainingSeconds).toBe(140);
    expect(done.items[0].secondsSpent).toBe(12);
    expect(done.items[2].selected).toBeNull();
    expect(listFinishedSessions(db).map((s) => s.id)).toEqual([id]);
  });

  it("times out a running test whose deadline passed while closed", () => {
    const db = makeDb();
    const id = createSession(
      db,
      { kind: "mock", questionIds: pickMockQuestions(db, 3), timeLimitSeconds: 60 },
      0,
    );
    resumeSession(db, id, 0);
    expect(getOpenSession(db, 30_000)?.id).toBe(id);
    expireOverdueSessions(db, 61_000);
    expect(getOpenSession(db, 61_000)).toBeNull();
    const s = getSession(db, id)!;
    expect(s.status).toBe("timed_out");
    expect(s.remainingSeconds).toBe(0);
  });

  it("abandons the previous open test when a new one starts", () => {
    const db = makeDb();
    const first = createSession(db, { kind: "mock", questionIds: [1, 2], timeLimitSeconds: 60 });
    const second = createSession(db, { kind: "focus", questionIds: [3, 4], timeLimitSeconds: 60 });
    expect(getSession(db, first)!.status).toBe("abandoned");
    expect(getOpenSession(db)?.id).toBe(second);
  });

  it("keeps a mistake in the deck until it is answered right twice in a row", () => {
    const db = makeDb();
    const q = getQuestion(db, 10)!;
    const practice = (selected: schema.OptionLetter, at: number) =>
      recordPracticeAnswer(
        db,
        { questionId: q.id, selected, correctOption: q.answer, source: "arena", secondsSpent: 5 },
        at,
      );

    practice(wrongOption(q.answer), 1000);
    expect(getMistakes(db).map((m) => m.questionId)).toEqual([q.id]);
    expect(getMistakes(db)[0].lastWrongOption).toBe(wrongOption(q.answer));

    practice(q.answer, 2000);
    expect(getMistakes(db)[0].streak).toBe(1);
    for (let i = 1; i < MASTERY_STREAK; i++) practice(q.answer, 3000 + i);
    expect(getMistakes(db)).toEqual([]);

    practice(wrongOption(q.answer), 9000);
    expect(getMistakes(db)).toHaveLength(1);
  });

  it("does not count skipped test questions as mistakes or in accuracy", () => {
    const db = makeDb();
    const ids = pickMockQuestions(db, 4);
    const id = createSession(db, { kind: "mock", questionIds: ids, timeLimitSeconds: 60 }, 0);
    const detail = getSessionDetail(db, id)!;
    answerInSession(db, id, 0, detail.items[0].question.answer, 1000);
    answerInSession(db, id, 1, wrongOption(detail.items[1].question.answer), 2000);
    finishSession(db, id, "timed_out", 3000);

    const overview = getOverview(db);
    expect(overview.answered).toBe(2);
    expect(overview.accuracy).toBe(0.5);
    expect(overview.activeMistakes).toBe(1);
    expect(overview.finishedTests).toBe(1);
    expect(overview.averageScore).toBeCloseTo(0.25);

    expect(pickRetestQuestions(db, id, true)).toEqual(ids.slice(1));
    expect(pickRetestQuestions(db, id, false)).toEqual(ids);
  });

  it("reports progress per topic and subject", () => {
    const db = makeDb();
    const q = getQuestion(db, 0)!;
    recordPracticeAnswer(db, {
      questionId: q.id,
      selected: q.answer,
      correctOption: q.answer,
      source: "bank",
      secondsSpent: 3,
    });
    const topics = getTopicProgress(db);
    const topic = topics.find((t) => t.id === q.topicId)!;
    expect(topic).toMatchObject({ seen: 1, mastered: 1 });
    expect(topics.reduce((n, t) => n + t.total, 0)).toBe(2999);
    expect(groupBySubject(topics)).toHaveLength(3);
    expect(getQuestionStatuses(db, q.topicId).get(q.id)).toBe("correct");
  });

  it("prefers questions the user has not practised", () => {
    const db = makeDb();
    const topicId = getTopics(db)[0].id;
    const id = getPracticeQuestionId(db, { topicIds: [topicId], excludeIds: [] });
    expect(getQuestion(db, id!)!.topicId).toBe(topicId);
    expect(getPracticeQuestionId(db, { excludeIds: [id!] })).not.toBe(id);
  });

  it("resets progress without touching the question bank", () => {
    const db = makeDb();
    createSession(db, { kind: "mock", questionIds: [1, 2, 3], timeLimitSeconds: 60 });
    resetProgress(db);
    expect(getOpenSession(db)).toBeNull();
    expect(getTopics(db)).toHaveLength(20);
  });
});
