import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { formatDateTime } from "@/lib/format";
import { KIND_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { TestSession } from "@/services/db/schema";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export function SessionRow({
  session,
  onLongPress,
}: {
  session: TestSession;
  onLongPress?: () => void;
}) {
  const router = useRouter();
  const meta = [
    formatDateTime(session.createdAt),
    session.label,
    session.status !== "completed" ? STATUS_LABEL[session.status] : null,
  ].filter(Boolean);

  return (
    <Card
      onPress={() => router.push({ pathname: "/results/[id]", params: { id: String(session.id) } })}
      onLongPress={onLongPress}
      accessibilityHint={onLongPress ? "Mbaj shtypur për ta fshirë" : undefined}
      accessibilityLabel={`${KIND_LABEL[session.kind]}, ${session.score} nga ${session.questionCount}, ${meta.join(", ")}`}
      className="flex-row items-center gap-3"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-card-foreground">
          {KIND_LABEL[session.kind]}
        </Text>
        <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
          {meta.join(" · ")}
        </Text>
      </View>
      <ScoreBadge score={session.score} total={session.questionCount} />
    </Card>
  );
}
