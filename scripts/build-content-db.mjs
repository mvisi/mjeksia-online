#!/usr/bin/env node
// Builds the read-only content database shipped with the app.
//
//   node scripts/build-content-db.mjs [source.db]
//
// - normalises the schema (topics table, NOT NULL constraints, CHECKs)
// - pre-renders every formula (question, options, explanation, reasoning)
//   to SVG with MathJax, keyed by normalised TeX
// - builds a diacritic-insensitive FTS5 index for search
// - writes constants/content-version.ts so the app replaces its local copy
//   whenever the content changes (user data lives in a separate database)
//
// The source can be the legacy `data.db` export or a previous `content.db`.

import { createHash } from "node:crypto";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { collectTex, toPlainText } from "../lib/rich-text.ts";
import { renderTexShared } from "./mathjax.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const OUTPUT = `${ROOT}assets/content.db`;
const SOURCE = process.argv[2] ?? (existsSync(OUTPUT) ? OUTPUT : `${ROOT}assets/data.db`);
const VERSION_FILE = `${ROOT}constants/content-version.ts`;

/** Display order of subjects and their topics. */
const TOPICS = {
  Biologji: ["Ciklet", "Diversiteti", "Ndërveprimet", "Sistemet"],
  Fizikë: [
    "Kinematika",
    "Dinamika",
    "Puna dhe energjia",
    "Termodinamika",
    "Elektrostatika",
    "Rryma elektrike",
    "Magnetizmi",
    "Lëkundjet dhe valët, Optika valore",
    "Optika gjeometrike",
    "Fizika kuantike dhe bërthamore",
  ],
  Kimi: [
    "Struktura e atomit dhe sistemi periodik",
    "Lidhjet kimike, simbolet, formulat dhe njehsimet stekiometrike",
    "Termokimia dhe kinetika",
    "Ekuilibri kimik, acidet-bazat, ekuilibrat jonik",
    "Reaksionet redoks dhe elektrokimia",
    "Kimi organike",
  ],
};

const source = new DatabaseSync(SOURCE, { readOnly: true });
const columns = source
  .prepare("PRAGMA table_info(questions)")
  .all()
  .map((c) => c.name);
const isLegacy = columns.includes("exam_title");

const rows = source
  .prepare(
    isLegacy
      ? `SELECT id, exam_title AS topic, subId AS sub_id, question_text, table_content, image,
                option_a, option_b, option_c, option_d, answer, explanation, reasoning
         FROM questions ORDER BY id`
      : `SELECT q.id, t.title AS topic, q.sub_id, q.question_text, q.table_content, q.image,
                q.option_a, q.option_b, q.option_c, q.option_d, q.answer, q.explanation, q.reasoning
         FROM questions q JOIN topics t ON t.id = q.topic_id ORDER BY q.id`,
  )
  .all();
source.close();

// ── Text repair ─────────────────────────────────────────────────────────
// The original export JSON-unescaped TeX backslashes (`\times` became TAB +
// "imes", `\frac` became FORM FEED + "rac", …) and left HTML entities around.

const ENTITIES = {
  euml: "ë",
  Euml: "Ë",
  ccedil: "ç",
  Ccedil: "Ç",
  eacute: "é",
  deg: "°",
  mu: "μ",
  sup2: "²",
  sup3: "³",
  times: "×",
  middot: "·",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rarr: "→",
  asymp: "≈",
};

/** Control character produced by the bad unescape → TeX commands it ate. */
const EATEN_ESCAPES = [
  ["\b", "b", ["boldsymbol", "backsim", "binom", "bullet", "beta", "bar", "big", "bot", "bf"]],
  ["\f", "f", ["frac", "flat", "forall"]],
  [
    "\t",
    "t",
    [
      "textbf",
      "textrm",
      "triangle",
      "theta",
      "tilde",
      "times",
      "tfrac",
      "text",
      "tan",
      "tau",
      "top",
      "to",
    ],
  ],
  [
    "\r",
    "r",
    [
      "rightleftharpoons",
      "rightarrow",
      "rangle",
      "rfloor",
      "rbrace",
      "right",
      "rceil",
      "rho",
      "rm",
    ],
  ],
  [
    "\n",
    "n",
    [
      "nparallel",
      "newline",
      "nexists",
      "notin",
      "nabla",
      "nleq",
      "ngeq",
      "nmid",
      "neg",
      "neq",
      "not",
      "nu",
      "ni",
      "ne",
    ],
  ],
];

function repairEscapes(text) {
  let out = text;
  for (const [char, letter, commands] of EATEN_ESCAPES) {
    const rest = commands.map((c) => c.slice(1)).join("|");
    const pattern = new RegExp(`${char}(${rest})(?![a-z])`, "g");
    const restore = (s) => s.replace(pattern, `\\${letter}$1`);
    // Newlines and tabs are legitimate in prose: only repair inside $…$.
    out = char === "\n" || char === "\t" ? out.replace(/\$+[^$]*\$+/g, restore) : restore(out);
  }
  // CR + another command name ("\romega") was a stray escape before it.
  out = out.replace(/\r(?=[a-zA-Z]{2,})/g, "\\");
  out = out.replace(/[\b\f\r]/g, "");
  // MathJax rejects chemistry like `O_7^{2-}_{(uj)}` (double subscript):
  // group the first script pair so the state subscript attaches cleanly.
  return out.replace(/\$+[^$]*\$+/g, (m) =>
    m.replace(/([A-Za-z]+_(?:\{[^{}]*\}|\w)\^(?:\{[^{}]*\}|[^\s{}]))_/g, "{$1}_"),
  );
}

function decodeEntities(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z\d]+);/gi, (m, code) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? m;
  });
}

const clean = (value) => decodeEntities(repairEscapes(String(value ?? ""))).trim();

const topicIds = new Map();
let position = 0;
for (const [subject, titles] of Object.entries(TOPICS)) {
  for (const title of titles) topicIds.set(title, { id: ++position, subject, title });
}
const unknown = [...new Set(rows.map((r) => r.topic))].filter((t) => !topicIds.has(t));
if (unknown.length) throw new Error(`Topics missing from TOPICS: ${unknown.join(", ")}`);

const tmp = `${OUTPUT}.tmp`;
rmSync(tmp, { force: true });
const db = new DatabaseSync(tmp);
db.exec(`
  PRAGMA journal_mode = DELETE;
  CREATE TABLE topics (
    id INTEGER PRIMARY KEY,
    subject TEXT NOT NULL,
    title TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL
  );
  CREATE TABLE questions (
    id INTEGER PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id),
    sub_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    table_content TEXT,
    image TEXT,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    answer TEXT NOT NULL CHECK (answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    UNIQUE (topic_id, sub_id)
  );
  CREATE TABLE glyphs (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL
  ) WITHOUT ROWID;
  CREATE TABLE math_svgs (
    tex TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    glyph_ids TEXT NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    vertical_align REAL NOT NULL
  ) WITHOUT ROWID;
  CREATE VIRTUAL TABLE questions_fts USING fts5(
    body,
    content = '',
    tokenize = 'unicode61 remove_diacritics 2'
  );
`);

const insertTopic = db.prepare("INSERT INTO topics VALUES (?, ?, ?, ?)");
for (const t of topicIds.values()) insertTopic.run(t.id, t.subject, t.title, t.id);

const insertQuestion = db.prepare(
  "INSERT INTO questions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
const insertFts = db.prepare("INSERT INTO questions_fts (rowid, body) VALUES (?, ?)");
const texSet = new Set();
const hash = createHash("sha256");

db.exec("BEGIN");
for (const r of rows) {
  const answer = String(r.answer).trim().toUpperCase();
  const fields = [
    r.question_text,
    r.option_a,
    r.option_b,
    r.option_c,
    r.option_d,
    r.explanation,
    r.reasoning,
  ].map(clean);
  const table = clean(r.table_content) || null;
  const image = r.image?.trim() || null;

  insertQuestion.run(
    r.id,
    topicIds.get(r.topic).id,
    r.sub_id,
    fields[0],
    table,
    image,
    fields[1],
    fields[2],
    fields[3],
    fields[4],
    answer,
    fields[5],
    fields[6],
  );
  insertFts.run(r.id, fields.slice(0, 5).map(toPlainText).join("\n"));
  for (const field of fields) for (const tex of collectTex(field)) texSet.add(tex);
  hash.update(JSON.stringify([r.id, r.topic, r.sub_id, ...fields, table, image, answer]));
}
db.exec("COMMIT");

const insertSvg = db.prepare("INSERT INTO math_svgs VALUES (?, ?, ?, ?, ?, ?)");
const insertGlyph = db.prepare("INSERT OR IGNORE INTO glyphs VALUES (?, ?)");
const failures = [];
db.exec("BEGIN");
for (const tex of [...texSet].sort()) {
  try {
    const svg = renderTexShared(tex);
    for (const [id, path] of svg.glyphs) insertGlyph.run(id, path);
    insertSvg.run(
      tex,
      svg.body,
      [...svg.glyphs.keys()].join(" "),
      svg.width,
      svg.height,
      svg.verticalAlign,
    );
  } catch (error) {
    failures.push(`${tex}  →  ${error.message}`);
  }
}
db.exec("COMMIT");

db.exec("INSERT INTO questions_fts(questions_fts) VALUES ('optimize'); ANALYZE; VACUUM;");
db.close();
renameSync(tmp, OUTPUT);

const version = hash.digest("hex").slice(0, 12);
writeFileSync(
  VERSION_FILE,
  `// Generated by scripts/build-content-db.mjs — do not edit.\n` +
    `export const CONTENT_VERSION = "${version}";\n` +
    `export const QUESTION_COUNT = ${rows.length};\n`,
);

console.log(`questions: ${rows.length}, formulas: ${texSet.size}, failed: ${failures.length}`);
for (const f of failures) console.warn(`  ! ${f}`);
console.log(`content version ${version} → ${OUTPUT}`);
