import { useAppTheme } from "@/hooks/useAppTheme";
import { parseMarkdownTable } from "@/lib/markdown-table";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { RichText } from "./RichText";

const MIN_COL_WIDTH = 88;

export function MarkdownTable({
  content,
  className,
}: {
  content: string | null;
  className?: string;
}) {
  const { color } = useAppTheme();
  const [width, setWidth] = useState(0);
  const table = useMemo(() => (content ? parseMarkdownTable(content) : null), [content]);
  if (!table) return null;

  const { headers, rows, alignments } = table;
  const equal = width / headers.length;
  const needsScroll = width > 0 && equal < MIN_COL_WIDTH;
  const colWidth = needsScroll ? MIN_COL_WIDTH : equal;
  const align = { left: "items-start", center: "items-center", right: "items-end" } as const;

  const row = (cells: string[], header: boolean, index: number) => (
    <View
      key={header ? "h" : index}
      className={cn(
        "flex-row",
        header ? "bg-muted" : "border-t border-border",
        !header && index % 2 === 1 && "bg-muted/40",
      )}
    >
      {cells.map((cell, c) => (
        <View
          key={c}
          style={{ width: colWidth }}
          className={cn(
            "justify-center px-3 py-2",
            align[alignments[c] ?? "left"],
            c < cells.length - 1 && "border-r border-border",
          )}
        >
          <RichText
            inline
            text={cell || "—"}
            fontSize={14}
            color={color("--foreground")}
            className={header ? "font-semibold" : undefined}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View
      onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width) - 2)}
      className={cn("overflow-hidden rounded-xl border border-border", className)}
    >
      {width > 0 ? (
        <ScrollView
          horizontal
          scrollEnabled={needsScroll}
          showsHorizontalScrollIndicator={needsScroll}
        >
          <View>
            {row(headers, true, -1)}
            {rows.map((r, i) => row(r, false, i))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}
