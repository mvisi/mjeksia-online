import { QuestionRow } from "@/components/lists/QuestionRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useQuery } from "@/hooks/useQuery";
import { useStartTest } from "@/hooks/useStartTest";
import { MASTERY_STREAK } from "@/lib/stats";
import { getMistakes } from "@/services/db/progress";
import { useTestPlan } from "@/services/settings/settings";
import { useRouter } from "expo-router";
import { FlatList, Text, View } from "react-native";

export default function Mistakes() {
  const router = useRouter();
  const startTest = useStartTest();
  const plan = useTestPlan("focus");
  const { data: mistakes } = useQuery(getMistakes, []);

  if (!mistakes) return <Loading />;

  return (
    <FlatList
      className="flex-1 bg-background"
      data={mistakes}
      keyExtractor={(m) => String(m.questionId)}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListHeaderComponent={
        mistakes.length > 0 ? (
          <View className="mb-2 gap-3">
            <Text className="text-muted-foreground">
              {mistakes.length} pyetje ku ke gabuar. Një pyetje del nga lista pasi i përgjigjesh
              saktë {MASTERY_STREAK} herë radhazi, në çdo mënyrë praktike.
            </Text>
            <Button
              icon="play"
              title={`Testo ${Math.min(plan.questionCount, mistakes.length)} gabime`}
              onPress={() => startTest({ kind: "mistakes" })}
            />
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon="checkmark-circle-outline"
          title="Asnjë gabim për t'u përsëritur"
          message="Pyetjet ku gabon shfaqen këtu derisa t'i zotërosh."
        />
      }
      renderItem={({ item }) => (
        <QuestionRow
          text={item.questionText}
          caption={`${item.subject} · ${item.topicTitle}`}
          status="wrong"
          footer={
            <Text className="mt-1 text-sm text-muted-foreground">
              Zgjodhe {item.lastWrongOption}, e sakta {item.answer}
              {item.wrongCount > 1 ? ` · gabuar ${item.wrongCount} herë` : ""}
              {item.streak > 0 ? ` · ${item.streak}/${MASTERY_STREAK} të sakta` : ""}
            </Text>
          }
          onPress={() =>
            router.push({ pathname: "/question/[id]", params: { id: String(item.questionId) } })
          }
        />
      )}
    />
  );
}
