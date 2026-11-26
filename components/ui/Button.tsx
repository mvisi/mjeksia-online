import type { ThemeToken } from "@/constants/theme";
import { cn } from "@/lib/utils";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { useAppTheme } from "@/hooks/useAppTheme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";

const container: Record<Variant, string> = {
  primary: "bg-primary active:opacity-90",
  secondary: "bg-secondary active:opacity-80",
  outline: "border border-border bg-card active:bg-muted",
  ghost: "active:bg-muted",
  destructive: "bg-destructive active:opacity-90",
};

const label: Record<Variant, string> = {
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  destructive: "text-destructive-foreground",
};

const iconToken: Record<Variant, ThemeToken> = {
  primary: "--primary-foreground",
  secondary: "--secondary-foreground",
  outline: "--foreground",
  ghost: "--foreground",
  destructive: "--destructive-foreground",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  iconPosition = "left",
  disabled,
  loading,
  size = "md",
  className,
  accessibilityHint,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  accessibilityHint?: string;
}) {
  const { color } = useAppTheme();
  const iconEl = icon ? (
    <Icon name={icon} size={size === "sm" ? 16 : 20} token={iconToken[variant]} />
  ) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-xl",
        size === "sm" && "min-h-10 px-3 py-2",
        size === "md" && "min-h-12 px-4 py-3",
        size === "lg" && "min-h-14 px-5 py-4",
        container[variant],
        (disabled || loading) && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={color(iconToken[variant])} />
      ) : (
        <View className="flex-row items-center gap-2">
          {iconPosition === "left" && iconEl}
          <Text
            className={cn(
              "font-semibold",
              size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base",
              label[variant],
            )}
          >
            {title}
          </Text>
          {iconPosition === "right" && iconEl}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label: accessibilityLabel,
  onPress,
  token = "--foreground",
  active,
  className,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  token?: ThemeToken;
  active?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      hitSlop={8}
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "h-11 w-11 items-center justify-center rounded-full active:bg-muted",
        active && "bg-secondary",
        disabled && "opacity-40",
        className,
      )}
    >
      <Icon name={icon} size={22} token={token} />
    </Pressable>
  );
}
