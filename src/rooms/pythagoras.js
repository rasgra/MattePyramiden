import { pick, tierOf, uniqueDraw, numEq, strictFloat } from '../core/utils.js';
import { drawPythagorasTriangle } from '../engine/canvas-scene.js';

var TRIPLES = [
  [3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[12,16,20],[20,21,29],
  [9,40,41],[12,35,37],[10,24,26],[15,20,25],[16,30,34],[18,24,30],[21,28,35],[15,36,39]
];

export default {
  key:'pythagoras', minLevel:7, isTrial:true, accent:'#9c3f2f', chargeIcon:'🔺',
  name:{sv:'Byggmästarens Gång', en:'The Mason’s Corridor'},
  buildSet:function(level, lang){
    var items = [];
    var seen = {};
    for(var i=0;i<5;i++){
      var tri = uniqueDraw(seen, function(){ return pick(TRIPLES); }, function(t){ return t.join('-'); }, 20);
      var leg1 = tri[0], leg2 = tri[1], hyp = tri[2];
      // Only from college level up does the puzzle ever hand you the
      // hypotenuse and ask for a leg instead — matches the old worksheet's
      // own difficulty curve exactly, just presented visually now.
      var askLeg = tierOf(level) >= 4 && Math.random() < 0.5;
      var unknownSide = askLeg ? 'leg2' : 'hyp';
      var ans = askLeg ? leg2 : hyp;

      items.push((function(leg1,leg2,hyp,unknownSide,ans){
        var self = { revealed:false, wasCorrect:false };
        self.prompt = unknownSide==='hyp'
          ? (lang==='sv'
              ? 'En ramp har basen ' + leg1 + ' alnar och höjden ' + leg2 + ' alnar. Hur lång är själva rampen (hypotenusan), i alnar?'
              : 'A ramp’s base runs ' + leg1 + ' cubits and rises ' + leg2 + ' cubits. How long is the ramp itself (the hypotenuse), in cubits?')
          : (lang==='sv'
              ? 'Rampen är ' + hyp + ' alnar lång och dess bas är ' + leg1 + ' alnar. Hur hög är rampen, i alnar?'
              : 'The ramp is ' + hyp + ' cubits long and its base runs ' + leg1 + ' cubits. How tall is the ramp, in cubits?');
        self.sub = unknownSide==='hyp'
          ? (lang==='sv'
              ? 'Pythagoras sats: kvadraten på den längsta sidan = summan av kvadraterna på de andra två. Rutorna på bilden visar varje sidas kvadrat.'
              : 'Pythagoras: the square of the longest side equals the sum of the squares of the other two — the squares in the picture show each side’s square.')
          : (lang==='sv'
              ? 'Denna gång är hypotenusan känd — lös ut den andra kateten. Rutorna på bilden visar varje sidas kvadrat.'
              : 'This time the hypotenuse is known — solve for the other leg. The squares in the picture show each side’s square.');
        self.hint = unknownSide==='hyp'
          ? (lang==='sv'
              ? 'hypotenusa² = ' + leg1 + '² + ' + leg2 + '² = ' + (leg1*leg1+leg2*leg2) + ', ta sedan roten ur.'
              : 'hypotenuse² = ' + leg1 + '² + ' + leg2 + '² = ' + (leg1*leg1+leg2*leg2) + ', then take the square root.')
          : (lang==='sv'
              ? 'höjd² = hypotenusa² − bas² = ' + hyp + '² − ' + leg1 + '² = ' + (hyp*hyp-leg1*leg1) + ', ta sedan roten ur.'
              : 'height² = hypotenuse² − base² = ' + hyp + '² − ' + leg1 + '² = ' + (hyp*hyp-leg1*leg1) + ', then take the square root.');
        self.draw = function(ctx,w,h,ti,safeH){
          drawPythagorasTriangle(ctx,w,h,leg1,leg2,hyp,unknownSide,self.revealed,self.wasCorrect,safeH);
        };
        self.check = function(s){
          var ok = numEq(strictFloat(s), ans, 0);
          self.revealed = true; self.wasCorrect = ok;
          return ok;
        };
        return self;
      })(leg1,leg2,hyp,unknownSide,ans));
    }
    return {
      name: lang==='sv' ? 'Byggmästarens Gång' : 'The Mason’s Corridor',
      sub: lang==='sv'
        ? 'Varje sidas kvadrat är ritad ut — se hur de två mindre tillsammans väger upp den största.'
        : 'Each side’s own square is drawn out — see how the two smaller ones together match the largest.',
      items: items
    };
  }
};
