import type { OptionLetter } from "@/services/db/schema";

/**
 * In-memory state of a test while it is on screen. Every change is also
 * written to the DB by the screen, so a test can be resumed at any time;
 * this reducer only keeps the UI instant and the rules in one testable place.
 */
export type EngineState = {
  index: number;
  selections: (OptionLetter | null)[];
  flags: boolean[];
  correct: OptionLetter[];
};

export type EngineAction =
  | { type: "select"; letter: OptionLetter }
  | { type: "clear" }
  | { type: "toggle-flag" }
  | { type: "go-to"; index: number }
  | { type: "next" }
  | { type: "prev" };

export function initEngine(input: {
  items: { selected: OptionLetter | null; flagged: boolean; correctOption: OptionLetter }[];
  index?: number;
}): EngineState {
  const count = input.items.length;
  return {
    index: clamp(input.index ?? 0, count),
    selections: input.items.map((i) => i.selected),
    flags: input.items.map((i) => i.flagged),
    correct: input.items.map((i) => i.correctOption),
  };
}

const clamp = (index: number, count: number) =>
  Math.max(0, Math.min(index, Math.max(0, count - 1)));

const replaceAt = <T>(list: T[], index: number, value: T) =>
  list.map((item, i) => (i === index ? value : item));

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  const count = state.selections.length;
  switch (action.type) {
    case "select":
      if (state.selections[state.index] === action.letter) return state;
      return { ...state, selections: replaceAt(state.selections, state.index, action.letter) };
    case "clear":
      return { ...state, selections: replaceAt(state.selections, state.index, null) };
    case "toggle-flag":
      return { ...state, flags: replaceAt(state.flags, state.index, !state.flags[state.index]) };
    case "go-to":
      return { ...state, index: clamp(action.index, count) };
    case "next":
      return { ...state, index: clamp(state.index + 1, count) };
    case "prev":
      return { ...state, index: clamp(state.index - 1, count) };
  }
}

export type QuestionMark =
  | "current"
  | "answered"
  | "flagged"
  | "empty"
  | "correct"
  | "wrong"
  | "skipped";

export function summarize(state: EngineState) {
  const answered = state.selections.filter((s) => s !== null).length;
  const correct = state.selections.filter((s, i) => s !== null && s === state.correct[i]).length;
  return {
    total: state.selections.length,
    answered,
    unanswered: state.selections.length - answered,
    flagged: state.flags.filter(Boolean).length,
    correct,
    isLast: state.index === state.selections.length - 1,
  };
}

/** Status of each question for the navigator grid. */
export function questionMarks(state: EngineState, reviewing: boolean): QuestionMark[] {
  return state.selections.map((selection, i) => {
    if (reviewing) {
      if (selection === null) return "skipped";
      return selection === state.correct[i] ? "correct" : "wrong";
    }
    if (state.flags[i]) return "flagged";
    return selection === null ? "empty" : "answered";
  });
}

/** Index of the next unanswered question after the current one (wrapping). */
export function nextUnanswered(state: EngineState): number | null {
  const count = state.selections.length;
  for (let step = 1; step <= count; step++) {
    const i = (state.index + step) % count;
    if (state.selections[i] === null) return i;
  }
  return null;
}
