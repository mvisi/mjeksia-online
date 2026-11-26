import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TabScreen } from "@/components/ui/TabScreen";
import { SectionTitle } from "@/components/ui/Text";
import { QUESTION_COUNT } from "@/constants/content-version";
import { useDb } from "@/services/db/DatabaseProvider";
import { resetProgress } from "@/services/db/sessions";
import { settingsSchema, type SettingsSectionKey } from "@/services/settings/settings";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert, Linking, Text, View } from "react-native";

const ISSUES_URL = "https://github.com/mvisi/mjeksia-online/issues";

export default function Settings() {
  const db = useDb();
  const router = useRouter();

  const confirmReset = () =>
    Alert.alert(
      "Fshi të gjithë progresin?",
      "Historia e testeve, gabimet dhe statistikat fshihen përgjithmonë. Fondi i pyetjeve mbetet.",
      [
        { text: "Anulo", style: "cancel" },
        { text: "Fshi gjithçka", style: "destructive", onPress: () => resetProgress(db) },
      ],
    );

  return (
    <TabScreen title="Cilësimet">
      <View className="mb-8 gap-3">
        {(Object.keys(settingsSchema) as SettingsSectionKey[]).map((key) => {
          const section = settingsSchema[key];
          return (
            <Card
              key={key}
              onPress={() =>
                router.push({ pathname: "/settings/[section]", params: { section: key } })
              }
              className="flex-row items-center gap-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
                <Icon name={section.icon as IconName} size={20} token="--accent-foreground" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-card-foreground">
                  {section.title}
                </Text>
                <Text className="text-sm text-muted-foreground">{section.description}</Text>
              </View>
              <Icon name="chevron-forward" size={18} token="--muted-foreground" />
            </Card>
          );
        })}
      </View>

      <SectionTitle>Rreth aplikacionit</SectionTitle>
      <Card className="mb-8 gap-3">
        <Text className="text-card-foreground">
          {QUESTION_COUNT} pyetje nga fondi zyrtar i QSHA-së, me shpjegime për çdo përgjigje.
          Funksionon pa internet.
        </Text>
        <Text className="text-sm text-muted-foreground">
          Versioni {Constants.expoConfig?.version}
        </Text>
        <Button
          variant="outline"
          icon="logo-github"
          title="Raporto një gabim në pyetje"
          onPress={() => void Linking.openURL(ISSUES_URL)}
        />
      </Card>

      <SectionTitle>Të dhënat</SectionTitle>
      <Button
        variant="destructive"
        icon="trash-outline"
        title="Fshi të gjithë progresin"
        onPress={confirmReset}
      />
    </TabScreen>
  );
}
