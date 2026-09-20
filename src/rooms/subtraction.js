import { randInt, T, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'subtraction', minLevel:1,
  name:{sv:'Subtraktionsrummet', en:'The Subtraction Room'}, accent:'#6b4a2f',
  build:function(level){
    var range = T(level, [[1,9],[5,40],[20,200],[100,5000],[1000,90000]]);
    var a = randInt(range[0], range[1]);
    // Almost always b <= a (a non-negative result) — occasionally
    // (under 5% of problems) b is drawn from the full range instead,
    // which can land above a and give a negative answer.
    var b = Math.random() < 0.05 ? randInt(range[0], range[1]) : randInt(range[0], a);
    return {a:a,b:b,ans:a-b};
  },
  text:function(lang,v){
    var negHint = v.ans < 0
      ? (lang==='sv' ? ' Den här gången är svaret negativt.' : ' This time the answer is negative.')
      : '';
    return lang==='sv' ? {
      prompt:'Förrådet rymmer ' + v.a + ' säckar spannmål. Arbetarna bär bort ' + v.b + '. Hur många säckar blir kvar?',
      sub:'Subtraktionsrummet! Hur mycket blir kvar när du är klar?',
      hint:'Räkna ut skillnaden: ' + v.a + ' − ' + v.b + '.' + negHint
    } : {
      prompt:'The storeroom holds ' + v.a + ' sacks of grain. The workers carry away ' + v.b + '. How many sacks are left?',
      sub:'The Subtraction Room! How much is left when you’re done?',
      hint:'Work out the difference: ' + v.a + ' − ' + v.b + '.' + negHint
    };
  },
  short:function(lang,v){ return v.a + ' − ' + v.b + ' ='; },
  check:function(v,s){ var n=strictFloat(s); return numEq(n,v.ans,0); }
};
