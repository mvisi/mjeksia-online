import { QuestionView } from "@/components/question/QuestionView";
import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useCountdown } from "@/hooks/useCountdown";
import { formatClock } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { KIND_LABEL } from "@/lib/labels";
import {
  engineReducer,
  initEngine,
  nextUnanswered,
  questionMarks,
  summarize,
  type EngineAction,
} from "@/lib/test-engine";
import { cn } from "@/lib/utils";
import { useDb } from "@/services/db/DatabaseProvider";
import type { OptionLetter } from "@/services/db/schema";
import {
  addTimeSpent,
  answerInSession,
  finishSession,
  pauseSession,
  setCurrentIndex,
  setFlag,
  type FinishStatus,
  type SessionDetail,
} from "@/services/db/sessions";
import { Stack, useNavigation, usePreventRemove, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuestionNavigator } from "./QuestionNavigator";

const LOW_TIME_SECONDS = 60;

function TimerBadge({ seconds }: { seconds: number }) {
  const low = seconds <= LOW_TIME_SECONDS;
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`Koha e mbetur ${formatClock(seconds)}`}
      className={cn(
        "flex-row items-center gap-1.5 rounded-full px-3 py-1.5",
        low ? "bg-destructive/15" : "bg-muted",
      )}
    >
      <Icon name="time-outline" size={16} token={low ? "--destructive" : "--muted-foreground"} />
      <Text className={cn("font-bold tabular-nums", low ? "text-destructive" : "text-foreground")}>
        {formatClock(seconds)}
      </Text>
    </View>
  );
}

/**
 * Runs a test (or reviews a finished one). The route starts the clock when it
 * loads the session, so `detail.endsAt` is the deadline of a running test. Every action is written to the DB
 * immediately, so leaving, a crash or a closed app never loses answers.
 */
export function TestRunner({
  detail,
  initialIndex,
}: {
  detail: SessionDetail;
  initialIndex?: number;
}) {
  const db = useDb();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const sessionId = detail.id;
  const reviewing = detail.status !== "in_progress";

  const [state, dispatch] = useReducer(
    engineReducer,
    { items: detail.items, index: initialIndex ?? detail.currentIndex },
    initEngine,
  );
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [finished, setFinished] = useState<FinishStatus | null>(null);
  const deadline = reviewing ? null : (detail.endsAt?.getTime() ?? null);
  const enteredAt = useRef(0);

  const summary = summarize(state);
  const item = detail.items[state.index];

  useEffect(() => {
    enteredAt.current = Date.now();
  }, []);

  /** Credits the time on the current question to it. */
  const flushTime = () => {
    if (reviewing) return;
    const now = Date.now();
    addTimeSpent(db, sessionId, state.index, (now - enteredAt.current) / 1000);
    enteredAt.current = now;
  };

  // Time spent in other apps is not time spent on the question.
  const onAppStateChange = useEffectEvent((next: string) => {
    if (next === "active") enteredAt.current = Date.now();
    else flushTime();
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  const finish = (status: FinishStatus) => {
    flushTime();
    finishSession(db, sessionId, status);
    setNavigatorOpen(false);
    setFinished(status);
  };

  // Navigate after the leave guard below has been switched off.
  useEffect(() => {
    if (!finished) return;
    router.replace({
      pathname: "/results/[id]",
      params: { id: String(sessionId), ...(finished === "timed_out" ? { timedOut: "1" } : {}) },
    });
  }, [finished, router, sessionId]);

  const secondsLeft = useCountdown(deadline, {
    onExpire: () => {
      if (reviewing || finished) return;
      haptics.warning();
      finish("timed_out");
    },
    onTick: (left) => {
      if (left <= 5) haptics.impact();
    },
  });

  usePreventRemove(!reviewing && !finished, ({ data }) => {
    Alert.alert("Po del nga testi", "Përgjigjet ruhen. Mund ta vazhdosh më vonë nga kryefaqja.", [
      { text: "Qëndro", style: "cancel" },
      { text: "Përfundo", style: "destructive", onPress: () => finish("completed") },
      {
        text: "Vazhdo më vonë",
        onPress: () => {
          flushTime();
          pauseSession(db, sessionId);
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const navigate = (action: EngineAction) => {
    const next = engineReducer(state, action);
    if (next.index === state.index) return;
    flushTime();
    dispatch(action);
    if (!reviewing) setCurrentIndex(db, sessionId, next.index);
  };

  const select = (letter: OptionLetter) => {
    haptics.select();
    dispatch({ type: "select", letter });
    answerInSession(db, sessionId, state.index, letter);
  };

  const clear = () => {
    dispatch({ type: "clear" });
    answerInSession(db, sessionId, state.index, null);
  };

  const toggleFlag = () => {
    haptics.select();
    dispatch({ type: "toggle-flag" });
    setFlag(db, sessionId, state.index, !state.flags[state.index]);
  };

  const confirmFinish = () => {
    const lines = [
      summary.unanswered > 0
        ? `${summary.unanswered} pyetje janë pa përgjigje.`
        : "Iu përgjigje të gjitha pyetjeve.",
      summary.flagged > 0 ? `${summary.flagged} pyetje janë të shënuara për rishikim.` : null,
    ].filter(Boolean);
    Alert.alert("Përfundo testin?", lines.join("\n"), [
      { text: "Anulo", style: "cancel" },
      { text: "Përfundo", onPress: () => finish("completed") },
    ]);
  };

  const title = detail.label
    ? `${KIND_LABEL[detail.kind]} · ${detail.label}`
    : KIND_LABEL[detail.kind];

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            reviewing ? (
              <Text className="font-semibold text-muted-foreground">Rishikim</Text>
            ) : (
              <TimerBadge seconds={deadline ? secondsLeft : detail.remainingSeconds} />
            ),
        }}
      />

      <View className="gap-2 px-4 pb-3 pt-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-foreground">
            Pyetja {state.index + 1}{" "}
            <Text className="font-normal text-muted-foreground">nga {summary.total}</Text>
          </Text>
          <Text className="text-sm text-muted-foreground">
            {reviewing ? `${summary.correct} të sakta` : `${summary.answered} të përgjigjura`}
          </Text>
        </View>
        <ProgressBar
          value={reviewing ? (state.index + 1) / summary.total : summary.answered / summary.total}
          label="Përparimi në test"
        />
      </View>

      <ScrollView
        key={state.index}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}
      >
        {item ? (
          <QuestionView
            question={item.question}
            selected={state.selections[state.index]}
            revealed={reviewing}
            onSelect={reviewing ? undefined : select}
          />
        ) : null}
        {!reviewing && state.selections[state.index] ? (
          <Pressable
            accessibilityRole="button"
            onPress={clear}
            className="mt-3 self-center rounded-lg px-3 py-2 active:bg-muted"
          >
            <Text className="text-muted-foreground">Pastro përgjigjen</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View
        className="flex-row items-center gap-2 border-t border-border bg-background px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <IconButton
          icon="arrow-back"
          label="Pyetja e mëparshme"
          disabled={state.index === 0}
          onPress={() => navigate({ type: "prev" })}
          className="border border-border"
        />
        <IconButton
          icon="grid-outline"
          label="Të gjitha pyetjet"
          onPress={() => setNavigatorOpen(true)}
          className="border border-border"
        />
        {!reviewing ? (
          <IconButton
            icon={state.flags[state.index] ? "flag" : "flag-outline"}
            label={state.flags[state.index] ? "Hiq shënimin" : "Shëno për rishikim"}
            token={state.flags[state.index] ? "--warning" : "--foreground"}
            active={state.flags[state.index]}
            onPress={toggleFlag}
            className="border border-border"
          />
        ) : null}
        <View className="flex-1">
          {summary.isLast ? (
            reviewing ? (
              <Button title="Rezultatet" icon="podium-outline" onPress={() => router.back()} />
            ) : (
              <Button title="Përfundo" icon="checkmark-done" onPress={confirmFinish} />
            )
          ) : (
            <Button
              title="Tjetra"
              icon="arrow-forward"
              iconPosition="right"
              variant={reviewing ? "secondary" : "primary"}
              onPress={() => navigate({ type: "next" })}
            />
          )}
        </View>
      </View>

      <QuestionNavigator
        visible={navigatorOpen}
        marks={questionMarks(state, reviewing).map((m, i) =>
          i === state.index && m === "empty" ? "current" : m,
        )}
        current={state.index}
        reviewing={reviewing}
        onClose={() => setNavigatorOpen(false)}
        onSelect={(index) => {
          setNavigatorOpen(false);
          navigate({ type: "go-to", index });
        }}
        onFinish={reviewing ? undefined : confirmFinish}
        onNextUnanswered={
          reviewing
            ? undefined
            : () => {
                const index = nextUnanswered(state);
                setNavigatorOpen(false);
                if (index !== null) navigate({ type: "go-to", index });
              }
        }
      />
    </View>
  );
}
