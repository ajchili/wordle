const API_URL = import.meta.env.VITE_API_URL;

import * as React from "react";
import { createContext, useReducer, useEffect } from "react";
import type {
  ConfirmedRow,
  ReducerState,
  GameOutcome,
  GameContext,
  ActionType,
} from "./types";

const INITIAL_STATE: ReducerState = {
  appReady: false,
  confirmedRows: [],
  usedLetters: {},
  error: false,
  placeholderRows: [],
  loading: true,
  hasInteracted: false,
};

const getGameOutcome = (
  confirmedRows: ReducerState["confirmedRows"]
): GameOutcome => {
  const isWinner = confirmedRows.some((row) =>
    row.every(({ letterState }) => letterState === 2)
  );
  const noRemaningAttempts = confirmedRows.length === 6;
  if (isWinner) {
    return "WINNER";
  } else if (noRemaningAttempts) {
    return "NOT_WINNER";
  }
  return;
};

const emptyKeyboardUsage: Record<string, number> = {};

const getKeyUsage = (confirmedRows: ConfirmedRow[]): Record<string, number> =>
  confirmedRows.flat().reduce(
    (usage, { value: letter, letterState }) => ({
      ...usage,
      [letter]: Math.max(usage[letter] || -Infinity, letterState),
    }),
    emptyKeyboardUsage
  );

function reducer(state: ReducerState, action: ActionType) {
  const { type, payload } = action;
  switch (type) {
    case "INTERACTION/OCCURRED": {
      return state.hasInteracted
        ? state
        : {
            ...state,
            hasInteracted: true,
          };
    }
    case "CONFIRM_ROW/START":
      return {
        ...state,
        loading: true,
      };
    case "CONFIRM_ROW/REJECT": {
      return {
        ...state,
        error: true,
        loading: false,
      };
    }
    case "CONFIRM_ROW/COMPLETE":
      const confirmedRows: ConfirmedRow[] = [
        ...state.confirmedRows,
        action.payload,
      ];
      const gameOutcome = getGameOutcome(confirmedRows);

      // Ensures that when "<CurrentRow />" disappears,
      // we accurately pad the board
      const currentRowOffset = gameOutcome ? 0 : -1;
      const attemptsRemaining =
        state.numRows - confirmedRows.length + currentRowOffset;

      const newPlaceholderRows = state.placeholderRows.slice(
        0,
        Math.max(attemptsRemaining, 0)
      );
      return {
        ...state,
        confirmedRows,
        error: false,
        loading: false,
        usedLetters: getKeyUsage(confirmedRows),
        placeholderRows: newPlaceholderRows,
        gameOutcome: gameOutcome,
      };
    case "META/COMPLETE":
      const { numRows, rowLength } = payload;
      const placeholderRows = new Array(numRows - 1).fill(
        new Array(rowLength).fill("")
      );
      return {
        ...state,
        appReady: true,
        loading: false,
        numRows,
        rowLength,
        placeholderRows,
      };
    case "META/REJECT":
      return {
        ...state,
        error: true,
      };
    default:
      break;
  }
  return state;
}

const INITIAL_CONTEXT: GameContext = {
  state: INITIAL_STATE,
  dispatch: () => {},
};
export const Context = createContext(INITIAL_CONTEXT);
export const GameContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  useEffect(() => {
    fetch(`${API_URL}/meta`)
      .then((resp) => resp.json())
      .then((payload) => {
        dispatch({
          type: "META/COMPLETE",
          payload,
        });
      })
      .catch((e) => dispatch({ type: "META/REJECT", payload: e }));
  }, []);
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  );
};