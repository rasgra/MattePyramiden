// ---------------- Drill-set (10-exercise worksheet) flow ----------------
import { state, els, t } from './state.js';
import { SET_SIZE } from './constants.js';
import { playPositive, playNegative } from '../core/audio.js';
import { advanceRoom, failRoom } from './room-lifecycle.js';

export function countCorrect(set){ return set.results.filter(function(r){ return r==='correct'; }).length; }

// Build the full two-column worksheet once; individual rows are patched in place afterward.
export function renderWorksheet(){
  var set = state.set;
  els.wsColLeft.innerHTML = '';
  els.wsColRight.innerHTML = '';
  var n = set.items.length;
  var half = Math.ceil(n/2);
  for(var i=0;i<n;i++){
    var row = document.createElement('div');
    row.className = 'ws-row';
    row.id = 'wsRow-' + i;
    var num = document.createElement('span');
    num.className = 'ws-num';
    num.textContent = set.items[i].label;
    var slot = document.createElement('span');
    slot.className = 'ws-slot placeholder';
    slot.id = 'wsSlot-' + i;
    slot.textContent = '?';
    row.appendChild(num);
    row.appendChild(slot);
    // Mouse/touch can jump straight to any not-yet-correct row, the same
    // destination arrow-key navigation would land on — selectRow() itself
    // is the no-op guard for the current row or an already-correct one.
    row.addEventListener('click', (function(idx){ return function(){ selectRow(idx); }; })(i));
    (i < half ? els.wsColLeft : els.wsColRight).appendChild(row);
  }
  updateRowHighlight();
}

export function updateRowHighlight(){
  var set = state.set;
  for(var i=0;i<set.items.length;i++){
    var row = document.getElementById('wsRow-' + i);
    if(!row) continue;
    row.classList.toggle('current', i === set.idx && !set.finalized);
    row.classList.toggle('ws-row-done', set.results[i] === 'correct');
  }
}

// Jumps straight to row `idx` — used by both the click handler above and
// arrow-key navigation below. A no-op for the row already focused or one
// already answered correctly (nothing to revisit there).
export function selectRow(idx){
  var set = state.set;
  if(!set || set.isTrial || set.finalized) return;
  if(idx === set.idx || set.results[idx] === 'correct') return;
  resetRowPlaceholder(set.idx);
  set.idx = idx;
  focusCurrentRow();
}

export function renderTrialCharges(){
  var set = state.set;
  els.trialCharges.innerHTML = '';
  for(var i=0;i<set.items.length;i++){
    var span = document.createElement('span');
    var cls = 'trial-charge';
    if(set.results[i]==='correct') cls += ' lit';
    else if(set.results[i]==='wrong') cls += ' spent';
    span.className = cls;
    span.textContent = set.chargeIcon || '🔥';
    els.trialCharges.appendChild(span);
  }
}

export function focusCurrentRow(){
  var set = state.set;
  els.hint.textContent = set.items[set.idx].hint || '';
  els.hint.classList.remove('show');
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';
  els.setTallyLabel.textContent = t().setTally(countCorrect(set));
  els.input.value = '';
  els.input.disabled = false;
  els.submitBtn.disabled = false;
  if(set.isTrial){
    var item = set.items[set.idx];
    els.prompt.textContent = item.prompt;
    els.sub.textContent = item.sub || '';
    renderTrialCharges();
    // A self-answering item (the Coordinate Grid's marker) supplies its own
    // value — show it read-only so typing can't just bypass the marking.
    if(typeof item.currentAnswerText === 'function'){
      els.input.readOnly = true;
      els.input.value = item.currentAnswerText();
    }
  } else {
    updateRowHighlight();
    // Drop the answer input right into the blank at the end of the current
    // line — "X + Y = __" gets its __ filled in in place. No submit button
    // here (Enter already submits, and this slot is too narrow to spare
    // the room) — the shared #submitBtn stays parked, hidden, in
    // .answer-row for the room types that actually use it.
    var slot = document.getElementById('wsSlot-' + set.idx);
    if(slot){
      slot.innerHTML = '';
      slot.className = 'ws-slot';
      slot.appendChild(els.input);
    }
  }
  setTimeout(function(){ els.input.focus(); }, 30);
}

// Restores a row's "?" placeholder when the player arrows away from it
// without answering — leaving it empty (its slot's only content, the
// shared input, having just moved to wherever they navigated to) would
// look broken. Rows that already hold a graded answer are left alone.
export function resetRowPlaceholder(idx){
  var set = state.set;
  if(set.results[idx] === 'correct' || set.results[idx] === 'wrong') return;
  var slot = document.getElementById('wsSlot-' + idx);
  if(!slot) return;
  // This slot may still be the one holding the shared input (e.g. the
  // sheet's timer ran out while it was mid-edit) — detach it first so
  // clearing the slot's markup doesn't delete the game's only input.
  els.input.remove();
  slot.innerHTML = '';
  slot.className = 'ws-slot placeholder';
  slot.textContent = '?';
}

// Arrow-key navigation between not-yet-correct rows. Columns are laid out
// top-to-bottom (rows 0..half-1 on the left, half..n-1 on the right), so
// Up/Down move within a column and Left/Right hop across it — matching
// how the worksheet actually reads. Stops at the sheet's edges rather
// than wrapping, so a repeated press can't loop back on itself unnoticed;
// already-correct rows are skipped over, never landed on.
export function moveWorksheetSelection(dRow, dCol){
  var set = state.set;
  if(!set || set.isTrial || set.finalized) return false;
  var n = set.items.length;
  var half = Math.ceil(n/2);
  var col = set.idx < half ? 0 : 1;
  var row = set.idx < half ? set.idx : set.idx - half;

  function toIdx(r,c){
    if(c===0) return (r>=0 && r<half) ? r : -1;
    if(c===1) return (r>=0 && r<(n-half)) ? half+r : -1;
    return -1;
  }

  var r = row, c = col;
  while(true){
    r += dRow; c += dCol;
    if(c<0 || c>1) return false;
    var idx = toIdx(r,c);
    if(idx===-1) return false;
    if(set.results[idx] !== 'correct'){
      selectRow(idx);
      return true;
    }
    // idx is already correct — keep scanning past it in the same direction
  }
}

export function checkAnswerForSet(val){
  var set = state.set;
  if(!set || set.finalized) return;
  var idx = set.idx;
  var item = set.items[idx];
  var correct = item.check(val);
  set.results[idx] = correct ? 'correct' : 'wrong';
  item.answered = val.trim();
  item.answeredCorrect = correct;
  correct ? playPositive() : playNegative();

  if(set.isTrial){
    renderTrialCharges();
  } else {
    var slot = document.getElementById('wsSlot-' + idx);
    if(slot){
      // Pull the shared input back out before wiping the slot's markup —
      // it's about to be re-homed in the next row (or in .answer-row,
      // once the sheet is finalized), never destroyed.
      els.input.remove();
      slot.innerHTML = '';
      var valSpan = document.createElement('span');
      valSpan.textContent = val.trim();
      var wordSpan = document.createElement('span');
      wordSpan.className = 'ws-word';
      wordSpan.textContent = correct ? t().wordCorrect : t().wordWrong;
      slot.appendChild(valSpan);
      slot.appendChild(wordSpan);
      slot.className = 'ws-slot ' + (correct ? 'correct' : 'wrong');
    }
  }
  els.feedback.className = 'feedback ' + (correct ? 'good' : 'bad');
  els.feedback.textContent = correct ? t().correct : t().wrongAnswer;
  els.setTallyLabel.textContent = t().setTally(countCorrect(set));
  els.input.disabled = true;
  els.submitBtn.disabled = true;
  setTimeout(function(){
    if(set.finalized) return;
    if(set.isTrial){
      if(idx+1 >= set.items.length) finalizeSet(false);
      else { set.idx = idx+1; focusCurrentRow(); }
      return;
    }
    // Worksheet rooms: a wrong answer no longer ends the attempt — the row
    // stays open to retry via the arrow keys. Move on to whichever other
    // row still isn't correct yet; once none remain, the sheet is done.
    var next = findNextPending(set, idx);
    if(next === null) finalizeSet(false);
    else { set.idx = next; focusCurrentRow(); }
  }, 700);
}

// Next not-yet-correct row after `fromIdx`, wrapping around the sheet;
// null once every row is correct. Used for the automatic hand-off after
// answering — arrow-key navigation has its own non-wrapping search below.
export function findNextPending(set, fromIdx){
  var n = set.items.length;
  for(var step=1; step<=n; step++){
    var idx = (fromIdx+step) % n;
    if(set.results[idx] !== 'correct') return idx;
  }
  return null;
}

export function finalizeSet(timedOut){
  var set = state.set;
  if(!set || set.finalized) return;
  // If the timer ran out mid-edit, the current row's slot still holds the
  // shared input rather than a graded result — restore its placeholder so
  // it doesn't just look like an empty gap in the result recap.
  if(!set.isTrial) resetRowPlaceholder(set.idx);
  set.finalized = true;
  var correctCount = countCorrect(set);
  if(correctCount === set.items.length){
    // A perfect sheet skips the "Flawless — the way opens!" confirmation
    // screen entirely and goes straight into the same "You did it!"
    // celebration + auto-advance every other room type already uses.
    advanceRoom();
  } else {
    // Falling short still gets its own screen — worth pausing on, since it
    // explains why a torch is about to burn out — with a manual Continue
    // (failRoom() doesn't have a "linger, but skippable" celebration to
    // fold this into the way a pass does).
    showSetResult(correctCount, timedOut);
  }
}

export function showSetResult(correctCount, timedOut){
  var s = t();
  var set = state.set;
  if(set && set.isTrial) renderTrialCharges(); else updateRowHighlight();
  els.hint.classList.remove('show');
  els.input.disabled = true;
  els.input.style.display = 'none';
  els.submitBtn.style.display = 'none';
  els.answerRow.style.display = ''; // holds #setContinueBtn — worksheet mode hides this row during play
  els.setContinueBtn.style.display = '';
  els.feedback.textContent = '';
  els.prompt.style.display = '';
  els.sub.style.display = '';

  els.prompt.textContent = s.setFail(correctCount, set ? set.items.length : SET_SIZE);
  els.sub.textContent = timedOut ? s.setTimeUp : s.setFailSub;
  playNegative();

  els.setContinueBtn.textContent = s.continueBtn;
  els.setContinueBtn.onclick = failRoom;
}
