/**
 * Tiny parser for the markdown-ish text used in questions, options,
 * explanations and reasoning: paragraphs, `**bold**`, numbered / bulleted
 * lists, inline `$tex$` and display `$$tex$$` math.
 *
 * This module is dependency free on purpose: it is also imported by
 * `scripts/build-content-db.mjs` so formula keys are produced by exactly the
 * same code at build time and at runtime.
 */

export type Inline =
  | { type: "text"; text: string; bold: boolean }
  | { type: "math"; tex: string; bold: boolean };

export type Block =
  | { type: "paragraph"; content: Inline[] }
  | { type: "list-item"; marker: string; depth: number; content: Inline[] }
  | { type: "display-math"; tex: string };

/** Normalised TeX is the lookup key for pre-rendered SVGs. */
export function normalizeTex(tex: string): string {
  return tex.trim().replace(/\s+/g, " ");
}

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let bold = false;
  let buffer = "";
  const flush = () => {
    if (buffer) out.push({ type: "text", text: buffer, bold });
    buffer = "";
  };

  let i = 0;
  while (i < source.length) {
    if (source.startsWith("\\$", i)) {
      buffer += "$";
      i += 2;
      continue;
    }
    if (source.startsWith("**", i)) {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    if (source[i] === "$") {
      const delimiter = source.startsWith("$$", i) ? "$$" : "$";
      const end = source.indexOf(delimiter, i + delimiter.length);
      const tex = end === -1 ? "" : source.slice(i + delimiter.length, end);
      if (normalizeTex(tex)) {
        flush();
        out.push({ type: "math", tex: normalizeTex(tex), bold });
        i = end + delimiter.length;
        continue;
      }
    }
    buffer += source[i];
    i++;
  }
  flush();
  return out;
}

const DISPLAY_MATH = /^\$\$([\s\S]+)\$\$$/;
const ORDERED_ITEM = /^(\d+)[.)]\s+(.*)$/;
const BULLET_ITEM = /^[-*•]\s+(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        content: parseInline(paragraph.join("\n")),
      });
    }
    paragraph = [];
  };

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const depth = Math.min(3, Math.floor((rawLine.length - rawLine.trimStart().length) / 4));

    if (!line) {
      flushParagraph();
      continue;
    }

    const display = DISPLAY_MATH.exec(line);
    if (display && !display[1].includes("$$")) {
      flushParagraph();
      blocks.push({ type: "display-math", tex: normalizeTex(display[1]) });
      continue;
    }

    const ordered = ORDERED_ITEM.exec(line);
    const bullet = ordered ? null : BULLET_ITEM.exec(line);
    if (ordered || bullet) {
      flushParagraph();
      blocks.push({
        type: "list-item",
        marker: ordered ? `${ordered[1]}.` : "•",
        depth,
        content: parseInline(ordered ? ordered[2] : bullet![1]),
      });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "paragraph",
        content: parseInline(`**${heading[1]}**`),
      });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

/** Every distinct formula in a text, as normalised TeX. */
export function collectTex(source: string): string[] {
  const found = new Set<string>();
  for (const block of parseBlocks(source)) {
    if (block.type === "display-math") {
      found.add(block.tex);
    } else {
      for (const inline of block.content) {
        if (inline.type === "math") found.add(inline.tex);
      }
    }
  }
  return [...found];
}

// ── Plain-text fallback ─────────────────────────────────────────────────

const SYMBOLS: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
  cdot: "·",
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  approx: "≈",
  neq: "≠",
  ne: "≠",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  infty: "∞",
  degree: "°",
  circ: "°",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  leftrightarrow: "↔",
  rightleftharpoons: "⇌",
  uparrow: "↑",
  downarrow: "↓",
  propto: "∝",
  sim: "~",
  partial: "∂",
  nabla: "∇",
  sum: "Σ",
  int: "∫",
  ldots: "…",
  cdots: "⋯",
  dots: "…",
  angle: "∠",
  perp: "⊥",
  parallel: "∥",
  prime: "′",
  percent: "%",
};

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
};

const SUBSCRIPT: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
};

function mapScript(text: string, table: Record<string, string>, marker: string) {
  const chars = [...text];
  return chars.every((c) => c in table)
    ? chars.map((c) => table[c]).join("")
    : `${marker}${chars.length > 1 ? `(${text})` : text}`;
}

/** Best-effort readable rendering of TeX, for previews and search. */
export function texToPlain(tex: string): string {
  let s = tex;
  // Innermost-first replacement of two-argument commands.
  for (let guard = 0; guard < 10; guard++) {
    const next = s
      .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt\s*\[([^{}]*)\]\s*\{([^{}]*)\}/g, "$1√($2)")
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
      .replace(
        /\\(?:text|mathrm|mathbf|mathit|operatorname|textbf|vec|overline|bar|hat)\s*\{([^{}]*)\}/g,
        "$1",
      )
      .replace(/\^\s*\{([^{}]*)\}/g, (_, x: string) => mapScript(x, SUPERSCRIPT, "^"))
      .replace(/_\s*\{([^{}]*)\}/g, (_, x: string) => mapScript(x, SUBSCRIPT, "_"));
    if (next === s) break;
    s = next;
  }
  return s
    .replace(/\^\s*([A-Za-z0-9+-])/g, (_, x: string) => mapScript(x, SUPERSCRIPT, "^"))
    .replace(/_\s*([A-Za-z0-9])/g, (_, x: string) => mapScript(x, SUBSCRIPT, "_"))
    .replace(/\\(?:left|right|big|Big|displaystyle|limits)\b/g, "")
    .replace(/\\[,;:! ]/g, " ")
    .replace(/\\%/g, "%")
    .replace(/\\([A-Za-z]+)/g, (_, name: string) => SYMBOLS[name] ?? name)
    .replace(/\(([^()\s/]+)\)\/\(([^()\s/]+)\)/g, "$1/$2")
    .replace(/[{}]/g, "")
    .replace(/~/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rich text flattened to a single readable line. */
export function toPlainText(source: string): string {
  return parseBlocks(source)
    .map((block) => {
      if (block.type === "display-math") return texToPlain(block.tex);
      const text = block.content
        .map((i) => (i.type === "math" ? texToPlain(i.tex) : i.text))
        .join("");
      return block.type === "list-item" ? `${block.marker} ${text}` : text;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
