import { PracticeQuestion } from "@/components/question/PracticeQuestion";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useQuery } from "@/hooks/useQuery";
import { getQuestion, getTopics } from "@/services/db/content";
import { getPracticeQuestionId } from "@/services/db/progress";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

type Score = { answered: number; correct: number; streak: number };

export default function Arena() {
  const params = useLocalSearchParams<{ topicId?: string }>();
  const fixedTopic = params.topicId ? Number(params.topicId) : null;

  const [subject, setSubject] = useState<string | null>(null);
  const [seen, setSeen] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState<Score>({ answered: 0, correct: 0, streak: 0 });

  const { data: topics } = useQuery(getTopics, [], { live: false });
  const subjects = [...new Set(topics?.map((t) => t.subject))];
  const topicIds = fixedTopic
    ? [fixedTopic]
    : subject
      ? topics?.filter((t) => t.subject === subject).map((t) => t.id)
      : undefined;

  // New question per round / filter; not re-run when answers are saved.
  const { data: question, isLoading } = useQuery(
    (db) => {
      const id = getPracticeQuestionId(db, { topicIds, excludeIds: seen.slice(-200) });
      return id === null ? null : getQuestion(db, id);
    },
    [round, subject, fixedTopic, topics === undefined],
    { live: false },
  );

  const next = () => {
    if (question) setSeen((s) => [...s, question.id]);
    setAnswered(false);
    setRound((r) => r + 1);
  };

  const fixedTitle = fixedTopic ? topics?.find((t) => t.id === fixedTopic)?.title : undefined;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: fixedTitle ?? "Pyetje të çfarëdoshme" }} />

      <View className="gap-3 px-4 pb-3">
        {!fixedTopic ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            <Chip
              label="Të gjitha"
              selected={subject === null}
              onPress={() => {
                setSubject(null);
                setAnswered(false);
              }}
            />
            {subjects.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={subject === s}
                onPress={() => {
                  setSubject(s);
                  setAnswered(false);
                }}
              />
            ))}
          </ScrollView>
        ) : null}
        <Text className="text-sm text-muted-foreground" accessibilityLiveRegion="polite">
          {score.answered === 0
            ? "Zgjidh një përgjigje për të parë shpjegimin."
            : `${score.correct}/${score.answered} të sakta në këtë seancë${score.streak >= 3 ? ` · 🔥 ${score.streak} radhazi` : ""}`}
        </Text>
      </View>

      {isLoading ? (
        <Loading />
      ) : !question ? (
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="Nuk ka më pyetje këtu"
          message="Provo një lëndë tjetër."
        />
      ) : (
        <ScrollView
          key={question.id}
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        >
          <PracticeQuestion
            question={question}
            source="arena"
            meta={`Pyetja ${question.subId}`}
            onAnswered={(correct) => {
              setAnswered(true);
              setScore((s) => ({
                answered: s.answered + 1,
                correct: s.correct + (correct ? 1 : 0),
                streak: correct ? s.streak + 1 : 0,
              }));
            }}
          />
        </ScrollView>
      )}

      <BottomBar>
        <Button
          className="flex-1"
          variant={answered ? "primary" : "secondary"}
          title={answered ? "Pyetja tjetër" : "Kapërce"}
          icon="arrow-forward"
          iconPosition="right"
          onPress={next}
          disabled={!question}
        />
      </BottomBar>
    </View>
  );
}
