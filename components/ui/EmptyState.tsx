import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon name={icon} size={30} token="--muted-foreground" />
      </View>
      <Text className="text-center text-lg font-bold text-foreground">{title}</Text>
      {message ? <Text className="mt-2 text-center text-muted-foreground">{message}</Text> : null}
      {action ? <View className="mt-6 w-full">{action}</View> : null}
    </View>
  );
}
