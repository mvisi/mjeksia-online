import { getThemeColor, type AppearanceName, type ColorSchemeName } from "@/constants/theme";
import { View } from "react-native";

const SWATCHES = ["--primary", "--accent", "--secondary", "--background"] as const;

export function ThemePreview({
  scheme,
  appearance,
}: {
  scheme: ColorSchemeName;
  appearance: AppearanceName;
}) {
  return (
    <View
      className="mr-2 flex-row gap-1"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {SWATCHES.map((token) => (
        <View
          key={token}
          className="h-4 w-4 rounded border border-border"
          style={{ backgroundColor: getThemeColor(token, scheme, appearance) }}
        />
      ))}
    </View>
  );
}
