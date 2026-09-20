// ---------------- Minesweeper, reskinned as sleeping mummies on a 10x10
// field. The mine layout is generated lazily on the first reveal, excluding
// that tile and its neighbors, so the opening click can never be an instant
// loss. ----
import { T } from '../core/utils.js';
import { state, els } from '../engine/state.js';
import { MS_SIZE } from '../engine/constants.js';
import { minigameName } from '../engine/room-names.js';
import { onSuccess, onFail } from '../engine/room-lifecycle.js';

export function msNeighbors(i, size){
  var r = Math.floor(i/size), c = i%size, out = [];
  for(var dr=-1; dr<=1; dr++){
    for(var dc=-1; dc<=1; dc++){
      if(dr===0 && dc===0) continue;
      var nr = r+dr, nc = c+dc;
      if(nr>=0 && nr<size && nc>=0 && nc<size) out.push(nr*size+nc);
    }
  }
  return out;
}
export function msPlaceMines(ms, safeIndex){
  var safe = [safeIndex].concat(msNeighbors(safeIndex, ms.size));
  var pool = [];
  for(var i=0;i<ms.total;i++) if(safe.indexOf(i)===-1) pool.push(i);
  for(var i=pool.length-1;i>0;i--){
    var j = Math.floor(Math.random()*(i+1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  ms.mines = new Array(ms.total).fill(false);
  pool.slice(0, ms.mummyCount).forEach(function(idx){ ms.mines[idx] = true; });
  ms.counts = new Array(ms.total).fill(0);
  for(var k=0;k<ms.total;k++){
    if(ms.mines[k]) continue;
    ms.counts[k] = msNeighbors(k, ms.size).filter(function(j){ return ms.mines[j]; }).length;
  }
}
export function msReveal(i){
  var ms = state.msState;
  if(ms.revealed[i] || ms.flagged[i]) return;
  ms.revealed[i] = true;
  if(ms.mines[i]) return;
  if(ms.counts[i]===0) msNeighbors(i, ms.size).forEach(function(j){ if(!ms.revealed[j]) msReveal(j); });
}
export function msCheckWin(){
  var ms = state.msState;
  for(var i=0;i<ms.total;i++) if(!ms.mines[i] && !ms.revealed[i]) return false;
  return true;
}

export function buildMinesweeperRoom(level, lang){
  var size = MS_SIZE;
  var mummyCount = T(level, [8,10,13,16,18]);
  state.msState = {
    size: size, total: size*size, mummyCount: mummyCount,
    mines: null, counts: null,
    revealed: new Array(size*size).fill(false),
    flagged: new Array(size*size).fill(false),
    flagMode: false, over: false
  };
  return {
    name: minigameName('minesweeper', lang),
    prompt: lang==='sv'
      ? 'Ett fält på 10×10 rutor döljer sovande mumier. Avslöja alla rutor utan mumie för att ta dig vidare.'
      : 'A 10×10 field hides sleeping mummies. Reveal every tile without one to move on.',
    sub: lang==='sv'
      ? 'Klicka för att avslöja en ruta; siffran visar mumier i rutorna runt om.'
      : 'Click to reveal a tile; the number counts mummies in the tiles around it.',
    hint: lang==='sv'
      ? 'Slå på flaggläge för att märka ut rutor du misstänker gömmer en mumie, så klickar du inte fel av misstag.'
      : 'Switch on flag mode to mark tiles you suspect hide a mummy, so you don’t click them by accident.',
    check: function(){ return false; }
  };
}

// ---------------- Minesweeper controls ----------------
export function renderMsGrid(){
  var ms = state.msState;
  var wrap = document.createElement('div');
  wrap.className = 'ms-wrap';
  var toolbar = document.createElement('div');
  toolbar.className = 'ms-toolbar';
  var counter = document.createElement('span');
  counter.className = 'ms-counter';
  var flagBtn = document.createElement('button');
  flagBtn.type = 'button';
  flagBtn.className = 'btn secondary ms-flag-btn';
  flagBtn.onclick = function(){ ms.flagMode = !ms.flagMode; renderMsBoard(); };
  toolbar.appendChild(counter);
  toolbar.appendChild(flagBtn);
  wrap.appendChild(toolbar);
  var grid = document.createElement('div');
  grid.className = 'ms-grid';
  for(var i=0;i<ms.total;i++){
    var cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'ms-cell';
    cell.onclick = (function(idx){ return function(){ msCellClick(idx); }; })(i);
    cell.oncontextmenu = (function(idx){ return function(e){ e.preventDefault(); msToggleFlag(idx); }; })(i);
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);
  return wrap;
}
export function renderMsBoard(){
  var ms = state.msState;
  if(!state.customControlsEl || !ms) return;
  var remaining = ms.mummyCount - ms.flagged.filter(Boolean).length;
  state.customControlsEl.querySelector('.ms-counter').textContent = '🧟 ' + remaining;
  var flagBtn = state.customControlsEl.querySelector('.ms-flag-btn');
  flagBtn.textContent = ms.flagMode
    ? (state.lang==='sv' ? 'Flaggläge: på' : 'Flag mode: on')
    : (state.lang==='sv' ? 'Flaggläge: av' : 'Flag mode: off');
  flagBtn.classList.toggle('active', ms.flagMode);
  var cells = state.customControlsEl.querySelectorAll('.ms-cell');
  for(var i=0;i<cells.length;i++){
    var cell = cells[i];
    var isMine = ms.mines && ms.mines[i];
    cell.className = 'ms-cell';
    if(ms.over && isMine){
      cell.classList.add('mine');
      cell.textContent = '🧟';
      cell.disabled = true;
    } else if(ms.revealed[i]){
      cell.classList.add('revealed');
      var cnt = ms.counts[i];
      cell.textContent = cnt>0 ? String(cnt) : '';
      if(cnt>0) cell.classList.add('n'+cnt);
      cell.disabled = true;
    } else if(ms.flagged[i]){
      cell.classList.add('flagged');
      cell.textContent = '🚩';
      cell.disabled = ms.over;
    } else {
      cell.textContent = '';
      cell.disabled = ms.over;
    }
  }
}
export function msAllMinesFlagged(ms){
  if(!ms.mines) return false;
  for(var i=0;i<ms.total;i++) if(ms.mines[i] && !ms.flagged[i]) return false;
  return true;
}
export function msToggleFlag(i){
  var ms = state.msState;
  if(!ms || ms.over || ms.revealed[i]) return;
  ms.flagged[i] = !ms.flagged[i];
  // Flagging the very last unflagged mummy clears the field outright —
  // no need to also hunt down and click every remaining safe tile.
  if(ms.flagged[i] && msAllMinesFlagged(ms)){
    for(var k=0;k<ms.total;k++) if(!ms.mines[k]) ms.revealed[k] = true;
    renderMsBoard();
    msFinish(true, state.lang==='sv' ? 'Alla mumier är märkta! En dörr öppnas.' : 'Every mummy is marked! A door opens.');
    return;
  }
  renderMsBoard();
}
export function msCellClick(i){
  var ms = state.msState;
  if(!ms || ms.over) return;
  if(ms.flagMode){ msToggleFlag(i); return; }
  if(ms.flagged[i] || ms.revealed[i]) return;
  if(!ms.mines) msPlaceMines(ms, i);
  msReveal(i);
  var hitMine = ms.mines[i];
  renderMsBoard();
  if(hitMine){
    msFinish(false, state.lang==='sv' ? 'Du väckte en mumie. Du faller tillbaka en kammare.' : 'You woke a mummy. You slip back a chamber.');
  } else if(msCheckWin()){
    msFinish(true, state.lang==='sv' ? 'Fältet är säkrat! En dörr öppnas.' : 'The field is clear! A door opens.');
  }
}
export function msFinish(passed, message){
  var ms = state.msState;
  ms.over = true;
  renderMsBoard();
  els.feedback.className = 'feedback ' + (passed ? 'good' : 'bad');
  els.feedback.textContent = message;
  setTimeout(function(){ if(passed) onSuccess(); else onFail(message); }, 900);
}
