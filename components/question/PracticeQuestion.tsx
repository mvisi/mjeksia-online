import { haptics } from "@/lib/haptics";
import type { QuestionWithTopic } from "@/services/db/content";
import { useDb } from "@/services/db/DatabaseProvider";
import type { OptionLetter } from "@/services/db/schema";
import { recordPracticeAnswer } from "@/services/db/sessions";
import { useEffect, useRef, useState } from "react";
import { QuestionView } from "./QuestionView";

/**
 * One practice question: the first tap is final, reveals the answer and is
 * saved to history (so practice counts towards progress and mistakes).
 * Key it by question id to reset between questions.
 */
export function PracticeQuestion({
  question,
  source,
  meta,
  onAnswered,
}: {
  question: QuestionWithTopic;
  source: "arena" | "bank";
  meta?: string;
  onAnswered?: (correct: boolean) => void;
}) {
  const db = useDb();
  const shownAt = useRef(0);
  const [selected, setSelected] = useState<OptionLetter | null>(null);

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const select = (letter: OptionLetter) => {
    if (selected) return;
    const correct = letter === question.answer;
    setSelected(letter);
    if (correct) haptics.success();
    else haptics.error();
    recordPracticeAnswer(db, {
      questionId: question.id,
      selected: letter,
      correctOption: question.answer,
      source,
      secondsSpent: (Date.now() - shownAt.current) / 1000,
    });
    onAnswered?.(correct);
  };

  return (
    <QuestionView
      question={question}
      selected={selected}
      revealed={selected !== null}
      onSelect={select}
      meta={meta}
    />
  );
}
