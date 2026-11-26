/**
 * The user's own data. Lives in `user.db`, managed by drizzle-kit migrations
 * (see drizzle.config.ts). Question ids refer to the attached content DB, so
 * there is intentionally no foreign key across databases.
 */
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { OPTION_LETTERS } from "./content-schema";

export const SESSION_KINDS = ["mock", "focus", "mistakes", "retest"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const SESSION_STATUSES = ["in_progress", "completed", "timed_out", "abandoned"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ANSWER_SOURCES = ["test", "arena", "bank"] as const;
export type AnswerSource = (typeof ANSWER_SOURCES)[number];

const now = sql`(unixepoch('subsec') * 1000)`;

export const testSessions = sqliteTable(
  "test_sessions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    kind: text({ enum: SESSION_KINDS }).notNull(),
    status: text({ enum: SESSION_STATUSES }).notNull().default("in_progress"),
    /** Human readable scope, e.g. a topic or subject name. */
    label: text(),
    retestOf: integer("retest_of"),
    questionCount: integer("question_count").notNull(),
    timeLimitSeconds: integer("time_limit_seconds").notNull(),
    /** Wall-clock deadline while the test is running, null while paused. */
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    /** Seconds left when paused, or when the test finished. */
    remainingSeconds: integer("remaining_seconds").notNull(),
    currentIndex: integer("current_index").notNull().default(0),
    score: integer().notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("test_sessions_status_idx").on(t.status),
    index("test_sessions_created_idx").on(t.createdAt),
  ],
);

export const answers = sqliteTable(
  "answers",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    /** Null for answers given outside a test (arena, question bank). */
    sessionId: integer("session_id").references(() => testSessions.id, {
      onDelete: "cascade",
    }),
    /** Order of the question inside its test. */
    position: integer(),
    source: text({ enum: ANSWER_SOURCES }).notNull(),
    questionId: integer("question_id").notNull(),
    selected: text({ enum: OPTION_LETTERS }),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
    correctOption: text("correct_option", { enum: OPTION_LETTERS }).notNull(),
    flagged: integer({ mode: "boolean" }).notNull().default(false),
    secondsSpent: integer("seconds_spent").notNull().default(0),
    answeredAt: integer("answered_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("answers_question_idx").on(t.questionId, t.answeredAt),
    index("answers_answered_idx").on(t.answeredAt),
    uniqueIndex("answers_session_position_idx").on(t.sessionId, t.position),
  ],
);

export type TestSession = typeof testSessions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
