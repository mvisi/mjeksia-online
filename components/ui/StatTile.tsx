import type { ThemeToken } from "@/constants/theme";
import { cn } from "@/lib/utils";
import { Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";

export function StatTile({
  value,
  label,
  icon,
  token = "--primary",
  className,
}: {
  value: string;
  label: string;
  icon?: IconName;
  token?: ThemeToken;
  className?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className={cn("flex-1 rounded-2xl border border-border bg-card p-4", className)}
    >
      {icon ? (
        <View className="mb-2">
          <Icon name={icon} size={18} token={token} />
        </View>
      ) : null}
      <Text className="text-2xl font-bold text-foreground" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
