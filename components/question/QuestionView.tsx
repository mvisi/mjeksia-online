import { useAppTheme } from "@/hooks/useAppTheme";
import type { QuestionWithTopic } from "@/services/db/content";
import { OPTION_LETTERS, optionText, type OptionLetter } from "@/services/db/schema";
import { Text, View } from "react-native";
import { Explanation } from "./Explanation";
import { MarkdownTable } from "./MarkdownTable";
import { OptionButton, type OptionState } from "./OptionButton";
import { QuestionImage } from "./QuestionImage";
import { RichText } from "./RichText";

/**
 * A question with its options. `revealed` shows right/wrong and the
 * explanation; before that, the selection is shown neutrally (tests let you
 * change your mind).
 */
export function QuestionView({
  question,
  selected,
  revealed,
  onSelect,
  meta,
}: {
  question: QuestionWithTopic;
  selected: OptionLetter | null;
  revealed: boolean;
  onSelect?: (letter: OptionLetter) => void;
  /** Small line above the question, e.g. "Pyetja 3 nga 50". */
  meta?: string;
}) {
  const { color } = useAppTheme();

  const stateOf = (letter: OptionLetter): OptionState => {
    if (!revealed) return selected === letter ? "selected" : "idle";
    if (letter === question.answer) return "correct";
    if (letter === selected) return "wrong";
    return "dimmed";
  };

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="text-sm font-medium text-muted-foreground">
          {meta ? `${meta} · ` : ""}
          {question.topicTitle}
        </Text>
        <RichText
          text={question.questionText}
          color={color("--foreground")}
          fontSize={18}
          className="font-medium leading-7"
        />
      </View>

      <MarkdownTable content={question.tableContent} />
      <QuestionImage imageKey={question.image} />

      <View accessibilityRole="radiogroup" className="gap-3">
        {OPTION_LETTERS.map((letter) => (
          <OptionButton
            key={letter}
            letter={letter}
            text={optionText(question, letter)}
            state={stateOf(letter)}
            disabled={revealed || !onSelect}
            onPress={() => onSelect?.(letter)}
          />
        ))}
      </View>

      {revealed ? (
        <Explanation
          key={question.id}
          explanation={question.explanation}
          reasoning={question.reasoning}
        />
      ) : null}
    </View>
  );
}
