import {
  getThemeColor,
  type AppearanceName,
  type ColorSchemeName,
  type ThemeToken,
} from "@/constants/theme";
import { useSetting } from "@/services/settings/settings";
import { useColorScheme } from "react-native";

export function useAppTheme() {
  const [scheme] = useSetting("user_color_scheme");
  const [appearance] = useSetting("user_appearance");
  const system = useColorScheme();

  const resolved: AppearanceName =
    appearance === "system" ? (system === "dark" ? "dark" : "light") : appearance;

  return {
    scheme: scheme as ColorSchemeName,
    appearance: resolved,
    isDark: resolved === "dark",
    /** Theme color for props that do not accept classNames (icons, native UI). */
    color: (token: ThemeToken, opacity?: number) =>
      getThemeColor(token, scheme as ColorSchemeName, resolved, opacity),
  };
}
