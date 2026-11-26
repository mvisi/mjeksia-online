import { cn } from "@/lib/utils";
import { View } from "react-native";

export function ProgressBar({
  value,
  className,
  barClassName = "bg-primary",
  label,
}: {
  /** 0…1 */
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
    >
      <View className={cn("h-full rounded-full", barClassName)} style={{ width: `${pct}%` }} />
    </View>
  );
}
