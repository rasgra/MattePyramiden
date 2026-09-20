import { randInt, T, uniqueDraw } from '../core/utils.js';
import { drawCoordGrid, coordGridPixelToGrid } from '../engine/canvas-scene.js';

export default {
  key:'coordinates', minLevel:5, isTrial:true, accent:'#3f7a4a', chargeIcon:'🍈',
  name:{sv:'Koordinat-rummet', en:'The Coordinate Grid'},
  buildSet:function(level, lang){
    var range = T(level, [3,4,5,6,7]);
    var items = [];
    var seen = {};
    for(var i=0;i<6;i++){
      var pt = uniqueDraw(seen, function(){
        return {tx: randInt(-range, range), ty: randInt(-range, range)};
      }, function(p){ return p.tx+','+p.ty; }, 20);
      var tx = pt.tx, ty = pt.ty;
      items.push((function(tx,ty){
        // The point is marked, not typed: cursor tracks the crosshair the
        // player is currently aiming (moved via arrow keys or a click/tap
        // on the grid — see onArrow/onCanvasClick below), and check() grades
        // wherever it's sitting when the player confirms with Answer/Enter.
        // currentAnswerText() is how the shared engine (which has no idea
        // what a "cursor" is) knows what to show/submit for a self-answering
        // item like this one instead of reading typed text.
        var self = {
          cursor: {x:0, y:0},
          markedPoint: null,
          prompt: lang==='sv' ? 'Markera punkten (' + tx + ', ' + ty + ')' : 'Mark the point (' + tx + ', ' + ty + ')',
          sub: lang==='sv'
            ? 'Flytta med piltangenterna eller klicka/tryck i rutnätet, bekräfta sedan med Svara eller Enter.'
            : 'Move with the arrow keys or click/tap the grid, then confirm with Answer or Enter.',
          hint: lang==='sv'
            ? 'Första talet är x (vågrätt), andra är y (lodrätt). Positivt går åt höger/uppåt, negativt åt vänster/nedåt.'
            : 'The first number is x (horizontal), the second is y (vertical). Positive goes right/up, negative goes left/down.',
          draw: function(ctx,w,h,ti,safeH){ drawCoordGrid(ctx,w,h,range,self.markedPoint,safeH,self.cursor); },
          currentAnswerText: function(){ return self.cursor.x + ',' + self.cursor.y; },
          onArrow: function(dx,dy){
            self.cursor = {
              x: Math.max(-range, Math.min(range, self.cursor.x+dx)),
              y: Math.max(-range, Math.min(range, self.cursor.y+dy))
            };
          },
          onCanvasClick: function(px,py,w,h,safeH){
            self.cursor = coordGridPixelToGrid(w,h,range,safeH,px,py);
          },
          check: function(){
            var ok = self.cursor.x===tx && self.cursor.y===ty;
            self.markedPoint = {x:self.cursor.x, y:self.cursor.y, ok:ok};
            return ok;
          }
        };
        return self;
      })(tx,ty));
    }
    return {
      name: lang==='sv' ? 'Koordinat-rummet' : 'The Coordinate Grid',
      sub: lang==='sv'
        ? 'Samla meloner genom att markera rätt punkt i koordinatsystemet.'
        : 'Collect melons by marking the right point on the coordinate grid.',
      items: items
    };
  }
};
