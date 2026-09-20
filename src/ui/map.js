// ---------------- Map ----------------
import { state, els, t, isMinigameSlot } from '../engine/state.js';
import { TOTAL_ROOMS, MAP_ROWS } from '../engine/constants.js';
import { comboName, minigameName } from '../engine/room-names.js';

// Row sizes still go apex→base (MAP_ROWS), so the map keeps a pyramid's
// usual silhouette — narrow tip at the top, wide base at the bottom.
// Chamber numbers, though, fill from the base upward: chamber 1 sits in
// the base row, the finale sits alone at the apex, so the player's
// progress reads as climbing from the bottom to the treasury at the top.
export function renderMap(){
  els.mapTrack.innerHTML = '';
  var rowsChambers = new Array(MAP_ROWS.length);
  var i = 0;
  for(var r=MAP_ROWS.length-1; r>=0; r--){
    var chambers = [];
    for(var c=0; c<MAP_ROWS[r] && i<TOTAL_ROOMS; c++, i++) chambers.push(i);
    rowsChambers[r] = chambers;
  }
  rowsChambers.forEach(function(chambers){
    var rowEl = document.createElement('div');
    rowEl.className = 'pyramid-row';
    chambers.forEach(function(idx){ rowEl.appendChild(buildMapNode(idx)); });
    els.mapTrack.appendChild(rowEl);
  });
}
export function buildMapNode(i){
  var node = document.createElement('div');
  var cls = 'map-node';
  if(i === state.room) cls += ' current';
  else if(state.visited.indexOf(i) !== -1) cls += ' done';
  node.className = cls;
  node.textContent = i+1;

  var titleText = t().chamber(i+1, TOTAL_ROOMS);
  var badgeIcon = null;
  if(i === TOTAL_ROOMS-1){
    titleText += ' — ' + comboName(state.lang);
    badgeIcon = '🏺';
  } else if(isMinigameSlot(i) && state.visitedMinigameTypes[i]){
    titleText += ' — ' + minigameName(state.visitedMinigameTypes[i], state.lang);
    badgeIcon = '🎲';
  }
  node.title = titleText;
  if(badgeIcon){
    var badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = badgeIcon;
    node.appendChild(badge);
  }
  return node;
}
