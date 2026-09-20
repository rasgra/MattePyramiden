import { randInt, T, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'multiplication', minLevel:2,
  name:{sv:'Radernas Sal', en:'The Hall of Rows'}, accent:'#8a2f2f',
  build:function(level){
    var range = T(level, [[1,5],[2,10],[2,12],[6,20],[12,30]]);
    var a = randInt(range[0], range[1]);
    var b = randInt(range[0], range[1]);
    return {a:a,b:b,ans:a*b};
  },
  text:function(lang,v){
    return lang==='sv' ? {
      prompt:'Stenblocken är lagda i ' + v.a + ' rader med ' + v.b + ' block i varje rad. Hur många block totalt?',
      sub:'Multiplicera raderna med antalet block per rad.',
      hint:'Antal rader × antal block per rad = ' + v.a + ' × ' + v.b + '.'
    } : {
      prompt:'The stone blocks are laid in ' + v.a + ' rows of ' + v.b + ' blocks each. How many blocks in total?',
      sub:'Multiply the rows by the blocks per row.',
      hint:'Rows × blocks per row = ' + v.a + ' × ' + v.b + '.'
    };
  },
  short:function(lang,v){ return v.a + ' × ' + v.b + ' ='; },
  check:function(v,s){ var n=strictFloat(s); return numEq(n,v.ans,0); }
};
