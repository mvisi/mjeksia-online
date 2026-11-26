import { cn } from "@/lib/utils";
import { Pressable, Text } from "react-native";

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        "min-h-9 justify-center rounded-full border px-4 py-1.5 active:opacity-80",
        selected ? "border-primary bg-primary" : "border-border bg-card",
      )}
    >
      <Text className={cn("font-medium", selected ? "text-primary-foreground" : "text-foreground")}>
        {label}
      </Text>
    </Pressable>
  );
}
