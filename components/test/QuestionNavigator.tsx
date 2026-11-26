import { Button } from "@/components/ui/Button";
import type { QuestionMark } from "@/lib/test-engine";
import { cn } from "@/lib/utils";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const markStyle: Record<QuestionMark, { box: string; text: string; label: string }> = {
  current: { box: "border-primary bg-card", text: "text-foreground", label: "aktuale" },
  answered: {
    box: "border-primary bg-primary",
    text: "text-primary-foreground",
    label: "e përgjigjur",
  },
  flagged: { box: "border-warning bg-warning/20", text: "text-foreground", label: "e shënuar" },
  empty: { box: "border-border bg-card", text: "text-muted-foreground", label: "pa përgjigje" },
  correct: { box: "border-success bg-success/20", text: "text-foreground", label: "e saktë" },
  wrong: {
    box: "border-destructive bg-destructive/20",
    text: "text-foreground",
    label: "e gabuar",
  },
  skipped: { box: "border-border bg-muted", text: "text-muted-foreground", label: "e kapërcyer" },
};

function Legend({ marks }: { marks: QuestionMark[] }) {
  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-2">
      {marks.map((mark) => (
        <View key={mark} className="flex-row items-center gap-1.5">
          <View className={cn("h-3.5 w-3.5 rounded border-2", markStyle[mark].box)} />
          <Text className="text-xs text-muted-foreground">{markStyle[mark].label}</Text>
        </View>
      ))}
    </View>
  );
}

export function QuestionNavigator({
  visible,
  marks,
  current,
  reviewing,
  onSelect,
  onClose,
  onFinish,
  onNextUnanswered,
}: {
  visible: boolean;
  marks: QuestionMark[];
  current: number;
  reviewing: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
  onFinish?: () => void;
  onNextUnanswered?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Mbyll" className="flex-1 bg-black/50" onPress={onClose} />
      <View
        className="max-h-[75%] rounded-t-3xl border-t border-border bg-background px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-muted" />
        <Text accessibilityRole="header" className="mb-3 text-lg font-bold text-foreground">
          Të gjitha pyetjet
        </Text>
        <Legend
          marks={reviewing ? ["correct", "wrong", "skipped"] : ["answered", "flagged", "empty"]}
        />
        <ScrollView className="mt-4" contentContainerClassName="flex-row flex-wrap gap-2 pb-4">
          {marks.map((mark, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Pyetja ${i + 1}, ${markStyle[mark].label}`}
              accessibilityState={{ selected: i === current }}
              onPress={() => onSelect(i)}
              className={cn(
                "h-11 w-11 items-center justify-center rounded-xl border-2 active:opacity-70",
                markStyle[mark].box,
                i === current && "border-foreground",
              )}
            >
              <Text className={cn("font-semibold tabular-nums", markStyle[mark].text)}>
                {i + 1}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {!reviewing ? (
          <View className="flex-row gap-2">
            {onNextUnanswered ? (
              <Button
                className="flex-1"
                variant="outline"
                title="Pa përgjigje"
                icon="arrow-forward"
                iconPosition="right"
                onPress={onNextUnanswered}
              />
            ) : null}
            {onFinish ? (
              <Button className="flex-1" title="Përfundo testin" onPress={onFinish} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
