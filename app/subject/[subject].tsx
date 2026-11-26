import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loading";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useQuery } from "@/hooks/useQuery";
import { useStartTest } from "@/hooks/useStartTest";
import { percent } from "@/lib/stats";
import { getTopicProgress, groupBySubject } from "@/services/db/progress";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Text, View } from "react-native";

export default function SubjectScreen() {
  const router = useRouter();
  const startTest = useStartTest();
  const { subject } = useLocalSearchParams<{ subject: string }>();
  const { data } = useQuery(
    (db) => groupBySubject(getTopicProgress(db)).find((s) => s.subject === subject) ?? null,
    [subject],
  );

  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen options={{ title: subject }} />
      <FlatList
        data={data.topics}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <View className="mb-2 gap-4">
            <Card className="gap-3">
              <View className="flex-row items-end justify-between">
                <Text className="text-3xl font-extrabold tabular-nums text-card-foreground">
                  {percent(data.mastered, data.total)}%
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {data.mastered} nga {data.total} të zotëruara
                </Text>
              </View>
              <ProgressBar value={data.mastered / data.total} />
            </Card>
            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                icon="timer-outline"
                title="Testo lëndën"
                onPress={() =>
                  startTest({
                    kind: "focus",
                    topicIds: data.topics.map((t) => t.id),
                    label: data.subject,
                  })
                }
              />
              <Button
                className="flex-1"
                variant="outline"
                icon="search"
                title="Kërko"
                onPress={() => router.push("/search")}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Card
            onPress={() =>
              router.push({ pathname: "/topic/[id]", params: { id: String(item.id) } })
            }
            className="gap-2.5"
          >
            <View className="flex-row items-center gap-3">
              <Text className="flex-1 text-base font-semibold text-card-foreground">
                {item.title}
              </Text>
              <Icon name="chevron-forward" size={18} token="--muted-foreground" />
            </View>
            <ProgressBar value={item.mastered / item.total} />
            <Text className="text-xs text-muted-foreground">
              {item.total} pyetje · {item.seen} të para · {percent(item.mastered, item.total)}% të
              zotëruara
            </Text>
          </Card>
        )}
      />
    </>
  );
}
