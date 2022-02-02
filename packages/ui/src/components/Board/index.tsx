const API_URL = import.meta.env.VITE_API_URL;
import * as React from "react";
import { useContext, useCallback } from "react";

import { Context } from "../../game/context";
import { ConfirmedRow, CurrentRow, EmptyRow } from "../rows";
import { GameOutcome } from "./GameOutcome";
import { nonEmpty } from "../../utils";
import type {
  ConfirmedRow as ConfirmedRowT,
  GameOutcome as GameOutcomeT,
  GameDispatch,
} from "../../game/types";

const empty: ConfirmedRowT = [];

function createUseOnConfirm(dispatch: GameDispatch, gameOutcome: GameOutcomeT) {
  return async (row: string[]) => {
    if (!!gameOutcome) return;
    if (row.every(nonEmpty)) {
      dispatch({
        type: "CONFIRM_ROW/START",
        payload: null,
      });
      const resp = await fetch(`${API_URL}/check/${row.join("")}`);
      if (resp.status === 400) throw new Error("INVALID_WORD");
      const { letterState } = await resp.json();
      return dispatch({
        type: "CONFIRM_ROW/COMPLETE",
        payload: row.map((l, i) => ({
          value: l,
          letterState: letterState[i],
        })),
      });
    }
    throw new Error("INCOMPLETE_WORD");
  };
}

function lastConfirmed(confirmedRows: ConfirmedRowT[]): ConfirmedRowT {
  const lastConfirmedRow = confirmedRows[confirmedRows.length - 1];
  return lastConfirmedRow || empty;
}

export function Board() {
  const {
    state: {
      appReady,
      hasInteracted,
      confirmedRows,
      gameOutcome,
      placeholderRows,
    },
    dispatch,
  } = useContext(Context);
  const _onConfirm = createUseOnConfirm(dispatch, gameOutcome);
  const onConfirm = useCallback(_onConfirm, [dispatch, gameOutcome]);
  const onInteraction = useCallback(
    () => dispatch({ type: "INTERACTION/OCCURRED", payload: null }),
    []
  );
  if (!appReady) {
    return null;
  }
  return (
    <>
      <GameOutcome gameOutcome={gameOutcome} confirmedRows={confirmedRows} />
      {confirmedRows.map((row, i) => (
        <ConfirmedRow
          hasInteracted={hasInteracted}
          key={`confirmed-${i}`}
          row={row}
        />
      ))}
      {!gameOutcome && (
        <CurrentRow
          hasInteracted={hasInteracted}
          index={confirmedRows.length + 1}
          previousRow={lastConfirmed(confirmedRows)}
          initialRow={placeholderRows[0]}
          onConfirm={onConfirm}
          onInteraction={onInteraction}
        />
      )}
      {placeholderRows.map((row, i) => (
        <EmptyRow
          hasInteracted={hasInteracted}
          key={`empty-${i}`}
          row={row}
          index={i}
        />
      ))}
    </>
  );
}