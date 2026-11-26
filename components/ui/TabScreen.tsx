import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenTitle } from "./Text";

/** Scrollable tab page with a large title (tabs have no native header). */
export function TabScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 16,
        paddingBottom: 32,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ScreenTitle title={title} subtitle={subtitle} />
      {children}
    </ScrollView>
  );
}
