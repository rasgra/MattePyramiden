import { randInt, T, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'subtraction', minLevel:1,
  name:{sv:'Subtraktionsrummet', en:'The Subtraction Room'}, accent:'#6b4a2f',
  build:function(level){
    var range = T(level, [[1,9],[5,40],[20,200],[100,5000],[1000,90000]]);
    // Occasionally (under 5% of problems) both operands are drawn
    // independently from the full range, which can land b above a and
    // give a negative answer.
    if(Math.random() < 0.05){
      var a2 = randInt(range[0], range[1]), b2 = randInt(range[0], range[1]);
      return {a:a2, b:b2, ans:a2-b2};
    }
    // Otherwise, the *difference* is drawn first and spread fairly evenly
    // across the whole span the level allows (rarely landing on exactly
    // 0), then a and b are built around it. Drawing a and b independently
    // instead (a uniform, b uniform up to a) used to badly skew the
    // answers toward small differences — a small minuend only ever leaves
    // room for a small gap, so 0s and 1s could dominate a 10-problem
    // sheet even though every (a,b) pair was individually "random".
    var span = range[1]-range[0];
    var diff = Math.random() < 0.1 ? 0 : randInt(1, span);
    var b = randInt(range[0], range[1]-diff);
    var a = b+diff;
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
