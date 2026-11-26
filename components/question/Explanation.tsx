import { Icon } from "@/components/ui/Icon";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSetting } from "@/services/settings/settings";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RichText } from "./RichText";

/**
 * Short explanation first; the detailed reasoning is one tap away (or open by
 * default via settings). When explanations are hidden in settings the user
 * can still reveal them on demand.
 */
export function Explanation({
  explanation,
  reasoning,
}: {
  explanation: string;
  reasoning: string;
}) {
  const { color } = useAppTheme();
  const [hidden] = useSetting("hide_explanations");
  const [expandByDefault] = useSetting("expand_reasoning");
  const [revealed, setRevealed] = useState(!hidden);
  const [expanded, setExpanded] = useState(expandByDefault);

  if (!revealed) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setRevealed(true)}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-4 active:bg-muted"
      >
        <Icon name="bulb-outline" size={18} token="--muted-foreground" />
        <Text className="font-medium text-muted-foreground">Shfaq shpjegimin</Text>
      </Pressable>
    );
  }

  return (
    <View className="gap-3 rounded-2xl bg-secondary p-4">
      <View className="flex-row items-center gap-2">
        <Icon name="bulb" size={18} token="--secondary-foreground" />
        <Text accessibilityRole="header" className="font-bold text-secondary-foreground">
          {expanded ? "Arsyetimi" : "Shpjegimi"}
        </Text>
      </View>
      <RichText
        text={expanded ? reasoning : explanation}
        color={color("--secondary-foreground")}
        fontSize={15}
        className="leading-6"
      />
      {reasoning && reasoning !== explanation ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((e) => !e)}
          className="flex-row items-center gap-1 self-start rounded-lg py-1 active:opacity-60"
        >
          <Text className="font-semibold text-primary">
            {expanded ? "Shfaq shpjegimin e shkurtër" : "Shiko arsyetimin e plotë"}
          </Text>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} token="--primary" />
        </Pressable>
      ) : null}
    </View>
  );
}
