import { describe, expect, it } from "vitest";
import {
  createHistory,
  GROUP_WINDOW_MS,
  HISTORY_LIMIT,
  type History,
  type HistoryAction,
  historyReducer,
} from "./history";

const run = (
  actions: HistoryAction<number>[],
  start: History<number> = createHistory(0),
) => actions.reduce((state, action) => historyReducer(state, action), start);

const set = (value: number, now: number, group?: string) =>
  ({ type: "set", value, now, group }) as const;

describe("historyReducer", () => {
  it("undoes and redoes single edits", () => {
    const state = run([set(1, 0), set(2, 10), { type: "undo" }]);
    expect(state.present).toBe(1);
    expect(state.future).toEqual([2]);
    expect(run([{ type: "redo" }], state).present).toBe(2);
  });

  it("ignores undo and redo at the ends", () => {
    const start = createHistory(0);
    expect(run([{ type: "undo" }], start)).toBe(start);
    expect(run([{ type: "redo" }], start)).toBe(start);
  });

  it("drops the future on a new edit", () => {
    const state = run([set(1, 0), { type: "undo" }, set(5, 20)]);
    expect(state.present).toBe(5);
    expect(state.future).toEqual([]);
    expect(state.past).toEqual([0]);
  });

  it("does not record an edit that changes nothing", () => {
    const start = createHistory(3);
    expect(historyReducer(start, set(3, 0))).toBe(start);
  });

  it("coalesces a group into one step, whatever its length", () => {
    const drag = Array.from({ length: 50 }, (_, i) =>
      set(i + 1, i * 16, "radius"),
    );
    const state = run(drag);
    expect(state.present).toBe(50);
    expect(state.past).toEqual([0]);
    expect(run([{ type: "undo" }], state).present).toBe(0);
  });

  it("starts a new step after a pause, a different group, or an undo", () => {
    const paused = run([set(1, 0, "a"), set(2, GROUP_WINDOW_MS + 1, "a")]);
    expect(paused.past).toEqual([0, 1]);

    const switched = run([set(1, 0, "a"), set(2, 5, "b")]);
    expect(switched.past).toEqual([0, 1]);

    const afterUndo = run([
      set(1, 0, "a"),
      set(2, 5, "a"),
      { type: "undo" },
      set(3, 10, "a"),
    ]);
    expect(afterUndo.past).toEqual([0]);
    expect(afterUndo.present).toBe(3);
  });

  it("removes the step when a group ends where it started", () => {
    const state = run([
      set(1, 0),
      set(2, 5, "a"),
      set(3, 10, "a"),
      set(1, 15, "a"),
    ]);
    expect(state.present).toBe(1);
    expect(state.past).toEqual([0]);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    const edits = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) =>
      set(i + 1, i * 10),
    );
    const state = run(edits);
    expect(state.past).toHaveLength(HISTORY_LIMIT);
    expect(state.past[0]).toBe(20);
  });

  it("uses the given equality", () => {
    const start = createHistory({ a: 1 });
    const same = historyReducer(
      start,
      { type: "set", value: { a: 1 }, now: 0 },
      (x, y) => x.a === y.a,
    );
    expect(same).toBe(start);
  });

  it("load replaces everything", () => {
    const state = run([set(1, 0), set(2, 10), { type: "load", value: 9 }]);
    expect(state).toEqual(createHistory(9));
  });
});
