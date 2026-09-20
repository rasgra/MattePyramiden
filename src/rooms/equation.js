import { randInt, pick, T, tierOf, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'equation', minLevel:5,
  name:{sv:'Ekvationssalen', en:'The Equation Hall'}, accent:'#8a7a2f',
  build:function(level){
    var tier = tierOf(level);
    var range = T(level, [[1,15],[1,30],[1,60],[1,99],[1,200]]);
    var op = pick(['+','-']);
    var n = randInt(range[0], range[1]);
    var xMin = tier >= 3 ? -range[1] : 0;
    var x = randInt(xMin, range[1]);
    var m = op==='+' ? x+n : x-n;
    return {op:op, n:n, m:m, x:x};
  },
  text:function(lang,v){
    return lang==='sv' ? {
      prompt:'Lös ekvationen: x ' + v.op + ' ' + v.n + ' = ' + v.m,
      sub:'Gör samma sak på båda sidor för att ensam ställa x.',
      hint: v.op==='+' ? 'x + ' + v.n + ' = ' + v.m + ' → dra bort ' + v.n + ' från båda sidor: x = ' + v.m + ' − ' + v.n + '.'
                         : 'x − ' + v.n + ' = ' + v.m + ' → lägg till ' + v.n + ' på båda sidor: x = ' + v.m + ' + ' + v.n + '.'
    } : {
      prompt:'Solve the equation: x ' + v.op + ' ' + v.n + ' = ' + v.m,
      sub:'Do the same thing to both sides to isolate x.',
      hint: v.op==='+' ? 'x + ' + v.n + ' = ' + v.m + ' → subtract ' + v.n + ' from both sides: x = ' + v.m + ' − ' + v.n + '.'
                         : 'x − ' + v.n + ' = ' + v.m + ' → add ' + v.n + ' to both sides: x = ' + v.m + ' + ' + v.n + '.'
    };
  },
  short:function(lang,v){ return 'x ' + v.op + ' ' + v.n + ' = ' + v.m + ' → x ='; },
  check:function(v,s){ var n=strictFloat(s); return numEq(n,v.x,0); }
};
