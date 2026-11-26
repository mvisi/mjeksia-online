import {
  engineReducer,
  initEngine,
  nextUnanswered,
  questionMarks,
  summarize,
  type EngineState,
} from "@/lib/test-engine";

const make = (): EngineState =>
  initEngine({
    items: [
      { selected: null, flagged: false, correctOption: "A" },
      { selected: "B", flagged: false, correctOption: "C" },
      { selected: null, flagged: true, correctOption: "D" },
    ],
    index: 1,
  });

describe("test engine", () => {
  it("restores a saved test at the saved question", () => {
    const state = make();
    expect(state.index).toBe(1);
    expect(summarize(state)).toMatchObject({
      total: 3,
      answered: 1,
      unanswered: 2,
      flagged: 1,
      correct: 0,
    });
  });

  it("clamps navigation to the test bounds", () => {
    let state = make();
    state = engineReducer(state, { type: "next" });
    state = engineReducer(state, { type: "next" });
    expect(state.index).toBe(2);
    expect(summarize(state).isLast).toBe(true);
    state = engineReducer(state, { type: "go-to", index: -5 });
    expect(state.index).toBe(0);
    expect(engineReducer(state, { type: "prev" }).index).toBe(0);
    expect(initEngine({ items: [], index: 4 }).index).toBe(0);
  });

  it("selects, changes, clears and flags the current question", () => {
    let state = make();
    state = engineReducer(state, { type: "select", letter: "C" });
    expect(state.selections[1]).toBe("C");
    expect(engineReducer(state, { type: "select", letter: "C" })).toBe(state);
    expect(summarize(state).correct).toBe(1);
    state = engineReducer(state, { type: "clear" });
    expect(state.selections[1]).toBeNull();
    state = engineReducer(state, { type: "toggle-flag" });
    expect(state.flags).toEqual([false, true, true]);
  });

  it("marks questions for the navigator in both modes", () => {
    const state = engineReducer(make(), { type: "go-to", index: 0 });
    expect(questionMarks(state, false)).toEqual(["empty", "answered", "flagged"]);
    const answered = engineReducer(state, { type: "select", letter: "A" });
    expect(questionMarks(answered, true)).toEqual(["correct", "wrong", "skipped"]);
  });

  it("finds the next unanswered question, wrapping around", () => {
    const state = engineReducer(make(), { type: "go-to", index: 2 });
    expect(nextUnanswered(state)).toBe(0);
    const full = { ...state, selections: ["A", "B", "C"] as EngineState["selections"] };
    expect(nextUnanswered(full)).toBeNull();
  });
});
