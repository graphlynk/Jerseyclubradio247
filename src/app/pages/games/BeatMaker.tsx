import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Trash2, Volume2, Music, Keyboard, ChevronLeft, Mic, ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { usePlayer } from '../../context/PlayerContext';
import { useBPMPulse } from '../../hooks/useBPMPulse';

// ═════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL JERSEY CLUB SOUND ENGINE
// Master bus with compression + limiting. Every sound is layered and shaped.
// ═════════════════════════════════════════════════════════════════════════════

type SoundDef = {
  name: string;
  emoji: string;
  color: string;
  key: string;
  synth: (ctx: AudioContext, master: GainNode) => void;
};

// ─── Saturation waveshaper curve ─────────────────────────────────────────────
function makeSatCurve(amount: number): Float32Array {
  const n = 44100;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return c;
}

// ─── White-noise buffer ──────────────────────────────────────────────────────
function noiseBuf(ctx: AudioContext, dur: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// ─── Impulse buffer for resonance ────────────────────────────────────────────
function impulseBuf(ctx: AudioContext, dur: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

// ═══ KICK ════════════════════════════════════════════════════════════════════
// 3-layer: click transient + punchy mid + deep 808 sub with pitch envelope
function playKick(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  // Click
  const cb = noiseBuf(ctx, 0.01);
  const cs = ctx.createBufferSource(); cs.buffer = cb;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.8, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 4200; cf.Q.value = 1.2;
  cs.connect(cf).connect(cg).connect(m); cs.start(t);
  // Mid punch
  const p = ctx.createOscillator(); p.type = 'triangle';
  p.frequency.setValueAtTime(200, t);
  p.frequency.exponentialRampToValueAtTime(50, t + 0.045);
  const pg = ctx.createGain();
  pg.gain.setValueAtTime(0.7, t);
  pg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  const ps = ctx.createWaveShaper(); ps.curve = makeSatCurve(8); ps.oversample = '2x';
  p.connect(ps).connect(pg).connect(m); p.start(t); p.stop(t + 0.08);
  // Sub
  const s = ctx.createOscillator(); s.type = 'sine';
  s.frequency.setValueAtTime(170, t);
  s.frequency.exponentialRampToValueAtTime(38, t + 0.12);
  s.frequency.setValueAtTime(38, t + 0.12);
  s.frequency.exponentialRampToValueAtTime(30, t + 0.45);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.9, t);
  sg.gain.setValueAtTime(0.9, t + 0.04);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  // 2nd harmonic for weight
  const h = ctx.createOscillator(); h.type = 'sine';
  h.frequency.setValueAtTime(340, t);
  h.frequency.exponentialRampToValueAtTime(76, t + 0.12);
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.2, t);
  hg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  s.connect(sg).connect(m); h.connect(hg).connect(m);
  s.start(t); h.start(t); s.stop(t + 0.5); h.stop(t + 0.18);
}

// ═══ SNARE ═══════════════════════════════════════════════════════════════════
// Tuned body + noise rattle + high sizzle + metallic ring overtone
function playSnare(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  // Body
  const b = ctx.createOscillator(); b.type = 'triangle';
  b.frequency.setValueAtTime(240, t);
  b.frequency.exponentialRampToValueAtTime(100, t + 0.04);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.8, t);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
  const bs = ctx.createWaveShaper(); bs.curve = makeSatCurve(5);
  b.connect(bs).connect(bg).connect(m); b.start(t); b.stop(t + 0.14);
  // Noise rattle
  const nb = noiseBuf(ctx, 0.25);
  const n1 = ctx.createBufferSource(); n1.buffer = nb;
  const n1g = ctx.createGain();
  n1g.gain.setValueAtTime(0.65, t);
  n1g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  const mbp = ctx.createBiquadFilter(); mbp.type = 'bandpass'; mbp.frequency.value = 3500; mbp.Q.value = 0.7;
  n1.connect(mbp).connect(n1g).connect(m); n1.start(t);
  // High sizzle
  const n2 = ctx.createBufferSource(); n2.buffer = nb;
  const n2g = ctx.createGain();
  n2g.gain.setValueAtTime(0.4, t);
  n2g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 9000; pk.gain.value = 5; pk.Q.value = 1;
  n2.connect(hp).connect(pk).connect(n2g).connect(m); n2.start(t);
  // Metallic ring
  const r = ctx.createOscillator(); r.type = 'sine'; r.frequency.value = 189;
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0.12, t);
  rg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  r.connect(rg).connect(m); r.start(t); r.stop(t + 0.1);
}

// ═══ HI-HAT (Closed) ════════════════════════════════════════════════════════
// 6 square oscillators at metallic ratios + shaped noise transient
function playHiHat(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const freqs = [800, 1342, 2840, 5043, 7246, 9800];
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.34, t);
  hg.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
  const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 10500; pk.gain.value = 4; pk.Q.value = 1.2;
  for (const f of freqs) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    o.connect(hp); o.start(t); o.stop(t + 0.06);
  }
  // Noise click
  const nb = noiseBuf(ctx, 0.008);
  const ns = ctx.createBufferSource(); ns.buffer = nb;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
  const nhp = ctx.createBiquadFilter(); nhp.type = 'highpass'; nhp.frequency.value = 9000;
  ns.connect(nhp).connect(ng).connect(m); ns.start(t);
  hp.connect(pk).connect(hg).connect(m);
}

// ═══ OPEN HAT ════════════════════════════════════════════════════════════════
function playOpenHat(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const freqs = [800, 1342, 2840, 5043, 7246, 9800];
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.28, t);
  hg.gain.setValueAtTime(0.28, t + 0.03);
  hg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5500;
  const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 9500; pk.gain.value = 3; pk.Q.value = 0.8;
  for (const f of freqs) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    o.connect(hp); o.start(t); o.stop(t + 0.42);
  }
  // Shimmer noise
  const nb = noiseBuf(ctx, 0.42);
  const ns = ctx.createBufferSource(); ns.buffer = nb;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.14, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  const nhp = ctx.createBiquadFilter(); nhp.type = 'highpass'; nhp.frequency.value = 8500;
  ns.connect(nhp).connect(ng).connect(m); ns.start(t);
  hp.connect(pk).connect(hg).connect(m);
}

// ═══ CLAP ════════════════════════════════════════════════════════════════════
// Staggered micro-bursts + room reverb tail
function playClap(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const offsets = [0, 0.007, 0.016, 0.024, 0.03];
  for (const off of offsets) {
    const s = t + off;
    const buf = noiseBuf(ctx, 0.022);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, s);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.022);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7;
    src.connect(bp).connect(g).connect(m); src.start(s);
  }
  // Reverb tail
  const rb = impulseBuf(ctx, 0.35, 2.5);
  const rs = ctx.createBufferSource(); rs.buffer = rb;
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0.001, t);
  rg.gain.linearRampToValueAtTime(0.42, t + 0.035);
  rg.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  const rbp = ctx.createBiquadFilter(); rbp.type = 'bandpass'; rbp.frequency.value = 2200; rbp.Q.value = 0.5;
  const rpk = ctx.createBiquadFilter(); rpk.type = 'peaking'; rpk.frequency.value = 1400; rpk.gain.value = 3;
  rs.connect(rbp).connect(rpk).connect(rg).connect(m); rs.start(t);
}

// ═══ BED SQUEAK ══════════════════════════════════════════════════════════════
// FM chirp with spring resonance + body thump
function playBedSqueak(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  // Carrier
  const c = ctx.createOscillator(); c.type = 'sine';
  c.frequency.setValueAtTime(700, t);
  c.frequency.exponentialRampToValueAtTime(1500, t + 0.03);
  c.frequency.exponentialRampToValueAtTime(1000, t + 0.06);
  c.frequency.exponentialRampToValueAtTime(450, t + 0.16);
  // FM modulator
  const mod = ctx.createOscillator(); mod.type = 'sine';
  mod.frequency.setValueAtTime(1800, t);
  mod.frequency.exponentialRampToValueAtTime(700, t + 0.14);
  const mg = ctx.createGain();
  mg.gain.setValueAtTime(350, t);
  mg.gain.exponentialRampToValueAtTime(30, t + 0.14);
  mod.connect(mg).connect(c.frequency);
  // Resonant filter
  const f = ctx.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.setValueAtTime(1300, t);
  f.frequency.exponentialRampToValueAtTime(700, t + 0.14);
  f.Q.value = 6;
  const sat = ctx.createWaveShaper(); sat.curve = makeSatCurve(5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.42, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  c.connect(f).connect(sat).connect(g).connect(m);
  // Body thump
  const bo = ctx.createOscillator(); bo.type = 'sine';
  bo.frequency.setValueAtTime(180, t);
  bo.frequency.exponentialRampToValueAtTime(80, t + 0.05);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.18, t);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  bo.connect(bg).connect(m);
  c.start(t); mod.start(t); bo.start(t);
  c.stop(t + 0.22); mod.stop(t + 0.22); bo.stop(t + 0.08);
}

// ═══ RIM ═════════════════════════════════════════════════════════════════════
function playRim(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  // Click
  const cb = noiseBuf(ctx, 0.004);
  const cs = ctx.createBufferSource(); cs.buffer = cb;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.55, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.005);
  const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 2500;
  cs.connect(chp).connect(cg).connect(m); cs.start(t);
  // Metallic body
  const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = 850;
  const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 1380;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.38, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 5;
  o1.connect(bp); o2.connect(bp); bp.connect(og).connect(m);
  o1.start(t); o2.start(t); o1.stop(t + 0.045); o2.stop(t + 0.045);
}

// ═══ COWBELL ═════════════════════════════════════════════════════════════════
function playCowbell(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 800;
  const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 540;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.42, t);
  og.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 3;
  const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1600; pk.gain.value = 5; pk.Q.value = 2;
  o1.connect(bp); o2.connect(bp); bp.connect(pk).connect(og).connect(m);
  o1.start(t); o2.start(t); o1.stop(t + 0.26); o2.stop(t + 0.26);
}

// ═══ SUB BASS ════════════════════════════════════════════════════════════════
function playSubBass(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const s = ctx.createOscillator(); s.type = 'sine';
  s.frequency.setValueAtTime(68, t);
  s.frequency.exponentialRampToValueAtTime(42, t + 0.1);
  const dr = ctx.createGain(); dr.gain.value = 2.8;
  const sat = ctx.createWaveShaper(); sat.curve = makeSatCurve(14); sat.oversample = '4x';
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 130; lp.Q.value = 1;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.8, t);
  sg.gain.setValueAtTime(0.8, t + 0.12);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  s.connect(dr).connect(sat).connect(lp).connect(sg).connect(m);
  // Harmonic
  const h = ctx.createOscillator(); h.type = 'sine';
  h.frequency.setValueAtTime(136, t);
  h.frequency.exponentialRampToValueAtTime(84, t + 0.1);
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.18, t);
  hg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  h.connect(hg).connect(m);
  s.start(t); h.start(t); s.stop(t + 0.65); h.stop(t + 0.4);
}

// ═══ PERC ════════════════════════════════════════════════════════════════════
function playPerc(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  // Click
  const cb = noiseBuf(ctx, 0.007);
  const cs = ctx.createBufferSource(); cs.buffer = cb;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.45, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.009);
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 4500;
  cs.connect(cf).connect(cg).connect(m); cs.start(t);
  // Body
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(440, t);
  o.frequency.exponentialRampToValueAtTime(190, t + 0.05);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.14);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.6, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 2.5;
  o.connect(bp).connect(og).connect(m); o.start(t); o.stop(t + 0.2);
}

// ═══ SIREN ═══════════════════════════════════════════════════════════════════
function playSiren(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(480, t);
  o.frequency.exponentialRampToValueAtTime(2000, t + 0.2);
  o.frequency.exponentialRampToValueAtTime(550, t + 0.45);
  const o2 = ctx.createOscillator(); o2.type = 'sine';
  o2.frequency.setValueAtTime(483, t);
  o2.frequency.exponentialRampToValueAtTime(2006, t + 0.2);
  o2.frequency.exponentialRampToValueAtTime(553, t + 0.45);
  const ds = ctx.createWaveShaper(); ds.curve = makeSatCurve(12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.2, t);
  g.gain.setValueAtTime(0.2, t + 0.14);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
  const mx = ctx.createGain(); o.connect(mx); o2.connect(mx);
  mx.connect(ds).connect(g).connect(m);
  o.start(t); o2.start(t); o.stop(t + 0.5); o2.stop(t + 0.5);
}

// ═══ HORN ════════════════════════════════════════════════════════════════════
function playHorn(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const f0 = 185;
  const detunes = [0, 4, -5, 8, -2];
  const mx = ctx.createGain(); mx.gain.value = 0.12;
  for (const d of detunes) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.value = f0; o.detune.value = d;
    o.connect(mx); o.start(t); o.stop(t + 0.48);
  }
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(350, t);
  lp.frequency.exponentialRampToValueAtTime(4000, t + 0.025);
  lp.frequency.exponentialRampToValueAtTime(2000, t + 0.2);
  lp.frequency.exponentialRampToValueAtTime(500, t + 0.42);
  lp.Q.value = 1.8;
  const eg = ctx.createGain();
  eg.gain.setValueAtTime(0.001, t);
  eg.gain.exponentialRampToValueAtTime(0.65, t + 0.012);
  eg.gain.setValueAtTime(0.65, t + 0.2);
  eg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  const sat = ctx.createWaveShaper(); sat.curve = makeSatCurve(5);
  mx.connect(lp).connect(sat).connect(eg).connect(m);
}

// ═══ ZAP ═════════════════════════════════════════════════════════════════════
function playZap(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(2500, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.11);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(9000, t);
  lp.frequency.exponentialRampToValueAtTime(180, t + 0.11);
  lp.Q.value = 14;
  const ds = ctx.createWaveShaper(); ds.curve = makeSatCurve(10);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.32, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(lp).connect(ds).connect(g).connect(m);
  o.start(t); o.stop(t + 0.18);
}

// ═══ TOM ═════════════════════════════════════════════════════════════════════
function playTom(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const cb = noiseBuf(ctx, 0.005);
  const cs = ctx.createBufferSource(); cs.buffer = cb;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.4, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.007);
  cs.connect(cg).connect(m); cs.start(t);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(300, t);
  o.frequency.exponentialRampToValueAtTime(105, t + 0.07);
  o.frequency.exponentialRampToValueAtTime(85, t + 0.32);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.7, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  const ov = ctx.createOscillator(); ov.type = 'triangle';
  ov.frequency.setValueAtTime(400, t);
  ov.frequency.exponentialRampToValueAtTime(140, t + 0.05);
  const ovg = ctx.createGain();
  ovg.gain.setValueAtTime(0.22, t);
  ovg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(og).connect(m); ov.connect(ovg).connect(m);
  o.start(t); ov.start(t); o.stop(t + 0.4); ov.stop(t + 0.12);
}

// ═══ SHAKER ════════════════════════════════════════════════════════════════��═
function playShaker(ctx: AudioContext, m: GainNode) {
  const t = ctx.currentTime;
  const buf = noiseBuf(ctx, 0.1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.3, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7800;
  const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 12500; pk.gain.value = 4; pk.Q.value = 1;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 16000;
  src.connect(hp).connect(pk).connect(lp).connect(g).connect(m); src.start(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// VOCAL PRESET SYSTEM — Realistic formant synthesis
// Each preset uses a glottal-like source (sawtooth + noise breath) through
// parallel formant bandpass filters at real vowel frequencies with pitch
// contours, vibrato, and proper amplitude shaping.
// ═════════════════════════════════════════════════════════════════════════════

type VocalPreset = {
  id: string;
  label: string;
  description: string;
  synth: (ctx: AudioContext, m: GainNode) => void;
};

// Helper: create formant vocal with params
function synthVocal(
  ctx: AudioContext,
  m: GainNode,
  opts: {
    pitch: number;
    pitchEnd?: number;
    pitchTime?: number;
    duration: number;
    breathAmt?: number;
    vibRate?: number;
    vibDepth?: number;
    formants: Array<{ freq: number; freqEnd?: number; Q: number; gain: number }>;
    attack?: number;
    decay?: number;
  }
) {
  const t = ctx.currentTime;
  const dur = opts.duration;
  const atk = opts.attack ?? 0.008;
  const dec = opts.decay ?? dur * 0.7;

  // Glottal source (sawtooth ≈ glottal pulse train)
  const src = ctx.createOscillator();
  src.type = 'sawtooth';
  src.frequency.setValueAtTime(opts.pitch, t);
  if (opts.pitchEnd && opts.pitchTime) {
    src.frequency.exponentialRampToValueAtTime(
      Math.max(opts.pitchEnd, 20), t + opts.pitchTime
    );
  }

  // Vibrato
  if (opts.vibRate && opts.vibDepth) {
    const vib = ctx.createOscillator();
    vib.frequency.value = opts.vibRate;
    const vg = ctx.createGain();
    vg.gain.value = opts.vibDepth;
    vib.connect(vg).connect(src.frequency);
    vib.start(t); vib.stop(t + dur + 0.05);
  }

  // Breath noise layer (adds realism)
  const breathAmt = opts.breathAmt ?? 0.15;
  const nb = noiseBuf(ctx, dur + 0.05);
  const nsrc = ctx.createBufferSource();
  nsrc.buffer = nb;
  const nGain = ctx.createGain();
  nGain.gain.value = breathAmt;

  // Mix source + breath
  const srcMix = ctx.createGain();
  srcMix.gain.value = 1;
  src.connect(srcMix);
  nsrc.connect(nGain).connect(srcMix);

  // Parallel formant filters
  const envGain = ctx.createGain();
  envGain.gain.setValueAtTime(0.001, t);
  envGain.gain.linearRampToValueAtTime(0.55, t + atk);
  envGain.gain.setValueAtTime(0.55, t + atk);
  envGain.gain.exponentialRampToValueAtTime(0.001, t + atk + dec);

  for (const fm of opts.formants) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(fm.freq, t);
    if (fm.freqEnd) {
      f.frequency.linearRampToValueAtTime(fm.freqEnd, t + dur * 0.8);
    }
    f.Q.value = fm.Q;
    const fg = ctx.createGain();
    fg.gain.value = fm.gain;
    srcMix.connect(f).connect(fg).connect(envGain);
  }

  envGain.connect(m);
  src.start(t); nsrc.start(t);
  src.stop(t + dur + 0.05); nsrc.stop(t + dur + 0.05);
}

const VOCAL_PRESETS: VocalPreset[] = [
  {
    id: 'hey',
    label: '"HEY!"',
    description: 'Classic Jersey call',
    synth: (ctx, m) => synthVocal(ctx, m, {
      pitch: 310, pitchEnd: 260, pitchTime: 0.18,
      duration: 0.22, breathAmt: 0.22, vibRate: 5.5, vibDepth: 8,
      attack: 0.005, decay: 0.18,
      formants: [
        { freq: 580, freqEnd: 480, Q: 8, gain: 0.38 },
        { freq: 1800, freqEnd: 2100, Q: 6, gain: 0.28 },
        { freq: 2800, Q: 4, gain: 0.14 },
        { freq: 3800, Q: 3, gain: 0.06 },
      ]
    })
  },
  {
    id: 'aye',
    label: '"AYE!"',
    description: 'Hype shout',
    synth: (ctx, m) => synthVocal(ctx, m, {
      pitch: 290, pitchEnd: 320, pitchTime: 0.06,
      duration: 0.2, breathAmt: 0.12, vibRate: 6, vibDepth: 10,
      attack: 0.003, decay: 0.16,
      formants: [
        { freq: 750, freqEnd: 350, Q: 9, gain: 0.4 },
        { freq: 1200, freqEnd: 2300, Q: 7, gain: 0.3 },
        { freq: 2600, freqEnd: 3100, Q: 5, gain: 0.15 },
        { freq: 3600, Q: 3, gain: 0.07 },
      ]
    })
  },
  {
    id: 'oh',
    label: '"OH!"',
    description: 'Round vocal drop',
    synth: (ctx, m) => synthVocal(ctx, m, {
      pitch: 250, pitchEnd: 210, pitchTime: 0.25,
      duration: 0.28, breathAmt: 0.1, vibRate: 5, vibDepth: 6,
      attack: 0.01, decay: 0.22,
      formants: [
        { freq: 500, Q: 10, gain: 0.42 },
        { freq: 820, Q: 8, gain: 0.32 },
        { freq: 2500, Q: 4, gain: 0.1 },
        { freq: 3500, Q: 3, gain: 0.05 },
      ]
    })
  },
  {
    id: 'yeah',
    label: '"YEAH!"',
    description: 'Extended yeah',
    synth: (ctx, m) => synthVocal(ctx, m, {
      pitch: 270, pitchEnd: 240, pitchTime: 0.3,
      duration: 0.35, breathAmt: 0.18, vibRate: 5.5, vibDepth: 12,
      attack: 0.006, decay: 0.3,
      formants: [
        { freq: 350, freqEnd: 780, Q: 8, gain: 0.38 },
        { freq: 2200, freqEnd: 1250, Q: 6, gain: 0.28 },
        { freq: 2900, freqEnd: 2500, Q: 5, gain: 0.15 },
        { freq: 3800, Q: 3, gain: 0.06 },
      ]
    })
  },
  {
    id: 'uh',
    label: '"UH!"',
    description: 'Deep grunt',
    synth: (ctx, m) => synthVocal(ctx, m, {
      pitch: 160, pitchEnd: 130, pitchTime: 0.12,
      duration: 0.15, breathAmt: 0.2, vibRate: 4, vibDepth: 5,
      attack: 0.003, decay: 0.12,
      formants: [
        { freq: 600, Q: 10, gain: 0.45 },
        { freq: 1200, Q: 7, gain: 0.25 },
        { freq: 2400, Q: 4, gain: 0.1 },
      ]
    })
  },
  {
    id: 'woo',
    label: '"WOO!"',
    description: 'Rising hype call',
    synth: (ctx, m) => synthVocal(ctx, m, {
      pitch: 200, pitchEnd: 380, pitchTime: 0.22,
      duration: 0.3, breathAmt: 0.16, vibRate: 6, vibDepth: 14,
      attack: 0.01, decay: 0.24,
      formants: [
        { freq: 340, freqEnd: 360, Q: 10, gain: 0.42 },
        { freq: 620, freqEnd: 700, Q: 8, gain: 0.3 },
        { freq: 2500, Q: 4, gain: 0.08 },
      ]
    })
  },
  {
    id: 'work',
    label: '"WORK!"',
    description: 'Jersey command',
    synth: (ctx, m) => {
      const t = ctx.currentTime;
      // Main vocal: "wer" portion
      synthVocal(ctx, m, {
        pitch: 230, pitchEnd: 200, pitchTime: 0.18,
        duration: 0.22, breathAmt: 0.2, vibRate: 5, vibDepth: 8,
        attack: 0.008, decay: 0.16,
        formants: [
          { freq: 450, freqEnd: 500, Q: 8, gain: 0.35 },
          { freq: 1400, freqEnd: 1600, Q: 6, gain: 0.25 },
          { freq: 2600, Q: 4, gain: 0.12 },
        ]
      });
      // "K" burst at end
      const kb = noiseBuf(ctx, 0.025);
      const ks = ctx.createBufferSource(); ks.buffer = kb;
      const kg = ctx.createGain();
      kg.gain.setValueAtTime(0.001, t + 0.16);
      kg.gain.linearRampToValueAtTime(0.35, t + 0.17);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      const kf = ctx.createBiquadFilter(); kf.type = 'highpass'; kf.frequency.value = 3000;
      ks.connect(kf).connect(kg).connect(m); ks.start(t + 0.16);
    }
  },
  {
    id: 'ah',
    label: '"AH!"',
    description: 'Open vocal hit',
    synth: (ctx, m) => synthVocal(ctx, m, {
      pitch: 280, pitchEnd: 250, pitchTime: 0.2,
      duration: 0.25, breathAmt: 0.14, vibRate: 5.8, vibDepth: 10,
      attack: 0.004, decay: 0.2,
      formants: [
        { freq: 800, Q: 9, gain: 0.42 },
        { freq: 1250, Q: 7, gain: 0.32 },
        { freq: 2600, Q: 5, gain: 0.16 },
        { freq: 3500, Q: 3, gain: 0.08 },
      ]
    })
  },
];

// ─── Sound Definitions (VOCAL is a placeholder — real synth is dynamic) ──────

const VOCAL_IDX = 10; // index of VOCAL in SOUNDS array

const SOUNDS: SoundDef[] = [
  { name: 'KICK',       emoji: '🥁', color: '#9D00FF', key: 'q', synth: playKick },
  { name: 'SNARE',      emoji: '🪘', color: '#FF0080', key: 'w', synth: playSnare },
  { name: 'HI-HAT',     emoji: '🔔', color: '#00FF88', key: 'e', synth: playHiHat },
  { name: 'OPEN HAT',   emoji: '🔕', color: '#00B4FF', key: 'r', synth: playOpenHat },
  { name: 'CLAP',       emoji: '👏', color: '#FFD700', key: 'a', synth: playClap },
  { name: 'BED SQUEAK', emoji: '🛏️', color: '#FF4444', key: 's', synth: playBedSqueak },
  { name: 'RIM',        emoji: '🥢', color: '#FF6B00', key: 'd', synth: playRim },
  { name: 'COWBELL',    emoji: '🔔', color: '#4ADE80', key: 'f', synth: playCowbell },
  { name: 'SUB BASS',   emoji: '🔊', color: '#7C3AED', key: 'z', synth: playSubBass },
  { name: 'PERC',       emoji: '🪇', color: '#06B6D4', key: 'x', synth: playPerc },
  // VOCAL — synth is overridden dynamically by selectedVocal
  { name: 'VOCAL',      emoji: '🎤', color: '#F97316', key: 'c', synth: VOCAL_PRESETS[0].synth },
  { name: 'SIREN',      emoji: '🚨', color: '#EF4444', key: 'v', synth: playSiren },
  { name: 'HORN',       emoji: '📯', color: '#A855F7', key: 'b', synth: playHorn },
  { name: 'ZAP',        emoji: '⚡', color: '#FACC15', key: 'n', synth: playZap },
  { name: 'TOM',        emoji: '🥁', color: '#EC4899', key: 'm', synth: playTom },
  { name: 'SHAKER',     emoji: '🎵', color: '#14B8A6', key: ',', synth: playShaker },
];

const STEPS = 16;
const KEYBOARD_MAP: Record<string, number> = {};
SOUNDS.forEach((s, i) => { KEYBOARD_MAP[s.key] = i; });

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function BeatMaker() {
  const { isPlaying: musicPlaying } = usePlayer();
  const { pulse } = useBPMPulse(musicPlaying);

  const [bpm, setBpm] = useState(140);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const [grid, setGrid] = useState<boolean[][]>(() =>
    Array.from({ length: SOUNDS.length }, () => Array(STEPS).fill(false))
  );
  const [swing, setSwing] = useState(0);
  const [selectedVocalId, setSelectedVocalId] = useState('hey');
  const [vocalPickerOpen, setVocalPickerOpen] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(-1);
  const selectedVocalRef = useRef(VOCAL_PRESETS[0]);

  // Keep ref in sync
  useEffect(() => {
    const p = VOCAL_PRESETS.find(v => v.id === selectedVocalId);
    if (p) selectedVocalRef.current = p;
  }, [selectedVocalId]);

  // AudioContext + master bus
  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new AudioContext();
      const mg = ctx.createGain(); mg.gain.value = 0.85;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 6;
      comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -3; lim.knee.value = 0;
      lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.05;
      mg.connect(comp).connect(lim).connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = mg;
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const getMaster = useCallback(() => { getCtx(); return masterRef.current!; }, [getCtx]);

  // Play a sound — for VOCAL row, use the selected preset
  const playSoundAtRow = useCallback((row: number, ctx: AudioContext, master: GainNode) => {
    if (row === VOCAL_IDX) {
      selectedVocalRef.current.synth(ctx, master);
    } else {
      SOUNDS[row].synth(ctx, master);
    }
  }, []);

  const hitPad = useCallback((soundIdx: number) => {
    const ctx = getCtx();
    const master = getMaster();
    playSoundAtRow(soundIdx, ctx, master);
    setActivePads(prev => { const n = new Set(prev); n.add(soundIdx); return n; });
    setTimeout(() => {
      setActivePads(prev => { const n = new Set(prev); n.delete(soundIdx); return n; });
    }, 120);
  }, [getCtx, getMaster, playSoundAtRow]);

  const toggleCell = useCallback((row: number, col: number) => {
    setGrid(prev => { const n = prev.map(r => [...r]); n[row][col] = !n[row][col]; return n; });
  }, []);

  const startSequencer = useCallback(() => {
    const ctx = getCtx();
    const master = getMaster();
    stepRef.current = -1;
    setCurrentStep(-1);
    setPlaying(true);
    const tick = () => {
      stepRef.current = (stepRef.current + 1) % STEPS;
      setCurrentStep(stepRef.current);
      for (let row = 0; row < SOUNDS.length; row++) {
        if (grid[row][stepRef.current]) {
          playSoundAtRow(row, ctx, master);
        }
      }
      const base = (60 / bpm / 4) * 1000;
      const isOff = stepRef.current % 2 === 1;
      const sw = isOff ? (swing / 100) * base * 0.33 : 0;
      timerRef.current = window.setTimeout(tick, base + sw);
    };
    tick();
  }, [getCtx, getMaster, grid, bpm, swing, playSoundAtRow]);

  const stopSequencer = useCallback(() => {
    setPlaying(false); setCurrentStep(-1); stepRef.current = -1;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (playing) {
      stopSequencer();
      const id = setTimeout(() => startSequencer(), 50);
      return () => clearTimeout(id);
    }
  }, [grid, bpm, swing]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = KEYBOARD_MAP[e.key.toLowerCase()];
      if (idx !== undefined) hitPad(idx);
      if (e.key === ' ') { e.preventDefault(); playing ? stopSequencer() : startSequencer(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hitPad, playing, startSequencer, stopSequencer]);

  const clearGrid = useCallback(() => {
    setGrid(Array.from({ length: SOUNDS.length }, () => Array(STEPS).fill(false)));
    if (playing) stopSequencer();
  }, [playing, stopSequencer]);

  const loadPreset = useCallback((preset: string) => {
    const g = Array.from({ length: SOUNDS.length }, () => Array(STEPS).fill(false));
    if (preset === 'classic') {
      [0, 8].forEach(s => g[0][s] = true);
      [4, 12].forEach(s => g[1][s] = true);
      for (let s = 0; s < 16; s++) g[2][s] = true;
      [2, 6, 10, 14].forEach(s => g[5][s] = true);
      [4, 12].forEach(s => g[4][s] = true);
    } else if (preset === 'bounce') {
      [0, 3, 6, 8, 11, 14].forEach(s => g[0][s] = true);
      [4, 12].forEach(s => g[1][s] = true);
      for (let s = 0; s < 16; s += 2) g[2][s] = true;
      [1, 5, 9, 13].forEach(s => g[3][s] = true);
      [4, 12].forEach(s => g[4][s] = true);
      [0, 8].forEach(s => g[8][s] = true);
    } else if (preset === 'rapid') {
      [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => g[0][s] = true);
      [2, 6, 10, 14].forEach(s => g[1][s] = true);
      for (let s = 0; s < 16; s++) g[2][s] = true;
      [3, 7, 11, 15].forEach(s => g[5][s] = true);
      [4, 12].forEach(s => g[4][s] = true);
      [0, 4, 8, 12].forEach(s => g[7][s] = true);
    }
    setGrid(g);
  }, []);

  // Vocal selection handler — select & preview
  const selectVocal = useCallback((id: string) => {
    setSelectedVocalId(id);
    const preset = VOCAL_PRESETS.find(v => v.id === id);
    if (preset) {
      selectedVocalRef.current = preset;
      const ctx = getCtx();
      const master = getMaster();
      preset.synth(ctx, master);
    }
  }, [getCtx, getMaster]);

  const currentVocal = VOCAL_PRESETS.find(v => v.id === selectedVocalId) ?? VOCAL_PRESETS[0];

  return (
    <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/games" className="text-[#5B4F70] hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#FF0080] animate-pulse" />
              <p className="text-[10px] font-bold text-[#FF0080] tracking-widest">JERSEY CLUB STUDIO</p>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
              <Music className="w-7 h-7 text-[#9D00FF]" />
              Beat Maker
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#5B4F70]" />
            <span className="text-[10px] text-[#5B4F70] hidden sm:block">Use keyboard shortcuts!</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-4"
          style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
          <button onClick={() => playing ? stopSequencer() : startSequencer()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02]"
            style={{
              background: playing
                ? 'linear-gradient(135deg, #FF0080, #FF4444)'
                : 'linear-gradient(135deg, #9D00FF, #FF0080)',
              boxShadow: playing ? '0 0 20px #FF008050' : '0 0 20px #9D00FF50',
            }}>
            {playing ? <><Square className="w-4 h-4" /> STOP</> : <><Play className="w-4 h-4" /> PLAY</>}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#5B4F70] font-bold">BPM</span>
            <input type="range" min={80} max={180} value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="w-24 accent-[#9D00FF]" />
            <span className="text-sm font-mono font-bold text-[#9D00FF] w-8">{bpm}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#5B4F70] font-bold">SWING</span>
            <input type="range" min={0} max={100} value={swing}
              onChange={e => setSwing(Number(e.target.value))}
              className="w-20 accent-[#FF0080]" />
            <span className="text-sm font-mono font-bold text-[#FF0080] w-8">{swing}%</span>
          </div>
          <button onClick={clearGrid}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#5B4F70] hover:text-white hover:bg-[#1a003a] transition-all"
            style={{ border: '1px solid #1a0040' }}>
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] text-[#5B4F70] font-bold mr-1">PRESETS:</span>
            {[
              { key: 'classic', label: 'Classic JC' },
              { key: 'bounce', label: 'Bounce' },
              { key: 'rapid', label: 'Rapid Fire' },
            ].map(p => (
              <button key={p.key} onClick={() => loadPreset(p.key)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#9D00FF] hover:bg-[#9D00FF]/10 transition-all"
                style={{ border: '1px solid #9D00FF30' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drum Pads */}
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-3.5 h-3.5 text-[#9D00FF]" />
            <p className="text-[10px] font-bold text-[#9D00FF] tracking-widest">DRUM PADS</p>
            <span className="text-[10px] text-[#3B2F50] ml-auto">tap or press key</span>
          </div>
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {SOUNDS.map((sound, idx) => (
              <motion.button key={idx}
                onPointerDown={(e) => {
                  // For vocal pad, tapping plays it; we don't open picker on tap
                  hitPad(idx);
                }}
                animate={{
                  scale: activePads.has(idx) ? 0.92 : 1,
                  boxShadow: activePads.has(idx) ? `0 0 20px ${sound.color}80` : `0 0 0px transparent`,
                }}
                transition={{ duration: 0.08 }}
                className="relative rounded-xl p-3 md:p-4 flex flex-col items-center justify-center gap-1 cursor-pointer select-none active:scale-95 transition-colors"
                style={{
                  background: activePads.has(idx)
                    ? `linear-gradient(135deg, ${sound.color}40, ${sound.color}15)`
                    : '#0a0018',
                  border: `2px solid ${activePads.has(idx) ? sound.color : sound.color + '30'}`,
                }}>
                <span className="text-xl md:text-2xl">{sound.emoji}</span>
                <span className="text-[9px] md:text-[10px] font-black text-white">
                  {idx === VOCAL_IDX ? currentVocal.label : sound.name}
                </span>
                <span className="absolute top-1 right-1.5 text-[8px] font-mono font-bold"
                  style={{ color: sound.color + '80' }}>
                  {sound.key.toUpperCase()}
                </span>
                {/* Vocal picker toggle */}
                {idx === VOCAL_IDX && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setVocalPickerOpen(v => !v);
                    }}
                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-[#F97316]/20 transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3 h-3 text-[#F97316]" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Vocal Selector Panel */}
        <AnimatePresence>
          {vocalPickerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-2xl p-4"
                style={{ background: '#0D001E', border: '1px solid #F9731640' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="w-3.5 h-3.5 text-[#F97316]" />
                  <p className="text-[10px] font-bold text-[#F97316] tracking-widest">SELECT VOCAL</p>
                  <span className="text-[10px] text-[#3B2F50] ml-auto">click to preview & select</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VOCAL_PRESETS.map(vp => {
                    const active = selectedVocalId === vp.id;
                    return (
                      <button
                        key={vp.id}
                        onClick={() => selectVocal(vp.id)}
                        className="rounded-xl p-3 text-left transition-all hover:scale-[1.02]"
                        style={{
                          background: active
                            ? 'linear-gradient(135deg, #F9731630, #F9731610)'
                            : '#0a0018',
                          border: `2px solid ${active ? '#F97316' : '#F9731625'}`,
                          boxShadow: active ? '0 0 16px #F9731630' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">🎤</span>
                          <span className="text-xs font-black text-white">{vp.label}</span>
                          {active && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
                          )}
                        </div>
                        <p className="text-[9px] text-[#5B4F70]">{vp.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Sequencer */}
        <div className="rounded-2xl p-4 overflow-x-auto"
          style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-3.5 h-3.5 text-[#FF0080]" />
            <p className="text-[10px] font-bold text-[#FF0080] tracking-widest">STEP SEQUENCER</p>
            <span className="text-[10px] text-[#3B2F50] ml-auto">click cells to program the pattern</span>
          </div>
          <div className="flex gap-0.5 mb-1 pl-16 md:pl-20">
            {Array.from({ length: STEPS }).map((_, s) => (
              <div key={s} className="flex-1 min-w-[22px] text-center">
                <span className={`text-[8px] font-mono font-bold ${
                  currentStep === s ? 'text-[#FF0080]' : s % 4 === 0 ? 'text-[#5B4F70]' : 'text-[#2a1850]'
                }`}>
                  {s + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-0.5">
            {SOUNDS.map((sound, row) => (
              <div key={row} className="flex items-center gap-0.5">
                <div className="w-16 md:w-20 flex-shrink-0 text-right pr-2">
                  <span className="text-[9px] font-bold truncate" style={{ color: sound.color }}>
                    {row === VOCAL_IDX ? currentVocal.label.replace(/"/g, '') : sound.name}
                  </span>
                </div>
                {Array.from({ length: STEPS }).map((_, col) => {
                  const active = grid[row][col];
                  const isCurrent = currentStep === col;
                  const isDownbeat = col % 4 === 0;
                  return (
                    <button key={col}
                      onClick={() => toggleCell(row, col)}
                      className="flex-1 min-w-[22px] h-5 md:h-6 rounded-sm transition-all"
                      style={{
                        background: active
                          ? isCurrent ? sound.color : sound.color + '80'
                          : isCurrent ? '#1a003a' : isDownbeat ? '#0F0022' : '#0a0015',
                        border: `1px solid ${active ? sound.color + '60' : '#1a003a'}`,
                        boxShadow: active && isCurrent ? `0 0 8px ${sound.color}60` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {playing && (
            <div className="flex gap-0.5 mt-1 pl-16 md:pl-20">
              {Array.from({ length: STEPS }).map((_, s) => (
                <div key={s} className="flex-1 min-w-[22px] flex justify-center">
                  {currentStep === s && (
                    <motion.div
                      layoutId="playhead"
                      className="w-1.5 h-1.5 rounded-full bg-[#FF0080]"
                      style={{ boxShadow: '0 0 8px #FF0080' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-4 rounded-xl p-3 flex items-start gap-3"
          style={{ background: '#0a0018', border: '1px solid #1a003030' }}>
          <span className="text-base">💡</span>
          <div className="text-[11px] text-[#5B4F70] leading-relaxed">
            <strong className="text-[#7B6F90]">Jersey Club Beat Tips:</strong> Start with a kick on beats 1 & 3, snare on 2 & 4, then layer rapid hi-hats on every 16th note. Add bed squeaks for that signature Jersey bounce. Use the <strong className="text-[#F97316]">vocal selector</strong> (tap the arrow on the VOCAL pad) to pick from 8 different vocal chops!
            <br />
            <strong className="text-[#7B6F90]">Keys:</strong> Q W E R A S D F Z X C V B N M , — <strong className="text-[#7B6F90]">Space</strong> to play/stop
          </div>
        </div>
      </div>
    </div>
  );
}
