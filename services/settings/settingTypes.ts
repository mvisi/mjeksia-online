// ── Base types ──────────────────────────────────────────────────────────

export type BaseSettingDef = {
  label: string;
  /** "dev" settings are only listed in development builds. */
  scope?: "dev";
  description?: string;
};

export type SelectOption = { label: string; value: string };

export type SelectSettingDef = BaseSettingDef & {
  type: "select";
  options: readonly SelectOption[];
  default: string;
};

export type ToggleSettingDef = BaseSettingDef & {
  type: "toggle";
  default: boolean;
};

export type AnySettingDef = SelectSettingDef | ToggleSettingDef;

// ── Schema shape types ─────────────────────────────────────────────────

export type SettingsSchema<Key extends string = string> = Record<
  string,
  {
    title: string;
    description: string;
    icon: string;
    subsections: Record<string, { title: string; settings: readonly Key[] }>;
  }
>;
