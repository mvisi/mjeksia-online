import { PracticeQuestion } from "@/components/question/PracticeQuestion";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useQuery } from "@/hooks/useQuery";
import { getAdjacentQuestionIds, getQuestion } from "@/services/db/content";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";

/** Question from the bank. Prev/next stay within its topic and replace the
 *  route params instead of stacking screens. */
export default function QuestionScreen() {
  const router = useRouter();
  const id = Number(useLocalSearchParams<{ id: string }>().id);

  const { data, isLoading } = useQuery(
    (db) => {
      const question = getQuestion(db, id);
      return question ? { question, ...getAdjacentQuestionIds(db, question) } : null;
    },
    [id],
    { live: false },
  );

  if (isLoading) return <Loading />;
  if (!data) return <EmptyState icon="help-circle-outline" title="Pyetja nuk u gjet" />;
  const { question, prevId, nextId } = data;

  const go = (target: number | null) => {
    if (target !== null) router.setParams({ id: String(target) });
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: `Pyetja ${question.subId}` }} />
      <ScrollView key={question.id} className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <PracticeQuestion question={question} source="bank" />
      </ScrollView>
      <BottomBar>
        <Button
          className="flex-1"
          variant="secondary"
          icon="arrow-back"
          title="Mëparshmja"
          disabled={prevId === null}
          onPress={() => go(prevId)}
        />
        <Button
          className="flex-1"
          variant="secondary"
          icon="arrow-forward"
          iconPosition="right"
          title={nextId === null ? "Mbyll" : "Tjetra"}
          onPress={() => (nextId === null ? router.back() : go(nextId))}
        />
      </BottomBar>
    </View>
  );
}
