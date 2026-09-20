// ================= End states =================
import { state, els, t } from './state.js';
import { TOTAL_ROOMS, AIR_SECONDS_PER_ROOM } from './constants.js';
import { playVictory } from '../core/audio.js';
import { startTreasureScene, stopTreasureScene, startMummyScene, stopMummyScene } from './canvas-scene.js';
import { loadRoom } from './room-lifecycle.js';
import { planRooms } from './room-plan.js';

export function winGame(){
  state.ended = true; clearInterval(state.tickId);
  els.endOverlay.classList.remove('mummy');
  els.endTitle.textContent = t().winTitle;
  // Level 10 ("Master"/"Mästare") is the top of the ladder — nothing
  // tougher to offer, so winBody() praises without a next-level nudge.
  var nextLevelName = state.level < 10 ? t().levelNames[state.level] : null;
  els.endBody.textContent = t().winBody(nextLevelName);
  els.endOverlay.classList.add('show');
  playVictory();
  startTreasureScene();
  try{ localStorage.removeItem('pyramid-reckoning-save'); }catch(_e){}
}
export function loseGame(){
  state.ended = true; clearInterval(state.tickId);
  els.endOverlay.classList.add('mummy');
  els.endTitle.textContent = t().loseTitle;
  els.endBody.textContent = t().loseBody;
  els.endOverlay.classList.add('show');
  startMummyScene();
  try{ localStorage.removeItem('pyramid-reckoning-save'); }catch(_e){}
}

export function resetGame(){
  state.room = 0; state.visited = []; state.ended = false;
  state.visitedMinigameTypes = {};
  // A fresh air supply for this climb — ticks continuously from here on,
  // shared across every chamber (see room-lifecycle.js's runGlobalTick()).
  state.airTotal = TOTAL_ROOMS * AIR_SECONDS_PER_ROOM;
  state.airLeft = state.airTotal;
  // A fresh map for this climb — which topic/mini-game each chamber gets
  // stays fixed from here on, for the whole run (see engine/room-plan.js).
  state.roomPlan = planRooms(state.level);
  els.endOverlay.classList.remove('show');
  stopTreasureScene();
  stopMummyScene();
  loadRoom(0);
}
