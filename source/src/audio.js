// ============================================================================
// audio: procedural space ambience (no sample files) — adapted from Abyssal Garden (MIT)
// ============================================================================
// A fixed Web Audio graph, built on the first click / key / touch and driven by a 10 Hz timer, not the frame loop.
// Layers: rumble, wind (follows speed and how deep in an atmosphere you are), drone, chimes and the spirits' slow songs.
let AC, OUT, muted = false;
const VOL = 0.78; // master level: about -18.5 LUFS, peaks near -5.5 dBFS
function mkSound(ac) {
  const sr = ac.sampleRate;
  // node of class C with options o, connected to every node / param in `to`; sources start at once
  const N = (C, o, ...to) => { const n = new C(ac, o); for (const d of to) n.connect(d); if (n.start) n.start(); return n; };
  const G = (gain, ...to) => N(GainNode, { gain }, ...to);
  const BQ = (type, frequency, Q, ...to) => N(BiquadFilterNode, { type, frequency, Q }, ...to);
  const lfo = (frequency, depth, to) => N(OscillatorNode, { frequency }, G(depth, to));
  const noise = (secs, f) => { const n = sr * secs | 0, b = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: sr }); f(b.getChannelData(0), n); f(b.getChannelData(1), n); return b; };
  // seamless brown noise loop (the end cross-fades into the start)
  const nb = noise(11, (d, n) => { for (let i = 0, b = 0; i < n + 4096; i++) { b = (b + 0.02 * (rnd() * 2 - 1)) / 1.02; if (i < n) d[i] = b * 3.5; else { const k = (i - n) / 4096; d[i - n] = d[i - n] * k + b * 3.5 * (1 - k); } } });
  // reverb impulse: 5 s of noise that fades out and gets darker
  const ir = noise(5, (d, n) => { for (let i = 0, b = 0; i < n; i++) { const t = i / sr; b += (rnd() * 2 - 1 - b) * (0.04 + 0.5 * exp(-t * 2)); d[i] = b * (1 - exp(-t * 30)) * exp(-t * 1.5) * (1 - i / n); } });

  const lim = N(DynamicsCompressorNode, { threshold: -6, knee: 6, ratio: 20, attack: 0.003, release: 0.3 }, ac.destination);
  const out = OUT = G(0, lim), wet = N(ConvolverNode, { buffer: ir }, out);
  const src = (playbackRate, ...to) => N(AudioBufferSourceNode, { buffer: nb, loop: true, playbackRate }, ...to);
  // rumble
  const rum = G(0.34, out); src(1, BQ('lowpass', 150, 0.7, rum)); lfo(0.07, 0.11, rum.gain); lfo(0.113, 0.08, rum.gain);
  // surface wash + water rush: the same noise played at another speed, so the loops never line up
  const wash = G(0.25, out), wave = G(1, wash), rush = G(0, out), rushF = BQ('bandpass', 300, 0.9, rush);
  src(0.63, BQ('bandpass', 420, 0.5, wave), rushF); lfo(0.09, 0.3, wave.gain); lfo(0.151, 0.25, wave.gain);
  // drone: stacked fifths on D, each note a pair of slightly detuned sines that slowly beat
  const pad = G(1, out, G(1.5, wet));
  [73.42, 110, 164.81, 246.94, 369.99].forEach((f, i) => { const g = G(0.022 - i * 0.003, pad); N(OscillatorNode, { frequency: f }, g); N(OscillatorNode, { frequency: f + rr(0.03, 0.11) }, g); });
  // pooled voices: oscillator -> envelope -> pan -> dry + reverb
  const pool = (n, send, type) => Array.from({ length: n }, () => { const p = N(StereoPannerNode, {}, out, G(send, wet)), g = G(0, p); return { p, g, o: N(OscillatorNode, { type }, g) }; });
  const bub = pool(4, 0.12), chime = pool(3, 1.2), whale = pool(2, 2, 'triangle');
  // one note: pitch glides f0 -> f1 over dur, level rises to vol in att then dies away
  const play = (vs, t, f0, f1, dur, vol, att) => {
    const v = vs.shift(), f = v.o.frequency, g = v.g.gain; vs.push(v);
    v.p.pan.setValueAtTime(rr(-0.7, 0.7), t);
    f.setValueAtTime(f0, t); f.exponentialRampToValueAtTime(f1, t + dur);
    g.setValueAtTime(0, t); g.linearRampToValueAtTime(vol, t + att); g.setTargetAtTime(0, t + att, (dur - att) / 5);
  };
  const NOTES = [0, 2, 5, 7, 9, 12, 14, 17, 19]; // D major pentatonic, in semitones above A4
  let lt = ac.currentTime, tB = lt + 1.5, tC = lt + 5, tW = lt + 12, lx = pos[0], ly = pos[1], lz = pos[2];
  out.gain.setTargetAtTime(VOL, lt, 1);
  return () => {
    const now = ac.currentTime, t = now + 0.05, dt = now - lt;
    if (dt <= 0) return;
    let v = hypot(pos[0] - lx, pos[1] - ly, pos[2] - lz) / dt; if (v > 60) v = 0; // ignore jumps to a viewpoint
    lt = now; lx = pos[0]; ly = pos[1]; lz = pos[2];
    rush.gain.setTargetAtTime(0.5 * pow(min(v / 26, 1), 1.2), t, 0.3); rushF.frequency.setTargetAtTime(220 + v * 14, t, 0.3);
    const s = near >= 0 ? clamp(1 - (hypot(pos[0] - PL[near].c[0], pos[1] - PL[near].c[1], pos[2] - PL[near].c[2]) - PL[near].R) / 60, 0, 1) : 0; wash.gain.setTargetAtTime(0.06 + 0.3 * s * s, t, 0.5);
    if (inWater && t > tB) { // a burst of 1-6 bubbles: short rising blips, smaller bubbles higher and shorter
      let tt = t;
      for (let n = 1 + rnd() * rnd() * 6 | 0; n--;) { const f = rr(380, 1300); play(bub, tt, f, f * rr(1.4, 2.2), 0.05 + 40 / f, rr(0.03, 0.08), 0.006); tt += rr(0.07, 0.2); }
      tB = tt + rr(0.5, 5);
    }
    if (t > tC) { const f = 440 * pow(2, NOTES[rnd() * 9 | 0] / 12); play(chime, t, f, f, 5, rr(0.02, 0.04), 0.03); tC = t + rr(2.5, 9); }
    if (t > tW) { // a phrase of 2-3 slow glides
      let tt = t;
      for (let n = 2 + rnd() * 2 | 0; n--;) { const f = rr(170, 380), d = rr(1.6, 3.2); play(whale, tt, f, f * rr(0.6, 1.7), d, 0.08, d * 0.4); tt += d * 0.8; }
      tW = tt + rr(20, 50);
    }
  };
}
// called on every click / key / touch: builds the graph once and resumes it when the browser allows
function sound() {
  if (!AC) { AC = new AudioContext({ latencyHint: 'playback' }); setInterval(mkSound(AC), 100); }
  if (AC.state === 'suspended' && !document.hidden) AC.resume();
}
const mute = () => { muted = !muted; OUT.gain.setTargetAtTime(muted ? 0 : VOL, AC.currentTime, 0.08); };
document.addEventListener('visibilitychange', () => { if (AC) document.hidden ? AC.suspend() : AC.resume(); });
