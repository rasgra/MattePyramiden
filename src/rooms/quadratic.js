import { randInt, tierOf, numEq, strictFloat, parseNumberSet, sameMultiset } from '../core/utils.js';

export default {
  key:'quadratic', minLevel:8,
  name:{sv:'Salen med Två Dörrar', en:'The Hall of Two Doors'}, accent:'#b1902f',
  build:function(level){
    var college = level >= 10;
    if(college){
      var k = randInt(3,20);
      return {college:true, k:k, roots:[0,k]};
    }
    var r = randInt(2, tierOf(level)>=3 ? 16 : 9);
    return {college:false, r:r, n:r*r};
  },
  text:function(lang,v){
    if(v.college){
      return lang==='sv' ? {
        prompt:'Två dörrar öppnas bara om båda lösningarna anges: x² − ' + v.k + 'x = 0. Ange båda värdena på x (skilj med komma).',
        sub:'Bryt ut x ur uttrycket.',
        hint:'Faktorisera: x(x − ' + v.k + ') = 0, så antingen är x = 0 eller x = ' + v.k + '.'
      } : {
        prompt:'Two doors open only if both solutions are given: x² − ' + v.k + 'x = 0. Give both values of x (comma-separated).',
        sub:'Factor x out of the expression.',
        hint:'Factor it as x(x − ' + v.k + ') = 0, so either x = 0 or x = ' + v.k + '.'
      };
    }
    return lang==='sv' ? {
      prompt:'Två identiska dörrar vaktar salen. Lös: x² = ' + v.n + ' (ange den positiva roten)',
      sub:'Den här typen av ekvation har alltid två svar — ett positivt och ett negativt.',
      hint:'Fråga dig "vilket tal gånger sig själv ger ' + v.n + '?" Det talets negativa motsvarighet fungerar också.'
    } : {
      prompt:'Two identical doors guard this hall. Solve: x² = ' + v.n + ' (give the positive root)',
      sub:'This kind of equation always has two answers — a positive and a negative one.',
      hint:'Ask "what number times itself gives ' + v.n + '?" The negative of that number also works.'
    };
  },
  short:function(lang,v){
    return v.college ? ('x² − ' + v.k + 'x = 0 → x =') : ('x² = ' + v.n + ' → x =');
  },
  check:function(v,s){
    if(v.college){
      var nums = parseNumberSet(s);
      return sameMultiset(nums, v.roots, 0.01);
    }
    var n=strictFloat(s); return numEq(Math.abs(n), v.r, 0);
  }
};
