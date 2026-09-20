// ================= Mini-game registry =================
// Chambers 5 and 10 are always one of these four mini-games, picked at
// random and never the same type in both slots. Each entry below wires one
// mini-game's build/controls/guess-submission functions under a common
// shape, so the room-lifecycle engine can drive any of them without
// knowing their internals — adding a fifth mini-game is purely additive:
// a new file plus one entry here.
import { buildNimRoom, renderNimControls, renderNimBoard } from './nim.js';
import { buildMastermindRoom, submitMastermindGuess } from './mastermind.js';
import { buildGuessRoom, submitNumberGuess } from './guess.js';
import { buildMinesweeperRoom, renderMsGrid, renderMsBoard } from './minesweeper.js';
import { pick } from '../core/utils.js';
import { state } from '../engine/state.js';
import { MINIGAME_TYPES } from '../engine/constants.js';

export { minigameName, comboName, nimName } from '../engine/room-names.js';

var REGISTRY = {
  nim: { build: buildNimRoom, renderControls: renderNimControls, renderBoard: renderNimBoard },
  mastermind: { build: buildMastermindRoom, submitGuess: submitMastermindGuess },
  guess: { build: buildGuessRoom, submitGuess: submitNumberGuess },
  minesweeper: { build: buildMinesweeperRoom, renderControls: renderMsGrid, renderBoard: renderMsBoard }
};

// Which mini-game type a chamber gets is decided once per run (see
// engine/room-plan.js) or by the dev-bar's one-shot override — see
// room-lifecycle.js's loadRoom(). This is only the defensive fallback for
// when neither is available (e.g. a save from before per-run planning
// existed).
export function pickMinigameType(){
  return pick(MINIGAME_TYPES);
}

export function buildMinigameRoom(type, level, lang){
  return REGISTRY[type].build(level, lang);
}

// Nim and Minesweeper play out on their own on-screen controls (the brick
// piles / the mine grid) instead of the shared text-answer input.
export function usesCustomControls(type){
  return !!REGISTRY[type].renderControls;
}

export function setupMinigameControls(type){
  var entry = REGISTRY[type];
  var el = entry.renderControls();
  state.customControlsEl = el;
  entry.renderBoard();
  return el;
}

export function submitMinigameGuess(type, val){
  REGISTRY[type].submitGuess(val);
}
