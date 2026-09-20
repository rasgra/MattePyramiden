// ================= Static text application & overlay panels =================
import { state, els, t } from '../engine/state.js';
import { TOTAL_ROOMS, AIR_SECONDS_PER_ROOM } from '../engine/constants.js';
import { pauseTick, formatTime } from '../engine/room-lifecycle.js';
import { resetGame } from '../engine/end.js';
import { renderMap } from './map.js';
import { showIntroScene, stopIntroScene } from '../engine/canvas-scene.js';

export function applyStaticText(){
  var s = t();
  els.eyebrowText.textContent = s.eyebrow;
  els.subtitleText.textContent = s.subtitle;
  els.footerText.textContent = s.footer;
  els.lblHint.textContent = s.hint;
  els.lblMap.textContent = s.map;
  els.lblSave.textContent = s.save;
  els.lblLoad.textContent = s.load;
  els.lblSettings.textContent = s.settings;
  els.lblRestart.textContent = s.restart;
  els.restartBtn.textContent = s.restartCta;
  renderSoundButton();
  els.lblRules.textContent = s.rulesBtn;
  els.rulesTitle.textContent = s.rulesTitle;
  els.submitBtn.textContent = s.answerBtn;
  els.input.placeholder = s.answerPlaceholder;
  els.mapTitle.textContent = s.mapTitle;
  els.mapSub.textContent = s.mapSub;
  els.mapLegendHere.textContent = s.mapLegendHere;
  els.mapLegendCleared.textContent = s.mapLegendCleared;
  els.mapLegendAhead.textContent = s.mapLegendAhead;
  els.langLabel.textContent = s.langLabel;
  els.levelLabel.textContent = s.levelLabel;
  els.langSv.classList.toggle('active', state.lang==='sv');
  els.langEn.classList.toggle('active', state.lang==='en');
  renderLevelGrid();
  els.levelBadge.textContent = s.levelNames[state.level-1];
  if(!state.booted){
    els.roomIndexLabel.textContent = s.chamber(1, TOTAL_ROOMS);
    els.roomNameLabel.textContent = '—';
    els.airClock.textContent = formatTime(TOTAL_ROOMS * AIR_SECONDS_PER_ROOM);
    els.airClock.classList.remove('low');
    els.hourglass.style.display = 'none'; // only the estimation room shows it, once a chamber has actually loaded
  }
}

export function renderLevelGrid(){
  els.levelGrid.innerHTML = '';
  t().levelNames.forEach(function(name, i){
    var lvl = i+1;
    var b = document.createElement('button');
    b.type='button';
    b.className = 'level-pill' + (lvl===10 ? ' master' : '') + (state.level===lvl ? ' active' : '');
    b.textContent = name;
    b.onclick = function(){ state.level = lvl; renderLevelGrid(); };
    els.levelGrid.appendChild(b);
  });
}

export function refreshSetupOverlayText(){
  var s = t();
  if(state.settingsMode==='initial'){
    els.setupTitle.textContent = s.settingsHeading;
    els.setupSub.textContent = s.settingsSub;
    els.setupPrimaryBtn.textContent = s.begin;
    els.setupCancelBtn.style.display = 'none';
  } else {
    els.setupTitle.textContent = s.settingsHeadingReopen;
    els.setupSub.textContent = s.settingsSubReopen;
    els.setupPrimaryBtn.textContent = s.apply;
    els.setupCancelBtn.style.display = '';
    els.setupCancelBtn.textContent = s.cancel;
  }
}

export function openSetup(mode){
  state.settingsMode = mode;
  if(mode==='reopen') pauseTick();
  applyStaticText();
  refreshSetupOverlayText();
  els.setupOverlay.classList.add('show');
}

var introIdx = 0;
export function openIntro(){
  introIdx = 0;
  renderIntroBeat();
  els.introOverlay.classList.add('show');
}
export function renderIntroBeat(){
  var s = t();
  var beat = s.introBeats[introIdx];
  if(beat === null){
    els.introBeatText.style.display = 'none';
    els.introLetter.style.display = '';
    els.introLetterText.textContent = s.introLetterText;
  } else {
    els.introLetter.style.display = 'none';
    els.introBeatText.style.display = '';
    els.introBeatText.textContent = beat;
  }
  showIntroScene(introIdx);
  els.introSkipBtn.textContent = s.introSkip;
  els.introNextBtn.textContent = (introIdx === s.introBeats.length-1) ? s.introEnter : s.introNext;
  els.introDots.innerHTML = '';
  s.introBeats.forEach(function(_,i){
    var d = document.createElement('span');
    if(i===introIdx) d.className='on';
    els.introDots.appendChild(d);
  });
}
export function introAdvance(){
  var s = t();
  if(introIdx < s.introBeats.length-1){ introIdx++; renderIntroBeat(); }
  else closeIntroAndPlay();
}
export function closeIntroAndPlay(){
  els.introOverlay.classList.remove('show');
  stopIntroScene();
  resetGame();
}

export function openRules(){
  var s = t();
  var mgType = state.current && state.current.minigameType;
  var body = s.rulesBodyDrill;
  if(mgType==='nim') body = s.rulesBodyNim;
  else if(mgType==='mastermind') body = s.rulesBodyMastermind;
  else if(mgType==='guess') body = s.rulesBodyGuess;
  else if(mgType==='minesweeper') body = s.rulesBodyMinesweeper;
  else if(state.room === TOTAL_ROOMS-1) body = s.rulesBodyCombo;
  else if(state.set && state.set.key === 'estimation') body = s.rulesBodyEstimation;
  els.rulesBody.textContent = body;
  els.rulesOverlay.classList.add('show');
}
export function closeRules(){ els.rulesOverlay.classList.remove('show'); }
export function toggleRules(){ els.rulesOverlay.classList.contains('show') ? closeRules() : openRules(); }

export function openMap(){ renderMap(); els.mapOverlay.classList.add('show'); }
export function closeMap(){ els.mapOverlay.classList.remove('show'); }
export function toggleMap(){ els.mapOverlay.classList.contains('show') ? closeMap() : openMap(); }

export function renderSoundButton(){
  els.soundIcon.textContent = state.soundOn ? '🔊' : '🔇';
  els.lblSound.textContent = state.soundOn ? t().soundOnLabel : t().soundOffLabel;
}
