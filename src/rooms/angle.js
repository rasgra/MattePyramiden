import { randInt, uniqueDraw, numEq, strictFloat } from '../core/utils.js';
import { drawAngleTriangle } from '../engine/canvas-scene.js';

export default {
  key:'angle', minLevel:5, isTrial:true, accent:'#a89a2f', chargeIcon:'📐',
  name:{sv:'Den Triangulära Stämpeln', en:'The Triangular Seal'},
  buildSet:function(_level, lang){
    var items = [];
    var seen = {};
    for(var i=0;i<6;i++){
      var pair = uniqueDraw(seen, function(){
        var a = randInt(30,85);
        var bMax = Math.max(21, 150-a-10);
        return {a:a, b:randInt(20, bMax)};
      }, function(p){ return p.a+'|'+p.b; }, 20);
      var a = pair.a, b = pair.b;
      var ans = 180-a-b;
      items.push((function(a,b,ans){
        var self = { revealed:false, wasCorrect:false };
        self.prompt = lang==='sv'
          ? 'En triangulär stämpel har vinklarna ' + a + '° och ' + b + '°. Vad är den tredje vinkeln, i grader?'
          : 'A triangular seal has angles ' + a + '° and ' + b + '°. What is the third angle, in degrees?';
        self.sub = lang==='sv'
          ? 'De tre vinklarna i en triangel summerar alltid till 180°.'
          : 'A triangle’s three angles always add up to 180°.';
        self.hint = lang==='sv'
          ? 'En triangels vinklar summerar alltid till 180°, så den saknade vinkeln är 180 − ' + a + ' − ' + b + '.'
          : 'A triangle’s angles always sum to 180°, so the missing one is 180 − ' + a + ' − ' + b + '.';
        self.draw = function(ctx,w,h,ti,safeH){ drawAngleTriangle(ctx,w,h,a,b,self.revealed,self.wasCorrect,safeH); };
        self.check = function(s){
          var ok = numEq(strictFloat(s), ans, 0);
          self.revealed = true; self.wasCorrect = ok;
          return ok;
        };
        return self;
      })(a,b,ans));
    }
    return {
      name: lang==='sv' ? 'Den Triangulära Stämpeln' : 'The Triangular Seal',
      sub: lang==='sv'
        ? 'Varje triangel har tre vinklar som alltid summerar till 180°.'
        : 'Every triangle’s three angles always add up to 180°.',
      items: items
    };
  }
};
