import { and, asc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "./client";
import { glyphs, mathSvgs, questions, topics, type Question } from "./schema";

export type QuestionWithTopic = Question & { topicTitle: string; subject: string };

const questionWithTopic = {
  id: questions.id,
  topicId: questions.topicId,
  subId: questions.subId,
  questionText: questions.questionText,
  tableContent: questions.tableContent,
  image: questions.image,
  optionA: questions.optionA,
  optionB: questions.optionB,
  optionC: questions.optionC,
  optionD: questions.optionD,
  answer: questions.answer,
  explanation: questions.explanation,
  reasoning: questions.reasoning,
  topicTitle: topics.title,
  subject: topics.subject,
};

export function getTopics(db: Db) {
  return db.select().from(topics).orderBy(asc(topics.position)).all();
}

export function getTopic(db: Db, topicId: number) {
  return db.select().from(topics).where(eq(topics.id, topicId)).get() ?? null;
}

export function getQuestion(db: Db, id: number): QuestionWithTopic | null {
  return (
    db
      .select(questionWithTopic)
      .from(questions)
      .innerJoin(topics, eq(topics.id, questions.topicId))
      .where(eq(questions.id, id))
      .get() ?? null
  );
}

/** Questions in the given order (ids from a test, a deck, …). */
export function getQuestionsByIds(db: Db, ids: number[]): QuestionWithTopic[] {
  if (ids.length === 0) return [];
  const rows = db
    .select(questionWithTopic)
    .from(questions)
    .innerJoin(topics, eq(topics.id, questions.topicId))
    .where(inArray(questions.id, ids))
    .all();
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export function getTopicQuestionList(db: Db, topicId: number) {
  return db
    .select({
      id: questions.id,
      subId: questions.subId,
      questionText: questions.questionText,
      hasImage: sql<boolean>`${questions.image} IS NOT NULL`.mapWith(Boolean),
      hasTable: sql<boolean>`${questions.tableContent} IS NOT NULL`.mapWith(Boolean),
    })
    .from(questions)
    .where(eq(questions.topicId, topicId))
    .orderBy(asc(questions.subId))
    .all();
}

export function getAdjacentQuestionIds(db: Db, question: Question) {
  const prev = db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.topicId, question.topicId), lt(questions.subId, question.subId)))
    .orderBy(sql`${questions.subId} DESC`)
    .get();
  const next = db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.topicId, question.topicId), gt(questions.subId, question.subId)))
    .orderBy(asc(questions.subId))
    .get();
  return { prevId: prev?.id ?? null, nextId: next?.id ?? null };
}

/** All question ids with their topic, for building tests in JS. */
export function getQuestionIndex(db: Db, topicIds?: number[]) {
  const query = db.select({ id: questions.id, topicId: questions.topicId }).from(questions);
  return (topicIds ? query.where(inArray(questions.topicId, topicIds)) : query).all();
}

/**
 * Full-text search over question text and options. The FTS index strips
 * diacritics, so "pergjigje" finds "përgjigje".
 */
export function searchQuestions(db: Db, input: string, limit = 50) {
  const terms = input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  if (terms.length === 0) return [];
  const match = terms.map((t) => `"${t}"*`).join(" ");

  return db
    .select({
      id: questions.id,
      subId: questions.subId,
      questionText: questions.questionText,
      topicId: topics.id,
      topicTitle: topics.title,
      subject: topics.subject,
    })
    .from(sql`questions_fts`)
    .innerJoin(questions, sql`${questions.id} = questions_fts.rowid`)
    .innerJoin(topics, eq(topics.id, questions.topicId))
    .where(sql`questions_fts MATCH ${match}`)
    .orderBy(sql`questions_fts.rank`)
    .limit(limit)
    .all();
}

export type MathSvg = { xml: string; width: number; height: number; verticalAlign: number };

/** Pre-rendered formulas plus the glyph outlines they reference. */
export function getMathSvgs(db: Db, texList: string[]) {
  if (texList.length === 0) return { rows: [], glyphs: new Map<string, string>() };
  const rows = db.select().from(mathSvgs).where(inArray(mathSvgs.tex, texList)).all();
  const glyphIds = [...new Set(rows.flatMap((r) => r.glyphIds.split(" ").filter(Boolean)))];
  const glyphRows = glyphIds.length
    ? db.select().from(glyphs).where(inArray(glyphs.id, glyphIds)).all()
    : [];
  return { rows, glyphs: new Map(glyphRows.map((g) => [g.id, g.path])) };
}
