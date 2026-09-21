// ================= Canvas scene =================
// All drawing on the main #scene canvas (the corridor backdrop and the
// trial-room diagrams that borrow it) plus the small #endScene treasure
// animation. Room `draw(ctx,w,h,ti,safeH)` callbacks (see the trial rooms
// in src/rooms/) call back into strokeShape/drawFramedShapes/drawCoordGrid/
// drawAngleTriangle, so this module is a rendering toolbox those rooms
// depend on, not the other way around.
import { state, els, t } from './state.js';
import { TOTAL_ROOMS } from './constants.js';

var canvas = document.getElementById('scene');
var ctx = canvas.getContext('2d');
var animStart = performance.now();

// ---- Wireframe shape diagrams (Geometry room) ----
export function strokeShape(ctx, key, cx, cy, s){
  ctx.beginPath();
  if(key==='cuboid' || key==='cube'){
    var hw = key==='cube' ? s*0.55 : s*0.7, hh = s*0.5;
    var dx = s*0.32, dy = -s*0.22;
    var x0=cx-hw, y0=cy-hh, x1=cx+hw, y1=cy+hh;
    ctx.rect(x0, y0, x1-x0, y1-y0);
    ctx.moveTo(x0,y0); ctx.lineTo(x0+dx,y0+dy);
    ctx.moveTo(x1,y0); ctx.lineTo(x1+dx,y0+dy);
    ctx.moveTo(x1,y1); ctx.lineTo(x1+dx,y1+dy);
    ctx.moveTo(x0+dx,y0+dy); ctx.lineTo(x1+dx,y0+dy); ctx.lineTo(x1+dx,y1+dy);
  } else if(key==='cylinder'){
    var rx=s*0.7, ry=s*0.24, top=cy-s*0.65, bot=cy+s*0.65;
    ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI*2);
    ctx.moveTo(cx-rx, top); ctx.lineTo(cx-rx, bot);
    ctx.moveTo(cx+rx, top); ctx.lineTo(cx+rx, bot);
    ctx.moveTo(cx+rx, bot);
    ctx.ellipse(cx, bot, rx, ry, 0, 0, Math.PI, false);
  } else if(key==='sphere'){
    var r=s*0.75;
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.moveTo(cx+r, cy);
    ctx.ellipse(cx, cy, r, r*0.28, 0, 0, Math.PI*2);
  } else if(key==='cone'){
    var rx2=s*0.65, ry2=s*0.22, apex=cy-s*0.85, base=cy+s*0.45;
    ctx.moveTo(cx, apex); ctx.lineTo(cx-rx2, base);
    ctx.moveTo(cx, apex); ctx.lineTo(cx+rx2, base);
    ctx.moveTo(cx+rx2, base);
    ctx.ellipse(cx, base, rx2, ry2, 0, 0, Math.PI*2);
  } else if(key==='pyramid'){
    var apx=cx-s*0.05, apy=cy-s*0.85;
    var p1=[cx-s*0.65, cy+s*0.45], p2=[cx+s*0.3, cy+s*0.55], p3=[cx+s*0.65, cy+s*0.1], p4=[cx-s*0.28, cy];
    ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]); ctx.lineTo(p3[0],p3[1]); ctx.lineTo(p4[0],p4[1]); ctx.closePath();
    ctx.moveTo(apx,apy); ctx.lineTo(p1[0],p1[1]);
    ctx.moveTo(apx,apy); ctx.lineTo(p2[0],p2[1]);
    ctx.moveTo(apx,apy); ctx.lineTo(p3[0],p3[1]);
    ctx.moveTo(apx,apy); ctx.lineTo(p4[0],p4[1]);
  }
  ctx.stroke();
}

export function drawFramedShapes(ctx, w, h, keys, safeH){
  var fx = w*0.18, fy = safeH*0.08, fw = w*0.64, fh = safeH*0.82;
  ctx.fillStyle = '#173a5e';
  ctx.fillRect(fx, fy, fw, fh);
  ctx.strokeStyle = '#f4f0e6';
  ctx.lineWidth = 2;
  var n = keys.length;
  var slot = fw / n;
  keys.forEach(function(key, i){
    strokeShape(ctx, key, fx + slot*(i+0.5), fy + fh*0.55, Math.min(slot, fh) * 0.34);
  });
}

// ---- Coordinate grid diagram (Coordinate room) ----
// Geometry shared between drawing and hit-testing (coordGridPixelToGrid,
// below), so a click always resolves to exactly the point that's drawn
// under the cursor.
function coordGridGeometry(w, h, range, safeH){
  var fx = w*0.12, fy = safeH*0.06, fw = w*0.76, fh = safeH*0.88;
  var cx = fx + fw/2, cy = fy + fh/2;
  var cells = range*2;
  return { fx:fx, fy:fy, fw:fw, fh:fh, cx:cx, cy:cy, cellW: fw/cells, cellH: fh/cells };
}

// cursor, if given, is the point the player is currently aiming at (moved
// via arrow keys or a click) but hasn't confirmed yet — drawn as a hollow
// marker, distinct from `marked` (the confirmed, graded answer).
export function drawCoordGrid(ctx, w, h, range, marked, safeH, cursor){
  var g = coordGridGeometry(w, h, range, safeH);
  ctx.fillStyle = '#0f2419';
  ctx.fillRect(g.fx, g.fy, g.fw, g.fh);
  var cells = range*2;
  ctx.strokeStyle = 'rgba(120,200,150,0.35)';
  ctx.lineWidth = 1;
  for(var i=0;i<=cells;i++){
    ctx.beginPath(); ctx.moveTo(g.fx+i*g.cellW, g.fy); ctx.lineTo(g.fx+i*g.cellW, g.fy+g.fh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.fx, g.fy+i*g.cellH); ctx.lineTo(g.fx+g.fw, g.fy+i*g.cellH); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(190,235,200,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(g.cx, g.fy); ctx.lineTo(g.cx, g.fy+g.fh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g.fx, g.cy); ctx.lineTo(g.fx+g.fw, g.cy); ctx.stroke();

  if(!marked && cursor && !isNaN(cursor.x) && !isNaN(cursor.y)){
    var cpx = g.cx + cursor.x*g.cellW, cpy = g.cy - cursor.y*g.cellH;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(cpx-g.cellW/2, cpy-g.cellH/2, g.cellW, g.cellH);
    ctx.strokeStyle = '#f6c766';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cpx, cpy, 7, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cpx-12, cpy); ctx.lineTo(cpx-5, cpy); ctx.moveTo(cpx+5, cpy); ctx.lineTo(cpx+12, cpy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cpx, cpy-12); ctx.lineTo(cpx, cpy-5); ctx.moveTo(cpx, cpy+5); ctx.lineTo(cpx, cpy+12); ctx.stroke();
  }

  if(marked && !isNaN(marked.x) && !isNaN(marked.y)){
    var px = g.cx + marked.x*g.cellW, py = g.cy - marked.y*g.cellH;
    ctx.strokeStyle = marked.ok ? '#5fd97a' : '#e0664a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px-9,py-9); ctx.lineTo(px+9,py+9);
    ctx.moveTo(px+9,py-9); ctx.lineTo(px-9,py+9);
    ctx.stroke();
  }
}

// Inverse of the grid math above — used to turn a click/tap into the
// nearest grid point, clamped to the visible range so a tap near the edge
// still resolves to something sane instead of nothing.
export function coordGridPixelToGrid(w, h, range, safeH, px, py){
  var g = coordGridGeometry(w, h, range, safeH);
  var gx = Math.round((px - g.cx) / g.cellW);
  var gy = Math.round((g.cy - py) / g.cellH);
  return { x: Math.max(-range, Math.min(range, gx)), y: Math.max(-range, Math.min(range, gy)) };
}

// Clicking (or tapping) the canvas hands the point straight to whichever
// trial item is currently active, if it wants one — only the Coordinate
// Grid room defines onCanvasClick today, but any future room could.
canvas.addEventListener('click', function(e){
  var set = state.set;
  if(!set || !set.isTrial || set.finalized) return;
  var item = set.items[set.idx];
  if(!item || typeof item.onCanvasClick !== 'function') return;
  var rect = canvas.getBoundingClientRect();
  if(rect.width <= 0 || rect.height <= 0) return;
  var scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  item.onCanvasClick((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY, canvas.width, canvas.height, visibleCanvasHeight());
  if(typeof item.currentAnswerText === 'function') els.input.value = item.currentAnswerText();
});

// ---- Angle-sum triangle diagram (Triangular Seal room) ----
// Draws an actual triangle whose base angles are angA/angB (uniformly scaled
// to fit the frame, so the picture is genuinely to scale, not just a stand-in).
export function drawAngleTriangle(ctx, w, h, angA, angB, revealed, correct, safeH){
  var fx = w*0.14, fy = safeH*0.08, fw = w*0.72, fh = safeH*0.84;
  ctx.fillStyle = '#241a10';
  ctx.fillRect(fx, fy, fw, fh);

  var rad = Math.PI/180;
  var tanA = Math.tan(angA*rad), tanB = Math.tan(angB*rad);
  var xUnit = tanB/(tanA+tanB); // base = 1 unit
  var yUnit = xUnit*tanA;
  var scale = Math.min((fw*0.72)/1, (fh*0.72)/yUnit);
  var base = scale, apexX = xUnit*scale, apexY = yUnit*scale;

  var A = { x: fx + (fw-base)/2, y: fy + fh*0.82 };
  var B = { x: A.x + base, y: A.y };
  var C = { x: A.x + apexX, y: A.y - apexY };

  ctx.fillStyle = 'rgba(217,154,61,0.16)';
  ctx.strokeStyle = '#f4d9a0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.font = '600 ' + Math.round(h*0.048) + 'px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6c766';
  ctx.fillText(angA + '°', A.x + (C.x>A.x?26:-26), A.y - 16);
  ctx.fillText(angB + '°', B.x + (C.x<B.x?26:-26), B.y - 16);

  ctx.fillStyle = revealed ? (correct ? '#5fd97a' : '#e0664a') : '#eae0c8';
  ctx.font = '700 ' + Math.round(h*0.052) + 'px "IBM Plex Mono", monospace';
  ctx.fillText(revealed ? (180-angA-angB) + '°' : '?', C.x, C.y + 24);
}

// ---- Right-triangle-with-squares diagram (Mason's Corridor / Pythagoras
// room) — the classic textbook picture: a square built outward on each
// side, so the a²+b²=c² relationship the hint talks about is something the
// pupil can actually see, not just read. `unknownSide` ('leg1'|'leg2'|'hyp')
// is which one stays a "?" (on both the edge and its square) until
// revealed. Drawn to true relative scale, so a stubby 3-4-5 and a long,
// shallow 9-40-41 genuinely look different, not like the same stock shape
// with different labels. ----
export function drawPythagorasTriangle(ctx, w, h, leg1, leg2, hyp, unknownSide, revealed, correct, safeH){
  var fx = w*0.06, fy = safeH*0.05, fw = w*0.88, fh = safeH*0.90;
  ctx.fillStyle = '#1b140d';
  ctx.fillRect(fx, fy, fw, fh);

  // Right angle at A; leg1 runs along +x to B, leg2 runs along -y to C
  // (canvas y grows downward, so "up" is negative) — a pure scale+translate
  // below keeps both legs axis-aligned in pixel space too.
  var A = {x:0, y:0}, B = {x:leg1, y:0}, C = {x:0, y:-leg2};

  function squareOn(p1, p2, away){
    var dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.sqrt(dx*dx+dy*dy);
    var nx=-dy/len, ny=dx/len;
    var mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
    if((mx-away.x)*nx + (my-away.y)*ny < 0){ nx=-nx; ny=-ny; } // point away from the third vertex
    return [p1, p2, {x:p2.x+nx*len, y:p2.y+ny*len}, {x:p1.x+nx*len, y:p1.y+ny*len}];
  }
  var sqLeg1 = squareOn(A,B,C), sqLeg2 = squareOn(C,A,B), sqHyp = squareOn(B,C,A);

  // Fit the whole composite (triangle + all three squares) into the frame.
  var allPts = [A,B,C].concat(sqLeg1, sqLeg2, sqHyp);
  var minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  allPts.forEach(function(p){
    if(p.x<minX) minX=p.x; if(p.x>maxX) maxX=p.x;
    if(p.y<minY) minY=p.y; if(p.y>maxY) maxY=p.y;
  });
  var scale = Math.min(fw/(maxX-minX), fh/(maxY-minY)) * 0.8;
  var offX = fx + fw/2 - (minX+maxX)/2*scale, offY = fy + fh/2 - (minY+maxY)/2*scale;
  function tp(p){ return {x: p.x*scale+offX, y: p.y*scale+offY}; }
  var Ap=tp(A), Bp=tp(B), Cp=tp(C);
  var squaresP = { leg1: sqLeg1.map(tp), leg2: sqLeg2.map(tp), hyp: sqHyp.map(tp) };
  var values = { leg1:leg1, leg2:leg2, hyp:hyp };

  function fillPoly(pts, style){
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(var i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,210,180,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  function squareCenter(pts){
    var sx=0, sy=0;
    pts.forEach(function(p){ sx+=p.x; sy+=p.y; });
    return {x:sx/4, y:sy/4};
  }

  ['leg1','leg2','hyp'].forEach(function(key){
    var isUnknown = key===unknownSide;
    var fillStyle = isUnknown
      ? (revealed ? (correct ? 'rgba(95,217,122,0.24)' : 'rgba(224,102,74,0.24)') : 'rgba(217,154,61,0.14)')
      : 'rgba(74,146,182,0.16)';
    fillPoly(squaresP[key], fillStyle);
  });

  // The triangle itself, drawn over the squares so its outline reads crisp.
  ctx.beginPath();
  ctx.moveTo(Ap.x,Ap.y); ctx.lineTo(Bp.x,Bp.y); ctx.lineTo(Cp.x,Cp.y); ctx.closePath();
  ctx.fillStyle = 'rgba(217,154,61,0.12)';
  ctx.fill();
  ctx.strokeStyle = '#f4d9a0';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Right-angle marker at A — legs are axis-aligned in pixel space, so this
  // is just a small square, not a rotated one.
  var rs = Math.min(Math.abs(Bp.x-Ap.x), Math.abs(Cp.y-Ap.y)) * 0.11;
  ctx.strokeStyle = '#f4d9a0'; ctx.lineWidth = 1.5;
  ctx.strokeRect(Ap.x, Ap.y-rs, rs, rs);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ['leg1','leg2','hyp'].forEach(function(key){
    var isUnknown = key===unknownSide;
    var label = isUnknown ? (revealed ? String(values[key]) : '?') : String(values[key]);
    var sqLabel = isUnknown ? (revealed ? String(values[key]*values[key]) : '?') : String(values[key]*values[key]);
    var color = isUnknown ? (revealed ? (correct ? '#5fd97a' : '#e0664a') : '#f6c766') : '#eae0c8';

    // Both labels are anchored to the square's own geometry, never to the
    // shared right-angle vertex — a short leg's square is naturally small
    // on screen either way, but at least this no longer crowds into the
    // *other* leg's corner the way anchoring near the shared edge did.
    // The length sits a constant pixel distance from the square's center,
    // back toward the shared edge — a fixed offset (rather than a fraction
    // of the square's own size) keeps the two labels apart by roughly the
    // same amount whether the square is wide or tall, since a fraction of
    // "near edge to center" collapses toward zero along whichever axis the
    // square happens to be short on.
    var sq = squaresP[key];
    var nearMid = {x:(sq[0].x+sq[1].x)/2, y:(sq[0].y+sq[1].y)/2};
    var c = squareCenter(sq);
    var squareSidePx = Math.sqrt(Math.pow(sq[1].x-sq[0].x,2) + Math.pow(sq[1].y-sq[0].y,2));
    var toEdge = {x:nearMid.x-c.x, y:nearMid.y-c.y};
    var toEdgeLen = Math.sqrt(toEdge.x*toEdge.x + toEdge.y*toEdge.y) || 1;

    ctx.fillStyle = color;
    if(squareSidePx > 100){
      // Room for both: the length offset from center back toward the shared
      // edge, the squared value at the square's true center.
      var offsetPx = Math.min(46, toEdgeLen*0.85);
      var lenPos = { x: c.x + (toEdge.x/toEdgeLen)*offsetPx, y: c.y + (toEdge.y/toEdgeLen)*offsetPx };
      ctx.font = '700 ' + Math.round(h*0.04) + 'px "IBM Plex Mono", monospace';
      ctx.fillText(label, lenPos.x, lenPos.y);
      ctx.font = '600 ' + Math.round(h*0.03) + 'px "IBM Plex Mono", monospace';
      ctx.fillText(sqLabel, c.x, c.y);
    } else {
      // Too small for two lines — just the length, centered, no squared value.
      ctx.font = '700 ' + Math.round(h*0.04) + 'px "IBM Plex Mono", monospace';
      ctx.fillText(label, c.x, c.y);
    }
  });
}

// The parchment card overlays the bottom of the canvas, and its height
// depends on the current room's prompt/sub/hint text — so trial-room
// diagrams (which share the canvas) need to know how much of it is
// actually still visible above the card, not just assume all of it is.
export function visibleCanvasHeight(){
  var canvasRect = canvas.getBoundingClientRect();
  if(canvasRect.height <= 0) return canvas.height * 0.45;
  var parchRect = els.parchment.getBoundingClientRect();
  var frac = (parchRect.top - canvasRect.top) / canvasRect.height;
  if(!isFinite(frac) || frac < 0.15) frac = 0.45;
  return canvas.height * Math.min(frac, 0.95);
}

// A single flickering wall torch — shared between the main corridor scene
// and the end-of-game illustrations below, so both light their chamber the
// same way.
export function drawTorch(ctx, x, y, scale, ti){
  var flick = 0.75 + 0.25*Math.sin(ti*9 + x*0.05) + 0.08*Math.sin(ti*23+x);
  var r = 46*scale*flick;
  var g = ctx.createRadialGradient(x,y,2,x,y,r);
  g.addColorStop(0, 'rgba(255,220,140,0.9)'); g.addColorStop(0.4, 'rgba(230,140,50,0.45)'); g.addColorStop(1, 'rgba(230,140,50,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x-4*scale, y, 8*scale, 22*scale);
  ctx.beginPath();
  ctx.moveTo(x, y-4*scale);
  ctx.quadraticCurveTo(x-9*scale*flick, y-24*scale*flick, x, y-40*scale*flick);
  ctx.quadraticCurveTo(x+9*scale*flick, y-24*scale*flick, x, y-4*scale);
  ctx.fillStyle = '#f6c766'; ctx.fill();
}

export function drawScene(){
  var w = canvas.width, h = canvas.height;
  var ti = (performance.now() - animStart) / 1000;
  ctx.clearRect(0,0,w,h);

  if(state.set && state.set.isTrial && !state.set.finalized){
    var item = state.set.items[state.set.idx];
    if(item && item.draw){ item.draw(ctx, w, h, ti, visibleCanvasHeight()); return; }
  }

  var bg = ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0, '#1c130c'); bg.addColorStop(1, '#080503');
  ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);

  var cx = w/2, cy = h*0.52;
  var stages = 6;
  for(var i=stages;i>=1;i--){
    var f = i/stages;
    var hw = (w*0.5) * f, hh = (h*0.42) * f;
    var shade = 20 + (stages-i)*10;
    ctx.strokeStyle = 'rgba(' + (120+shade) + ',' + (90+shade*0.6) + ',' + (50+shade*0.3) + ',0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx-hw, cy-hh, hw*2, hh*2);
  }
  var portalW = w*0.5/stages, portalH = h*0.42/stages;
  var pg = ctx.createRadialGradient(cx,cy, 4, cx,cy, Math.max(portalW,portalH)*1.4);
  pg.addColorStop(0, 'rgba(246,199,102,0.55)'); pg.addColorStop(1, 'rgba(246,199,102,0)');
  ctx.fillStyle = pg; ctx.fillRect(0,0,w,h);

  ctx.strokeStyle = 'rgba(255,220,150,0.06)';
  for(var j=-3;j<=3;j++){
    ctx.beginPath(); ctx.moveTo(cx + j*40, h); ctx.lineTo(cx + j*6, cy + h*0.3); ctx.stroke();
  }

  drawTorch(ctx, w*0.14, h*0.62, 1.1, ti); drawTorch(ctx, w*0.86, h*0.62, 1.1, ti);
  drawTorch(ctx, w*0.32, h*0.5, 0.7, ti); drawTorch(ctx, w*0.68, h*0.5, 0.7, ti);

  ctx.fillStyle = 'rgba(246,199,102,0.85)';
  ctx.font = '600 ' + (h*0.05) + 'px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillText(t().chamber(state.room+1, TOTAL_ROOMS), cx, cy - h*0.32);

  var vg = ctx.createRadialGradient(cx,h*0.55,h*0.15, cx,h*0.55,h*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0,0,w,h);
}
(function loop(){ drawScene(); requestAnimationFrame(loop); })();

// ---- Victory scene: the treasure chamber, a chest, and a shaft of
// sunlight through a breach in the wall — drawn once the pyramid is
// cleared. Self-terminating animation loop: it just stops rescheduling
// itself once the end overlay is no longer showing the win state. ----
function fillRoundRect(c,x,y,w,h,r){
  if(c.roundRect){ c.beginPath(); c.roundRect(x,y,w,h,r); c.fill(); }
  else { c.fillRect(x,y,w,h); }
}
var endSceneRunning = false;
function drawTreasureScene(){
  var c = els.endScene;
  if(!c) return;
  var ectx = c.getContext('2d');
  var w = c.width, h = c.height;
  var ti = (performance.now() - animStart) / 1000;
  ectx.clearRect(0,0,w,h);

  var bg = ectx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0, '#241b13'); bg.addColorStop(1, '#0c0906');
  ectx.fillStyle = bg; ectx.fillRect(0,0,w,h);
  ectx.fillStyle = '#150f09';
  ectx.fillRect(0, h*0.72, w, h*0.28);

  // The breach in the wall and the beam it casts across the floor.
  var openX = w*0.66, openY = h*0.10, openW = w*0.30, openH = h*0.5;
  var beam = ectx.createLinearGradient(openX, openY, w*0.18, h);
  beam.addColorStop(0, 'rgba(255,244,214,.85)');
  beam.addColorStop(1, 'rgba(255,244,214,0)');
  ectx.fillStyle = beam;
  ectx.beginPath();
  ectx.moveTo(openX, openY);
  ectx.lineTo(openX+openW, openY);
  ectx.lineTo(w*0.22, h);
  ectx.lineTo(-w*0.1, h);
  ectx.closePath();
  ectx.fill();

  var glow = ectx.createRadialGradient(openX+openW*0.5, openY+openH*0.32, 4, openX+openW*0.5, openY+openH*0.32, openW*0.95);
  glow.addColorStop(0, 'rgba(255,250,230,1)');
  glow.addColorStop(.5, 'rgba(255,225,155,.55)');
  glow.addColorStop(1, 'rgba(255,225,155,0)');
  ectx.fillStyle = glow;
  ectx.beginPath();
  ectx.ellipse(openX+openW*0.5, openY+openH*0.35, openW*0.6, openH*0.45, 0, 0, Math.PI*2);
  ectx.fill();
  ectx.fillStyle = '#fdf6e3';
  ectx.beginPath();
  ectx.moveTo(openX, openY+openH*0.5);
  ectx.quadraticCurveTo(openX, openY, openX+openW*0.5, openY);
  ectx.quadraticCurveTo(openX+openW, openY, openX+openW, openY+openH*0.5);
  ectx.lineTo(openX+openW, openY+openH);
  ectx.lineTo(openX, openY+openH);
  ectx.closePath();
  ectx.fill();

  // Dust motes drifting down through the light.
  ectx.fillStyle = '#fff';
  for(var i=0;i<12;i++){
    var seed = i*41.7;
    var drift = (ti*0.12 + i/12) % 1;
    var px = openX*0.35 + (w*0.15 - openX*0.35)*drift + Math.sin(ti+seed)*5;
    var py = openY + (h*0.95-openY)*drift;
    ectx.globalAlpha = 0.12 + 0.35*Math.abs(Math.sin(ti*1.4+seed));
    ectx.beginPath(); ectx.arc(px, py, 1.3, 0, Math.PI*2); ectx.fill();
  }
  ectx.globalAlpha = 1;

  // The treasure chest, sitting where the light lands.
  var cx = w*0.34, cy = h*0.76, cw = w*0.24, ch = h*0.16;
  ectx.fillStyle = 'rgba(0,0,0,.35)';
  ectx.beginPath(); ectx.ellipse(cx, cy+ch*0.5, cw*0.62, ch*0.2, 0, 0, Math.PI*2); ectx.fill();

  var bodyGrad = ectx.createLinearGradient(cx-cw/2, cy, cx+cw/2, cy+ch*0.6);
  bodyGrad.addColorStop(0, '#8a5a24'); bodyGrad.addColorStop(1, '#4a2c10');
  ectx.fillStyle = bodyGrad;
  fillRoundRect(ectx, cx-cw/2, cy, cw, ch*0.6, Math.max(3,w*0.01));

  ectx.fillStyle = '#7a4a1e';
  ectx.beginPath();
  ectx.moveTo(cx-cw/2, cy);
  ectx.quadraticCurveTo(cx, cy-ch*0.65, cx+cw/2, cy);
  ectx.closePath();
  ectx.fill();

  ectx.strokeStyle = '#f6c766'; ectx.lineWidth = Math.max(2, w*0.006);
  ectx.beginPath(); ectx.moveTo(cx-cw/2, cy+ch*0.2); ectx.lineTo(cx+cw/2, cy+ch*0.2); ectx.stroke();
  ectx.beginPath(); ectx.moveTo(cx, cy-ch*0.6); ectx.lineTo(cx, cy+ch*0.58); ectx.stroke();
  ectx.fillStyle = '#f6c766';
  fillRoundRect(ectx, cx-cw*0.05, cy+ch*0.04, cw*0.1, ch*0.24, 2);

  var sparkle = 0.4 + 0.6*Math.abs(Math.sin(ti*3));
  ectx.fillStyle = 'rgba(255,255,255,' + sparkle + ')';
  ectx.beginPath(); ectx.arc(cx+cw*0.3, cy+ch*0.2, 2, 0, Math.PI*2); ectx.fill();

  [[-0.4,0.62],[0.32,0.6],[0.46,0.44],[-0.18,0.68]].forEach(function(p){
    ectx.fillStyle = '#e0a83a';
    ectx.beginPath();
    ectx.ellipse(cx+p[0]*cw, cy+p[1]*ch, cw*0.05, cw*0.024, 0, 0, Math.PI*2);
    ectx.fill();
  });
}

// ---- Defeat scene: a wrapped mummy standing in a torch-lit burial niche —
// drawn once the air runs out. Mirrors the treasure scene structurally
// (same shared canvas, same self-terminating loop below), just grimmer. ----
function drawMummyScene(){
  var c = els.endScene;
  if(!c) return;
  var ectx = c.getContext('2d');
  var w = c.width, h = c.height;
  var ti = (performance.now() - animStart) / 1000;
  ectx.clearRect(0,0,w,h);

  var bg = ectx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0, '#1a1712'); bg.addColorStop(1, '#050403');
  ectx.fillStyle = bg; ectx.fillRect(0,0,w,h);
  ectx.fillStyle = '#100d09';
  ectx.fillRect(0, h*0.82, w, h*0.18);

  drawTorch(ectx, w*0.10, h*0.58, 1.0, ti);
  drawTorch(ectx, w*0.90, h*0.58, 1.0, ti);

  // The niche cut into the back wall, housing the sarcophagus.
  var nx = w*0.5, nw = w*0.34, nTop = h*0.10, nBot = h*0.86;
  ectx.fillStyle = '#0c0906';
  ectx.beginPath();
  ectx.moveTo(nx-nw/2, nBot);
  ectx.lineTo(nx-nw/2, nTop+nw*0.28);
  ectx.quadraticCurveTo(nx-nw/2, nTop, nx, nTop);
  ectx.quadraticCurveTo(nx+nw/2, nTop, nx+nw/2, nTop+nw*0.28);
  ectx.lineTo(nx+nw/2, nBot);
  ectx.closePath();
  ectx.fill();
  ectx.strokeStyle = 'rgba(217,154,61,0.35)'; ectx.lineWidth = Math.max(2,w*0.006);
  ectx.stroke();

  // Faint ambient glow inside the niche so the mummy isn't a flat silhouette.
  var ambient = ectx.createRadialGradient(nx, h*0.55, 6, nx, h*0.55, nw*0.9);
  ambient.addColorStop(0, 'rgba(180,140,80,0.18)');
  ambient.addColorStop(1, 'rgba(180,140,80,0)');
  ectx.fillStyle = ambient; ectx.fillRect(nx-nw/2, nTop, nw, nBot-nTop);

  // ---- The mummy itself: a tapered wrapped body, a wrapped head, and a
  // few curved "bandage" strokes following the taper. ----
  var bodyCx = nx;
  var headR = w*0.05;
  var headCy = h*0.28 + headR*0.9;
  var shoulderY = headCy + headR*1.3, botY = h*0.80;
  var shoulderW = w*0.095, hipW = w*0.075, footW = w*0.05;
  var hipY = botY - (botY-shoulderY)*0.22;

  ectx.fillStyle = '#d8c9a3';
  ectx.beginPath();
  ectx.moveTo(bodyCx-shoulderW, shoulderY);
  ectx.quadraticCurveTo(bodyCx-shoulderW*1.05, (shoulderY+hipY)/2, bodyCx-hipW, hipY);
  ectx.quadraticCurveTo(bodyCx-hipW*0.9, (hipY+botY)/2, bodyCx-footW, botY);
  ectx.lineTo(bodyCx+footW, botY);
  ectx.quadraticCurveTo(bodyCx+hipW*0.9, (hipY+botY)/2, bodyCx+hipW, hipY);
  ectx.quadraticCurveTo(bodyCx+shoulderW*1.05, (shoulderY+hipY)/2, bodyCx+shoulderW, shoulderY);
  ectx.closePath();
  ectx.fill();
  ectx.strokeStyle = 'rgba(90,70,40,0.5)'; ectx.lineWidth = 1.5; ectx.stroke();

  ectx.beginPath();
  ectx.ellipse(bodyCx, headCy, headR, headR*1.15, 0, 0, Math.PI*2);
  ectx.fill(); ectx.stroke();

  ectx.strokeStyle = 'rgba(120,98,58,0.55)'; ectx.lineWidth = Math.max(1.5, w*0.004);
  var bands = 9;
  for(var i=0;i<=bands;i++){
    var f = i/bands;
    var y = shoulderY + (botY-shoulderY)*f;
    var halfW = (shoulderW + (footW-shoulderW)*f) * (1 - 0.15*Math.sin(f*Math.PI));
    ectx.beginPath();
    ectx.moveTo(bodyCx-halfW, y);
    ectx.quadraticCurveTo(bodyCx, y+halfW*0.28, bodyCx+halfW, y);
    ectx.stroke();
  }
  // Crossed wraps over the chest, and a few bands across the wrapped head.
  ectx.beginPath(); ectx.moveTo(bodyCx-shoulderW*0.9, shoulderY+6); ectx.lineTo(bodyCx+shoulderW*0.5, shoulderY+headR*1.6); ectx.stroke();
  ectx.beginPath(); ectx.moveTo(bodyCx+shoulderW*0.9, shoulderY+6); ectx.lineTo(bodyCx-shoulderW*0.5, shoulderY+headR*1.6); ectx.stroke();
  for(var hi=1; hi<=3; hi++){
    var hy = headCy - headR*0.6 + hi*headR*0.4;
    ectx.beginPath();
    ectx.moveTo(bodyCx-headR*0.9, hy);
    ectx.quadraticCurveTo(bodyCx, hy+headR*0.22, bodyCx+headR*0.9, hy);
    ectx.stroke();
  }

  // Glowing eyes behind the wrap, pulsing gently.
  var eyeGlow = 0.55 + 0.45*Math.abs(Math.sin(ti*1.6));
  ectx.fillStyle = 'rgba(255,120,40,' + eyeGlow + ')';
  ectx.beginPath(); ectx.ellipse(bodyCx-headR*0.35, headCy, headR*0.16, headR*0.08, 0, 0, Math.PI*2); ectx.fill();
  ectx.beginPath(); ectx.ellipse(bodyCx+headR*0.35, headCy, headR*0.16, headR*0.08, 0, 0, Math.PI*2); ectx.fill();

  // A loose bandage end drifting near the feet.
  ectx.strokeStyle = 'rgba(180,160,120,0.5)'; ectx.lineWidth = 2;
  ectx.beginPath();
  ectx.moveTo(bodyCx-footW*0.7, botY);
  ectx.quadraticCurveTo(bodyCx-footW*1.6 + Math.sin(ti*1.3)*4, botY+14, bodyCx-footW*1.3 + Math.sin(ti*1.3)*6, botY+26);
  ectx.stroke();

  var vg = ectx.createRadialGradient(w*0.5,h*0.55,h*0.12, w*0.5,h*0.55,h*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.6)');
  ectx.fillStyle = vg; ectx.fillRect(0,0,w,h);
}

// ---- Intro illustrations: a small scene per non-letter intro beat, so
// every "page" of the intro carries its own picture instead of leaving
// the hieroglyph-wall/pitch-black-corridor/shaft beats as bare text next
// to only the letter's candle. Kept intentionally simple (flat shapes,
// no full corridor perspective) since this is a supporting illustration
// on a small canvas, not the main stage. ----
function drawIntroWallScene(ctx, w, h, ti){
  ctx.clearRect(0,0,w,h);
  var bg = ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0, '#241b13'); bg.addColorStop(1, '#0c0906');
  ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);

  // A carved stone panel with a small column of hieroglyph-style glyphs —
  // simplified, decorative stand-ins, not an attempt at real hieroglyphs.
  var px = w*0.06, py = h*0.08, pw = w*0.56, ph = h*0.84;
  ctx.fillStyle = '#1b140d';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(217,154,61,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  var glyphs = 4, cell = ph/glyphs;
  ctx.strokeStyle = '#f4d9a0'; ctx.fillStyle = 'rgba(244,217,160,0.18)'; ctx.lineWidth = 2.5;
  for(var i=0;i<glyphs;i++){
    var gx = px + pw/2, gy = py + cell*(i+0.5), s = cell*0.32;
    ctx.save(); ctx.translate(gx, gy);
    if(i===0){ // sun disk over a horizon arc
      ctx.beginPath(); ctx.arc(0, -s*0.55, s*0.42, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, s*0.15, s*0.85, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
    } else if(i===1){ // a watching eye
      ctx.beginPath(); ctx.ellipse(0, 0, s*0.85, s*0.42, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s*0.18, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s*0.55, s*0.2); ctx.quadraticCurveTo(s*0.8, s*0.7, s*0.5, s*0.9); ctx.stroke();
    } else if(i===2){ // an ankh
      ctx.beginPath(); ctx.ellipse(0, -s*0.6, s*0.38, s*0.46, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s*0.15); ctx.lineTo(0, s*0.9); ctx.moveTo(-s*0.55, s*0.2); ctx.lineTo(s*0.55, s*0.2); ctx.stroke();
    } else { // wavy water lines
      for(var wi=0; wi<3; wi++){
        var wy = -s*0.5 + wi*s*0.5;
        ctx.beginPath();
        ctx.moveTo(-s*0.9, wy);
        ctx.quadraticCurveTo(-s*0.3, wy-s*0.25, s*0.3, wy);
        ctx.quadraticCurveTo(s*0.9, wy+s*0.25, s*0.9, wy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // The corner archway the tour's already vanishing into — a fading torch
  // glow with a few small silhouettes walking away.
  var ax = w*0.80, ay = h*0.52;
  var flick = 0.85 + 0.15*Math.sin(ti*6);
  var glow = ctx.createRadialGradient(ax, ay, 4, ax, ay, w*0.2*flick);
  glow.addColorStop(0, 'rgba(255,210,140,0.5)');
  glow.addColorStop(1, 'rgba(255,210,140,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(ax, ay, w*0.2, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = 'rgba(15,10,6,0.88)';
  [-16, 2, 18].forEach(function(dx, gi){
    var fx = ax + dx*flick, fy = ay + h*0.1 - gi*2;
    ctx.beginPath(); ctx.ellipse(fx, fy, 5, 14, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx, fy-16, 4.5, 0, Math.PI*2); ctx.fill();
  });
}

function drawIntroCorridorScene(ctx, w, h, ti){
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#050403';
  ctx.fillRect(0,0,w,h);

  // Dim stone walls receding into the dark — visible enough to read as a
  // corridor (this is dim, not literally invisible), but with no torch:
  // the group's light is already gone.
  var cx = w/2, cy = h*0.52, stages = 5;
  for(var i=stages;i>=1;i--){
    var f = i/stages;
    var hw = (w*0.42)*f, hh = (h*0.38)*f;
    ctx.strokeStyle = 'rgba(130,102,66,' + (0.1 + (stages-i)*0.04) + ')';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx-hw, cy-hh, hw*2, hh*2);
  }

  // A single groping hand, dimly lit, feeling its way into the dark from
  // the corner — the only sign of a person left in the frame.
  ctx.save();
  ctx.translate(w*0.24, h*0.84);
  ctx.rotate(-0.3);
  ctx.fillStyle = 'rgba(190,162,122,' + (0.5 + 0.08*Math.sin(ti*1.5)) + ')';
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.045, h*0.08, 0, 0, Math.PI*2); ctx.fill();
  for(var fi=-2; fi<=2; fi++){
    ctx.beginPath(); ctx.ellipse(fi*w*0.017, -h*0.075, w*0.011, h*0.045, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  var vg = ctx.createRadialGradient(cx,cy,h*0.05, cx,cy,h*0.7);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.7)');
  ctx.fillStyle = vg; ctx.fillRect(0,0,w,h);
}

function drawIntroLampScene(ctx, w, h, ti){
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#050403';
  ctx.fillRect(0,0,w,h);

  // The same dim corridor walls as the pitch-black beat, but now lit by a
  // real light source instead of just ambient gloom.
  var cx = w/2, cy = h*0.5, stages = 5;
  for(var i=stages;i>=1;i--){
    var f = i/stages;
    var hw = (w*0.42)*f, hh = (h*0.38)*f;
    ctx.strokeStyle = 'rgba(150,115,70,' + (0.06 + (stages-i)*0.035) + ')';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx-hw, cy-hh, hw*2, hh*2);
  }

  var lampX = w*0.47, lampY = h*0.68;
  var flick = 0.85 + 0.15*Math.sin(ti*7);

  // The lamp's glow, spilling out into the dark around it.
  var glow = ctx.createRadialGradient(lampX, lampY-h*0.05, 4, lampX, lampY-h*0.05, w*0.32*flick);
  glow.addColorStop(0, 'rgba(255,214,140,0.6)');
  glow.addColorStop(0.5, 'rgba(255,180,90,0.2)');
  glow.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(lampX, lampY-h*0.05, w*0.32*flick, 0, Math.PI*2); ctx.fill();

  // The folded note, lying flat beside the lamp.
  ctx.save();
  ctx.translate(lampX+w*0.11, lampY+h*0.025);
  ctx.rotate(-0.14);
  ctx.fillStyle = '#d9cba3';
  ctx.fillRect(-w*0.045, -h*0.02, w*0.09, h*0.04);
  ctx.strokeStyle = 'rgba(90,70,40,0.45)'; ctx.lineWidth = 1;
  ctx.strokeRect(-w*0.045, -h*0.02, w*0.09, h*0.04);
  ctx.restore();

  // The oil lamp itself: a rounded vessel with a spout, resting on the floor.
  ctx.fillStyle = '#3a2f22';
  ctx.beginPath(); ctx.ellipse(lampX, lampY, w*0.055, h*0.028, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(lampX+w*0.048, lampY-h*0.006);
  ctx.quadraticCurveTo(lampX+w*0.09, lampY-h*0.014, lampX+w*0.1, lampY-h*0.026);
  ctx.quadraticCurveTo(lampX+w*0.085, lampY, lampX+w*0.04, lampY+h*0.012);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#241c14';
  ctx.beginPath(); ctx.ellipse(lampX, lampY-h*0.012, w*0.018, h*0.01, 0, 0, Math.PI*2); ctx.fill();

  // The flame, rising from the spout.
  var fx = lampX+w*0.1, fy = lampY-h*0.03;
  ctx.beginPath();
  ctx.moveTo(fx, fy-2*flick);
  ctx.quadraticCurveTo(fx-6*flick, fy-16*flick, fx, fy-28*flick);
  ctx.quadraticCurveTo(fx+6*flick, fy-16*flick, fx, fy-2*flick);
  ctx.fillStyle = '#f6c766';
  ctx.fill();

  var vg = ctx.createRadialGradient(cx,cy,h*0.1, cx,cy,h*0.7);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0,0,w,h);
}

function drawIntroShaftScene(ctx, w, h, ti){
  ctx.clearRect(0,0,w,h);
  var bg = ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0, '#241b13'); bg.addColorStop(1, '#050302');
  ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);

  var cx = w*0.5, openY = h*0.16;
  // The shaft walls converging up toward a bright opening far above, with
  // a few masonry rings for depth.
  ctx.strokeStyle = 'rgba(217,154,61,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w*0.08, h); ctx.lineTo(cx-w*0.09, openY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.92, h); ctx.lineTo(cx+w*0.09, openY); ctx.stroke();
  [0.32, 0.52, 0.72, 0.9].forEach(function(f){
    var y = openY + (h-openY)*f;
    var hw = w*0.09 + (w*0.42)*f;
    ctx.strokeStyle = 'rgba(217,154,61,0.14)';
    ctx.beginPath(); ctx.moveTo(cx-hw, y); ctx.lineTo(cx+hw, y); ctx.stroke();
  });

  // The opening itself: a small bright disc of daylight, hissing sand
  // already streaming down through it.
  var glow = ctx.createRadialGradient(cx, openY, 2, cx, openY, w*0.13);
  glow.addColorStop(0, 'rgba(255,244,214,0.95)');
  glow.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, openY, w*0.13, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#e8d5a8';
  for(var i=0;i<26;i++){
    var seed = i*17.3;
    var drift = (ti*0.5 + i/26) % 1;
    var px = cx + Math.sin(seed)*w*0.045*drift;
    var py = openY + (h-openY)*drift;
    ctx.globalAlpha = 0.5*(1-drift*0.4);
    ctx.beginPath(); ctx.arc(px, py, 1.4, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  var vg = ctx.createRadialGradient(cx,h*0.6,h*0.1, cx,h*0.6,h*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(0,0,w,h);
}

// One entry per intro beat index — null for the letter beat, which already
// has its own visual (the lamp + parchment markup, not a canvas scene).
var INTRO_SCENES = [drawIntroWallScene, drawIntroCorridorScene, drawIntroLampScene, null, drawIntroShaftScene];
var introSceneRunning = false;
var activeIntroDraw = null;
function runIntroSceneLoop(){
  if(!introSceneRunning) return;
  activeIntroDraw();
  requestAnimationFrame(runIntroSceneLoop);
}
export function showIntroScene(beatIndex){
  var c = els.introScene;
  if(!c) return;
  var draw = INTRO_SCENES[beatIndex];
  if(!draw){ stopIntroScene(); c.style.display = 'none'; return; }
  c.style.display = '';
  var ictx = c.getContext('2d');
  activeIntroDraw = function(){ draw(ictx, c.width, c.height, (performance.now()-animStart)/1000); };
  if(!introSceneRunning){ introSceneRunning = true; runIntroSceneLoop(); }
}
export function stopIntroScene(){ introSceneRunning = false; }

// Both end scenes share one canvas and one self-terminating rAF loop —
// only one of them is ever active (win XOR lose) — so starting either stops
// whichever, if any, was already running.
var endSceneRunning = false;
var activeEndDraw = null;
function runEndSceneLoop(){
  if(!endSceneRunning) return;
  activeEndDraw();
  requestAnimationFrame(runEndSceneLoop);
}
export function startTreasureScene(){
  if(endSceneRunning) return;
  endSceneRunning = true;
  activeEndDraw = drawTreasureScene;
  runEndSceneLoop();
}
export function startMummyScene(){
  if(endSceneRunning) return;
  endSceneRunning = true;
  activeEndDraw = drawMummyScene;
  runEndSceneLoop();
}
export function stopTreasureScene(){ endSceneRunning = false; }
export function stopMummyScene(){ endSceneRunning = false; }
