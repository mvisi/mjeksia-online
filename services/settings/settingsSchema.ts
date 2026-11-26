import type { AnySettingDef, SettingsSchema } from "./settingTypes";

const QUESTION_COUNTS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
] as const;

/** Time is set per question so count and duration can never disagree. */
const PACES = [
  { value: "45", label: "45 sek" },
  { value: "60", label: "1 min" },
  { value: "90", label: "1.5 min" },
  { value: "120", label: "2 min" },
] as const;

// ── Flat registry (single source of truth for types) ────────────────────

export const settingsDefs = {
  user_color_scheme: {
    type: "select",
    label: "Tema e ngjyrave",
    options: [
      { value: "Zen", label: "Zen" },
      { value: "Amber", label: "Amber" },
      { value: "Minimal", label: "Minimal" },
      { value: "Dracula", label: "Dracula" },
      { value: "Cyberpunk", label: "Cyberpunk" },
      { value: "Catppuccin", label: "Catppuccin" },
      { value: "Leadgen", label: "Leadgen" },
      { value: "Brutalist", label: "Brutalist" },
    ],
    default: "Zen",
  },
  user_appearance: {
    type: "select",
    label: "Pamja",
    options: [
      { value: "light", label: "E çelët" },
      { value: "dark", label: "E errët" },
      { value: "system", label: "Sipas sistemit" },
    ],
    default: "system",
  },
  hide_explanations: {
    type: "toggle",
    label: "Fshih shpjegimet",
    description: "Mos shfaq shpjegimin pasi zgjedh një përgjigje.",
    default: false,
  },
  expand_reasoning: {
    type: "toggle",
    label: "Hap arsyetimin e plotë",
    description: "Shfaq menjëherë arsyetimin e detajuar në vend të shpjegimit të shkurtër.",
    default: false,
  },
  haptics: {
    type: "toggle",
    label: "Dridhjet",
    description: "Dridhje e lehtë kur zgjedh një përgjigje dhe në fund të kohës.",
    default: true,
  },
  mock_question_count: {
    type: "select",
    label: "Numri i pyetjeve",
    options: QUESTION_COUNTS,
    default: "50",
  },
  mock_seconds_per_question: {
    type: "select",
    label: "Koha për pyetje",
    options: PACES,
    default: "60",
  },
  focus_question_count: {
    type: "select",
    label: "Numri i pyetjeve",
    options: QUESTION_COUNTS,
    default: "25",
  },
  focus_seconds_per_question: {
    type: "select",
    label: "Koha për pyetje",
    options: PACES,
    default: "60",
  },
  always_show_image_placeholder: {
    type: "toggle",
    label: "Shfaq vendin e imazhit",
    description: "Shfaq një kuadrat bosh edhe kur pyetja nuk ka imazh.",
    default: false,
    scope: "dev",
  },
} as const satisfies Record<string, AnySettingDef>;

// ── Derived types ───────────────────────────────────────────────────────

type SettingsDefs = typeof settingsDefs;

export type SettingsKey = keyof SettingsDefs;

export type SettingValue<K extends SettingsKey> = SettingsDefs[K] extends {
  type: "select";
  options: readonly { value: infer V }[];
}
  ? V & string
  : SettingsDefs[K] extends { type: "toggle" }
    ? boolean
    : never;

// ── Nested schema (UI layout only) ─────────────────────────────────────

export const settingsSchema = {
  appearance: {
    title: "Pamja",
    description: "Tema dhe ngjyrat",
    icon: "color-palette-outline",
    subsections: {
      ui: {
        title: "Ndërfaqja",
        settings: ["user_color_scheme", "user_appearance"],
      },
    },
  },
  practice: {
    title: "Testet dhe praktika",
    description: "Gjatësia e testeve, shpjegimet",
    icon: "document-text-outline",
    subsections: {
      questions: {
        title: "Pyetjet",
        settings: ["hide_explanations", "expand_reasoning", "haptics"],
      },
      mock: {
        title: "Model testi",
        settings: ["mock_question_count", "mock_seconds_per_question"],
      },
      focus: {
        title: "Testet sipas temës",
        settings: ["focus_question_count", "focus_seconds_per_question"],
      },
      developer: {
        title: "Zhvilluesi",
        settings: ["always_show_image_placeholder"],
      },
    },
  },
} as const satisfies SettingsSchema<SettingsKey>;

export type SettingsSectionKey = keyof typeof settingsSchema;
