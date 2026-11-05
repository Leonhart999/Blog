// Small synthesized sound effects (Web Audio, no audio files).
// Sounds only play in response to a click or key press. A header button
// toggles them; the choice is kept per browser.
const KEY = 'castle-sound';
let ctx = null;
let master = null;

export function soundOn() {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}
export function setSound(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ }
  if (!on) stopCrackle();
  document.dispatchEvent(new CustomEvent('castle-sound', { detail: on }));
}

function audio() {
  if (!soundOn()) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

let noiseBuf = null;
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

function env(c, peak, attack, decay, at = c.currentTime) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

function burst(c, { at = c.currentTime, dur = 0.08, freq = 2000, q = 1, gain = 0.3, type = 'bandpass' }) {
  const n = noise(c);
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = env(c, gain, 0.003, dur, at);
  n.connect(f).connect(g).connect(master);
  n.start(at, Math.random() * 1.2, dur + 0.05);
}

/** Hammer on anvil: inharmonic partials with a fast click. */
export function clang(strength = 1) {
  const c = audio(); if (!c) return;
  const base = 380 + Math.random() * 60;
  [1, 2.76, 5.4, 8.93, 13.3].forEach((r, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = base * r * (1 + (Math.random() - 0.5) * 0.01);
    const g = env(c, 0.22 * strength / (i * 0.7 + 1), 0.002, 1.4 / (i * 0.5 + 1));
    o.connect(g).connect(master);
    o.start(); o.stop(c.currentTime + 1.6);
  });
  burst(c, { dur: 0.04, freq: 3500, q: 0.7, gain: 0.5 * strength });
}

/** Dice rattling across a wooden table. */
export function dice() {
  const c = audio(); if (!c) return;
  let at = c.currentTime;
  for (let i = 0; i < 9; i++) {
    burst(c, { at, dur: 0.03, freq: 1800 + Math.random() * 1800, q: 4, gain: 0.35 * (1 - i / 11) });
    at += 0.05 + i * 0.022 + Math.random() * 0.03;
  }
}

/** Page turning. */
export function flip() {
  const c = audio(); if (!c) return;
  const n = noise(c);
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 0.8;
  f.frequency.setValueAtTime(600, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(3200, c.currentTime + 0.22);
  const g = env(c, 0.22, 0.05, 0.25);
  n.connect(f).connect(g).connect(master);
  n.start(c.currentTime, Math.random(), 0.4);
}

/** Wing beats. */
export function wings(count = 4) {
  const c = audio(); if (!c) return;
  for (let i = 0; i < count; i++) burst(c, { at: c.currentTime + i * 0.16, dur: 0.11, freq: 380, q: 0.6, gain: 0.3, type: 'lowpass' });
}

/** A raven's croak: a buzzy tone gliding down through a nasal formant. */
export function caw() {
  const c = audio(); if (!c) return;
  for (let k = 0; k < 2; k++) {
    const at = c.currentTime + k * 0.32;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, at);
    o.frequency.exponentialRampToValueAtTime(330, at + 0.22);
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 3;
    const g = env(c, 0.28, 0.02, 0.22, at);
    o.connect(f).connect(g).connect(master);
    o.start(at); o.stop(at + 0.3);
    burst(c, { at, dur: 0.2, freq: 1600, q: 2, gain: 0.08 });
  }
}

/** Coins / chime. */
export function chime() {
  const c = audio(); if (!c) return;
  [1320, 1760, 2093].forEach((fq, i) => {
    const at = c.currentTime + i * 0.07;
    const o = c.createOscillator();
    o.type = 'triangle'; o.frequency.value = fq;
    const g = env(c, 0.12, 0.004, 0.5, at);
    o.connect(g).connect(master);
    o.start(at); o.stop(at + 0.6);
  });
}

/** Soft whoosh of fire flaring. */
export function whoosh() {
  const c = audio(); if (!c) return;
  const n = noise(c);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(300, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 0.3);
  const g = env(c, 0.35, 0.12, 0.6);
  n.connect(f).connect(g).connect(master);
  n.start(c.currentTime, Math.random(), 0.9);
}

// ---- looping fire crackle --------------------------------------------------
let crackleTimer = null;
let bed = null;
export function crackling() { return !!crackleTimer; }
export function startCrackle() {
  const c = audio(); if (!c || crackleTimer) return;
  const n = noise(c);
  n.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 420;
  const g = c.createGain();
  g.gain.value = 0.07;
  n.connect(f).connect(g).connect(master);
  n.start();
  bed = n;
  crackleTimer = setInterval(() => {
    if (Math.random() < 0.75) burst(c, { dur: 0.012 + Math.random() * 0.02, freq: 1500 + Math.random() * 3000, q: 1.5, gain: 0.05 + Math.random() * 0.22 });
  }, 70);
}
export function stopCrackle() {
  if (crackleTimer) clearInterval(crackleTimer);
  crackleTimer = null;
  try { bed?.stop(); } catch { /* already stopped */ }
  bed = null;
}
