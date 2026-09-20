// The finale: chamber 12, always the combinatorics riddle ("the Treasury Door").
import { tierOf, strictInt } from '../core/utils.js';
import { comboName } from '../engine/room-names.js';

export function buildComboRoom(level, lang){
  var tier = tierOf(level);
  var pools = [3,4,6,9,9];
  var picks = [3,3,4,4,4];
  var n = pools[tier], r = picks[tier];
  var isCollege = tier===4;
  var perm = 1; for(var i=0;i<r;i++) perm *= (n-i);
  if(isCollege){
    // combination (order doesn't matter) — nCr
    function fact(x){ var f=1; for(var j=2;j<=x;j++) f*=j; return f; }
    var comb = fact(n) / (fact(r) * fact(n-r));
    return {
      name: comboName(lang),
      prompt: lang==='sv'
        ? 'Valvet väljs ut av ' + r + ' väktarstatyer bland ' + n + ' tillgängliga — ordningen spelar ingen roll. Hur många olika urval är möjliga?'
        : 'The vault is guarded by choosing ' + r + ' statues out of ' + n + ' available — order doesn’t matter. How many different selections are possible?',
      sub: lang==='sv' ? 'Det här är ett urval, inte en ordnad kod.' : 'This is a selection, not an ordered code.',
      hint: lang==='sv'
        ? 'Antal urval utan ordning = n! / (r! × (n−r)!). Här: ' + n + '! / (' + r + '! × ' + (n-r) + '!).'
        : 'Number of unordered selections = n! / (r! × (n−r)!). Here: ' + n + '! / (' + r + '! × ' + (n-r) + '!).',
      check: function(s){ var v=strictInt(s,10); return v===comb; }
    };
  }
  return {
    name: comboName(lang),
    prompt: lang==='sv'
      ? 'Slutvalvet har en kod med ' + r + ' siffror, valda bland siffrorna 1–' + n + ', ingen siffra upprepas. Hur många olika koder är möjliga?'
      : 'The final vault uses a ' + r + '-digit code drawn from the digits 1–' + n + ', no digit repeated. How many different codes are possible?',
    sub: lang==='sv' ? (n) + ' val för första siffran, en färre för varje efterföljande.' : n + ' choices for the first digit, one fewer for each after.',
    hint: lang==='sv'
      ? 'Multiplicera ' + Array.from({length:r},function(_,i){return n-i;}).join(' × ') + ' — en möjlighet färre för varje siffra som placeras.'
      : 'Multiply ' + Array.from({length:r},function(_,i){return n-i;}).join(' × ') + ' — one fewer option for each digit placed.',
    check: function(s){ var v=strictInt(s,10); return v===perm; }
  };
}
