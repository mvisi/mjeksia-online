import { SessionRow } from "@/components/lists/SessionRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatTile } from "@/components/ui/StatTile";
import { TabScreen } from "@/components/ui/TabScreen";
import { SectionTitle } from "@/components/ui/Text";
import type { ThemeToken } from "@/constants/theme";
import { useQuery } from "@/hooks/useQuery";
import { useStartTest } from "@/hooks/useStartTest";
import { formatClock, formatDuration } from "@/lib/format";
import { KIND_LABEL, SUBJECT_ICON } from "@/lib/labels";
import { percent } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { getOverview, getTopicProgress, groupBySubject } from "@/services/db/progress";
import { getOpenSession, listFinishedSessions, secondsLeft } from "@/services/db/sessions";
import { answers } from "@/services/db/schema";
import { useTestPlan } from "@/services/settings/settings";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

function ResumeCard() {
  const router = useRouter();
  const { data } = useQuery((db) => {
    const session = getOpenSession(db);
    if (!session) return null;
    const [{ answered }] = db
      .select({ answered: count() })
      .from(answers)
      .where(and(eq(answers.sessionId, session.id), isNotNull(answers.selected)))
      .all();
    return { session, answered, left: secondsLeft(session, Date.now()) };
  }, []);

  if (!data) return null;
  const { session, answered, left } = data;
  return (
    <Card
      className="mb-6 gap-3 border-primary bg-primary/10"
      onPress={() => router.push({ pathname: "/test/[id]", params: { id: String(session.id) } })}
      accessibilityHint="Vazhdo testin e papërfunduar"
    >
      <View className="flex-row items-center gap-3">
        <Icon name="play-circle" size={28} token="--primary" />
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">Vazhdo testin</Text>
          <Text className="text-sm text-muted-foreground">
            {KIND_LABEL[session.kind]}
            {session.label ? ` · ${session.label}` : ""} · {formatClock(left)} të mbetura
          </Text>
        </View>
      </View>
      <ProgressBar value={answered / session.questionCount} label="Pyetje të përgjigjura" />
      <Text className="text-xs text-muted-foreground">
        {answered} nga {session.questionCount} pyetje të përgjigjura
      </Text>
    </Card>
  );
}

function ModeCard({
  icon,
  token,
  title,
  subtitle,
  onPress,
  primary,
}: {
  icon: IconName;
  token: ThemeToken;
  title: string;
  subtitle: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Card onPress={onPress} className={cn("flex-1 gap-3", primary && "border-primary bg-primary")}>
      <Icon name={icon} size={26} token={primary ? "--primary-foreground" : token} />
      <View>
        <Text
          className={cn(
            "text-base font-bold",
            primary ? "text-primary-foreground" : "text-card-foreground",
          )}
        >
          {title}
        </Text>
        <Text
          className={cn(
            "mt-0.5 text-sm",
            primary ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </Text>
      </View>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const startTest = useStartTest();
  const plan = useTestPlan("mock");
  const { data: overview } = useQuery(getOverview, []);
  const { data: subjects } = useQuery((db) => groupBySubject(getTopicProgress(db)), []);
  const { data: recent } = useQuery((db) => listFinishedSessions(db, 3), []);

  const subtitle = overview
    ? overview.streakDays > 0
      ? `🔥 ${overview.streakDays} ditë rresht · ${overview.answeredToday} pyetje sot`
      : overview.answered > 0
        ? `${overview.answeredToday} pyetje sot. Vazhdo kështu!`
        : "Fillo me disa pyetje të çfarëdoshme."
    : undefined;

  return (
    <TabScreen title="Mirë se erdhe" subtitle={subtitle}>
      <ResumeCard />

      <View className="mb-3 flex-row gap-3">
        <ModeCard
          primary
          icon="shuffle"
          token="--primary"
          title="Pyetje të çfarëdoshme"
          subtitle="Praktikë pa kohë"
          onPress={() => router.push("/arena")}
        />
        <ModeCard
          icon="timer-outline"
          token="--info"
          title="Model testi"
          subtitle={`${plan.questionCount} pyetje · ${formatDuration(plan.questionCount * plan.secondsPerQuestion)}`}
          onPress={() => startTest({ kind: "mock" })}
        />
      </View>
      {overview && overview.activeMistakes > 0 ? (
        <Card onPress={() => router.push("/mistakes")} className="mb-6 flex-row items-center gap-3">
          <Icon name="refresh-circle" size={26} token="--destructive" />
          <View className="flex-1">
            <Text className="text-base font-bold text-card-foreground">Rishiko gabimet</Text>
            <Text className="text-sm text-muted-foreground">
              {`${overview.activeMistakes} pyetje për t'i përsëritur`}
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} token="--muted-foreground" />
        </Card>
      ) : (
        <View className="mb-6" />
      )}

      {overview && overview.answered > 0 ? (
        <View className="mb-6">
          <SectionTitle>Statistikat</SectionTitle>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <StatTile
                icon="analytics"
                token="--primary"
                value={`${Math.round(overview.accuracy * 100)}%`}
                label="Saktësia"
              />
              <StatTile
                icon="checkmark-done"
                token="--success"
                value={String(overview.answered)}
                label="Pyetje të zgjidhura"
              />
            </View>
            <View className="flex-row gap-3">
              <StatTile
                icon="ribbon-outline"
                token="--warning"
                value={overview.finishedTests ? `${Math.round(overview.averageScore * 100)}%` : "—"}
                label="Mesatarja e testeve"
              />
              <StatTile
                icon="time-outline"
                token="--info"
                value={formatDuration(overview.studySeconds)}
                label="Koha e studimit"
              />
            </View>
          </View>
        </View>
      ) : null}

      {subjects ? (
        <View className="mb-6">
          <SectionTitle>Përparimi sipas lëndës</SectionTitle>
          <View className="gap-3">
            {subjects.map((s) => (
              <Card
                key={s.subject}
                onPress={() =>
                  router.push({ pathname: "/subject/[subject]", params: { subject: s.subject } })
                }
                className="gap-3"
              >
                <View className="flex-row items-center gap-3">
                  <Icon
                    name={SUBJECT_ICON[s.subject] ?? "book-outline"}
                    size={22}
                    token="--primary"
                  />
                  <Text className="flex-1 text-base font-semibold text-card-foreground">
                    {s.subject}
                  </Text>
                  <Text className="text-sm tabular-nums text-muted-foreground">
                    {percent(s.mastered, s.total)}%
                  </Text>
                </View>
                <ProgressBar value={s.mastered / s.total} label={`Përparimi në ${s.subject}`} />
                <Text className="text-xs text-muted-foreground">
                  {s.mastered} të zotëruara · {s.seen} të para · {s.total} gjithsej
                </Text>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      <SectionTitle
        action={
          recent?.length ? (
            <Button
              size="sm"
              variant="ghost"
              title="Të gjitha"
              onPress={() => router.push("/history")}
            />
          ) : undefined
        }
      >
        Testet e fundit
      </SectionTitle>
      {recent?.length ? (
        <View className="gap-3">
          {recent.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </View>
      ) : (
        <Text className="text-muted-foreground">
          Ende nuk ke bërë asnjë test. Provo një model testi kur të jesh gati.
        </Text>
      )}
    </TabScreen>
  );
}
