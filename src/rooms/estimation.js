import { randInt, T, tierOf, strictFloat } from '../core/utils.js';

export default {
  key:'estimation', minLevel:3,
  name:{sv:'Uppsyningsmannens Lista', en:'The Overseer’s Tally'}, accent:'#8a4fb1',
  build:function(level){
    var range = T(level, [[10,40],[40,150],[100,600],[180,890],[500,3000]]);
    var a = randInt(range[0], range[1]);
    var b = randInt(Math.max(2,Math.round(range[0]/8)), Math.max(9,Math.round(range[1]/8)));
    var tol = tierOf(level) >= 3 ? 0.07 : 0.12;
    return {a:a,b:b,ans:a*b,tol:tol};
  },
  text:function(lang,v){
    return lang==='sv' ? {
      prompt:'Uppsyningsmannen vill ha ett snabbt överslag: ungefär hur mycket är ' + v.a + ' × ' + v.b + '? (avrunda båda talen först)',
      sub:'Godkänt svar ligger inom ' + Math.round(v.tol*100) + '% av det exakta värdet.',
      hint:'Avrunda ' + v.a + ' och ' + v.b + ' till närmaste tiotal eller hundratal, multiplicera sedan.'
    } : {
      prompt:'The overseer wants a quick estimate: about how much is ' + v.a + ' × ' + v.b + '? (round each number first)',
      sub:'Accepted within ' + Math.round(v.tol*100) + '% of the true product.',
      hint:'Round ' + v.a + ' and ' + v.b + ' to the nearest ten or hundred, then multiply.'
    };
  },
  short:function(lang,v){ return '≈ ' + v.a + ' × ' + v.b + ' ='; },
  check:function(v,s){ var n=strictFloat(s); return Math.abs(n-v.ans) <= v.ans*v.tol; }
};
