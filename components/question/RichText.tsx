import { assembleSvg, glyphPath } from "@/lib/math-svg";
import { parseBlocks, parseInline, texToPlain, type Block, type Inline } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import type { Db } from "@/services/db/client";
import { getMathSvgs, type MathSvg } from "@/services/db/content";
import { useDb } from "@/services/db/DatabaseProvider";
import { useMemo, useState } from "react";
import { ScrollView, Text, View, type LayoutChangeEvent } from "react-native";
import { SvgXml } from "react-native-svg";

/** MathJax sizes are in ex; one ex is roughly half the font size. */
const EX_RATIO = 0.5;

// Formulas never change at runtime, so they are cached for the app's lifetime.
const svgCache = new Map<string, MathSvg | null>();

/**
 * Loads formulas synchronously (expo-sqlite reads are synchronous JSI calls),
 * so math renders in the first frame instead of flashing placeholders.
 */
function loadSvgs(db: Db, texList: string[]) {
  const missing = texList.filter((tex) => !svgCache.has(tex));
  if (missing.length > 0) {
    try {
      const { rows, glyphs } = getMathSvgs(db, missing);
      for (const row of rows) {
        const paths = row.glyphIds
          .split(" ")
          .filter(Boolean)
          .map((id) => glyphPath(id, glyphs.get(id) ?? ""));
        svgCache.set(row.tex, {
          xml: assembleSvg(row.body, paths),
          width: row.width,
          height: row.height,
          verticalAlign: row.verticalAlign,
        });
      }
    } catch (error) {
      console.error("Failed to load formulas", error);
    }
    for (const tex of missing) if (!svgCache.has(tex)) svgCache.set(tex, null);
  }
  return new Map(texList.map((tex) => [tex, svgCache.get(tex) ?? null]));
}

function texOf(blocks: Block[]) {
  return blocks.flatMap((b) =>
    b.type === "display-math"
      ? [b.tex]
      : b.content.flatMap((i) => (i.type === "math" ? [i.tex] : [])),
  );
}

type Style = { color: string; fontSize: number };

function InlineMath({
  svg,
  tex,
  style,
  bold,
}: {
  svg: MathSvg | null;
  tex: string;
  style: Style;
  bold: boolean;
}) {
  if (!svg) {
    // Should not happen (the build checks every formula); stay readable anyway.
    return (
      <Text style={{ fontStyle: "italic", fontWeight: bold ? "700" : undefined }}>
        {texToPlain(tex)}
      </Text>
    );
  }
  const scale = style.fontSize * EX_RATIO;
  const shift = -svg.verticalAlign * scale;
  return (
    <SvgXml
      xml={svg.xml}
      width={svg.width * scale}
      height={svg.height * scale}
      color={style.color}
      accessibilityLabel={texToPlain(tex)}
      style={{ transform: [{ translateY: shift }] }}
    />
  );
}

function InlineRun({
  content,
  svgs,
  style,
}: {
  content: Inline[];
  svgs: Map<string, MathSvg | null>;
  style: Style;
}) {
  return content.map((part, i) =>
    part.type === "text" ? (
      <Text key={i} style={part.bold ? { fontWeight: "700" } : undefined}>
        {part.text}
      </Text>
    ) : (
      <InlineMath
        key={i}
        svg={svgs.get(part.tex) ?? null}
        tex={part.tex}
        style={style}
        bold={part.bold}
      />
    ),
  );
}

/**
 * Wraps content in a horizontal scroller only when a formula is wider than
 * the space available, instead of making every text a ScrollView.
 */
function Overflow({
  contentWidth,
  available,
  children,
}: {
  contentWidth: number;
  available: number;
  children: React.ReactNode;
}) {
  if (available === 0 || contentWidth <= available) return children;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
      <View style={{ width: contentWidth }}>{children}</View>
    </ScrollView>
  );
}

export function RichText({
  text,
  color,
  fontSize = 16,
  className,
  inline = false,
}: {
  text: string;
  color: string;
  fontSize?: number;
  /** Tailwind classes for the text (weight, line height…). */
  className?: string;
  /** Single run of text (options, table cells): no paragraphs or lists. */
  inline?: boolean;
}) {
  const db = useDb();
  const [available, setAvailable] = useState(0);
  const blocks = useMemo<Block[]>(
    () => (inline ? [{ type: "paragraph", content: parseInline(text) }] : parseBlocks(text)),
    [text, inline],
  );
  const svgs = useMemo(() => loadSvgs(db, texOf(blocks)), [db, blocks]);
  const style: Style = { color, fontSize };
  const scale = fontSize * EX_RATIO;

  const onLayout = (e: LayoutChangeEvent) => {
    const width = Math.floor(e.nativeEvent.layout.width);
    if (width !== available) setAvailable(width);
  };

  const widest = (content: Inline[]) =>
    Math.max(
      0,
      ...content.map((p) => (p.type === "math" ? (svgs.get(p.tex)?.width ?? 0) * scale : 0)),
    );

  return (
    <View onLayout={onLayout} className={inline ? undefined : "gap-2"}>
      {blocks.map((block, i) => {
        if (block.type === "display-math") {
          const svg = svgs.get(block.tex) ?? null;
          return (
            <Overflow key={i} contentWidth={(svg?.width ?? 0) * scale} available={available}>
              <View className="items-center py-1">
                <Text style={style}>
                  <InlineMath svg={svg} tex={block.tex} style={style} bold={false} />
                </Text>
              </View>
            </Overflow>
          );
        }

        const run = (
          <Text className={className} style={style}>
            <InlineRun content={block.content} svgs={svgs} style={style} />
          </Text>
        );

        if (block.type === "list-item") {
          return (
            <View key={i} className="flex-row" style={{ paddingLeft: block.depth * 16 }}>
              <Text className={cn("w-7", className)} style={style}>
                {block.marker}
              </Text>
              <View className="flex-1">
                <Overflow contentWidth={widest(block.content)} available={available - 28}>
                  {run}
                </Overflow>
              </View>
            </View>
          );
        }

        return (
          <Overflow key={i} contentWidth={widest(block.content)} available={available}>
            {run}
          </Overflow>
        );
      })}
    </View>
  );
}
