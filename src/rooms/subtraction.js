import { randInt, T, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'subtraction', minLevel:1,
  name:{sv:'Subtraktionsrummet', en:'The Subtraction Room'}, accent:'#6b4a2f',
  build:function(level){
    var range = T(level, [[1,9],[5,40],[20,200],[100,5000],[1000,90000]]);
    var a = randInt(range[0], range[1]);
    // Almost always b < a (a meaningfully positive result) — a plain
    // uniform draw of b up to a used to land on b===a roughly 1-in-a
    // times, which at the easiest tier's tiny [1,9] range meant a large
    // share of a 10-problem sheet was the trivial "anything minus itself
    // is zero", so that's now kept rare (~10% of the non-negative case)
    // rather than left to chance. Occasionally (under 5% of problems) b
    // is drawn from the full range instead, which can land above a and
    // give a negative answer.
    var b;
    if(Math.random() < 0.05) b = randInt(range[0], range[1]);
    else if(a > range[0] && Math.random() < 0.9) b = randInt(range[0], a-1);
    else b = randInt(range[0], a);
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
