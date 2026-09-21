// ================= Room registry =================
// Each room module exports one descriptor:
//   { key, name:{sv,en}, minLevel, build(level)->vars, text(lang,vars)->{prompt,sub,hint}, check(vars,answer)->bool }
// or, for the two "sequential visual" trial rooms, buildSet(level,lang)->{...}
// instead of build/text/check. Adding a new room is purely additive: drop a
// new file in src/rooms/, import it and add it to ROOMS below.
import threshold from './threshold.js';
import coins from './coins.js';
import subtraction from './subtraction.js';
import multiplication from './multiplication.js';
import estimation from './estimation.js';
import sequence from './sequence.js';
import percent from './percent.js';
import area from './area.js';
import angle from './angle.js';
import equation from './equation.js';
import base from './base.js';
import pythagoras from './pythagoras.js';
import quadratic from './quadratic.js';
import geometryVault from './geometry-vault.js';
import coordinateGrid from './coordinate-grid.js';

import { pick, uniqueDraw } from '../core/utils.js';
import { SET_SIZE } from '../engine/constants.js';

export var ROOMS = [
  threshold, coins, subtraction, multiplication, estimation, sequence, percent,
  area, angle, equation, base, pythagoras, quadratic, geometryVault, coordinateGrid
];

// A level-appropriate topic pool — shared by both the once-per-run planner
// (engine/room-plan.js) and this module's own defensive fallback below.
export function topicPool(level){
  var pool = ROOMS.filter(function(r){ return r.minLevel <= level; });
  return pool.length ? pool : ROOMS.filter(function(r){ return r.minLevel===1; });
}

// Build a themed worksheet of SET_SIZE independent problems from the given
// topic. Which topic a chamber gets is decided once per run (see
// engine/room-plan.js) so falling back to an earlier chamber and climbing
// back up to it later shows the same *kind* of problem, just with freshly
// randomized numbers — this only ever re-rolls the numbers, never the topic.
export function buildDrillSet(topicKey, level, lang){
  var def = ROOMS.filter(function(r){ return r.key === topicKey; })[0];
  // Defensive fallback — no plan yet (e.g. a save from before per-run
  // planning existed), or a key that no longer matches any room.
  if(!def) def = pick(topicPool(level));

  if(def.isTrial){
    // Sequential visual challenge: each item draws its own scene on the room canvas
    // instead of appearing as a worksheet row. All items must be answered correctly
    // to pass, same rule as the text worksheets.
    var trial = def.buildSet(level, lang);
    return {
      key: def.key, topicName: trial.name, topicSub: trial.sub || '', accent: def.accent, isTrial:true,
      chargeIcon: def.chargeIcon, items: trial.items,
      idx:0, results:[], finalized:false, wrongCount:0
    };
  }

  var items = [];
  var seen = {};
  for(var i=0;i<SET_SIZE;i++){
    var vars = uniqueDraw(seen, function(){ return def.build(level); }, function(v){ return def.short(lang, v); }, 20);
    var text = def.text(lang, vars);
    items.push({
      label: def.short(lang, vars), sub: text.sub, hint: text.hint,
      check: (function(v){ return function(s){ return def.check(v, s); }; })(vars)
    });
  }
  return {
    key: def.key, topicName: def.name[lang], topicSub: items[0].sub, accent: def.accent, isTrial:false,
    items: items, idx:0, results:[], finalized:false, wrongCount:0
  };
}
