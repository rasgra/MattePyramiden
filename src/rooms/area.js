import { randInt, T, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'area', minLevel:4,
  name:{sv:'Det Sluttande Golvet', en:'The Sloped Floor'}, accent:'#b1652f',
  build:function(level){
    var range = T(level, [[4,10],[4,14],[6,20],[8,30],[10,60]]);
    var base = randInt(range[0], range[1]);
    var height = randInt(range[0], range[1]);
    return {base:base, height:height, ans: base*height/2};
  },
  text:function(lang,v){
    return lang==='sv' ? {
      prompt:'En triangulär hällplatta har basen ' + v.base + ' m och höjden ' + v.height + ' m. Vad är arean, i m²?',
      sub:'Arean av en triangel = bas × höjd / 2.',
      hint:'Multiplicera bas med höjd, dela sedan resultatet med 2: ' + v.base + ' × ' + v.height + ' / 2.'
    } : {
      prompt:'A triangular slab has base ' + v.base + ' m and height ' + v.height + ' m. What is its area, in m²?',
      sub:'Area of a triangle = base × height / 2.',
      hint:'Multiply base by height, then halve the result: ' + v.base + ' × ' + v.height + ' / 2.'
    };
  },
  short:function(lang,v){ return 'b=' + v.base + ' h=' + v.height + ' → A ='; },
  check:function(v,s){ var n=strictFloat(s); return numEq(n,v.ans,0.05); }
};
