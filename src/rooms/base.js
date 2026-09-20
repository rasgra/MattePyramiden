import { randInt, pick, T, tierOf, normAnswer, strictInt } from '../core/utils.js';

export default {
  key:'base', minLevel:6,
  name:{sv:'Det Binära Låset', en:'The Binary Lock'}, accent:'#2f6d8a',
  build:function(level){
    var useHex = tierOf(level) >= 3 && Math.random() < (tierOf(level)===4 ? 0.6 : 0.3);
    var base = useHex ? 16 : 2;
    var range = T(level, [[3,9],[5,15],[8,24],[9,60],[16,120]]);
    var n = randInt(range[0], range[1]);
    var dir = pick(['toBase','toDec']);
    return {n:n, base:base, dir:dir, repr:n.toString(base)};
  },
  text:function(lang,v){
    var baseName = v.base===16 ? {sv:'bas 16 (hexadecimalt)', en:'base 16 (hex)'} : {sv:'bas 2 (binärt)', en:'base 2 (binary)'};
    if(v.dir==='toBase'){
      return lang==='sv' ? {
        prompt:'Ett lås accepterar bara ' + baseName.sv + '. Ange ' + v.n + ' i ' + baseName.sv + '.',
        sub: v.base===16 ? 'Använd siffrorna 0-9 och a-f.' : 'Bara 0:or och 1:or öppnar den här dörren.',
        hint:'Dela talet upprepade gånger med ' + v.base + ', notera resten varje gång, läs sedan resterna nerifrån och upp.'
      } : {
        prompt:'A lock accepts only ' + baseName.en + '. Enter ' + v.n + ' in ' + baseName.en + '.',
        sub: v.base===16 ? 'Use digits 0-9 and letters a-f.' : 'Only 0s and 1s open this door.',
        hint:'Repeatedly divide by ' + v.base + ', noting the remainder each time, then read the remainders bottom-to-top.'
      };
    } else {
      return lang==='sv' ? {
        prompt:'Ett lås visar talet ' + v.repr + ' i ' + baseName.sv + '. Ange värdet i bas 10.',
        sub:'Varje position är värd ' + v.base + ' gånger mer än den till höger.',
        hint:'Räkna platsvärdena från höger: 1, ' + v.base + ', ' + (v.base*v.base) + ', ' + (v.base*v.base*v.base) + '… och summera.'
      } : {
        prompt:'A lock displays the number ' + v.repr + ' in ' + baseName.en + '. Enter its value in base 10.',
        sub:'Each position is worth ' + v.base + ' times the one to its right.',
        hint:'Place values from the right are 1, ' + v.base + ', ' + (v.base*v.base) + ', ' + (v.base*v.base*v.base) + '… add up the ones that are used.'
      };
    }
  },
  short:function(lang,v){
    return v.dir==='toBase' ? (v.n + ' → base' + v.base + ' =') : (v.repr + ' (base' + v.base + ') → dec =');
  },
  check:function(v,s){
    if(v.dir==='toBase'){
      var raw = normAnswer(s).replace(/^0+(?=[0-9a-f])/,'');
      return raw === v.repr;
    }
    // The user answers in base 10 here regardless of v.base (the *source*
    // representation being converted from) — parsing with v.base instead
    // used to silently misgrade every hex-to-decimal answer (e.g. parseInt
    // ('13', 16) is 19, not 13) and reject almost every binary-to-decimal
    // one outright (parseInt('5', 2) is NaN).
    return strictInt(s, 10) === v.n;
  }
};
