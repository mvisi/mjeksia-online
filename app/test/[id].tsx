import { TestRunner } from "@/components/test/TestRunner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useQuery } from "@/hooks/useQuery";
import { expireOverdueSessions, getSessionDetail, resumeSession } from "@/services/db/sessions";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function TestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; index?: string }>();
  const sessionId = Number(params.id);

  // Loaded once: the runner owns the state afterwards. Opening a running
  // test (re)starts its clock; loading time before this is not counted.
  const { data: detail, isLoading } = useQuery(
    (db) => {
      expireOverdueSessions(db);
      const session = getSessionDetail(db, sessionId);
      if (session?.status === "in_progress") session.endsAt = resumeSession(db, sessionId);
      return session;
    },
    [sessionId],
    { live: false },
  );

  if (isLoading) return <Loading label="Duke përgatitur testin…" />;
  if (!detail || detail.items.length === 0) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Testi nuk u gjet"
        action={<Button title="Kthehu" variant="secondary" onPress={() => router.back()} />}
      />
    );
  }

  const index = params.index !== undefined ? Number(params.index) : undefined;
  return <TestRunner key={detail.id} detail={detail} initialIndex={index} />;
}
