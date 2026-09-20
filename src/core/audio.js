// ================= Sound =================
// Small synthesized cues via Web Audio — no audio files to keep the page
// self-contained. The context is created lazily on the first call, which
// always happens from inside a click/keydown handler, satisfying browsers'
// "needs a user gesture" autoplay rule without any separate unlock step.
import { state } from '../engine/state.js';

var audioCtx = null;
function getAudioCtx(){
  if(audioCtx) return audioCtx;
  var AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  try{ audioCtx = new AC(); }catch(_e){ audioCtx = null; }
  return audioCtx;
}
function playTone(freq, startDelay, duration, type, peak){
  if(!state.soundOn) return;
  var ctx = getAudioCtx();
  if(!ctx) return;
  if(ctx.state === 'suspended') ctx.resume().catch(function(){});
  var t0 = ctx.currentTime + startDelay;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}
export function playPositive(){
  playTone(1046.5, 0, 0.11, 'sine', 0.2);   // C6
  playTone(1318.5, 0.08, 0.16, 'sine', 0.18); // E6
}
export function playNegative(){
  playTone(220.0, 0, 0.16, 'square', 0.09);  // A3
  playTone(196.0, 0.10, 0.22, 'square', 0.08); // G3 — a small descending buzz
}
export function playCheer(){
  [523.25, 659.25, 783.99, 1046.5].forEach(function(f, i){ // C5 E5 G5 C6
    playTone(f, i*0.09, 0.22, 'triangle', 0.15);
  });
}
export function playVictory(){
  var run = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5 E5 G5 C6 E6
  run.forEach(function(f, i){ playTone(f, i*0.1, 0.22, 'triangle', 0.16); });
  [783.99, 1046.5, 1318.5].forEach(function(f){ playTone(f, run.length*0.1, 0.55, 'triangle', 0.13); });
}
