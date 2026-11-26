import { SettingRow } from "@/components/settings/SettingRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDuration } from "@/lib/format";
import {
  isSettingVisible,
  settingsSchema,
  useTestPlan,
  type SettingsKey,
  type SettingsSectionKey,
} from "@/services/settings/settings";
import { Stack, useLocalSearchParams } from "expo-router";
import { Fragment } from "react";
import { ScrollView, Text, View } from "react-native";

function PlanSummary({ kind }: { kind: "mock" | "focus" }) {
  const plan = useTestPlan(kind);
  return (
    <Text className="px-4 pb-4 text-sm text-muted-foreground">
      Gjithsej: {plan.questionCount} pyetje ·{" "}
      {formatDuration(plan.questionCount * plan.secondsPerQuestion)}
    </Text>
  );
}

export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (!(section in settingsSchema)) {
    return <EmptyState icon="settings-outline" title="Ky seksion nuk ekziston" />;
  }
  const def = settingsSchema[section as SettingsSectionKey];

  return (
    <>
      <Stack.Screen options={{ title: def.title }} />
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 24 }}>
        {Object.entries<{ title: string; settings: readonly SettingsKey[] }>(def.subsections).map(
          ([key, sub]) => {
            const keys = sub.settings.filter(isSettingVisible);
            if (keys.length === 0) return null;
            return (
              <View key={key}>
                <Text
                  accessibilityRole="header"
                  className="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  {sub.title}
                </Text>
                <View className="overflow-hidden rounded-2xl border border-border bg-card">
                  {keys.map((settingKey, i) => (
                    <Fragment key={settingKey}>
                      {i > 0 ? <View className="h-px bg-border" /> : null}
                      <SettingRow settingKey={settingKey} />
                    </Fragment>
                  ))}
                  {key === "mock" || key === "focus" ? <PlanSummary kind={key} /> : null}
                </View>
              </View>
            );
          },
        )}
      </ScrollView>
    </>
  );
}
