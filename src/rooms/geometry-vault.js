import { randInt, strictFloat } from '../core/utils.js';
import { drawFramedShapes } from '../engine/canvas-scene.js';

export default {
  key:'geometry3d', minLevel:4, isTrial:true, accent:'#2f6d9c', chargeIcon:'🧨',
  name:{sv:'Geometri-rummet', en:'The Geometry Vault'},
  buildSet:function(_level, lang){
    var shapeKeys = ['cuboid','cube','cylinder','sphere','cone','pyramid'];
    var shuffled = shapeKeys.slice();
    for(var i=shuffled.length-1;i>0;i--){ var j=randInt(0,i); var tmp=shuffled[i]; shuffled[i]=shuffled[j]; shuffled[j]=tmp; }
    var synonyms = {
      cuboid:['ratblock','cuboid','rectangularprism','box'],
      cube:['kub','cube'],
      cylinder:['cylinder'],
      sphere:['klot','sphere','ball'],
      cone:['kon','cone'],
      pyramid:['pyramid']
    };
    function normShape(s){ return String(s).toLowerCase().trim().replace(/\s+/g,'').replace(/[åä]/g,'a').replace(/ö/g,'o'); }
    var items = shuffled.map(function(key){
      return {
        prompt: lang==='sv' ? 'Vad kallas denna geometriska figur?' : 'What is this geometric shape called?',
        sub: '',
        hint: lang==='sv' ? 'Räkna hörn, kanter och sidoytor — jämför med ett föremål du känner igen.' : 'Count corners, edges and faces — compare it to an object you recognize.',
        draw: function(ctx,w,h,ti,safeH){ drawFramedShapes(ctx,w,h,[key],safeH); },
        check: function(s){ var n=normShape(s); return synonyms[key].some(function(alt){ return normShape(alt)===n; }); }
      };
    });
    items.push({
      prompt: lang==='sv' ? 'Hur många dimensioner har dessa figurer?' : 'How many dimensions do these shapes have?',
      sub: '',
      hint: lang==='sv' ? 'Dimensioner = antal riktningar figuren sträcker sig i (längd, bredd, höjd).' : 'Dimensions = the number of directions a shape extends in (length, width, height).',
      draw: function(ctx,w,h,ti,safeH){ drawFramedShapes(ctx,w,h,['cube','sphere','cylinder'],safeH); },
      check: function(s){ return strictFloat(s) === 3; }
    });
    return {
      name: lang==='sv' ? 'Geometri-rummet' : 'The Geometry Vault',
      sub: lang==='sv'
        ? 'Rummet saknar dörr — du måste spränga dig ut. Varje rätt svar tänder en ny laddning.'
        : 'The room has no door — you must blast your way out. Each correct answer lights a new charge.',
      items: items
    };
  }
};
