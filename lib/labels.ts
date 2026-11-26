import type { SessionKind, SessionStatus } from "@/services/db/schema";

export const KIND_LABEL: Record<SessionKind, string> = {
  mock: "Model testi",
  focus: "Test sipas temës",
  mistakes: "Test i gabimeve",
  retest: "Ritestim",
};

export const STATUS_LABEL: Record<SessionStatus, string> = {
  in_progress: "Në vazhdim",
  completed: "Përfunduar",
  timed_out: "Koha mbaroi",
  abandoned: "I ndërprerë",
};

export const SUBJECT_ICON: Record<string, "leaf-outline" | "planet-outline" | "flask-outline"> = {
  Biologji: "leaf-outline",
  Fizikë: "planet-outline",
  Kimi: "flask-outline",
};
