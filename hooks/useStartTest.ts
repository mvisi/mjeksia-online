import { useDb } from "@/services/db/DatabaseProvider";
import type { Db } from "@/services/db/client";
import {
  createSession,
  getOpenSession,
  pickMistakeQuestions,
  pickMockQuestions,
  pickRetestQuestions,
  pickTopicQuestions,
  type NewSession,
} from "@/services/db/sessions";
import { getTestPlan } from "@/services/settings/settings";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

type Plan =
  | { kind: "mock" }
  | { kind: "focus"; topicIds: number[]; label: string }
  | { kind: "mistakes" }
  | { kind: "retest"; sessionId: number; onlyMissed: boolean; label: string | null };

function buildSession(db: Db, plan: Plan): NewSession {
  switch (plan.kind) {
    case "mock": {
      const { questionCount, secondsPerQuestion } = getTestPlan("mock");
      const questionIds = pickMockQuestions(db, questionCount);
      return {
        kind: "mock",
        questionIds,
        timeLimitSeconds: questionIds.length * secondsPerQuestion,
      };
    }
    case "focus": {
      const { questionCount, secondsPerQuestion } = getTestPlan("focus");
      const questionIds = pickTopicQuestions(db, plan.topicIds, questionCount);
      return {
        kind: "focus",
        label: plan.label,
        questionIds,
        timeLimitSeconds: questionIds.length * secondsPerQuestion,
      };
    }
    case "mistakes": {
      const { questionCount, secondsPerQuestion } = getTestPlan("focus");
      const questionIds = pickMistakeQuestions(db, questionCount);
      return {
        kind: "mistakes",
        label: "Gabimet",
        questionIds,
        timeLimitSeconds: questionIds.length * secondsPerQuestion,
      };
    }
    case "retest": {
      const { secondsPerQuestion } = getTestPlan("mock");
      const questionIds = pickRetestQuestions(db, plan.sessionId, plan.onlyMissed);
      return {
        kind: "retest",
        label: plan.label,
        retestOf: plan.sessionId,
        questionIds,
        timeLimitSeconds: questionIds.length * secondsPerQuestion,
      };
    }
  }
}

/** Starts a test, asking first if another one is still open. */
export function useStartTest() {
  const db = useDb();
  const router = useRouter();

  return (plan: Plan) => {
    const start = () => {
      const session = buildSession(db, plan);
      if (session.questionIds.length === 0) {
        Alert.alert("Nuk ka pyetje", "Nuk u gjetën pyetje për këtë test.");
        return;
      }
      const id = createSession(db, session);
      router.push({ pathname: "/test/[id]", params: { id: String(id) } });
    };

    const open = getOpenSession(db);
    if (!open) return start();

    Alert.alert(
      "Ke një test të papërfunduar",
      "Nëse fillon një test të ri, testi i mëparshëm mbyllet me rezultatin që ke deri tani.",
      [
        { text: "Anulo", style: "cancel" },
        {
          text: "Vazhdo testin",
          onPress: () => router.push({ pathname: "/test/[id]", params: { id: String(open.id) } }),
        },
        { text: "Fillo të riun", style: "destructive", onPress: start },
      ],
    );
  };
}
