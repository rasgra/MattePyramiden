// ================= Room plan =================
// Decides, once per run, which topic each drill chamber gets and which
// mini-game type each mini-game chamber gets — a fixed "map" for the whole
// climb. Falling back to an earlier chamber and climbing back up to it
// later lands on the same *kind* of room, never a different one; only the
// numbers inside it are freshly randomized every time (buildDrillSet() and
// buildMinigameRoom() already re-roll those on every loadRoom() call — this
// module only ever decides the topic/type, once).
import { pick } from '../core/utils.js';
import { TOTAL_ROOMS, MINIGAME_SLOTS, MINIGAME_TYPES, TOPIC_MEMORY } from './constants.js';
import { isSpecialRoom } from './state.js';
import { ROOMS, topicPool } from '../rooms/index.js';

// Returns an array of length TOTAL_ROOMS: a topic key for each drill
// chamber, a mini-game type for each mini-game chamber, and null for the
// finale (always the combo room — nothing to plan).
export function planRooms(level){
  var pool = topicPool(level);
  var plan = new Array(TOTAL_ROOMS).fill(null);

  // Drill topics, in play order, so "no repeat within the last TOPIC_MEMORY
  // chambers" is exactly the same rule the old per-visit picker enforced —
  // just computed once up front instead of as the player reaches each one.
  var history = [];
  for(var i=0;i<TOTAL_ROOMS;i++){
    if(isSpecialRoom(i)) continue;
    var recentWindow = history.slice(-TOPIC_MEMORY);
    var freshPool = pool.filter(function(r){ return recentWindow.indexOf(r.key) === -1; });
    var key = pick(freshPool.length ? freshPool : pool).key;
    plan[i] = key;
    history.push(key);
  }

  // The two mini-game chambers never get the same type as each other.
  var firstType = pick(MINIGAME_TYPES);
  var secondType = pick(MINIGAME_TYPES.filter(function(mt){ return mt !== firstType; }));
  plan[MINIGAME_SLOTS[0]] = firstType;
  plan[MINIGAME_SLOTS[1]] = secondType;

  return plan;
}

// Room keys can outlive a save (e.g. a room file gets renamed/removed in a
// later version) — validate before trusting a restored plan, and only ever
// touch the drill slots, since MINIGAME_TYPES is a small fixed set that
// isn't expected to change the same way.
export function isValidPlan(plan){
  if(!Array.isArray(plan) || plan.length !== TOTAL_ROOMS) return false;
  for(var i=0;i<TOTAL_ROOMS;i++){
    if(isSpecialRoom(i)) continue;
    if(!ROOMS.some(function(r){ return r.key === plan[i]; })) return false;
  }
  return true;
}
