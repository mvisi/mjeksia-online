import { scoreTone } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Text, View } from "react-native";

const tone = {
  low: { box: "bg-destructive/15", text: "text-destructive" },
  mid: { box: "bg-warning/15", text: "text-warning" },
  high: { box: "bg-success/15", text: "text-success" },
} as const;

export function ScoreBadge({
  score,
  total,
  className,
}: {
  score: number;
  total: number;
  className?: string;
}) {
  const t = tone[scoreTone(score, total)];
  return (
    <View className={cn("rounded-xl px-3 py-1.5", t.box, className)}>
      <Text className={cn("font-bold tabular-nums", t.text)}>
        {score}/{total}
      </Text>
    </View>
  );
}
