// ---------------- Guess-the-number ----------------
import { randInt, T, normAnswer } from '../core/utils.js';
import { state, els } from '../engine/state.js';
import { GUESS_MAX_TRIES } from '../engine/constants.js';
import { minigameName } from '../engine/room-names.js';
import { onSuccess, onFail } from '../engine/room-lifecycle.js';

export function buildGuessRoom(level, lang){
  var maxN = T(level, [50,120,300,600,1000]);
  state.guessState = { secret: randInt(1,maxN), maxN:maxN, guesses:[], over:false };
  return {
    name: minigameName('guess', lang),
    prompt: lang==='sv'
      ? 'Jag tänker på ett tal mellan 1 och ' + maxN + '. Du har ' + GUESS_MAX_TRIES + ' gissningar på dig.'
      : 'I’m thinking of a number between 1 and ' + maxN + '. You have ' + GUESS_MAX_TRIES + ' guesses.',
    sub: lang==='sv' ? 'Skriv en gissning och tryck Svara.' : 'Type a guess and press Answer.',
    hint: lang==='sv'
      ? 'Gissa på mitten av det intervall som återstår varje gång — då hittar du talet snabbast.'
      : 'Guess the middle of whatever range is left each time — that finds the number fastest.',
    check: function(){ return false; }
  };
}

export function submitNumberGuess(val){
  var g = state.guessState;
  if(!g || g.over) return;
  var n = parseInt(normAnswer(val).replace(/[^0-9-]/g,''), 10);
  if(isNaN(n)){
    els.feedback.className = 'feedback bad';
    els.feedback.textContent = state.lang==='sv' ? 'Ange ett heltal.' : 'Enter a whole number.';
    return;
  }
  g.guesses.push(n);
  els.input.value = '';
  els.feedback.textContent = '';

  var correct = n === g.secret;
  var resultText = correct
    ? (state.lang==='sv' ? 'rätt!' : 'correct!')
    : (n < g.secret ? (state.lang==='sv' ? 'för lågt' : 'too low') : (state.lang==='sv' ? 'för högt' : 'too high'));

  var row = document.createElement('div');
  row.className = 'mm-row' + (correct ? ' win' : '');
  var left = document.createElement('span');
  left.className = 'mm-code';
  left.textContent = (state.lang==='sv' ? 'Gissning ' : 'Guess ') + g.guesses.length + ': ' + n;
  var right = document.createElement('span');
  right.className = 'mm-score';
  right.textContent = resultText;
  row.appendChild(left); row.appendChild(right);
  els.mmHistory.appendChild(row);
  els.mmHistory.scrollTop = els.mmHistory.scrollHeight;

  if(correct){
    g.over = true;
    onSuccess();
  } else if(g.guesses.length >= GUESS_MAX_TRIES){
    g.over = true;
    onFail(state.lang==='sv' ? 'Du gissade slut på försök.' : 'You ran out of guesses.');
  }
}
