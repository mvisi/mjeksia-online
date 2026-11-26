/**
 * Read-only question bank, shipped as `assets/content.db` and ATTACHed to
 * the user database at startup. Built by `scripts/build-content-db.mjs`;
 * NOT managed by drizzle-kit migrations.
 */
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
export type OptionLetter = (typeof OPTION_LETTERS)[number];

export const topics = sqliteTable("topics", {
  id: integer().primaryKey(),
  subject: text().notNull(),
  title: text().notNull(),
  position: integer().notNull(),
});

export const questions = sqliteTable("questions", {
  id: integer().primaryKey(),
  topicId: integer("topic_id").notNull(),
  subId: integer("sub_id").notNull(),
  questionText: text("question_text").notNull(),
  tableContent: text("table_content"),
  image: text(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  answer: text({ enum: OPTION_LETTERS }).notNull(),
  explanation: text().notNull(),
  reasoning: text().notNull(),
});

export const mathSvgs = sqliteTable("math_svgs", {
  tex: text().primaryKey(),
  body: text().notNull(),
  glyphIds: text("glyph_ids").notNull(),
  width: real().notNull(),
  height: real().notNull(),
  verticalAlign: real("vertical_align").notNull(),
});

export const glyphs = sqliteTable("glyphs", {
  id: text().primaryKey(),
  path: text().notNull(),
});

export type Topic = typeof topics.$inferSelect;
export type Question = typeof questions.$inferSelect;

export function optionText(question: Question, letter: OptionLetter): string {
  switch (letter) {
    case "A":
      return question.optionA;
    case "B":
      return question.optionB;
    case "C":
      return question.optionC;
    case "D":
      return question.optionD;
  }
}
