// ================= Dev mode =================
// Local-only room/mini-game jump menu, gated by dev.config.js (git-tracked,
// defaults to disabled). That file doesn't exist for the published
// Artifact, so window.PYRAMID_DEV_CONFIG is simply undefined there and
// this whole feature quietly stays off.
import { state, els, isMinigameSlot } from '../engine/state.js';
import { TOTAL_ROOMS } from '../engine/constants.js';
import { loadRoom } from '../engine/room-lifecycle.js';
import { stopTreasureScene, stopMummyScene } from '../engine/canvas-scene.js';
import { planRooms } from '../engine/room-plan.js';

export var DEV_MODE = !!(window.PYRAMID_DEV_CONFIG && window.PYRAMID_DEV_CONFIG.enabled);

export function initDevBar(){
  if(!DEV_MODE || !els.devBar) return;
  els.devBar.classList.add('show');
  for(var i=0;i<TOTAL_ROOMS;i++){
    var opt = document.createElement('option');
    opt.value = i;
    var tag = isMinigameSlot(i) ? ' (mini-game)' : (i===TOTAL_ROOMS-1 ? ' (finale)' : '');
    opt.textContent = 'Chamber ' + (i+1) + tag;
    els.devRoomSelect.appendChild(opt);
  }
  els.devJumpBtn.addEventListener('click', function(){
    var idx = parseInt(els.devRoomSelect.value, 10);
    if(els.devGameSelect.value) state.forcedMinigameType = els.devGameSelect.value;
    els.setupOverlay.classList.remove('show');
    els.introOverlay.classList.remove('show');
    els.endOverlay.classList.remove('show');
    stopTreasureScene();
    stopMummyScene();
    state.ended = false;
    // Jumping in cold (e.g. straight from the setup screen) may not have
    // planned a map yet — do it now so the jumped-to chamber, and any
    // others reached from here, still show a topic/mini-game consistently.
    if(!state.roomPlan) state.roomPlan = planRooms(state.level);
    loadRoom(idx, {});
  });
}
