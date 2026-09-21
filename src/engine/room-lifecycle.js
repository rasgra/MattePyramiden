// ================= Room lifecycle =================
// The orchestrator: decides what kind of room a given index is, builds it,
// wires its controls, and handles the win/fail transitions every room type
// (drill worksheet, mini-game, or the finale) funnels back through.
import { state, els, t, isMinigameSlot, isSpecialRoom } from './state.js';
import { TOTAL_ROOMS, ESTIMATION_ROOM_SECONDS, MINIGAME_ACCENTS, MINIGAME_ICONS, COMBO_ACCENT, COMBO_ICON, DRILL_ICON } from './constants.js';
import { buildDrillSet } from '../rooms/index.js';
import { buildComboRoom } from '../rooms/combo.js';
import { pickMinigameType, buildMinigameRoom, usesCustomControls, setupMinigameControls, submitMinigameGuess } from '../minigames/index.js';
import { playPositive, playCheer, playNegative } from '../core/audio.js';
import { drawScene } from './canvas-scene.js';
import { renderWorksheet, focusCurrentRow, checkAnswerForSet, finalizeSet } from './worksheet.js';
import { winGame, loseGame } from './end.js';

export { isSpecialRoom };

export function formatTime(ti){ var m=Math.floor(ti/60), s=ti%60; return (m<10?'0':'')+m+':'+(s<10?'0':'')+s; }

// One shared heartbeat drives both clocks. The air clock always ticks,
// every chamber, from the first to the last — it's the whole climb's
// breathable air, not a per-chamber deadline, so loadRoom() never resets
// it. The hourglass (state.roomTimeTotal/roomTimeLeft) only ever ticks
// when the current chamber set one — today, only the Overseer's Tally
// (estimation) — and running it out sends the player back a chamber
// exactly like a wrong answer would, independently of the air supply.
export function runGlobalTick(){
  clearInterval(state.tickId);
  updateAirClock();
  updateHourglass();
  state.tickId = setInterval(function(){
    state.airLeft--;
    updateAirClock();
    if(state.airLeft <= 0){
      clearInterval(state.tickId);
      loseGame(); // out of air — the game ends here, regardless of room
      return;
    }

    if(state.roomTimeTotal > 0){
      state.roomTimeLeft--;
      updateHourglass();
      if(state.roomTimeLeft <= 0){
        // Disarm rather than stop the shared interval — the air clock
        // keeps draining through the fail screen and the fall-back to the
        // previous chamber, same as it would for any other wrong answer.
        state.roomTimeTotal = 0;
        if(state.set && !state.set.finalized) finalizeSet('timeUp');
        else onFail(t().timeUp);
      }
    }
  }, 1000);
}
export function pauseTick(){ clearInterval(state.tickId); }

export function updateAirClock(){
  var left = Math.max(0, state.airLeft);
  els.airClock.textContent = formatTime(left);
  els.airClock.classList.toggle('low', state.airTotal > 0 && left/state.airTotal < 0.15);
}

// The hourglass's two sand pools are simple rects clipped to the bulb
// triangles (see #hgTopClip/#hgBotClip in index.html): the top pool shrinks
// from its neck-anchored bottom edge, the bottom pool grows from its
// base-anchored bottom edge, both by the same fraction of the same 24-unit
// bulb height — so together they always look like sand that actually
// moved from one bulb to the other, not two independent bars.
var HOURGLASS_BULB_H = 24, HOURGLASS_TOP_NECK = 30, HOURGLASS_BOT_BASE = 58;
export function updateHourglass(){
  var frac = state.roomTimeTotal > 0 ? Math.max(0, Math.min(1, state.roomTimeLeft / state.roomTimeTotal)) : 0;
  els.hgTopSand.setAttribute('y', HOURGLASS_TOP_NECK - frac*HOURGLASS_BULB_H);
  els.hgTopSand.setAttribute('height', frac*HOURGLASS_BULB_H);
  var botHeight = (1-frac)*HOURGLASS_BULB_H;
  els.hgBotSand.setAttribute('y', HOURGLASS_BOT_BASE - botHeight);
  els.hgBotSand.setAttribute('height', botHeight);
  els.hourglass.classList.toggle('low', frac < 0.25);
  els.hourglass.classList.toggle('empty', frac <= 0);
  els.hourglassTitle.textContent = formatTime(Math.max(0,state.roomTimeLeft)) + ' remaining';
}

export function loadRoom(index, opts){
  opts = opts || {};
  state.booted = true;
  if(state.customControlsEl){ state.customControlsEl.remove(); state.customControlsEl = null; }
  state.room = index;
  state.resolved = false;
  state.set = null;
  state.current = null; // only special/mini-game rooms repopulate this, below
  els.hint.classList.remove('show');
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';
  els.input.style.display = '';
  els.input.disabled = false;
  els.input.readOnly = false; // a self-answering trial item (below) turns this back on for itself
  els.submitBtn.style.display = '';
  els.submitBtn.disabled = false;
  els.setContinueBtn.style.display = 'none';
  els.mmHistory.style.display = 'none';
  els.mmHistory.innerHTML = '';
  // #answerInput/#submitBtn may currently be parked inline in a worksheet row
  // from the last room — insertBefore moves a node from wherever it already
  // is, so this always restores their normal home-row order before anything
  // else (a fresh renderWorksheet() included) touches the DOM around them.
  els.answerRow.insertBefore(els.input, els.answerRow.firstChild);
  els.answerRow.insertBefore(els.submitBtn, els.setContinueBtn);
  els.levelBadge.textContent = t().levelNames[state.level-1];
  els.roomIndexLabel.textContent = t().chamber(index+1, TOTAL_ROOMS);
  els.input.value = '';

  if(isSpecialRoom(index)){
    els.wsTip.style.display = 'none';
    els.worksheet.style.display = 'none';
    els.tallyRow.style.display = 'none';
    els.trialCharges.style.display = 'none';
    els.prompt.style.display = '';
    els.sub.style.display = '';
    var mgType = null;
    if(isMinigameSlot(index)){
      // The dev bar's "force this mini-game" picker is a one-shot override;
      // otherwise this chamber's type was already fixed for the whole run
      // when the map was planned (see engine/room-plan.js) — falling back
      // to it later always shows the same mini-game, just re-rolled.
      mgType = state.forcedMinigameType || (state.roomPlan && state.roomPlan[index]) || pickMinigameType();
      state.forcedMinigameType = null;
      state.visitedMinigameTypes[index] = mgType;
      state.current = buildMinigameRoom(mgType, state.level, state.lang);
    } else {
      state.current = buildComboRoom(state.level, state.lang);
    }
    state.current.minigameType = mgType;
    els.parchment.style.setProperty('--room-accent', mgType ? MINIGAME_ACCENTS[mgType] : COMBO_ACCENT);

    els.hint.textContent = state.current.hint;
    els.roomNameLabel.textContent = (mgType ? MINIGAME_ICONS[mgType] : COMBO_ICON) + ' ' + state.current.name;
    els.prompt.textContent = state.current.prompt;
    els.sub.textContent = state.current.sub || '';

    if(mgType && usesCustomControls(mgType)){
      els.answerRow.style.display = 'none';
      els.parchment.appendChild(setupMinigameControls(mgType));
    } else {
      els.answerRow.style.display = '';
      setTimeout(function(){ els.input.focus(); }, 50);
    }
    els.mmHistory.style.display = (mgType==='mastermind' || mgType==='guess') ? 'block' : 'none';
    state.roomTimeTotal = 0; state.roomTimeLeft = 0; // no mini-game/finale keeps its own deadline anymore
  } else {
    els.answerRow.style.display = '';
    state.set = buildDrillSet(state.roomPlan && state.roomPlan[index], state.level, state.lang);
    els.roomNameLabel.textContent = (state.set.isTrial ? (state.set.chargeIcon || '🔥') : DRILL_ICON) + ' ' + state.set.topicName;
    els.parchment.style.setProperty('--room-accent', state.set.accent || '#4a92b6');

    if(state.set.isTrial){
      els.wsTip.style.display = 'none';
      els.worksheet.style.display = 'none';
      els.tallyRow.style.display = 'none';
      els.trialCharges.style.display = '';
      els.prompt.style.display = '';
      els.sub.style.display = '';
    } else {
      els.wsTip.style.display = '';
      els.worksheet.style.display = '';
      els.tallyRow.style.display = '';
      els.trialCharges.style.display = 'none';
      els.prompt.style.display = 'none';
      els.sub.style.display = 'none';
      els.answerRow.style.display = 'none'; // the blank lives inline at the end of the current row instead
      els.wsTip.textContent = state.set.topicSub || '';
      renderWorksheet();
    }
    focusCurrentRow();
    // Only the Overseer's Tally (estimation) keeps a hard per-room deadline
    // — a fixed 4 minutes regardless of level, forcing a quick, rounded
    // answer rather than a careful exact one. Every other drill/trial room
    // now only answers to the shared air clock.
    if(state.set.key === 'estimation'){
      state.roomTimeTotal = ESTIMATION_ROOM_SECONDS;
      state.roomTimeLeft = ESTIMATION_ROOM_SECONDS;
    } else {
      state.roomTimeTotal = 0; state.roomTimeLeft = 0;
    }
  }

  els.hourglass.style.display = state.roomTimeTotal > 0 ? '' : 'none';
  if(!opts.skipTimer) runGlobalTick();

  drawScene();
  if(state.visited.indexOf(index) === -1) state.visited.push(index);
}

// Small "You won!"/"You did it!" pop-up, then a short slide/fade as the
// stage hands off to the next chamber. Skipped entirely for the final
// room, since winGame() already has its own dedicated victory screen.
// The banner lingers on its own for a second, but a click/tap/Enter any
// time during that wait skips straight to the fade-out instead — the
// player is never stuck waiting one out just to keep moving.
export function celebrateAndAdvance(message, nextIndex){
  els.roomClearText.textContent = message;
  els.roomClearBanner.classList.remove('show');
  void els.roomClearBanner.offsetWidth; // restart the animation if it's still mid-run
  els.roomClearBanner.classList.add('show');

  var proceeded = false;
  function proceed(){
    if(proceeded) return;
    proceeded = true;
    clearTimeout(lingerTimer);
    document.removeEventListener('click', onSkip);
    document.removeEventListener('touchstart', onSkip);
    document.removeEventListener('keydown', onSkip);
    els.roomClearBanner.classList.remove('show');
    els.stage.classList.add('leaving');
    setTimeout(function(){
      loadRoom(nextIndex);
      els.stage.classList.remove('leaving');
      els.stage.classList.add('entering');
      setTimeout(function(){ els.stage.classList.remove('entering'); }, 420);
    }, 350);
  }
  function onSkip(e){
    if(e.type==='keydown' && e.key!=='Enter') return;
    proceed();
  }
  var lingerTimer = setTimeout(proceed, 1000);
  document.addEventListener('click', onSkip);
  document.addEventListener('touchstart', onSkip);
  document.addEventListener('keydown', onSkip);
}

export function advanceRoom(){
  // Guards the same race onSuccess()/onFail() already guard below: the
  // Continue button (and the Enter key, which clicks it) stays visible and
  // enabled for up to ~1.25s while celebrateAndAdvance()'s own timers run,
  // so a second Enter/click in that window used to fire a second, fully
  // independent advance — the next room loading twice, with a flash of
  // stage-leaving black in between.
  if(state.resolved) return;
  state.resolved = true;
  state.set = null;
  state.roomTimeTotal = 0; // disarm the estimation-room deadline check during the celebration/transition
  playCheer();
  if(state.room >= TOTAL_ROOMS-1){ winGame(); return; }
  celebrateAndAdvance(t().roomClearMath, state.room+1);
}

export function failRoom(){
  if(state.resolved) return;
  state.resolved = true;
  state.set = null;
  state.roomTimeTotal = 0;
  loadRoom(Math.max(0, state.room-1));
}

// ---------------- Single-shot rooms (mini-games, Treasury Door) ----------------
export function onSuccess(){
  if(state.resolved) return;
  state.resolved = true;
  els.feedback.className = 'feedback good';
  els.feedback.textContent = t().correct;
  playPositive();
  playCheer();
  var mgType = state.current && state.current.minigameType;
  var isGame = mgType==='nim' || mgType==='mastermind' || mgType==='guess' || mgType==='minesweeper';
  var message = isGame ? t().roomClearGame : t().roomClearMath;
  setTimeout(function(){
    if(state.room >= TOTAL_ROOMS-1){ winGame(); return; }
    celebrateAndAdvance(message, state.room+1);
  }, 650);
}

export function onFail(message){
  if(state.resolved) return;
  state.resolved = true;
  playNegative();
  els.feedback.className = 'feedback bad';
  els.feedback.textContent = message || t().wrongGeneric;
  var back = Math.max(0, state.room - 1);
  setTimeout(function(){ loadRoom(back); }, 900);
}

export function checkAnswer(){
  var val = els.input.value;
  var mgType = state.current && state.current.minigameType;
  if(mgType && usesCustomControls(mgType)) return; // played via their own on-screen controls
  if(state.set){
    // A self-answering trial item (e.g. the Coordinate Grid's marker) has no
    // typed text to require — it grades whatever its own internal state
    // (cursor position, etc.) already is, moved via arrow keys/clicks
    // rather than the shared input.
    var trialItem = state.set.isTrial ? state.set.items[state.set.idx] : null;
    if(trialItem && typeof trialItem.currentAnswerText === 'function'){
      checkAnswerForSet(trialItem.currentAnswerText());
      return;
    }
    if(val.trim() === '') return;
    checkAnswerForSet(val);
    return;
  }
  if(mgType==='mastermind' || mgType==='guess'){
    if(val.trim() === '') return;
    submitMinigameGuess(mgType, val);
    return;
  }
  if(!state.current) return;
  if(val.trim() === '') return;
  if(state.current.check(val)) onSuccess(); else onFail(t().wrongGeneric);
}
