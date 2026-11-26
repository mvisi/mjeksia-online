import { useAppTheme } from "@/hooks/useAppTheme";
import { useQuery } from "@/hooks/useQuery";
import { getOverview } from "@/services/db/progress";
import { NativeTabs } from "expo-router/native-tabs";

export default function TabsLayout() {
  const { color } = useAppTheme();
  const { data } = useQuery(getOverview, []);
  const mistakes = data?.activeMistakes ?? 0;

  return (
    <NativeTabs
      backgroundColor={color("--background")}
      tintColor={color("--primary")}
      iconColor={{ default: color("--muted-foreground"), selected: color("--primary") }}
      indicatorColor={color("--primary", 0.15)}
      rippleColor={color("--primary", 0.12)}
      labelStyle={{
        default: { color: color("--muted-foreground") },
        selected: { color: color("--primary") },
      }}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>Kryefaqja</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="practice">
        <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} md="menu_book" />
        <NativeTabs.Trigger.Label>Praktiko</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
        <NativeTabs.Trigger.Label>Historia</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={mistakes === 0}>
          {mistakes > 99 ? "99+" : String(mistakes)}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>Cilësimet</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
