// ---------------- Mastermind ----------------
import { randInt, normAnswer } from '../core/utils.js';
import { state, els } from '../engine/state.js';
import { MM_CODE_LEN, MM_MAX_GUESSES } from '../engine/constants.js';
import { onSuccess, onFail } from '../engine/room-lifecycle.js';

export function scoreMastermind(secret, guess){
  var exact = 0;
  var secretRest = [], guessRest = [];
  for(var i=0;i<secret.length;i++){
    if(secret[i]===guess[i]) exact++;
    else { secretRest.push(secret[i]); guessRest.push(guess[i]); }
  }
  var freq = {};
  secretRest.forEach(function(d){ freq[d] = (freq[d]||0)+1; });
  var partial = 0;
  guessRest.forEach(function(d){ if(freq[d] > 0){ partial++; freq[d]--; } });
  return {exact:exact, partial:partial};
}

export function buildMastermindRoom(level, lang){
  var secret = [];
  for(var i=0;i<MM_CODE_LEN;i++) secret.push(randInt(0,9));
  state.mmState = { secret:secret, guesses:[], over:false };
  return {
    name: lang==='sv' ? 'Master Mind-rummet' : 'The Master Mind Room',
    prompt: lang==='sv'
      ? 'Lista ut de ' + MM_CODE_LEN + ' hemliga siffrorna (0–9, kan upprepas). Du får gissa högst ' + MM_MAX_GUESSES + ' gånger.'
      : 'Work out the ' + MM_CODE_LEN + ' secret digits (0–9, repeats allowed). You have at most ' + MM_MAX_GUESSES + ' guesses.',
    sub: lang==='sv' ? 'Ange en gissning som ' + MM_CODE_LEN + ' siffror, t.ex. 482.' : 'Enter a guess as ' + MM_CODE_LEN + ' digits, e.g. 482.',
    hint: lang==='sv'
      ? '"Helt rätt" = rätt siffra på rätt plats. "Siffror rätt" = siffran finns med men på fel plats. Använd båda ledtrådarna för att snäva in svaret!'
      : '"Exact" means the right digit in the right spot. "Present" means the digit is in the code but in the wrong spot. Use both clues together to narrow it down.',
    check: function(){ return false; }
  };
}

export function submitMastermindGuess(val){
  var mm = state.mmState;
  if(!mm || mm.over) return;
  var digits = normAnswer(val).replace(/[^0-9]/g,'');
  if(digits.length !== MM_CODE_LEN){
    els.feedback.className = 'feedback bad';
    els.feedback.textContent = state.lang==='sv'
      ? 'Ange en gissning med exakt ' + MM_CODE_LEN + ' siffror.'
      : 'Enter a guess with exactly ' + MM_CODE_LEN + ' digits.';
    return;
  }
  var guess = digits.split('').map(Number);
  var score = scoreMastermind(mm.secret, guess);
  mm.guesses.push({guess:guess, score:score});
  els.input.value = '';
  els.feedback.textContent = '';

  var row = document.createElement('div');
  row.className = 'mm-row' + (score.exact===MM_CODE_LEN ? ' win' : '');
  var left = document.createElement('span');
  left.textContent = (state.lang==='sv' ? 'Gissning ' : 'Guess ') + mm.guesses.length + ':  ' + digits;
  left.className = 'mm-code';
  var right = document.createElement('span');
  right.className = 'mm-score';
  right.textContent = state.lang==='sv'
    ? score.exact + ' helt rätt, ' + score.partial + ' siffror rätt'
    : score.exact + ' exact, ' + score.partial + ' present';
  row.appendChild(left); row.appendChild(right);
  els.mmHistory.appendChild(row);
  els.mmHistory.scrollTop = els.mmHistory.scrollHeight;

  if(score.exact === MM_CODE_LEN){
    mm.over = true;
    onSuccess();
  } else if(mm.guesses.length >= MM_MAX_GUESSES){
    mm.over = true;
    onFail(state.lang==='sv' ? 'Du tog slut på gissningar.' : 'You ran out of guesses.');
  }
}
