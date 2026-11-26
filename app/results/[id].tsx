import { QuestionRow } from "@/components/lists/QuestionRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loading";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatTile } from "@/components/ui/StatTile";
import { SectionTitle } from "@/components/ui/Text";
import { useQuery } from "@/hooks/useQuery";
import { useStartTest } from "@/hooks/useStartTest";
import { formatDateTime, formatDuration } from "@/lib/format";
import { KIND_LABEL, STATUS_LABEL } from "@/lib/labels";
import { percent, scoreTone } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { useDb } from "@/services/db/DatabaseProvider";
import { deleteSession, getSessionDetail, type SessionDetail } from "@/services/db/sessions";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, FlatList, Text, View } from "react-native";

const toneText = { low: "text-destructive", mid: "text-warning", high: "text-success" } as const;

function topicBreakdown(detail: SessionDetail) {
  const topics = new Map<string, { title: string; correct: number; total: number }>();
  for (const item of detail.items) {
    const key = item.question.topicTitle;
    const entry = topics.get(key) ?? { title: key, correct: 0, total: 0 };
    entry.total++;
    if (item.isCorrect) entry.correct++;
    topics.set(key, entry);
  }
  return [...topics.values()].sort((a, b) => a.correct / a.total - b.correct / b.total);
}

function Summary({ detail, timedOut }: { detail: SessionDetail; timedOut: boolean }) {
  const router = useRouter();
  const startTest = useStartTest();
  const answered = detail.items.filter((i) => i.selected !== null).length;
  const wrong = answered - detail.score;
  const skipped = detail.items.length - answered;
  const pct = percent(detail.score, detail.questionCount);
  const used = detail.timeLimitSeconds - detail.remainingSeconds;
  const breakdown = topicBreakdown(detail);

  return (
    <View className="gap-6 pb-6">
      {timedOut ? (
        <View className="flex-row items-center gap-3 rounded-2xl bg-warning/15 p-4">
          <Icon name="alarm-outline" size={22} token="--warning" />
          <Text className="flex-1 font-medium text-foreground">
            Koha mbaroi. Testi u mbyll me përgjigjet që kishe dhënë.
          </Text>
        </View>
      ) : null}

      <Card className="items-center gap-1 py-6">
        <Text className="text-sm font-medium text-muted-foreground">
          {KIND_LABEL[detail.kind]}
          {detail.label ? ` · ${detail.label}` : ""}
        </Text>
        <Text
          className={cn(
            "text-6xl font-extrabold tabular-nums",
            toneText[scoreTone(detail.score, detail.questionCount)],
          )}
        >
          {pct}%
        </Text>
        <Text className="text-lg font-semibold text-foreground">
          {detail.score} nga {detail.questionCount} të sakta
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          {STATUS_LABEL[detail.status]} · {formatDateTime(detail.createdAt)} ·{" "}
          {formatDuration(used)}
        </Text>
      </Card>

      <View className="flex-row gap-3">
        <StatTile
          value={String(detail.score)}
          label="Të sakta"
          icon="checkmark-circle"
          token="--success"
        />
        <StatTile
          value={String(wrong)}
          label="Të gabuara"
          icon="close-circle"
          token="--destructive"
        />
        <StatTile
          value={String(skipped)}
          label="Pa përgjigje"
          icon="remove-circle"
          token="--muted-foreground"
        />
      </View>

      <View className="gap-3">
        <Button
          title="Rishiko përgjigjet"
          icon="eye-outline"
          onPress={() =>
            router.push({ pathname: "/test/[id]", params: { id: String(detail.id), index: "0" } })
          }
        />
        <View className="flex-row gap-3">
          {wrong + skipped > 0 ? (
            <Button
              className="flex-1"
              variant="outline"
              title="Ritesto gabimet"
              icon="refresh"
              onPress={() =>
                startTest({
                  kind: "retest",
                  sessionId: detail.id,
                  onlyMissed: true,
                  label: detail.label,
                })
              }
            />
          ) : null}
          <Button
            className="flex-1"
            variant="outline"
            title="Ritesto të gjitha"
            icon="repeat"
            onPress={() =>
              startTest({
                kind: "retest",
                sessionId: detail.id,
                onlyMissed: false,
                label: detail.label,
              })
            }
          />
        </View>
      </View>

      {breakdown.length > 1 ? (
        <View>
          <SectionTitle>Sipas temës</SectionTitle>
          <Card className="gap-4">
            {breakdown.map((t) => (
              <View key={t.title} className="gap-1.5">
                <View className="flex-row justify-between gap-2">
                  <Text className="flex-1 text-sm text-card-foreground" numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text className="text-sm font-semibold tabular-nums text-card-foreground">
                    {t.correct}/{t.total}
                  </Text>
                </View>
                <ProgressBar
                  value={t.correct / t.total}
                  barClassName={
                    { low: "bg-destructive", mid: "bg-warning", high: "bg-success" }[
                      scoreTone(t.correct, t.total)
                    ]
                  }
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <SectionTitle className="mb-0">Pyetjet</SectionTitle>
    </View>
  );
}

export default function ResultsScreen() {
  const db = useDb();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; timedOut?: string }>();
  const sessionId = Number(params.id);
  const { data: detail, isLoading } = useQuery(
    (db) => getSessionDetail(db, sessionId),
    [sessionId],
  );

  if (isLoading) return <Loading />;
  if (!detail) return <EmptyState icon="alert-circle-outline" title="Testi nuk u gjet" />;

  const confirmDelete = () =>
    Alert.alert("Fshi testin?", "Testi dhe përgjigjet e tij fshihen nga historia.", [
      { text: "Anulo", style: "cancel" },
      {
        text: "Fshi",
        style: "destructive",
        onPress: () => {
          router.back();
          deleteSession(db, sessionId);
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Text
              onPress={confirmDelete}
              accessibilityRole="button"
              className="px-2 font-semibold text-destructive"
            >
              Fshi
            </Text>
          ),
        }}
      />
      <FlatList
        data={detail.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={<Summary detail={detail} timedOut={params.timedOut === "1"} />}
        renderItem={({ item, index }) => {
          const status = item.selected === null ? "skipped" : item.isCorrect ? "correct" : "wrong";
          return (
            <QuestionRow
              number={index + 1}
              status={status}
              text={item.question.questionText}
              caption={item.question.topicTitle}
              footer={
                <Text className="mt-1 text-sm text-muted-foreground">
                  {item.selected === null ? "Pa përgjigje" : `Zgjodhe ${item.selected}`}
                  {item.isCorrect ? " ✓" : ` · E sakta: ${item.correctOption}`}
                </Text>
              }
              onPress={() =>
                router.push({
                  pathname: "/test/[id]",
                  params: { id: String(detail.id), index: String(index) },
                })
              }
            />
          );
        }}
      />
    </>
  );
}
