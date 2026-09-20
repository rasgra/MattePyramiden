// ================= State =================
// The one mutable object every other module reads/writes. Modules import
// `state` and `els` by reference (a live binding to the same object, just
// like the shared closure variables the game used before the module split)
// — mutating a property on them here is visible everywhere else that
// imported them too.
import { STR } from '../i18n/strings.js';
import { TOTAL_ROOMS, MINIGAME_SLOTS, AIR_SECONDS_PER_ROOM } from './constants.js';

export var state = {
  lang: 'en',
  level: 5,
  room: 0,
  visited: [],
  current: null,
  // The hourglass now tracks the whole climb's breathable air, not any
  // one chamber — a single budget that ticks continuously from the first
  // chamber to the last (see engine/room-lifecycle.js's runGlobalTick()).
  airTotal: TOTAL_ROOMS * AIR_SECONDS_PER_ROOM,
  airLeft: TOTAL_ROOMS * AIR_SECONDS_PER_ROOM,
  // A second, independent countdown only the estimation room actually uses
  // — roomTimeTotal is 0 (meaning "no per-room deadline") for every other
  // chamber. Kept separate from the air budget so both can tick down at
  // once without one clobbering the other's remaining time.
  roomTimeLeft: 0,
  roomTimeTotal: 0,
  tickId: null,
  nimState: null,
  mmState: null,
  guessState: null,
  msState: null,
  set: null,
  ended: false,
  resolved: false,
  booted: false,
  roomPlan: null,             // topic/mini-game-type per chamber index, fixed for the whole run — see engine/room-plan.js
  forcedMinigameType: null,   // dev-bar override: the next mini-game slot uses exactly this type
  visitedMinigameTypes: {},   // index -> mini-game type, for the map labels
  soundOn: true,
  settingsMode: 'initial',    // 'initial' | 'reopen'
  customControlsEl: null      // the current room's custom control block (Nim piles, Minesweeper grid), if any
};

export var els = {};
['eyebrowText','subtitleText','footerText','levelBadge','roomIndexLabel','roomNameLabel',
 'airClock','hourglass','hourglassTitle','hgTopSand','hgBotSand',
 'promptText','subPromptText','answerInput','submitBtn','feedbackText','hintText','hintBtn','mapBtn',
 'wsTip','worksheet','wsColLeft','wsColRight','tallyRow','setTallyLabel','setContinueBtn','mmHistory','trialCharges',
 'mapOverlay','mapTrack','mapXBtn','mapTitle','mapSub','mapLegendHere','mapLegendCleared','mapLegendAhead',
 'saveBtn','loadBtn','settingsBtn','resetBtn','soundBtn','soundIcon','lblSound',
 'rulesBtn','rulesOverlay','rulesTitle','rulesBody','rulesXBtn','lblRules',
 'setupOverlay','setupTitle','setupSub','langLabel','langSv','langEn','levelLabel','levelGrid',
 'setupPrimaryBtn','setupCancelBtn','introOverlay','introScene','introBeatText','introLetter','introLetterText','introLetterSig','introDots','introSkipBtn','introNextBtn',
 'endOverlay','endTitle','endBody','restartBtn','parchment','lblHint','lblMap','lblSave','lblLoad','lblSettings','lblRestart',
 'stage','roomClearBanner','roomClearText',
 'devBar','devRoomSelect','devGameSelect','devJumpBtn','endScene'
].forEach(function(id){ els[id] = document.getElementById(id); });
els.answerRow = document.querySelector('.answer-row');
// short aliases used throughout the game logic below
els.prompt = els.promptText;
els.sub = els.subPromptText;
els.feedback = els.feedbackText;
els.hint = els.hintText;
els.input = els.answerInput;

export function t(){ return STR[state.lang]; }

export function isMinigameSlot(index){ return MINIGAME_SLOTS.indexOf(index) !== -1; }
export function isSpecialRoom(index){ return isMinigameSlot(index) || index === TOTAL_ROOMS-1; }
