import type { ThemeToken } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** Ionicon colored by a theme token (icons cannot take classNames). */
export function Icon({
  name,
  size = 20,
  token = "--foreground",
  opacity,
}: {
  name: IconName;
  size?: number;
  token?: ThemeToken;
  opacity?: number;
}) {
  const { color } = useAppTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color(token, opacity)}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
