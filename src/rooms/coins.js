import { randInt, T, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'coins', minLevel:1,
  name:{sv:'Skattkistan', en:'The Coin Chest'}, accent:'#c99a3d',
  build:function(level){
    var range = T(level, [[1,9],[5,40],[20,200],[100,5000],[1000,90000]]);
    var a = randInt(range[0], range[1]);
    var b = randInt(range[0], range[1]);
    return {a:a,b:b,ans:a+b};
  },
  text:function(lang,v){
    return lang==='sv' ? {
      prompt:'I ena handen har du ' + v.a + ' guldmynt, i den andra ' + v.b + '. Hur många mynt har du sammanlagt?',
      sub:'Lägg ihop de två högarna.',
      hint:'Räkna ihop myntens antal: ' + v.a + ' + ' + v.b + '.'
    } : {
      prompt:'You hold ' + v.a + ' gold coins in one hand and ' + v.b + ' in the other. How many coins in total?',
      sub:'Add the two piles together.',
      hint:'Simply add the two amounts: ' + v.a + ' + ' + v.b + '.'
    };
  },
  short:function(lang,v){ return v.a + ' + ' + v.b + ' ='; },
  check:function(v,s){ var n=strictFloat(s); return numEq(n,v.ans,0); }
};
