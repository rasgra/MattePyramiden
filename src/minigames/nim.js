// ---------------- Nim ("The Counting Wall") ----------------
// Visualized 3-pile misère Nim: click a brick to take it and everything
// stacked above it. Whoever is forced to take the last brick loses.
import { randInt, pick, T } from '../core/utils.js';
import { state, els } from '../engine/state.js';
import { NIM_PILE_COUNT } from '../engine/constants.js';
import { nimName } from '../engine/room-names.js';
import { onSuccess, onFail } from '../engine/room-lifecycle.js';

export function buildNimRoom(level, lang){
  var range = T(level, [[2,4],[3,5],[3,6],[4,7],[5,8]]);
  var piles = [];
  for(var i=0;i<NIM_PILE_COUNT;i++) piles.push(randInt(range[0], range[1]));
  state.nimState = {
    piles: piles, over:false, locked:false,
    mistakeChance: T(level, [0.5,0.35,0.2,0.08,0])
  };
  return {
    name: nimName(lang),
    prompt: lang==='sv'
      ? 'Tre murar av lösa tegelstenar blockerar passagen. På din tur tar du valfritt antal stenar från EN av murarna. Den som tvingas ta den allra SISTA stenen måste hitta en annan väg runt.'
      : 'Three walls of loose bricks block the passage. On your turn, take any number of bricks from ONE wall. Whoever is forced to take the very LAST brick must find another way around.',
    sub: lang==='sv' ? 'Klicka på en tegelsten för att ta den och alla stenar ovanför den.' : 'Click a brick to take it and every brick stacked above it.',
    hint: lang==='sv'
      ? 'Titta på alla tre murarna tillsammans, inte bara en i taget — försök lämna din motståndare utan ett säkert drag.'
      : 'Look at all three walls together, not just one at a time — try to leave your rival with no safe move.',
    check: function(){ return false; }
  };
}
// Optimal misère-Nim move: normal nim-sum strategy while two or more
// piles hold 2+ bricks; once at most one pile does, switch to leaving an
// ODD number of single-brick piles for the opponent (the standard
// misère-play endgame adjustment) — since whoever takes the last brick
// loses, not wins.
export function nimBestMove(piles){
  var bigPiles = [];
  for(var i=0;i<piles.length;i++) if(piles[i]>=2) bigPiles.push(i);

  if(bigPiles.length >= 2){
    var nimSum = piles.reduce(function(a,b){ return a^b; }, 0);
    if(nimSum !== 0){
      for(var j=0;j<piles.length;j++){
        var target = piles[j] ^ nimSum;
        if(target < piles[j]) return { pile:j, remove: piles[j]-target };
      }
    }
    var maxIdx = piles.indexOf(Math.max.apply(null, piles));
    return { pile:maxIdx, remove:1 };
  }

  if(bigPiles.length === 1){
    var bIdx = bigPiles[0];
    var ones = 0;
    for(var k=0;k<piles.length;k++) if(k!==bIdx && piles[k]===1) ones++;
    return (ones % 2 === 0)
      ? { pile:bIdx, remove: piles[bIdx]-1 }   // leave the big pile at 1
      : { pile:bIdx, remove: piles[bIdx] };    // clear the big pile entirely
  }

  var oneIdx = piles.findIndex(function(p){ return p===1; });
  return oneIdx===-1 ? null : { pile:oneIdx, remove:1 };
}
export function nimRandomMove(piles){
  var options = [];
  for(var p=0;p<piles.length;p++) for(var r=1;r<=piles[p];r++) options.push({pile:p, remove:r});
  return pick(options);
}

// Each pile is a vertical stack of clickable bricks, numbered 1 (bottom)
// to size (top) in `data-level`. Clicking a brick takes it and every
// brick above it — the classic "cut point" way to pick both a pile and a
// count in one gesture — with a brief pop-and-fade animation standing in
// for physically pulling bricks out of the wall.
export function renderNimControls(){
  var wrap = document.createElement('div');
  wrap.className = 'nim-piles';
  for(var p=0; p<NIM_PILE_COUNT; p++){
    var col = document.createElement('div');
    col.className = 'nim-pile';
    var bricks = document.createElement('div');
    bricks.className = 'nim-bricks';
    col.appendChild(bricks);
    var count = document.createElement('div');
    count.className = 'nim-pile-count';
    col.appendChild(count);
    wrap.appendChild(col);
  }
  return wrap;
}
export function renderNimBoard(){
  var ns = state.nimState;
  if(!state.customControlsEl || !ns) return;
  var cols = state.customControlsEl.querySelectorAll('.nim-pile');
  for(var p=0; p<cols.length; p++){
    var size = ns.piles[p];
    var bricksEl = cols[p].querySelector('.nim-bricks');
    bricksEl.innerHTML = '';
    for(var level=size; level>=1; level--){
      var brick = document.createElement('div');
      brick.className = 'nim-brick';
      brick.dataset.level = level;
      if(ns.over || ns.locked){
        brick.classList.add('disabled');
      } else {
        brick.addEventListener('click', (function(pile,lvl){ return function(){ nimPlayerMove(pile,lvl); }; })(p, level));
        brick.addEventListener('mouseenter', (function(pile,lvl){ return function(){ nimPreview(pile,lvl,true); }; })(p, level));
        brick.addEventListener('mouseleave', (function(pile,lvl){ return function(){ nimPreview(pile,lvl,false); }; })(p, level));
      }
      bricksEl.appendChild(brick);
    }
    cols[p].querySelector('.nim-pile-count').textContent = size;
  }
}
export function nimPreview(pile, level, on){
  var ns = state.nimState;
  if(!state.customControlsEl || !ns || ns.over || ns.locked) return;
  var bricksEl = state.customControlsEl.querySelectorAll('.nim-pile')[pile].querySelector('.nim-bricks');
  var kids = bricksEl.children;
  for(var i=0;i<kids.length;i++){
    kids[i].classList.toggle('preview', on && parseInt(kids[i].dataset.level,10) >= level);
  }
}
export function nimAnimateRemoval(pile, count, done){
  if(!state.customControlsEl){ done(); return; }
  var bricksEl = state.customControlsEl.querySelectorAll('.nim-pile')[pile].querySelector('.nim-bricks');
  var kids = Array.prototype.slice.call(bricksEl.children, 0, count); // top `count` bricks are the first DOM children
  kids.forEach(function(el){ el.classList.remove('preview'); el.classList.add('removing'); });
  setTimeout(done, 320);
}
export function nimPlayerMove(pile, level){
  var ns = state.nimState;
  if(!ns || ns.over || ns.locked) return;
  var removeCount = ns.piles[pile] - (level - 1);
  if(removeCount <= 0) return;
  ns.locked = true;
  nimAnimateRemoval(pile, removeCount, function(){
    ns.piles[pile] = level - 1;
    renderNimBoard();
    if(ns.piles.reduce(function(a,b){ return a+b; }, 0) === 0){
      ns.over = true;
      finishNimRoom(false);
      return;
    }
    els.sub.textContent = state.lang==='sv' ? 'Motståndaren funderar …' : 'Your rival is thinking…';
    setTimeout(nimComputerMove, 600);
  });
}
export function nimComputerMove(){
  var ns = state.nimState;
  if(!ns || ns.over) return;
  var move = (Math.random() < ns.mistakeChance) ? nimRandomMove(ns.piles) : nimBestMove(ns.piles);
  if(!move) return;
  ns.locked = true;
  nimAnimateRemoval(move.pile, move.remove, function(){
    ns.piles[move.pile] -= move.remove;
    if(ns.piles.reduce(function(a,b){ return a+b; }, 0) === 0){
      ns.over = true;
      renderNimBoard();
      finishNimRoom(true);
      return;
    }
    ns.locked = false;
    renderNimBoard();
    els.sub.textContent = state.lang==='sv' ? 'Din tur — klicka på en tegelsten.' : 'Your turn — click a brick.';
  });
}
export function finishNimRoom(passed){
  if(state.customControlsEl){ state.customControlsEl.remove(); state.customControlsEl = null; }
  var msg = passed
    ? (state.lang==='sv' ? 'Din motståndare tar den sista stenen. Passagen är din!' : 'Your rival takes the last brick. The passage is yours!')
    : (state.lang==='sv' ? 'Du tog den sista stenen — muren rasar på din sida! Du faller tillbaka en kammare.' : 'You took the last brick — the wall collapses on your side! You slip back a chamber.');
  els.feedback.className = 'feedback ' + (passed ? 'good' : 'bad');
  els.feedback.textContent = msg;
  setTimeout(function(){ if(passed) onSuccess(); else onFail(msg); }, passed ? 900 : 1000);
}
