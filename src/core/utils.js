// ================= Utilities =================
// Small, dependency-free helpers shared across rooms, mini-games and the
// engine. Kept dense/hand-formatted like the rest of the game logic — see
// .prettierignore.

export function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
export function pick(arr){ return arr[randInt(0, arr.length-1)]; }
// Re-rolls build() until its sigFn signature hasn't been seen yet in this
// batch (tracked via the caller's `seen` map), so a worksheet never shows
// the same problem twice. Bounded by maxAttempts and falls back to
// whatever was last drawn, so a too-small value space (e.g. tiny number
// ranges at the easiest levels) can't spin forever or force a rarer draw.
export function uniqueDraw(seen, build, sigFn, maxAttempts){
  var value, sig, attempts = 0;
  do{
    value = build();
    sig = sigFn(value);
    attempts++;
  } while(seen[sig] && attempts < maxAttempts);
  seen[sig] = true;
  return value;
}
export function normAnswer(s){
  return String(s).trim().toLowerCase().replace(/\s+/g,'').replace(/,/g,'.').replace(/±/g,'+-');
}
export function numEq(a,b,eps){ eps = eps===undefined?0.01:eps; return Math.abs(a-b) <= eps; }
// A bare parseFloat/parseInt only reads a leading numeric prefix and silently
// ignores whatever garbage follows it (parseFloat('1asd') === 1) — so a
// worksheet room built on those would grade a typo or stray keystroke as a
// clean correct answer. These reject anything the normalized answer isn't
// made of entirely, returning NaN instead (which numEq/=== then correctly
// fails), while still normalizing the everyday variations a pupil might
// type (comma decimals, a trailing % on a percent answer).
export function strictFloat(s){
  var n = normAnswer(s).replace(/%$/, '');
  return /^[+-]?\d+(\.\d+)?$/.test(n) ? parseFloat(n) : NaN;
}
export function strictInt(s, base){
  base = base || 10;
  var n = normAnswer(s);
  var digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base);
  var re = new RegExp('^-?[' + digits + ']+$');
  return re.test(n) ? parseInt(n, base) : NaN;
}
export function parseNumberSet(s){
  return String(s).toLowerCase()
    .replace(/och|and/g,',')
    .split(/[,;\s]+/)
    .filter(function(x){ return x!==''; })
    .map(function(x){ return /^[+-]?\d+(\.\d+)?$/.test(x) ? parseFloat(x) : NaN; })
    .filter(function(x){ return !isNaN(x); });
}
export function sameMultiset(a,b,eps){
  if(a.length!==b.length) return false;
  var bb = b.slice();
  for(var i=0;i<a.length;i++){
    var idx = bb.findIndex(function(v){ return numEq(v,a[i],eps); });
    if(idx===-1) return false;
    bb.splice(idx,1);
  }
  return true;
}
// tier: 0 = grade 1-2, 1 = grade 3-4, 2 = grade 5-6, 3 = grade 7-9, 4 = college
export function tierOf(level){
  if(level<=2) return 0;
  if(level<=4) return 1;
  if(level<=6) return 2;
  if(level<=9) return 3;
  return 4;
}
export function T(level, arr){ return arr[tierOf(level)]; }
