import Constants from "expo-constants";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import type { AnySettingDef } from "./settingTypes";
import { settingsDefs, type SettingsKey, type SettingValue } from "./settingsSchema";

export * from "./settingsSchema";
export * from "./settingTypes";

const showDevSettings = __DEV__ || Constants.expoConfig?.extra?.showDevSettings === true;

export function isSettingVisible(key: SettingsKey) {
  const def: AnySettingDef = settingsDefs[key];
  return def.scope !== "dev" || showDevSettings;
}

// ── Runtime ─────────────────────────────────────────────────────────────

const listeners = new Map<SettingsKey, Set<() => void>>();
/** Reads hit storage once; later reads come from memory. */
const cache = new Map<SettingsKey, unknown>();

function subscribe(key: SettingsKey, cb: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(cb);
  return () => {
    set.delete(cb);
  };
}

function parse(def: AnySettingDef, raw: string | null): unknown {
  if (raw === null) return def.default;
  if (def.type === "select") {
    return def.options.some((o) => o.value === raw) ? raw : def.default;
  }
  return raw === "true" ? true : raw === "false" ? false : def.default;
}

export function getSetting<K extends SettingsKey>(key: K): SettingValue<K> {
  if (!cache.has(key)) {
    let raw: string | null = null;
    try {
      raw = Storage.getItemSync(`setting_${key}`);
    } catch (e) {
      console.warn(`Failed to read setting "${key}":`, e);
    }
    cache.set(key, parse(settingsDefs[key], raw));
  }
  return cache.get(key) as SettingValue<K>;
}

export function setSetting<K extends SettingsKey>(key: K, value: SettingValue<K>) {
  const def: AnySettingDef = settingsDefs[key];
  if (def.type === "select" && !def.options.some((o) => o.value === String(value))) {
    console.warn(`Invalid value "${String(value)}" for setting "${key}"`);
    return;
  }
  try {
    Storage.setItemSync(`setting_${key}`, String(value));
  } catch (e) {
    console.warn(`Failed to write setting "${key}":`, e);
    return;
  }
  cache.set(key, value);
  listeners.get(key)?.forEach((l) => l());
}

export function useSetting<K extends SettingsKey>(key: K) {
  const value = useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => getSetting(key),
  );
  return [value, (v: SettingValue<K>) => setSetting(key, v)] as const;
}

// ── Derived settings ────────────────────────────────────────────────────

export type TestPlan = { questionCount: number; secondsPerQuestion: number };

export function getTestPlan(kind: "mock" | "focus"): TestPlan {
  return kind === "mock"
    ? {
        questionCount: Number(getSetting("mock_question_count")),
        secondsPerQuestion: Number(getSetting("mock_seconds_per_question")),
      }
    : {
        questionCount: Number(getSetting("focus_question_count")),
        secondsPerQuestion: Number(getSetting("focus_seconds_per_question")),
      };
}

export function useTestPlan(kind: "mock" | "focus"): TestPlan {
  const [mockCount] = useSetting("mock_question_count");
  const [mockPace] = useSetting("mock_seconds_per_question");
  const [focusCount] = useSetting("focus_question_count");
  const [focusPace] = useSetting("focus_seconds_per_question");
  return kind === "mock"
    ? { questionCount: Number(mockCount), secondsPerQuestion: Number(mockPace) }
    : { questionCount: Number(focusCount), secondsPerQuestion: Number(focusPace) };
}
