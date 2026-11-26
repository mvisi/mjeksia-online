import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import type { ColorSchemeName } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { cn } from "@/lib/utils";
import {
  settingsDefs,
  useSetting,
  type AnySettingDef,
  type SettingsKey,
} from "@/services/settings/settings";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { ThemePreview } from "./ThemePreview";

function Label({ def }: { def: AnySettingDef }) {
  return (
    <View className="flex-1 pr-4">
      <Text className="text-base font-medium text-foreground">{def.label}</Text>
      {def.description ? (
        <Text className="mt-1 text-sm text-muted-foreground">{def.description}</Text>
      ) : null}
    </View>
  );
}

export function SettingRow({ settingKey }: { settingKey: SettingsKey }) {
  const def: AnySettingDef = settingsDefs[settingKey];
  const [value, setValue] = useSetting(settingKey);
  const [open, setOpen] = useState(false);
  const { color, appearance } = useAppTheme();
  // The setter is typed per key; the schema guarantees values come from `def`.
  const set = setValue as (v: string | boolean) => void;

  if (def.type === "toggle") {
    return (
      <View className="flex-row items-center px-4 py-4">
        <Label def={def} />
        <Switch
          accessibilityLabel={def.label}
          value={Boolean(value)}
          onValueChange={set}
          trackColor={{ false: color("--muted"), true: color("--primary") }}
          thumbColor={color("--background")}
        />
      </View>
    );
  }

  const isTheme = settingKey === "user_color_scheme";
  const current = def.options.find((o) => o.value === value);

  if (def.options.length <= 4 && !isTheme) {
    return (
      <View className="gap-3 px-4 py-4">
        <Label def={def} />
        <View className="flex-row flex-wrap gap-2">
          {def.options.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={o.value === value}
              onPress={() => set(o.value)}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${def.label}: ${current?.label}`}
        onPress={() => setOpen(true)}
        className="flex-row items-center px-4 py-4 active:bg-muted"
      >
        <Label def={def} />
        {isTheme ? (
          <ThemePreview scheme={value as ColorSchemeName} appearance={appearance} />
        ) : null}
        <Text className="mr-1 text-muted-foreground">{current?.label}</Text>
        <Icon name="chevron-forward" size={16} token="--muted-foreground" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => setOpen(false)}
        >
          <Pressable className="max-h-[70%] w-full overflow-hidden rounded-2xl border border-border bg-background">
            <Text
              accessibilityRole="header"
              className="border-b border-border p-4 text-lg font-semibold text-foreground"
            >
              {def.label}
            </Text>
            <ScrollView contentContainerStyle={{ padding: 8 }}>
              {def.options.map((o) => {
                const selected = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      set(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex-row items-center rounded-xl p-3 active:bg-muted",
                      selected && "bg-secondary",
                    )}
                  >
                    {isTheme ? (
                      <ThemePreview scheme={o.value as ColorSchemeName} appearance={appearance} />
                    ) : null}
                    <Text
                      className={cn(
                        "flex-1 text-base",
                        selected ? "font-semibold text-primary" : "text-foreground",
                      )}
                    >
                      {o.label}
                    </Text>
                    {selected ? <Icon name="checkmark" size={18} token="--primary" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
