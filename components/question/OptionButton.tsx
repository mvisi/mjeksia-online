import { Icon } from "@/components/ui/Icon";
import type { ThemeToken } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toPlainText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import type { OptionLetter } from "@/services/db/schema";
import { Pressable, Text, View } from "react-native";
import { RichText } from "./RichText";

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const styles: Record<
  OptionState,
  { box: string; badge: string; badgeText: string; token: ThemeToken }
> = {
  idle: {
    box: "border-border bg-card",
    badge: "bg-muted",
    badgeText: "text-muted-foreground",
    token: "--card-foreground",
  },
  selected: {
    box: "border-primary bg-primary/10",
    badge: "bg-primary",
    badgeText: "text-primary-foreground",
    token: "--foreground",
  },
  correct: {
    box: "border-success bg-success/10",
    badge: "bg-success",
    badgeText: "text-success-foreground",
    token: "--foreground",
  },
  wrong: {
    box: "border-destructive bg-destructive/10",
    badge: "bg-destructive",
    badgeText: "text-destructive-foreground",
    token: "--foreground",
  },
  dimmed: {
    box: "border-border bg-card opacity-60",
    badge: "bg-muted",
    badgeText: "text-muted-foreground",
    token: "--card-foreground",
  },
};

const stateLabel: Partial<Record<OptionState, string>> = {
  selected: "e zgjedhur",
  correct: "përgjigja e saktë",
  wrong: "përgjigje e gabuar",
};

export function OptionButton({
  letter,
  text,
  state,
  disabled,
  onPress,
}: {
  letter: OptionLetter;
  text: string;
  state: OptionState;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { color } = useAppTheme();
  const s = styles[state];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: state === "selected", disabled: !!disabled }}
      accessibilityLabel={`${letter}. ${toPlainText(text)}${stateLabel[state] ? `, ${stateLabel[state]}` : ""}`}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "min-h-14 flex-row items-center gap-3 rounded-2xl border-2 px-3 py-3 active:opacity-80",
        s.box,
      )}
    >
      <View className={cn("h-8 w-8 items-center justify-center rounded-full", s.badge)}>
        <Text className={cn("font-bold", s.badgeText)}>{letter}</Text>
      </View>
      <View className="flex-1">
        <RichText inline text={text} color={color(s.token)} fontSize={16} />
      </View>
      {state === "correct" ? <Icon name="checkmark-circle" size={22} token="--success" /> : null}
      {state === "wrong" ? <Icon name="close-circle" size={22} token="--destructive" /> : null}
    </Pressable>
  );
}
