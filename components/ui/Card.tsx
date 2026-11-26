import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

export function Card({
  children,
  onPress,
  onLongPress,
  className,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const base = cn("rounded-2xl border border-border bg-card p-4", className);
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      className={cn(base, "active:opacity-80")}
    >
      {children}
    </Pressable>
  );
}
