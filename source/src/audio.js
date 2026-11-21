// ============================================================================
// audio: procedural ambience and one generated piece of music per planet (no sample files)
// ============================================================================
// The ambience graph comes from Abyssal Garden (MIT): rumble, wind that follows speed, a drone and chimes for open
// space. On top, every planet has its own piece, written from its seed and its mood:
//   leve        major / lydian, plucked arpeggios through an echo, warm pad, soft bass
//   enigmatico  whole-tone and odd scales, FM bells at irregular times, a drifting cluster pad, glass shimmer
//   sinistro    phrygian / locrian, a slow heartbeat, a growling low voice, dissonant swells, metal scrapes
// The pieces cross-fade with distance; inside the black hole everything sinks under a deep drone.
let AC, OUT, muted = false, SPEAK = null;
const VOL = 0.78;
function mkSound(ac) {
  const sr = ac.sampleRate;
  const N = (C, o, ...to) => { const n = new C(ac, o); for (const d of to) n.connect(d); if (n.start) n.start(); return n; };
  const G = (gain, ...to) => N(GainNode, { gain }, ...to);
  const BQ = (type, frequency, Q, ...to) => N(BiquadFilterNode, { type, frequency, Q }, ...to);
  const lfo = (frequency, depth, to) => N(OscillatorNode, { frequency }, G(depth, to));
  const noise = (secs, f) => { const n = sr * secs | 0, b = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: sr }); f(b.getChannelData(0), n); f(b.getChannelData(1), n); return b; };
  const nb = noise(11, (d, n) => { for (let i = 0, b = 0; i < n + 4096; i++) { b = (b + 0.02 * (rnd() * 2 - 1)) / 1.02; if (i < n) d[i] = b * 3.5; else { const k = (i - n) / 4096; d[i - n] = d[i - n] * k + b * 3.5 * (1 - k); } } });
  const wn = noise(2, (d, n) => { for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1; });
  const ir = noise(5, (d, n) => { for (let i = 0, b = 0; i < n; i++) { const t = i / sr; b += (rnd() * 2 - 1 - b) * (0.04 + 0.5 * exp(-t * 2)); d[i] = b * (1 - exp(-t * 30)) * exp(-t * 1.5) * (1 - i / n); } });

  const lim = N(DynamicsCompressorNode, { threshold: -8, knee: 6, ratio: 12, attack: 0.003, release: 0.3 }, ac.destination);
  const out = OUT = G(0, lim), wet = N(ConvolverNode, { buffer: ir }, out);
  // a shared echo for plucks and bells
  const echo = N(DelayNode, { delayTime: 0.42, maxDelayTime: 2 }), fb = G(0.38, echo);
  echo.connect(fb); echo.connect(out); echo.connect(G(0.5, wet));
  const src = (buffer, playbackRate, ...to) => N(AudioBufferSourceNode, { buffer, loop: true, playbackRate }, ...to);
  // rumble + wind (follows speed)
  const rum = G(0.28, out); src(nb, 1, BQ('lowpass', 150, 0.7, rum)); lfo(0.07, 0.09, rum.gain);
  const rush = G(0, out), rushF = BQ('bandpass', 300, 0.9, rush); src(nb, 0.63, rushF);
  // open space: drone of stacked fifths and chimes (from Abyssal Garden)
  const space = G(0, out, G(1.2, wet));
  [73.42, 110, 164.81, 246.94, 369.99].forEach((f, i) => { const g = G(0.02 - i * 0.003, space); N(OscillatorNode, { frequency: f }, g); N(OscillatorNode, { frequency: f + rr(0.03, 0.11) }, g); });
  // the black hole: a very low beating drone and a hollow wind
  const hole = G(0, out, G(1.5, wet));
  for (const f of [27.5, 41.2, 55.1]) { const g = G(0.12, hole); N(OscillatorNode, { frequency: f }, g); N(OscillatorNode, { frequency: f * 1.006 }, g); }
  src(nb, 0.4, BQ('bandpass', 180, 3, G(0.5, hole)));

  // the corridor of light: a bright lydian cluster, shimmering
  const corr = G(0, out, G(1.4, wet));
  [261.6, 329.6, 370, 392, 523.3, 659.3, 740, 987.8].forEach((f, i) => { const g = G(0.018, corr); N(OscillatorNode, { frequency: f }, g); N(OscillatorNode, { frequency: f * 1.003 }, g); lfo(0.2 + i * 0.07, 0.012, g.gain); });
  // the shore: waves on the sand, a warm major pad, a soft choir singing "ah"
  const shore = G(0, out, G(1, wet));
  const waves = G(0.5, shore); src(nb, 0.45, BQ('lowpass', 700, 0.5, waves)); lfo(0.09, 0.4, waves.gain); lfo(0.053, 0.25, waves.gain);
  [130.8, 196, 246.9, 293.7, 329.6].forEach((f) => { const g = G(0.02, BQ('lowpass', 1400, 0.5, shore)); N(OscillatorNode, { type: 'triangle', frequency: f }, g); N(OscillatorNode, { type: 'triangle', frequency: f * 1.004 }, g); });
  const choir = G(0.5, shore), f1 = BQ('bandpass', 750, 6, choir), f2 = BQ('bandpass', 1150, 8, choir);
  [261.6, 329.6, 392].forEach((f) => { const o = N(OscillatorNode, { type: 'sawtooth', frequency: f }, G(0.03, f1, f2)); lfo(5 + rnd(), 3, o.frequency); });
  lfo(0.07, 0.35, choir.gain);
  // breathing (B): a very deep, warm drone and a slow tide of air, rising and falling about once every 5.5 s
  const breathBus = G(0, out, G(1.2, wet));
  for (const [f, v] of [[36.7, 0.22], [55, 0.14], [73.4, 0.07], [110, 0.025]]) { const g = G(v, BQ('lowpass', 260, 0.6, breathBus)); N(OscillatorNode, { frequency: f }, g); N(OscillatorNode, { frequency: f * 1.004 }, g); }
  const air = G(0, breathBus); src(nb, 0.5, BQ('bandpass', 380, 0.8, air));
  const tide = N(OscillatorNode, { frequency: 1.15 / (2 * Math.PI) }, G(0.35, air.gain));
  const swell = G(0.3, breathBus.gain); tide.connect(swell);
  // ---------------------------------------------------------------- notes
  // a voice made for one note and thrown away; env: attack, decay time constant, level
  const voice = (dest, type, f, t, att, dec, vol, o = {}) => {
    const g = G(0, dest), osc = new OscillatorNode(ac, { type, frequency: f });
    let to = g;
    if (o.lp) { to = new BiquadFilterNode(ac, { type: 'lowpass', frequency: o.lp, Q: o.q || 0.7 }); to.connect(g); }
    osc.connect(to);
    if (o.fm) { // frequency modulation: a bell or a glassy tone
      const m = new OscillatorNode(ac, { frequency: f * o.fm }), mg = new GainNode(ac, { gain: 0 });
      m.connect(mg); mg.connect(osc.frequency);
      mg.gain.setValueAtTime(f * (o.idx || 2), t); mg.gain.setTargetAtTime(0, t, dec * 0.4);
      m.start(t); m.stop(t + att + dec * 6);
    }
    if (o.glide) osc.frequency.setTargetAtTime(f * o.glide, t, dec * 0.5);
    if (o.det) osc.detune.value = o.det;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setTargetAtTime(0, t + att, dec);
    osc.start(t); osc.stop(t + att + dec * 6);
    return osc;
  };
  const hz = (root, semis) => root * pow(2, semis / 12);
  const SCALES = {
    leve: [[0, 2, 4, 7, 9], [0, 2, 4, 6, 7, 9, 11], [0, 2, 4, 5, 7, 9, 11]],
    enigmatico: [[0, 2, 4, 6, 8, 10], [0, 1, 4, 6, 7, 10], [0, 3, 4, 7, 8, 11], [0, 1, 5, 6, 8, 11]],
    sinistro: [[0, 1, 3, 5, 6, 8, 10], [0, 1, 4, 5, 7, 8, 10], [0, 2, 3, 6, 7, 8, 11]],
  };
  // one piece per planet, from its own random stream so the music is the same every visit
  function makeSong(p, bus) {
    let st = (p.seed * 9973 | 0) + 17;
    const r = () => { st = (st + 0x6D2B79F5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const rg = (a, b) => a + (b - a) * r(), pk = (a) => a[r() * a.length | 0];
    const mood = p.mood, sc = pk(SCALES[mood]), n = sc.length;
    const deg = (d) => sc[((d % n) + n) % n] + 12 * floor(d / n);
    const root = mood === 'leve' ? hz(196, r() * 7 | 0) : mood === 'enigmatico' ? hz(146.8, r() * 6 | 0) : hz(41.2, r() * 5 | 0);
    const step = mood === 'leve' ? rg(0.2, 0.3) : mood === 'enigmatico' ? rg(0.26, 0.4) : rg(0.6, 0.85);
    const prog = Array.from({ length: 4 }, (_, i) => (i ? pk([1, 2, 3, 4, 5, -1, -2]) : 0));
    const barLen = mood === 'sinistro' ? 8 : 16;
    const pad = G(1, bus, G(0.9, wet)), lead = G(1, bus), dly = G(0.5, echo);
    lead.connect(dly);
    let next = 0, k = 0, mel = n, bar = 0;
    return {
      reset(t) { next = t + 0.1; },
      tick(t0, t1) {
        if (next < t0) next = t0;
        while (next < t1) {
          const t = next;
          if (k % barLen === 0) {
            // a new chord on the pad
            const c = prog[bar++ % prog.length], dur = step * barLen;
            const notes = mood === 'enigmatico' ? [0, 1, 3, 5] : mood === 'sinistro' ? [0, 2, 3] : [0, 2, 4, 6];
            for (const d of notes) {
              const f = hz(root, deg(c + d)) * (mood === 'sinistro' ? 2 : 1);
              voice(pad, mood === 'sinistro' ? 'sawtooth' : mood === 'leve' ? 'triangle' : 'sine', f, t, dur * 0.35, dur * 0.35, mood === 'sinistro' ? 0.025 : 0.03,
                { lp: mood === 'sinistro' ? 420 : mood === 'leve' ? 1600 : 1100, det: rg(-9, 9), glide: mood === 'enigmatico' ? pow(2, rg(-0.3, 0.3) / 12) : 0 });
            }
            if (mood === 'leve') voice(pad, 'sine', hz(root / 2, deg(c)), t, 0.05, step * 6, 0.12);
            if (mood === 'sinistro' && r() < 0.5) voice(pad, 'sawtooth', hz(root * 4, deg(c) + 6), t + step * 2, step * 3, step * 3, 0.012, { lp: 900 }); // the tritone swell
          }
          // melody: a random walk over the scale
          const pn = mood === 'leve' ? 0.6 : mood === 'enigmatico' ? 0.38 : 0.18;
          if (r() < pn) {
            mel += pk([-2, -1, -1, 1, 1, 2, 0, 3, -3]); mel = clamp(mel, 0, n * 2 + 2);
            const f = hz(root, deg(mel)) * (mood === 'sinistro' ? 4 : 2);
            if (mood === 'leve') voice(lead, 'triangle', f, t, 0.005, 0.35, 0.07);
            else if (mood === 'enigmatico') voice(lead, 'sine', f, t + rg(0, step * 0.5), 0.004, rg(0.6, 1.4), 0.06, { fm: pk([1.41, 2.76, 3.5, 1.83]), idx: rg(1, 4) });
            else voice(lead, 'sawtooth', f / 2, t, rg(0.05, 0.4), rg(0.8, 1.6), 0.05, { lp: 380, q: 6, glide: pk([1, 1, 0.94, 1.06]) });
          }
          if (mood === 'sinistro' && k % 4 === 0) { // heartbeat
            voice(bus, 'sine', 62, t, 0.005, 0.09, 0.45, { glide: 0.55 });
            voice(bus, 'sine', 58, t + step * 0.38, 0.005, 0.08, 0.3, { glide: 0.55 });
          }
          if (mood === 'sinistro' && r() < 0.012) { // metal scrape
            const s = new AudioBufferSourceNode(ac, { buffer: wn, loop: true }), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: rg(900, 2500), Q: 25 }), g = new GainNode(ac, { gain: 0 });
            s.connect(f); f.connect(g); g.connect(bus); g.connect(wet);
            f.frequency.setTargetAtTime(rg(300, 700), t, 1.5);
            g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 1.2); g.gain.setTargetAtTime(0, t + 1.5, 0.8);
            s.start(t); s.stop(t + 6);
          }
          if (mood === 'enigmatico' && r() < 0.03) { // glass shimmer
            for (let j = 0; j < 4; j++) voice(lead, 'sine', hz(root * 8, deg(mel + j * 2)), t + j * 0.07, 0.01, 0.8, 0.015);
          }
          next += step * (mood === 'enigmatico' ? pk([1, 1, 1, 0.5, 1.5, 0.75]) : 1);
          k++;
        }
      },
    };
  }
  const songs = PL.map((p) => {
    const lp = BQ('lowpass', 18000, 0.5, G(1, out)), bus = G(0, lp);
    return { bus, lp, song: makeSong(p, bus), w: 0 };
  });
  // a soul speaking: a soft glide; a thought inside the black hole: a low bell
  SPEAK = (kind) => {
    if (kind === 'pulse') {
      // a deep beat, like a heart heard from inside
      const t = ac.currentTime + 0.01, p = G(1, out, G(0.8, wet));
      voice(p, 'sine', 58, t, 0.004, 0.12, 0.6, { glide: 0.55 }); voice(p, 'sine', 116, t, 0.004, 0.05, 0.12);
      return;
    }
    if (kind === 'expel') {
      // a deep, slow refusal
      const t = ac.currentTime + 0.02, p = G(1, out, G(2, wet));
      voice(p, 'sine', 55, t, 0.15, 2.2, 0.5, { glide: 0.6 }); voice(p, 'sine', 82.4, t + 0.05, 0.2, 2, 0.25, { glide: 0.7 });
      voice(p, 'sawtooth', 41.2, t, 0.4, 1.8, 0.12, { lp: 180, glide: 0.8 });
      return;
    }
    const t = ac.currentTime + 0.02, f = kind === 'thought' ? rr(220, 330) : rr(330, 660);
    const p = N(StereoPannerNode, { pan: rr(-0.4, 0.4) }, out, G(1.5, wet));
    voice(p, 'sine', f, t, 0.3, 0.9, 0.05, { glide: rr(0.8, 1.25) });
    voice(p, 'sine', f * 1.5, t + 0.15, 0.4, 0.8, 0.025);
  };
  const NOTES = [0, 2, 5, 7, 9, 12, 14, 17, 19];
  const chime = (t) => { const f = 440 * pow(2, NOTES[rnd() * 9 | 0] / 12), p = N(StereoPannerNode, { pan: rr(-0.7, 0.7) }, space, G(1.2, wet)); voice(p, 'sine', f, t, 0.03, 1, 0.03); };
  let lt = ac.currentTime, tC = lt + 5, tS = lt, lx = pos[0], ly = pos[1], lz = pos[2];
  out.gain.setTargetAtTime(VOL, lt, 1);
  return () => {
    const now = ac.currentTime, t = now + 0.05, dt = now - lt;
    if (dt <= 0) return;
    let v = hypot(pos[0] - lx, pos[1] - ly, pos[2] - lz) / dt; if (v > 150) v = 0;
    lt = now; lx = pos[0]; ly = pos[1]; lz = pos[2];
    rush.gain.setTargetAtTime(0.5 * pow(min(v / 60, 1), 1.2) + aura * 0.08, t, 0.3); rushF.frequency.setTargetAtTime(220 + v * 10, t, 0.3);
    // the end takes over all other music
    const endF = max(END.corr, END.shore);
    corr.gain.setTargetAtTime(END.corr * 0.9 + END.glare * 0.4 * (1 - END.shore), t, 1.5);
    shore.gain.setTargetAtTime(END.shore * 0.9, t, 3);
    if (END.shore && t > tS) { const f = 523.3 * pow(2, [0, 2, 4, 7, 9, 12][rnd() * 6 | 0] / 12), pp = N(StereoPannerNode, { pan: rr(-0.8, 0.8) }, shore, G(1.5, wet)); voice(pp, 'sine', f, t, 0.02, 2.5, 0.025, { fm: 2, idx: 0.5 }); tS = t + rr(3, 9); }
    // which planet's music: by distance to its surface
    let wmax = 0;
    for (let i = 0; i < songs.length; i++) {
      const p = PL[i], s = songs[i], d = hypot(pos[0] - p.c[0], pos[1] - p.c[1], pos[2] - p.c[2]) - p.R;
      const w = sstep(p.hmax + 150, p.hmax + 30, d) * (1 - bhIn) * (1 - endF) * (1 - END.glare * 0.6);
      if (w > 0.01 && s.w <= 0.01) s.song.reset(now);
      s.w = w; wmax = max(wmax, w);
      s.bus.gain.setTargetAtTime(w * 0.9, t, 1.2);
      s.lp.frequency.setTargetAtTime(mix(18000, 350, max(bhNear, bhIn, breath * 0.85)), t, 0.5);
      if (w > 0.01) s.song.tick(now, now + 0.5);
    }
    space.gain.setTargetAtTime((1 - wmax) * (1 - bhIn) * (1 - endF), t, 1.5);
    breathBus.gain.setTargetAtTime(breath * 0.85, t, breath > 0.5 ? 0.8 : 0.5);
    hole.gain.setTargetAtTime(max(bhIn, bhNear * 0.6) * 0.9, t, 1);
    if (t > tC && wmax < 0.5 && !bhIn) { chime(t); tC = t + rr(2.5, 9); }
  };
}
function sound() {
  if (!AC) { AC = new AudioContext({ latencyHint: 'playback' }); setInterval(mkSound(AC), 100); }
  if (AC.state === 'suspended' && !document.hidden) AC.resume();
}
const mute = () => { muted = !muted; if (OUT) OUT.gain.setTargetAtTime(muted ? 0 : VOL, AC.currentTime, 0.08); };
const speakSound = (kind) => { if (SPEAK && !muted) SPEAK(kind); };
document.addEventListener('visibilitychange', () => { if (AC) document.hidden ? AC.suspend() : AC.resume(); });
