// audio.js — tiny WebAudio sounds: footsteps, coin clink, pickup chime,
// alarm sting. No audio files; everything is synthesized, so the game
// stays offline and self-contained.
let ctx = null;

export function ensureAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch (e) { /* headless or no audio: stay silent */ }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol || 0.12, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function sfx(name) {
  if (!ctx) return;
  if (name === 'step') tone(90 + Math.random() * 30, 0.06, 'triangle', 0.05);
  if (name === 'coin') { tone(1568, 0.09, 'sine', 0.12); setTimeout(() => tone(2093, 0.12, 'sine', 0.1), 70); }
  if (name === 'pickup') { tone(660, 0.1, 'sine', 0.12); setTimeout(() => tone(990, 0.16, 'sine', 0.12), 90); }
  if (name === 'alarm') { tone(220, 0.35, 'sawtooth', 0.14, 440); setTimeout(() => tone(440, 0.35, 'sawtooth', 0.12, 220), 200); }
  if (name === 'win') { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.12), i * 110)); }
  if (name === 'caught') { tone(180, 0.5, 'sawtooth', 0.16, 60); }
}
