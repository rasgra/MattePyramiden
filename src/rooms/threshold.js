import { randInt, pick, T, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'threshold', minLevel:1,
  name:{sv:'Tröskeln', en:'The Threshold'}, accent:'#4a92b6',
  build:function(level){
    var range = T(level, [[1,20],[10,99],[50,500],[100,9999],[500,99999]]);
    var op = pick(['+','-']);
    var x = randInt(range[0], range[1]), y = randInt(range[0], range[1]);
    if(op==='-' && x<y){ var t=x; x=y; y=t; }
    var ans = op==='+' ? x+y : x-y;
    return {x:x,y:y,op:op,ans:ans};
  },
  text:function(lang,v){
    return lang==='sv' ? {
      prompt:'En sliten trappsten visar: ' + v.x + ' ' + v.op + ' ' + v.y + ' = ?',
      sub:'Dela upp talen i hundratal, tiotal och ental innan du räknar.',
      hint:'Dela upp varje tal i hundratal/tiotal/ental och räkna var för sig, t.ex. 283+45 → 323, sedan +5 → 328.'
    } : {
      prompt:'A worn step reads: ' + v.x + ' ' + v.op + ' ' + v.y + ' = ?',
      sub:'Try splitting the numbers into hundreds, tens and ones first.',
      hint:'Break each number into hundreds/tens/ones and combine separately, e.g. 283+45 → 323, then +5 → 328.'
    };
  },
  short:function(lang,v){ return v.x + ' ' + v.op + ' ' + v.y + ' ='; },
  check:function(v,s){ var n=strictFloat(s); return numEq(n,v.ans,0); }
};
