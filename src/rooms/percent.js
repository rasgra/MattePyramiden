import { randInt, pick, T, tierOf, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'percent', minLevel:4,
  name:{sv:'Vågkammaren', en:'The Scale Chamber'}, accent:'#3f8a52',
  build:function(level){
    var pctPool = T(level, [
      [10,25,50], [10,25,50,20,75], [10,20,25,30,50,75], [5,15,30,40,60,70], [5,12.5,17.5,32.5,62.5]
    ]);
    var baseRange = T(level, [[20,60],[40,120],[60,250],[100,400],[200,900]]);
    var base = randInt(baseRange[0], baseRange[1]);
    var pct = pick(pctPool);
    var part = Math.round(base*pct)/100;
    // From tier 1 up, sometimes ask the reverse: "X of Y is what percent?"
    var findPercent = tierOf(level) >= 1 && Math.random() < 0.5;
    return {base:base, pct:pct, part:part, findPercent:findPercent};
  },
  text:function(lang,v){
    if(v.findPercent){
      return lang==='sv' ? {
        prompt:'Handlaren undrar: hur många procent utgör ' + v.part + ' av ' + v.base + '?',
        sub:'Dela delen med det hela, och gör om till procent.',
        hint:'Procentandel = (delen / det hela) × 100 = (' + v.part + ' / ' + v.base + ') × 100.'
      } : {
        prompt:'The merchant wonders: what percent of ' + v.base + ' is ' + v.part + '?',
        sub:'Divide the part by the whole, then convert to a percentage.',
        hint:'Percentage = (part / whole) × 100 = (' + v.part + ' / ' + v.base + ') × 100.'
      };
    }
    return lang==='sv' ? {
      prompt:'En handlares våg kräver: hur mycket är ' + v.pct + '% av ' + v.base + '?',
      sub:'Procent betyder "per hundra".',
      hint:'10% är en tiondel (dela med 10), 25% är en fjärdedel (dela med 4), 50% är hälften (dela med 2). Kombinera för andra procenttal.'
    } : {
      prompt:'A merchant’s scale demands: what is ' + v.pct + '% of ' + v.base + '?',
      sub:'Percent means "per hundred".',
      hint:'10% is a tenth (÷10), 25% is a quarter (÷4), 50% is half (÷2). Combine those for other percentages.'
    };
  },
  short:function(lang,v){
    return v.findPercent
      ? (v.part + ' ' + (lang==='sv'?'av':'of') + ' ' + v.base + ' = ?%')
      : (v.pct + '% ' + (lang==='sv'?'av':'of') + ' ' + v.base + ' =');
  },
  check:function(v,s){
    var n=strictFloat(s);
    return v.findPercent ? numEq(n, v.pct, 0.5) : numEq(n, v.part, 0.05);
  }
};
