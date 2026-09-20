import { randInt, pick, T, tierOf, numEq, strictFloat } from '../core/utils.js';

export default {
  key:'sequence', minLevel:2,
  name:{sv:'Frisen av Tal', en:'The Frieze of Numbers'}, accent:'#3f8a7a',
  build:function(level){
    var geoAllowed = tierOf(level) >= 2;
    var kind = geoAllowed ? pick(['arith','geo']) : 'arith';
    if(kind==='arith'){
      // Both the step AND the starting number scale with level — the start
      // used to be pinned to randInt(1,9) at every tier, so a worksheet only
      // ever drew from a couple dozen start/step combinations and every
      // sequence in it looked much the same. Tier 0 is left as it was
      // (still right for the youngest grades); the rest now actually widen.
      var stepRange = T(level, [[1,3],[2,6],[2,9],[3,12],[4,20]]);
      var startRange = T(level, [[1,9],[1,20],[1,60],[1,150],[1,500]]);
      var start = randInt(startRange[0], startRange[1]);
      var step = randInt(stepRange[0], stepRange[1]);
      var seq = [start, start+step, start+2*step, start+3*step];
      return {seq:seq, ans:start+4*step, kind:kind};
    } else {
      // Same fix for the geometric branch — s0 was pinned to randInt(1,4)
      // regardless of level.
      var s0Range = T(level, [[1,4],[1,4],[1,6],[1,9],[1,12]]);
      var s0 = randInt(s0Range[0], s0Range[1]), ratio = pick(tierOf(level)>=3 ? [2,3,4] : [2,3]);
      var seq2 = [s0, s0*ratio, s0*ratio*ratio, s0*ratio*ratio*ratio];
      return {seq:seq2, ans:s0*Math.pow(ratio,4), kind:kind};
    }
  },
  text:function(lang,v){
    return lang==='sv' ? {
      prompt:'Inhugget i frisen: ' + v.seq.join('  ') + '  ?',
      sub:'Vad kommer härnäst i talföljden?',
      hint: v.kind==='arith' ? 'Jämför varje tal med det föregående — här läggs samma tal till varje gång.' : 'Jämför varje tal med det föregående — här multipliceras med samma tal varje gång.'
    } : {
      prompt:'Carved into the frieze: ' + v.seq.join('  ') + '  ?',
      sub:'What comes next in the sequence?',
      hint: v.kind==='arith' ? 'Compare each term to the one before it — the same number is added each time.' : 'Compare each term to the one before it — each term is multiplied by the same number.'
    };
  },
  short:function(lang,v){ return v.seq.join(' ') + ' ?'; },
  check:function(v,s){ var n=strictFloat(s); return numEq(n,v.ans,0); }
};
