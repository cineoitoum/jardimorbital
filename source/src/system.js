// ============================================================================
// the planetary system: everything decided from one seed (load-time only)
// ============================================================================
// Biomes, from the reference boards:
//   0 prado   green meadow, orange flower specks, blue rim of atmosphere
//   1 cristal violet crystal columns, dark purple bushes, cyan glints, salmon valley paths
//   2 escarpa dark brown crags and spires, dark water, cyan mist
//   3 marmore poured-paint bands of pink, orange and blue, wet sheen
//   4 jardim  pink and violet flower fields, rock spires, floating rocks, pink haze
//   5 praia   the end: a psychedelic beach before a great sea (never part of a system)
const BIOMES = ['Prado', 'Cristal', 'Escarpa', 'Mármore', 'Jardim', 'Praia'];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
// colours given in sRGB, used linear
const lin = (h) => hex(h).map((c) => pow(c, 2.2));
const jit = (c, a) => c.map((v) => clamp(v * (1 + rr(-a, a)), 0, 4));
// slots: 0 rockA 1 rockB 2 ground 3 ground2 4 low/sand 5 emissive 6 water 7 deep water 8 blade base 9 blade tip 10 crystal 11 crystal glow
const PALETTES = [
  // prado
  () => ({ col: ['#3b3a36', '#57534a', '#2f6b1f', '#7a9a24', '#b9a24a', '#ff7a2a', '#2f7fb5', '#06213a', '#2f6b1f', '#a8c83a', '#000000', '#000000'], atm: '#4f8dff', dens: 0.010, H: 12, emis: 0 }),
  // cristal
  () => ({ col: ['#2a1d4a', '#3d2a6e', '#2a1640', '#3b1f5a', '#b56f5a', '#5ff7ff', '#3fd6e6', '#071434', '#1d0d33', '#4b2378', '#5a3cff', '#3ff0ff'], atm: '#6a4cff', dens: 0.004, H: 10, emis: 1 }),
  // escarpa
  () => ({ col: ['#2a1e17', '#4a3628', '#3a2a20', '#4f3a2a', '#5a4a3c', '#ff5a3a', '#1b3550', '#02060f', '#2a1a14', '#7a2a1e', '#000000', '#000000'], atm: '#46c8e8', dens: 0.012, H: 5, emis: 0.15 }),
  // marmore: ground slots carry the band colours
  () => ({ col: ['#1c2a5a', '#2e3f86', '#2b4fb8', '#ff7aa8', '#ffb347', '#ffd27a', '#35c3e0', '#0a1840', '#000000', '#7a5cff', '#3fd0d8', '#000000'], atm: '#3a6dff', dens: 0.007, H: 10, emis: 0 }),
  // jardim
  () => ({ col: ['#4a3f55', '#6a5a70', '#3f5a2a', '#5a7a34', '#8a6a7a', '#ff6ad5', '#6fa8ff', '#1a1a4a', '#2c4a1e', '#ff5fb4', '#000000', '#000000'], atm: '#ff8ad8', dens: 0.016, H: 14, emis: 0 }),
  // praia: band colours in 2, 3, 4, 9, 10; mushroom caps 5 and 11
  () => ({ col: ['#5a2a7a', '#8a3a9a', '#ff5fa8', '#ff9a3c', '#ffe08a', '#ff4fd8', '#2ae0d0', '#15206a', '#000000', '#3fd0ff', '#9a5cff', '#7affc8'], atm: '#b88aff', dens: 0.0025, H: 14, emis: 0.25 }),
];
const NEBULAE = [
  ['#5a2a9a', '#1f8a9a', '#c03a8a'],  // violet and teal clouds
  ['#1a4aff', '#2a6aff', '#7a3aff'],  // blue filaments
  ['#c0306a', '#5a2a9a', '#2a7aff'],  // magenta and violet
];
// each planet has a mood: its music, its light, its gravity
//   leve: light music, floaty gravity · enigmatico: strange music, earth gravity · sinistro: dark music, heavy gravity
const MOODS = ['leve', 'enigmatico', 'sinistro'];
const MOOD_NAMES = { leve: 'leve', enigmatico: 'enigmático', sinistro: 'sinistro' };
const MOOD_OF_BIOME = [0, 1, 2, 1, 0];
const SYL = ['ka', 'lu', 'mi', 'ra', 'no', 've', 'si', 'ta', 'or', 'el', 'zu', 'an', 'is', 'ko', 'ne', 'ya', 'th', 'ae'];
const nameOf = () => { let s = ''; for (let n = 2 + (rnd() * 2 | 0); n--;) s += SYL[rnd() * SYL.length | 0]; return s[0].toUpperCase() + s.slice(1); };

function makeSystem(seed, count = 5) {
  rseed(seed);
  const sun = (() => { const v = [rr(-1, 1), rr(0.2, 1), rr(-1, 1)], l = hypot(...v); return v.map((c) => c / l); })();
  // pick `count` different biomes
  const order = [0, 1, 2, 3, 4];
  for (let i = order.length - 1; i > 0; i--) { const j = rnd() * (i + 1) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  const planets = [], used = new Set();
  for (let i = 0; i < count; i++) {
    const biome = order[i % order.length], pal = PALETTES[biome]();
    let mood = MOODS[MOOD_OF_BIOME[biome]];
    if (used.has(mood)) mood = MOODS.find((m) => !used.has(m)) || mood;
    used.add(mood);
    const dark = mood === 'sinistro';
    if (dark) { for (const k of [0, 1, 2, 3, 4, 8, 9]) pal.col[k] = '#' + hex(pal.col[k]).map((c) => round(c * 255 * 0.62).toString(16).padStart(2, '0')).join(''); pal.dens *= 1.3; }
    const R = rr(62, 92);
    const A = R * [0.07, 0.11, 0.2, 0.05, 0.08][biome];
    const seaOff = [-0.35, -1.1, -0.15, -0.6, -0.4][biome] * A + rr(-0.15, 0.15) * A;
    const hasSea = biome === 1 ? rnd() < 0.5 : biome === 3 ? rnd() < 0.6 : true;
    // place it: the first at the origin, the rest next to one already placed, with a gap the jetpack can cross
    let c = [0, 0, 0];
    if (i) for (let tries = 0; tries < 200; tries++) {
      const o = planets[rnd() * planets.length | 0], gap = rr(55, 95);
      const d = (() => { const v = [rr(-1, 1), rr(-0.5, 0.5), rr(-1, 1)], l = hypot(...v); return v.map((x) => x / l); })();
      const dist = o.R + o.A * 2.5 + R + A * 2.5 + gap;
      const cc = d.map((x, k) => o.c[k] + x * dist);
      if (planets.every((p) => hypot(cc[0] - p.c[0], cc[1] - p.c[1], cc[2] - p.c[2]) > p.R + p.A * 2.5 + R + A * 2.5 + 50)) { c = cc; break; }
    }
    planets.push({
      i, biome, name: nameOf(), c, R, A, hmax: A * (biome === 2 || biome === 4 ? 2.4 : 1.4) + 5,
      sea: hasSea ? R + seaOff : 0, g: mood === 'leve' ? rr(0.8, 1.2) : mood === 'enigmatico' ? rr(8.8, 10.5) : rr(14, 17), mood, seed: rr(0, 200),
      col: pal.col.map((h) => jit(lin(h), 0.12)), atm: jit(lin(pal.atm), 0.1), dens: pal.dens * rr(0.8, 1.25), H: pal.H * rr(0.85, 1.2), emis: pal.emis,
    });
  }
  const neb = NEBULAE[rnd() * NEBULAE.length | 0].map((h) => jit(lin(h), 0.15));
  // a black hole out past the planets: rs is the visual radius, nr the point of no return
  const ctr = [0, 1, 2].map((k) => planets.reduce((a, p) => a + p.c[k], 0) / planets.length);
  const far = max(...planets.map((p) => hypot(p.c[0] - ctr[0], p.c[1] - ctr[1], p.c[2] - ctr[2]) + p.R));
  let bc = null;
  for (let tries = 0; tries < 100 && !bc; tries++) {
    const d = (() => { const v = [rr(-1, 1), rr(-0.4, 0.4), rr(-1, 1)], l = hypot(...v); return v.map((x) => x / l); })();
    const c = d.map((x, k) => ctr[k] + x * (far + rr(170, 230)));
    if (planets.every((p) => hypot(c[0] - p.c[0], c[1] - p.c[1], c[2] - p.c[2]) > p.R + 280)) bc = c;
  }
  const bn = (() => { const v = [rr(-0.4, 0.4), 1, rr(-0.4, 0.4)], l = hypot(...v); return v.map((x) => x / l); })();
  const bh = { c: bc || [ctr[0] + far + 400, ctr[1], ctr[2]], rs: 6, nr: 22, GM: 22000, n: bn, ctr, far };
  return { seed, sun, planets, neb, nebStyle: rnd() < 0.5 ? 0 : 1, nebSeed: rr(0, 100), bh };
}
// the place at the end: one big quiet planet far from everything, with a sea over most of it
function makeShore(sys) {
  rseed(sys.seed * 7 + 3);
  const pal = PALETTES[5](), R = 500, A = 13;
  const c = [sys.bh.ctr[0] + 6000, sys.bh.ctr[1] + 900, sys.bh.ctr[2] - 4000];
  return {
    i: 7, biome: 5, name: 'Praia', c, R, A, hmax: A * 1.6 + 5, sea: R + A * 0.15, g: 3, mood: 'leve', seed: rr(0, 200),
    col: pal.col.map((h) => lin(h)), atm: lin(pal.atm), dens: pal.dens, H: pal.H, emis: pal.emis,
  };
}

// gravity at (x, y, z): the sum of every planet's pull, falling off with the square of the distance
function gravity(planets, x, y, z, out, bh) {
  out[0] = out[1] = out[2] = 0;
  if (bh) {
    // the black hole pulls hard up close and not at all beyond ~250 m, so the planets stay upright
    const dx = bh.c[0] - x, dy = bh.c[1] - y, dz = bh.c[2] - z, d = max(hypot(dx, dy, dz), 2);
    const a = bh.GM / (d * d) * sstep(250, 140, d) / d;
    out[0] += dx * a; out[1] += dy * a; out[2] += dz * a;
  }
  for (const p of planets) {
    const dx = p.c[0] - x, dy = p.c[1] - y, dz = p.c[2] - z, d = max(hypot(dx, dy, dz), p.R * 0.5);
    // each planet only holds what is inside its sphere of influence, fading out a little past the atmosphere,
    // so a heavy neighbour never pulls you off a light planet
    const ri = p.R + p.hmax + 75;
    const a = p.g * (p.R / d) * (p.R / d) / d * sstep(ri, ri * 0.72, d);
    out[0] += dx * a; out[1] += dy * a; out[2] += dz * a;
  }
  return out;
}
