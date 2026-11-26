import { SessionRow } from "@/components/lists/SessionRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { StatTile } from "@/components/ui/StatTile";
import { ScreenTitle, SectionTitle } from "@/components/ui/Text";
import { useQuery } from "@/hooks/useQuery";
import { formatDuration } from "@/lib/format";
import { useDb } from "@/services/db/DatabaseProvider";
import { getOverview } from "@/services/db/progress";
import { deleteSession, listFinishedSessions } from "@/services/db/sessions";
import { useRouter } from "expo-router";
import { Alert, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Header() {
  const router = useRouter();
  const { data: o } = useQuery(getOverview, []);
  if (!o) return null;

  return (
    <View className="gap-6 pb-3">
      <ScreenTitle title="Historia" />
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile
            icon="document-text-outline"
            value={String(o.finishedTests)}
            label="Teste të përfunduara"
          />
          <StatTile
            icon="ribbon-outline"
            token="--warning"
            value={o.finishedTests ? `${Math.round(o.averageScore * 100)}%` : "—"}
            label="Mesatarja"
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            icon="analytics"
            token="--success"
            value={o.answered ? `${Math.round(o.accuracy * 100)}%` : "—"}
            label={`Saktësia (${o.answered} përgjigje)`}
          />
          <StatTile
            icon="time-outline"
            token="--info"
            value={formatDuration(o.studySeconds)}
            label="Koha e studimit"
          />
        </View>
      </View>

      <Card
        onPress={() => router.push("/mistakes")}
        className="flex-row items-center gap-3 border-destructive/30 bg-destructive/10"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-destructive/15">
          <Icon name="refresh" size={22} token="--destructive" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">Rishiko gabimet</Text>
          <Text className="text-sm text-muted-foreground">
            {o.activeMistakes > 0
              ? `${o.activeMistakes} pyetje. Dy përgjigje të sakta radhazi e heqin një pyetje nga lista.`
              : "Nuk ke gabime aktive. Shkëlqyeshëm!"}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} token="--muted-foreground" />
      </Card>

      <SectionTitle className="mb-0">Testet e mëparshme</SectionTitle>
    </View>
  );
}

export default function History() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const { data: sessions } = useQuery((db) => listFinishedSessions(db), []);

  const confirmDelete = (id: number) =>
    Alert.alert("Fshi testin?", "Testi dhe përgjigjet e tij fshihen nga historia.", [
      { text: "Anulo", style: "cancel" },
      { text: "Fshi", style: "destructive", onPress: () => deleteSession(db, id) },
    ]);

  return (
    <FlatList
      className="flex-1 bg-background"
      data={sessions ?? []}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 12,
      }}
      ListHeaderComponent={<Header />}
      ListEmptyComponent={
        sessions ? (
          <EmptyState
            icon="document-text-outline"
            title="Asnjë test ende"
            message="Testet që përfundon shfaqen këtu me rezultatin dhe përgjigjet."
          />
        ) : undefined
      }
      renderItem={({ item }) => (
        <SessionRow session={item} onLongPress={() => confirmDelete(item.id)} />
      )}
    />
  );
}
