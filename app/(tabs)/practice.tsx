import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TabScreen } from "@/components/ui/TabScreen";
import { SectionTitle } from "@/components/ui/Text";
import { useQuery } from "@/hooks/useQuery";
import { useStartTest } from "@/hooks/useStartTest";
import { formatDuration } from "@/lib/format";
import { SUBJECT_ICON } from "@/lib/labels";
import { percent } from "@/lib/stats";
import { getOverview, getTopicProgress, groupBySubject } from "@/services/db/progress";
import { useTestPlan } from "@/services/settings/settings";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

function Row({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
        <Icon name={icon} size={20} token="--secondary-foreground" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-card-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground">{subtitle}</Text>
      </View>
      <Icon name="chevron-forward" size={18} token="--muted-foreground" />
    </Card>
  );
}

export default function Practice() {
  const router = useRouter();
  const startTest = useStartTest();
  const plan = useTestPlan("mock");
  const { data: subjects } = useQuery((db) => groupBySubject(getTopicProgress(db)), []);
  const { data: overview } = useQuery(getOverview, []);
  const total = subjects?.reduce((n, s) => n + s.total, 0);

  return (
    <TabScreen title="Praktiko" subtitle={total ? `${total} pyetje nga fondi zyrtar` : undefined}>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Kërko pyetje"
        onPress={() => router.push("/search")}
        className="mb-6 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 active:opacity-80"
      >
        <Icon name="search" size={18} token="--muted-foreground" />
        <Text className="text-base text-muted-foreground">Kërko në pyetje dhe përgjigje…</Text>
      </Pressable>

      <SectionTitle>Mënyrat</SectionTitle>
      <View className="mb-6 gap-3">
        <Row
          icon="shuffle"
          title="Pyetje të çfarëdoshme"
          subtitle="Një nga një, me shpjegim menjëherë"
          onPress={() => router.push("/arena")}
        />
        <Row
          icon="timer-outline"
          title="Model testi"
          subtitle={`${plan.questionCount} pyetje nga të gjitha temat · ${formatDuration(plan.questionCount * plan.secondsPerQuestion)}`}
          onPress={() => startTest({ kind: "mock" })}
        />
        <Row
          icon="refresh-circle-outline"
          title="Gabimet e mia"
          subtitle={
            overview?.activeMistakes
              ? `${overview.activeMistakes} pyetje për t'u përsëritur`
              : "Asnjë gabim për momentin"
          }
          onPress={() => router.push("/mistakes")}
        />
      </View>

      <SectionTitle>Lëndët</SectionTitle>
      <View className="gap-3">
        {subjects?.map((s) => (
          <Card
            key={s.subject}
            onPress={() =>
              router.push({ pathname: "/subject/[subject]", params: { subject: s.subject } })
            }
            className="gap-3"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <Icon
                  name={SUBJECT_ICON[s.subject] ?? "book-outline"}
                  size={22}
                  token="--secondary-foreground"
                />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-card-foreground">{s.subject}</Text>
                <Text className="text-sm text-muted-foreground">
                  {s.topics.length} tema · {s.total} pyetje
                </Text>
              </View>
              <Text className="text-sm font-semibold tabular-nums text-muted-foreground">
                {percent(s.mastered, s.total)}%
              </Text>
            </View>
            <ProgressBar value={s.mastered / s.total} />
          </Card>
        ))}
      </View>
    </TabScreen>
  );
}
