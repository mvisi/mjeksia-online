import { useAppTheme } from "@/hooks/useAppTheme";
import { ActivityIndicator, Text, View } from "react-native";

export function Loading({ label }: { label?: string }) {
  const { color } = useAppTheme();
  return (
    <View className="flex-1 items-center justify-center bg-background p-8">
      <ActivityIndicator size="large" color={color("--primary")} />
      {label ? <Text className="mt-4 text-muted-foreground">{label}</Text> : null}
    </View>
  );
}
