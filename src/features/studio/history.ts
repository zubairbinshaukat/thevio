// Undo/redo for the Studio: past / present / future, in memory only.
// The URL mirrors `present` (history: "replace"), so the back button is never
// flooded with one entry per slider step.
//
// Continuous edits (a slider drag, typing a hex value) share a `group`: while
// the same group keeps changing within GROUP_WINDOW_MS, they update one entry,
// so a whole drag undoes in one step whatever the input device.

export const HISTORY_LIMIT = 100;
export const GROUP_WINDOW_MS = 1000;

export type History<T> = {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  /** The group of the last edit, and when it happened. */
  readonly group: string | null;
  readonly at: number;
};

export type HistoryAction<T> =
  | { type: "set"; value: T; group?: string; now: number }
  | { type: "undo" }
  | { type: "redo" }
  /** Replace everything, e.g. a theme loaded from elsewhere. Not undoable. */
  | { type: "load"; value: T };

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], group: null, at: 0 };
}

export function historyReducer<T>(
  state: History<T>,
  action: HistoryAction<T>,
  equal: (a: T, b: T) => boolean = Object.is,
): History<T> {
  switch (action.type) {
    case "set": {
      const group = action.group ?? null;
      const continues =
        group !== null &&
        group === state.group &&
        action.now - state.at < GROUP_WINDOW_MS;
      if (continues) {
        // Dragged back to where the group started: nothing left to undo.
        const start = state.past[state.past.length - 1];
        if (start !== undefined && equal(start, action.value)) {
          return {
            ...state,
            past: state.past.slice(0, -1),
            present: start,
            group: null,
          };
        }
        return { ...state, present: action.value, at: action.now };
      }
      if (equal(state.present, action.value)) return state;
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: action.value,
        future: [],
        group,
        at: action.now,
      };
    }
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (previous === undefined) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        group: null,
        at: 0,
      };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (next === undefined) return state;
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: rest,
        group: null,
        at: 0,
      };
    }
    case "load":
      return createHistory(action.value);
  }
}
