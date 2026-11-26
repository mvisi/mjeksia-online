import { Icon } from "@/components/ui/Icon";
import { toPlainText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";

/** Compact, plain-text preview of a question (formulas rendered as text). */
export function QuestionRow({
  number,
  text,
  caption,
  status,
  footer,
  onPress,
}: {
  number?: number | string;
  text: string;
  caption?: string;
  status?: "correct" | "wrong" | "skipped" | null;
  footer?: ReactNode;
  onPress: () => void;
}) {
  const preview = toPlainText(text);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${number !== undefined ? `Pyetja ${number}. ` : ""}${preview}`}
      onPress={onPress}
      className="flex-row gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-80"
    >
      {number !== undefined ? (
        <View
          className={cn(
            "h-8 w-8 items-center justify-center rounded-full",
            status === "correct" && "bg-success/15",
            status === "wrong" && "bg-destructive/15",
            (!status || status === "skipped") && "bg-muted",
          )}
        >
          <Text
            className={cn(
              "text-xs font-bold tabular-nums",
              status === "correct"
                ? "text-success"
                : status === "wrong"
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            {number}
          </Text>
        </View>
      ) : null}
      <View className="flex-1 gap-1">
        {caption ? (
          <Text className="text-xs font-medium text-muted-foreground">{caption}</Text>
        ) : null}
        <Text className="text-base text-card-foreground" numberOfLines={3}>
          {preview}
        </Text>
        {footer}
      </View>
      <View className="justify-center">
        <Icon name="chevron-forward" size={18} token="--muted-foreground" />
      </View>
    </Pressable>
  );
}
