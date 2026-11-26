import "../global.css";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loading";
import { themes } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { DatabaseProvider } from "@/services/db/DatabaseProvider";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { Suspense, useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";

void SplashScreen.preventAutoHideAsync();

/**
 * Applies the theme's CSS variables. Changing theme re-renders in place; it
 * must never remount the tree (that used to wipe a test in progress).
 */
function ThemeRoot({ children }: { children: ReactNode }) {
  const { scheme, appearance, isDark, color } = useAppTheme();
  const background = color("--background");

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(background);
  }, [background]);

  return (
    <View style={[themes[scheme][appearance], { flex: 1 }]} className="bg-background">
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </View>
  );
}

function HideSplash() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return null;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ThemeRoot>
      <HideSplash />
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Icon name="warning-outline" size={40} token="--destructive" />
        <Text className="text-center text-xl font-bold text-foreground">Diçka shkoi keq</Text>
        <Text className="text-center text-muted-foreground">{error.message}</Text>
        <Button title="Provo përsëri" icon="refresh" onPress={retry} />
      </View>
    </ThemeRoot>
  );
}

function AppStack() {
  const { color } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color("--background") },
        headerTintColor: color("--foreground"),
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: color("--background") },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Kryefaqja" }} />
      <Stack.Screen name="arena" options={{ title: "Arena" }} />
      <Stack.Screen name="test/[id]" options={{ title: "Test" }} />
      <Stack.Screen name="results/[id]" options={{ title: "Rezultati" }} />
      <Stack.Screen name="subject/[subject]" options={{ title: "" }} />
      <Stack.Screen name="topic/[id]" options={{ title: "" }} />
      <Stack.Screen name="question/[id]" options={{ title: "Pyetja" }} />
      <Stack.Screen name="search" options={{ title: "Kërko pyetje" }} />
      <Stack.Screen name="mistakes" options={{ title: "Gabimet e mia" }} />
      <Stack.Screen name="settings/[section]" options={{ title: "" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeRoot>
      <Suspense fallback={<Loading />}>
        <DatabaseProvider>
          <HideSplash />
          <AppStack />
        </DatabaseProvider>
      </Suspense>
    </ThemeRoot>
  );
}
