import { formatClock, formatDuration } from "@/lib/format";
import { collectTex, parseBlocks, parseInline, texToPlain, toPlainText } from "@/lib/rich-text";
import { shuffle, stratifiedSample } from "@/lib/sampling";
import { dayKey, percent, scoreTone, studyStreak } from "@/lib/stats";

/** Deterministic PRNG for sampling tests. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("rich text", () => {
  it("parses bold that spans inline math", () => {
    expect(parseInline("**Forca ($F$):** e madhe")).toEqual([
      { type: "text", text: "Forca (", bold: true },
      { type: "math", tex: "F", bold: true },
      { type: "text", text: "):", bold: true },
      { type: "text", text: " e madhe", bold: false },
    ]);
  });

  it("parses display math, lists and paragraphs", () => {
    const blocks = parseBlocks(
      "Hyrje $a$.\n\n1.  **Hapi 1:**\n    $$F = m \\cdot a$$\n- pika\n\nFund",
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "paragraph",
      "list-item",
      "display-math",
      "list-item",
      "paragraph",
    ]);
    expect(blocks[1]).toMatchObject({ marker: "1." });
    expect(blocks[2]).toEqual({ type: "display-math", tex: "F = m \\cdot a" });
    expect(blocks[3]).toMatchObject({ marker: "•" });
  });

  it("does not treat a lone or escaped dollar as math", () => {
    expect(parseInline("Kosto 5\\$ dhe $")).toEqual([
      { type: "text", text: "Kosto 5$ dhe $", bold: false },
    ]);
  });

  it("collects normalised formulas once", () => {
    expect(collectTex("$a  +  b$ dhe $a + b$ dhe $$c$$")).toEqual(["a + b", "c"]);
  });

  it("renders TeX as readable plain text", () => {
    expect(texToPlain("\\frac{1}{2} m v^2")).toBe("1/2 m v²");
    expect(texToPlain("H_2O + \\Delta E_{k}")).toBe("H₂O + Δ E_k");
    expect(texToPlain("\\sqrt{2} \\cdot 10^{-3}\\,\\text{m}")).toBe("√(2) · 10⁻³ m");
    expect(toPlainText("**Sa është** $v_0$?")).toBe("Sa është v₀?");
  });
});

describe("sampling", () => {
  it("shuffles without losing items", () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffle(items, seeded(1)).sort()).toEqual(items);
  });

  it("samples groups proportionally", () => {
    const items = [
      ...Array.from({ length: 60 }, (_, i) => ({ id: i, g: "a" })),
      ...Array.from({ length: 30 }, (_, i) => ({ id: 100 + i, g: "b" })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: 200 + i, g: "c" })),
    ];
    const picked = stratifiedSample(items, 10, (x) => x.g, seeded(7));
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((p) => p.id)).size).toBe(10);
    const count = (g: string) => picked.filter((p) => p.g === g).length;
    expect([count("a"), count("b"), count("c")]).toEqual([6, 3, 1]);
  });

  it("handles requests larger than the pool and zero", () => {
    expect(stratifiedSample([1, 2], 5, () => 0)).toHaveLength(2);
    expect(stratifiedSample([1, 2], 0, () => 0)).toEqual([]);
  });
});

describe("stats and formatting", () => {
  it("counts the study streak ending today or yesterday", () => {
    const today = new Date(2026, 10, 26, 12);
    const day = (offset: number) => dayKey(new Date(2026, 10, 26 + offset));
    expect(studyStreak([day(0), day(-1), day(-2), day(-4)], today)).toBe(3);
    expect(studyStreak([day(-1), day(-2)], today)).toBe(2);
    expect(studyStreak([day(-3)], today)).toBe(0);
  });

  it("grades scores", () => {
    expect(scoreTone(5, 10)).toBe("low");
    expect(scoreTone(7, 10)).toBe("mid");
    expect(scoreTone(8, 10)).toBe("high");
    expect(scoreTone(0, 0)).toBe("low");
    expect(percent(1, 3)).toBe(33);
  });

  it("formats clocks and durations", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("00:00");
    expect(formatDuration(42)).toBe("42s");
    expect(formatDuration(7500)).toBe("2 orë 5 min");
  });
});
