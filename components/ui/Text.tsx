import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("mb-3 flex-row items-center justify-between", className)}>
      <Text accessibilityRole="header" className="text-lg font-bold text-foreground">
        {children}
      </Text>
      {action}
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-6">
      <Text
        accessibilityRole="header"
        className="text-3xl font-extrabold tracking-tight text-foreground"
      >
        {title}
      </Text>
      {subtitle ? <Text className="mt-1 text-base text-muted-foreground">{subtitle}</Text> : null}
    </View>
  );
}
