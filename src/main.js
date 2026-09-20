// ================= Wiring & boot =================
// The entry point: imports the engine/rooms/mini-games/UI modules, wires up
// every DOM event listener, and starts the game. Nothing here should hold
// game logic of its own — it only connects pieces that live elsewhere.
import { state, els, t, isMinigameSlot } from './engine/state.js';
import { checkAnswer, loadRoom, onSuccess, onFail, advanceRoom, runGlobalTick, pauseTick } from './engine/room-lifecycle.js';
import { moveWorksheetSelection, finalizeSet } from './engine/worksheet.js';
import { stopTreasureScene, stopMummyScene } from './engine/canvas-scene.js';
import { resetGame } from './engine/end.js';
import { planRooms, isValidPlan } from './engine/room-plan.js';
import { minigameName } from './engine/room-names.js';
import { nimPlayerMove, nimBestMove } from './minigames/nim.js';
import { playPositive } from './core/audio.js';
import {
  applyStaticText, openSetup, refreshSetupOverlayText, openIntro, introAdvance, closeIntroAndPlay,
  closeRules, toggleRules, closeMap, toggleMap, renderSoundButton
} from './ui/overlays.js';
import { initDevBar } from './dev/dev-bar.js';

els.submitBtn.addEventListener('click', checkAnswer);
els.input.addEventListener('keydown', function(e){ if(e.key==='Enter') checkAnswer(); });
els.hintBtn.addEventListener('click', function(){ els.hint.classList.toggle('show'); });
els.rulesBtn.addEventListener('click', toggleRules);
els.rulesXBtn.addEventListener('click', closeRules);
els.mapBtn.addEventListener('click', toggleMap);
els.mapXBtn.addEventListener('click', closeMap);
els.restartBtn.addEventListener('click', function(){ els.endOverlay.classList.remove('show'); resetGame(); });
els.resetBtn.addEventListener('click', resetGame);

els.soundBtn.addEventListener('click', function(){
  state.soundOn = !state.soundOn;
  renderSoundButton();
  saveSettings();
  if(state.soundOn) playPositive(); // immediate confirmation that sound is back on
});

els.settingsBtn.addEventListener('click', function(){ openSetup('reopen'); });
els.langSv.addEventListener('click', function(){ state.lang='sv'; applyStaticText(); refreshSetupOverlayText(); });
els.langEn.addEventListener('click', function(){ state.lang='en'; applyStaticText(); refreshSetupOverlayText(); });
els.setupCancelBtn.addEventListener('click', function(){
  els.setupOverlay.classList.remove('show');
  if(!state.ended) runGlobalTick();
});
els.setupPrimaryBtn.addEventListener('click', function(){
  saveSettings();
  els.setupOverlay.classList.remove('show');
  if(state.settingsMode === 'initial'){
    openIntro();
  } else {
    resetGame();
  }
});
els.introSkipBtn.addEventListener('click', closeIntroAndPlay);
els.introNextBtn.addEventListener('click', introAdvance);

els.saveBtn.addEventListener('click', function(){
  try{
    localStorage.setItem('pyramid-reckoning-save', JSON.stringify({
      room: state.room, visited: state.visited, lang: state.lang, level: state.level,
      roomPlan: state.roomPlan
    }));
    els.feedback.className='feedback good'; els.feedback.textContent = t().saveOk;
  }catch(_e){ els.feedback.className='feedback bad'; els.feedback.textContent = t().saveFail; }
});
els.loadBtn.addEventListener('click', function(){
  try{
    var raw = localStorage.getItem('pyramid-reckoning-save');
    if(!raw){ els.feedback.className='feedback bad'; els.feedback.textContent = t().loadEmpty; return; }
    var data = JSON.parse(raw);
    if(data.lang) state.lang = data.lang;
    if(data.level) state.level = data.level;
    state.visited = data.visited || [];
    // Restore the same map the save was made on, so the chambers already
    // seen don't reshuffle under the player — only fall back to a fresh
    // one for a save made before per-run planning existed (or corrupted).
    state.roomPlan = isValidPlan(data.roomPlan) ? data.roomPlan : planRooms(state.level);
    state.ended = false;
    els.endOverlay.classList.remove('show');
    stopTreasureScene();
    stopMummyScene();
    applyStaticText();
    loadRoom(data.room||0);
    els.feedback.className='feedback good'; els.feedback.textContent = t().loadOk;
  }catch(_e){ els.feedback.className='feedback bad'; els.feedback.textContent = t().loadFail; }
});

document.addEventListener('keydown', function(e){
  if(state.ended) return;
  var tag = (e.target && e.target.tagName) || '';
  if(els.setupOverlay.classList.contains('show') || els.introOverlay.classList.contains('show')) return;
  if(e.key==='Enter' && els.setContinueBtn.style.display !== 'none'){ els.setContinueBtn.click(); return; }
  if(e.key==='Escape'){
    if(els.mapOverlay.classList.contains('show')) closeMap();
    if(els.rulesOverlay.classList.contains('show')) closeRules();
    return;
  }

  if(e.key==='ArrowUp' || e.key==='ArrowDown' || e.key==='ArrowLeft' || e.key==='ArrowRight'){
    // All four arrows always mean row navigation on a worksheet — Up/Down
    // within a column, Left/Right across to the other one. moveWorksheetSelection
    // itself is the no-op outside a worksheet room (mini-games, trial rooms),
    // so this never steals normal text-cursor movement from those inputs.
    var moved = false;
    if(e.key==='ArrowUp') moved = moveWorksheetSelection(-1, 0);
    else if(e.key==='ArrowDown') moved = moveWorksheetSelection(1, 0);
    else if(e.key==='ArrowLeft') moved = moveWorksheetSelection(0, -1);
    else if(e.key==='ArrowRight') moved = moveWorksheetSelection(0, 1);
    if(moved){ e.preventDefault(); return; }

    // Not a worksheet — a self-answering trial item (the Coordinate Grid's
    // marker) gets the arrows instead, to move its own crosshair.
    var trialItem = state.set && state.set.isTrial ? state.set.items[state.set.idx] : null;
    if(trialItem && typeof trialItem.onArrow === 'function'){
      var dx = e.key==='ArrowLeft' ? -1 : e.key==='ArrowRight' ? 1 : 0;
      var dy = e.key==='ArrowUp' ? 1 : e.key==='ArrowDown' ? -1 : 0;
      trialItem.onArrow(dx, dy);
      if(typeof trialItem.currentAnswerText === 'function') els.input.value = trialItem.currentAnswerText();
      e.preventDefault();
      return;
    }
  }

  if(tag === 'INPUT') return;
  if(e.key==='h' || e.key==='H') els.hint.classList.toggle('show');
  if(e.key==='r' || e.key==='R') toggleRules();
  if(e.key==='m' || e.key==='M') toggleMap();
  if(e.key==='s' || e.key==='S') els.saveBtn.click();
  if(e.key==='l' || e.key==='L') els.loadBtn.click();
});

function saveSettings(){
  try{ localStorage.setItem('pyramid-reckoning-settings', JSON.stringify({ lang: state.lang, level: state.level, sound: state.soundOn })); }catch(_e){}
}
function loadSettings(){
  try{
    var raw = localStorage.getItem('pyramid-reckoning-settings');
    if(raw){
      var d = JSON.parse(raw);
      if(d.lang) state.lang=d.lang;
      if(d.level) state.level=d.level;
      if(typeof d.sound === 'boolean') state.soundOn = d.sound;
    }
  }catch(_e){}
}

// ================= Boot =================
function start(savedData){
  loadSettings();
  if(savedData && typeof savedData.room === 'number'){
    if(savedData.lang) state.lang = savedData.lang;
    if(savedData.level) state.level = savedData.level;
    state.visited = savedData.visited || [];
    state.roomPlan = isValidPlan(savedData.roomPlan) ? savedData.roomPlan : planRooms(state.level);
    applyStaticText();
    loadRoom(savedData.room, {});
  } else {
    applyStaticText();
    openSetup('initial');
  }
}

// Test-only hook: never active unless the page is loaded with ?debug=1,
// so ordinary play never sees it. Lets the Playwright suite jump straight
// to a room and read the real game state (which room, which mini-game,
// topic history) without having to solve arbitrary worksheets first.
if(/(?:^|[?&])debug=1(?:&|$)/.test(location.search)){
  window.__debug = {
    state: state, loadRoom: loadRoom, isMinigameSlot: isMinigameSlot, minigameName: minigameName,
    onSuccess: onSuccess, onFail: onFail, advanceRoom: advanceRoom, finalizeSet: finalizeSet,
    planRooms: planRooms, pauseTick: pauseTick, nimPlayerMove: nimPlayerMove, nimBestMove: nimBestMove
  };
}

initDevBar();

if(window.claude && window.claude.hot){
  window.claude.hot.snapshot(function(){
    return {
      room: state.room, visited: state.visited, lang: state.lang, level: state.level,
      roomPlan: state.roomPlan
    };
  });
  window.claude.hot.ready ? window.claude.hot.ready(start) : start(window.claude.hot.data || null);
} else {
  start(null);
}
