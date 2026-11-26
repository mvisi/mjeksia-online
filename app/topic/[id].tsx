import { QuestionRow } from "@/components/lists/QuestionRow";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { useQuery } from "@/hooks/useQuery";
import { useStartTest } from "@/hooks/useStartTest";
import { getTopic, getTopicQuestionList } from "@/services/db/content";
import { getQuestionStatuses } from "@/services/db/progress";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Text, View } from "react-native";

export default function TopicScreen() {
  const router = useRouter();
  const startTest = useStartTest();
  const topicId = Number(useLocalSearchParams<{ id: string }>().id);

  const { data } = useQuery(
    (db) => ({ topic: getTopic(db, topicId), questions: getTopicQuestionList(db, topicId) }),
    [topicId],
    { live: false },
  );
  const { data: statuses } = useQuery((db) => getQuestionStatuses(db, topicId), [topicId]);

  if (!data?.topic) return <Loading />;
  const { topic, questions } = data;

  return (
    <>
      <Stack.Screen options={{ title: topic.title }} />
      <FlatList
        data={questions}
        keyExtractor={(q) => String(q.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        initialNumToRender={12}
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <Text className="text-sm text-muted-foreground">
              {topic.subject} · {questions.length} pyetje · {statuses?.size ?? 0} të para
            </Text>
            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                icon="timer-outline"
                title="Fillo testin"
                onPress={() =>
                  startTest({ kind: "focus", topicIds: [topic.id], label: topic.title })
                }
              />
              <Button
                className="flex-1"
                variant="outline"
                icon="shuffle"
                title="Praktiko"
                onPress={() =>
                  router.push({ pathname: "/arena", params: { topicId: String(topic.id) } })
                }
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <QuestionRow
            number={item.subId}
            status={statuses?.get(item.id) ?? null}
            text={item.questionText}
            caption={
              [item.hasImage && "Imazh", item.hasTable && "Tabelë"].filter(Boolean).join(" · ") ||
              undefined
            }
            onPress={() =>
              router.push({ pathname: "/question/[id]", params: { id: String(item.id) } })
            }
          />
        )}
      />
    </>
  );
}
