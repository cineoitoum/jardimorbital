// ============================================================================
// visions: a look inward. Each feeling has a small symbolic scene, built from boxes, cylinders and spheres,
// floating in a coloured void around a still point (the viewer at the origin, looking along -Z at first).
// ============================================================================
// Instance format (64 bytes): pos.xyz + emissive | scale.xyz + phase | rotation quaternion | colour.rgb + float amplitude
// Objects made of several parts share a phase and an amplitude so they drift together.
const VIS_ENV = {
  alegria: { top: '#ffcf8a', bottom: '#ff7a5c', fog: '#ffb070', key: '#fff0d0', beam: [1.6, 1.15, 0.5] },
  desejo: { top: '#24186a', bottom: '#ff8ac0', fog: '#9a6ad8', key: '#ffd0f0', beam: [1.3, 0.6, 1.5] },
  conquista: { top: '#5a88d8', bottom: '#f0c890', fog: '#8a9ac0', key: '#fff4d8', beam: [1.5, 1.4, 1.1] },
  arrependimento: { top: '#7fa8a0', bottom: '#e88a9a', fog: '#8a9aa8', key: '#ffd0c0', beam: [0.45, 0.7, 1.6] },
  perda: { top: '#151c28', bottom: '#4a5668', fog: '#3a4658', key: '#c8d0e0', beam: [0.8, 0.9, 1.2] },
};
const visMeshes = () => {
  const box = new Mesh();
  // unit cube with hard edges
  const F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
  for (const [n, a, b] of F) {
    const v = (s, t) => box.v(n[0] * 0.5 + (a[0] * s + b[0] * t) * 0.5, n[1] * 0.5 + (a[1] * s + b[1] * t) * 0.5, n[2] * 0.5 + (a[2] * s + b[2] * t) * 0.5, 0);
    box.quad(v(-1, -1), v(1, -1), v(1, 1), v(-1, 1));
  }
  const cyl = new Mesh(), S = 18;
  const ring = (y) => Array.from({ length: S }, (_, k) => cyl.v(cos(k / S * TAU) * 0.5, y, sin(k / S * TAU) * 0.5, 0));
  const r0 = ring(-0.5), r1 = ring(0.5), s0 = ring(-0.5), s1 = ring(0.5), c0 = cyl.v(0, -0.5, 0, 0), c1 = cyl.v(0, 0.5, 0, 0);
  for (let k = 0; k < S; k++) { const k2 = (k + 1) % S; cyl.quad(r0[k], r1[k], r1[k2], r0[k2]); cyl.tri(c0, s0[k2], s0[k]); cyl.tri(c1, s1[k], s1[k2]); }
  const sph = icosphere(2, (x, y, z) => [x * 0.5, y * 0.5, z * 0.5]);
  sph.aux = sph.aux.map(() => 0);
  return [box.build(), cyl.build(), sph.build()];
};
// builds the list of parts for a feeling: [mesh, x, y, z, sx, sy, sz, quaternion, colour, emissive, phase, amplitude]
function visionScene(feel) {
  rseed(FEELINGS.indexOf(feel) * 97 + 5);
  const out = [];
  let G = { p: [0, 0, 0], q: [0, 0, 0, 1], ph: 0, amp: 0 };
  const C = (h) => hex(h).map((c) => pow(c, 2.2));
  const qE = (yaw = 0, pitch = 0, roll = 0) => qMul(qMul(qAxis(0, 1, 0, yaw), qAxis(1, 0, 0, pitch)), qAxis(0, 0, 1, roll));
  const rot = (q, v) => { const [x, y, z, w] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]); return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx]; };
  // start a group at p with orientation (yaw, pitch, roll); amp: how much it bobs
  const group = (p, yaw = 0, pitch = 0, roll = 0, amp = 0.12) => { G = { p, q: qE(yaw, pitch, roll), ph: rnd(), amp }; };
  const part = (m, lp, ls, col, emis = 0, lq = [0, 0, 0, 1]) => { const w = rot(G.q, lp); out.push([m, G.p[0] + w[0], G.p[1] + w[1], G.p[2] + w[2], ...ls, qMul(G.q, lq), typeof col === 'string' ? C(col) : col, emis, G.ph, G.amp]); };
  const box = (lp, ls, col, emis, lq) => part(0, lp, ls, col, emis, lq), cyl = (lp, ls, col, emis, lq) => part(1, lp, ls, col, emis, lq), ball = (lp, r, col, emis) => part(2, lp, [r * 2, r * 2, r * 2], col, emis);
  // ---------------------------------------------------------------- furniture and things
  const table = (w, d, h, col) => { box([0, h, 0], [w, 0.07, d], col); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([sx * (w / 2 - 0.07), h / 2, sz * (d / 2 - 0.07)], [0.07, h, 0.07], col); };
  const chair = (col) => { box([0, 0.45, 0], [0.48, 0.05, 0.48], col); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([sx * 0.2, 0.22, sz * 0.2], [0.05, 0.45, 0.05], col); box([0, 0.78, -0.22], [0.48, 0.62, 0.05], col); };
  const windowFrame = (w, h, pane, emis) => { box([0, h / 2, 0], [w + 0.2, 0.1, 0.12], '#f2ead8'); box([0, -h / 2, 0], [w + 0.2, 0.1, 0.12], '#f2ead8'); box([-w / 2, 0, 0], [0.1, h, 0.12], '#f2ead8'); box([w / 2, 0, 0], [0.1, h, 0.12], '#f2ead8'); box([0, 0, 0], [0.06, h, 0.08], '#f2ead8'); box([0, 0, -0.02], [w, h, 0.02], pane, emis); };
  const cup = (x, y, z, col) => { cyl([x, y + 0.06, z], [0.16, 0.12, 0.16], col); box([x + 0.1, y + 0.06, z], [0.04, 0.07, 0.015], col); };
  const letter = (col = '#f4ecd8') => box([0, 0, 0], [0.32, 0.22, 0.008], col, 0.15);
  const suitcase = (col) => { box([0, 0, 0], [0.7, 0.5, 0.22], col); box([0, 0.3, 0], [0.2, 0.06, 0.04], '#3a2a20'); };
  const balloon = (col) => { ball([0, 0, 0], 0.28, col, 0.35); cyl([0, -0.9, 0], [0.01, 1.3, 0.01], '#eeeeee'); };
  const floor = (r, col, emis = 0) => { group([0, -1.75, 0], 0, 0, 0, 0); cyl([0, 0, 0], [r * 2, 0.04, r * 2], col, emis); };
  // ---------------------------------------------------------------- the scenes
  if (feel === 'alegria') {
    // a Sunday kitchen: table laid, chairs pushed back, a drawing of a sun on the fridge, balloons, oranges, a kite
    floor(9, '#c88a5a');
    group([0, -1.75, -4], 0.2, 0, 0, 0.05); table(2.2, 1.2, 0.85, '#a0683a');
    for (const [x, y, z] of [[-0.6, 0.89, 0.2], [0.1, 0.89, -0.25], [0.7, 0.89, 0.15]]) cup(x, y, z, '#fff6e8');
    cyl([0, 0.9, 0], [0.5, 0.03, 0.5], '#f8f0e0'); ball([0, 1.02, 0], 0.13, '#ff9a30', 0.2); ball([0.12, 0.98, 0.08], 0.09, '#ff9a30', 0.2);
    for (const [x, z, yaw] of [[-1.5, 0.3, 1.3], [1.5, -0.2, -1.5], [0.2, 1.1, 3.3]]) { group([x * 0.95 + 0, -1.75, -4 + z], yaw + 0.2, 0, 0, 0.04); chair('#b97a48'); }
    group([-4.2, -1.75, -1.5], 1.2, 0, 0, 0.03); box([0, 0.95, 0], [0.8, 1.9, 0.7], '#f6f2ea'); box([0, 1.2, 0.36], [0.32, 0.42, 0.01], '#fff3b0', 0.3); ball([0, 1.26, 0.38], 0.08, '#ffb020', 0.9);
    group([3.5, 0.9, -6.5], -0.5, 0, 0, 0.05); windowFrame(2, 1.6, '#40d8e0', 1.6); box([0, -0.25, -0.03], [2, 0.6, 0.01], '#1ab0c8', 1.4); box([0, 0.45, -0.03], [2, 0.7, 0.01], '#bfe8ff', 1.8);
    group([-3.2, 1.1, -5.2], 0.6, 0, 0, 0.03); box([0, 0, 0], [2.2, 0.06, 0.4], '#8a5a30'); for (let k = 0; k < 5; k++) cyl([-0.85 + k * 0.42, 0.15, 0], [0.3, 0.24, 0.3], '#c86a2a', 0.15); box([0, 0.7, 0], [2.2, 0.06, 0.4], '#8a5a30'); for (let k = 0; k < 6; k++) cyl([-0.9 + k * 0.36, 0.78, 0], [0.26, 0.1, 0.26], '#f4f0e8');
    const bc = ['#ff4f6a', '#ffd23f', '#3fb6ff', '#7aff8a', '#ff8adf'];
    for (let k = 0; k < 9; k++) { const a = rr(0, TAU), r = rr(3, 7); group([cos(a) * r, rr(0.5, 3.2), sin(a) * r], 0, 0, 0, rr(0.15, 0.35)); balloon(bc[k % 5]); }
    for (let k = 0; k < 12; k++) { const a = rr(0, TAU), r = rr(2.2, 6); group([cos(a) * r, rr(-1, 2.5), sin(a) * r], rr(0, TAU), rr(0, TAU), 0, 0.2); ball([0, 0, 0], 0.09, '#ff8a20', 0.25); }
    group([-2, 3.2, 4], 0.6, 0, 0.785, 0.4); box([0, 0, 0], [0.9, 0.9, 0.02], '#ff4f6a', 0.4); for (let k = 1; k < 7; k++) ball([0.3 + k * 0.18, -0.3 - k * 0.22, 0], 0.05, bc[k % 5], 0.5);
    for (let k = 0; k < 5; k++) { const a = rr(0, TAU); group([cos(a) * 4, rr(0.8, 2.6), sin(a) * 4], rr(0, TAU), 0.2, 0, 0.3); box([0, 0, 0], [0.5, 0.01, 0.22], '#fffaf0', 0.2, qAxis(0, 0, 1, 0.3)); box([0, 0, 0], [0.5, 0.01, 0.22], '#fffaf0', 0.2, qAxis(0, 0, 1, -0.3)); }
  } else if (feel === 'desejo') {
    // a great window onto a sea never reached; suitcases, a map with pins, a little boat, a coin jar, stairs into the light
    floor(10, '#3a2a6a');
    group([0, 0.6, -6], 0, 0, 0, 0.04); windowFrame(3.4, 2.4, '#5ae0f0', 1.6); box([0, -0.1, -0.03], [3.4, 0.05, 0.01], '#fff4d0', 4);
    for (let k = 0; k < 4; k++) { group([rr(-5, 5), rr(-1.2, 1.5), rr(-1, 5)], rr(0, TAU), rr(-0.4, 0.4), rr(-0.4, 0.4), rr(0.1, 0.3)); suitcase(['#7a3a2a', '#2a4a7a', '#8a6a2a', '#4a2a5a'][k]); }
    group([-3.6, 1.2, -3.2], 0.9, -0.1, 0, 0.15); box([0, 0, 0], [1.4, 0.9, 0.01], '#e8d8b0', 0.25); for (let k = 0; k < 9; k++) ball([rr(-0.6, 0.6), rr(-0.4, 0.4), 0.03], 0.03, '#ff3a4a', 0.8);
    group([4.5, -0.9, 2], -2.2, 0, 0.1, 0.25); box([0, 0, 0], [2, 0.35, 0.65], '#8a4a2a'); cyl([0, 1, 0], [0.06, 1.8, 0.06], '#d8c8a8'); box([0.35, 1.1, 0], [0.7, 1.3, 0.01], '#fff8f0', 0.5);
    group([2.5, -1.2, -3], 0, 0, 0, 0.06); cyl([0, 0, 0], [0.4, 0.55, 0.4], '#a8d8e8', 0.3); for (let k = 0; k < 8; k++) cyl([rr(-0.1, 0.1), -0.2 + k * 0.05, rr(-0.1, 0.1)], [0.12, 0.02, 0.12], '#ffd040', 0.6);
    for (let k = 0; k < 12; k++) { group([0, -1.7 + k * 0.42, 5 + k * 0.6], 0, 0, 0, 0); box([0, 0, 0], [1.4, 0.12, 0.6], k > 8 ? '#fff0f8' : '#6a5aa8', k > 8 ? 3 : 0.1); }
  } else if (feel === 'conquista') {
    // a house raised by hand, half finished; bricks, a ladder, a tree grown taller than expected, a great golden key, a medal
    floor(10, '#b8a888');
    group([0, -1.75, -6.5], 0.3, 0, 0, 0);
    box([0, 0.05, 0], [4, 0.1, 3], '#8a7a6a');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl([sx * 1.9, 1.3, sz * 1.4], [0.14, 2.5, 0.14], '#a87848');
    box([-1.05, 2.95, 0], [2.4, 0.08, 3.1], '#c8785a', 0.45, qAxis(0, 0, 1, 0.6)); box([1.05, 2.95, 0], [2.4, 0.08, 3.1], '#c8785a', 0.45, qAxis(0, 0, 1, -0.6));
    for (let y = 0; y < 6; y++) for (let x = 0; x < 7 - (y > 3 ? 3 : 0); x++) box([-1.6 + x * 0.42 + (y % 2) * 0.21, 0.2 + y * 0.17, 1.45], [0.4, 0.15, 0.2], '#b8583a');
    box([-1.95, 1.2, 0], [0.12, 2.3, 2.9], '#f0d040', 0.15); box([0, 1.6, -1.45], [3.9, 1.6, 0.12], '#f0d040', 0.15);
    box([0.8, 1, 1.46], [0.8, 1.8, 0.05], '#ff7a2a', 0.5); ball([1.05, 1, 1.5], 0.05, '#ffd040', 1); box([-1.96, 1.4, 0.4], [0.05, 0.7, 0.8], '#ffe070', 3); box([-0.6, 1.9, -1.5], [0.9, 0.6, 0.05], '#ffe070', 3);
    group([3.2, -1.75, -3], -0.4, 0, -0.25, 0); for (const sx of [-1, 1]) box([sx * 0.25, 1.6, 0], [0.06, 3.2, 0.06], '#a87848'); for (let k = 0; k < 9; k++) box([0, 0.3 + k * 0.35, 0], [0.5, 0.04, 0.04], '#a87848');
    group([-4, -1.75, -2], 0, 0, 0, 0); cyl([0, 1.6, 0], [0.35, 3.2, 0.35], '#6a4a30'); for (let k = 0; k < 7; k++) ball([rr(-1.2, 1.2), rr(3, 4.6), rr(-1.2, 1.2)], rr(0.6, 1.1), '#4a8a3a', 0.05);
    group([1.3, 0.3, -2.6], -0.5, 0.3, 0.4, 0.15);
    for (let k = 0; k < 14; k++) ball([cos(k / 14 * TAU) * 0.3 - 0.55, sin(k / 14 * TAU) * 0.3, 0], 0.07, '#ffcf40', 1.4);
    box([0.3, 0, 0], [1.1, 0.12, 0.08], '#ffcf40', 1.4); box([0.7, -0.14, 0], [0.08, 0.2, 0.08], '#ffcf40', 1.4); box([0.55, -0.12, 0], [0.08, 0.16, 0.08], '#ffcf40', 1.4);
    group([-1.8, 1.6, 3], 2.6, 0, 0, 0.25); cyl([0, 0, 0], [0.5, 0.06, 0.5], '#ffd860', 1.2, qAxis(1, 0, 0, PI / 2)); box([-0.12, 0.55, 0], [0.12, 0.7, 0.02], '#3a5aff', 0.4, qAxis(0, 0, 1, 0.2)); box([0.12, 0.55, 0], [0.12, 0.7, 0.02], '#ff3a3a', 0.4, qAxis(0, 0, 1, -0.2));
    for (let k = 0; k < 10; k++) { group([rr(-6, 6), rr(-1.5, 2), rr(1, 6)], rr(0, TAU), rr(0, 1), 0, 0.2); box([0, 0, 0], [0.4, 0.15, 0.2], '#b8583a'); }
  } else if (feel === 'arrependimento') {
    // a telephone off the hook, its cord drifting; letters never sent everywhere; a clock; a door ajar with light behind; a closed piano
    floor(8, '#0a0f1e');
    group([0, -1.75, -4.2], 0.25, 0, 0.06, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([sx * 0.5, 1.15, sz * 0.5], [0.1, 2.3, 0.1], '#c8202a', 0.15);
    box([0, 2.35, 0], [1.15, 0.18, 1.15], '#c8202a', 0.2); box([0, 0.05, 0], [1.1, 0.1, 1.1], '#a01820');
    for (const [x, z, w, d] of [[0, -0.5, 0.9, 0.02], [-0.5, 0, 0.02, 0.9], [0.5, 0, 0.02, 0.9]]) box([x, 1.25, z], [w, 2, d], '#ffd8a0', 0.9);
    box([0, 2.2, 0.56], [0.9, 0.16, 0.02], '#fff4e0', 2.5); box([0, 1.35, -0.42], [0.3, 0.45, 0.12], '#151515'); box([0, 1.5, -0.38], [0.18, 0.12, 0.02], '#e8c070', 1.2);
    group([0.5, -0.5, -3.1], 0.4, 0.2, 0.9, 0.2); cyl([0, 0, 0], [0.07, 0.42, 0.07], '#151515', 0, qAxis(0, 0, 1, PI / 2)); box([-0.24, -0.05, 0], [0.1, 0.12, 0.1], '#151515'); box([0.24, -0.05, 0], [0.1, 0.12, 0.1], '#151515');
    group([0, 0, 0], 0, 0, 0, 0.05); for (let k = 0; k < 30; k++) { const t = k / 30; ball([0.35 - t * 0.4 + sin(t * 18) * 0.12, -0.75 - t * 0.2 + cos(t * 15) * 0.1, -3.4 + t * 0.9], 0.025, '#151515'); }
    for (let k = 0; k < 26; k++) { const a = rr(0, TAU), r = rr(1.8, 7); group([cos(a) * r, rr(-1.4, 3), sin(a) * r], rr(0, TAU), rr(-1, 1), rr(-1, 1), rr(0.1, 0.35)); letter(); }
    group([-3.2, 1.4, -3.4], 0.7, 0, 0, 0.08); cyl([0, 0, 0], [1.2, 0.08, 1.2], '#e8e0d0', 0.25, qAxis(1, 0, 0, PI / 2)); box([0, 0.2, 0.05], [0.04, 0.42, 0.02], '#101010'); box([0.13, 0.05, 0.05], [0.3, 0.04, 0.02], '#101010', 0, qAxis(0, 0, 1, 0.5));
    group([3.8, -1.75, -1], -1.2, 0, 0, 0); box([0, 1.1, 0], [1.1, 2.2, 0.02], '#fff0c8', 5); box([-0.6, 1.1, 0.05], [0.1, 2.3, 0.15], '#2a2030'); box([0.6, 1.1, 0.05], [0.1, 2.3, 0.15], '#2a2030'); box([0, 2.25, 0.05], [1.3, 0.1, 0.15], '#2a2030');
    box([-0.25, 1.1, 0.45], [0.06, 2.15, 1], '#3a2a30', 0, qAxis(0, 1, 0, 0.5));
    group([-1.5, -1.75, 3.5], 2.8, 0, 0, 0); box([0, 0.75, 0], [1.6, 0.9, 0.6], '#0c0c0e'); box([0, 1.25, -0.2], [1.6, 0.1, 0.25], '#0c0c0e'); box([0, 0.55, 0.35], [1.5, 0.05, 0.15], '#d8d0c0', 0.1);
  } else {
    // an empty armchair, a coat on the rack, rain at a window, a candle left burning, his cup, a photograph, petals falling
    floor(8, '#262c36');
    group([0, -1.75, -4], 0.15, 0, 0, 0);
    box([0, 0.3, 0], [1, 0.4, 0.9], '#5a3a3a'); box([0, 0.55, 0.05], [0.8, 0.15, 0.75], '#6a4444'); box([0, 1, -0.4], [1, 1, 0.2], '#5a3a3a'); for (const sx of [-1, 1]) box([sx * 0.45, 0.7, 0], [0.15, 0.4, 0.85], '#5a3a3a');
    group([-2.4, -1.75, -3.2], 0.5, 0, 0, 0); cyl([0, 0.95, 0], [0.06, 1.9, 0.06], '#3a2a20'); for (let k = 0; k < 3; k++) cyl([0, 0.05, 0], [0.5, 0.05, 0.5], '#3a2a20'); box([0.05, 1.3, 0.12], [0.55, 0.9, 0.18], '#2a3a4a', 0, qAxis(0, 0, 1, 0.08)); cyl([0, 1.75, 0.1], [0.1, 0.12, 0.1], '#2a3a4a');
    group([2.8, 0.8, -5], -0.45, 0, 0, 0); windowFrame(2, 1.7, '#8aa0c0', 0.8);
    for (let k = 0; k < 50; k++) box([rr(-1, 1), rr(-0.9, 0.9), 0.08], [0.006, rr(0.12, 0.3), 0.006], '#c8d8ff', 1.2, qAxis(0, 0, 1, 0.15));
    group([1.1, -1.75, -3], 0, 0, 0, 0); table(0.6, 0.6, 0.7, '#3a2a22'); cyl([0.1, 0.83, 0], [0.09, 0.26, 0.09], '#f4f0e0', 0.2); ball([0.1, 1.03, 0], 0.045, '#ffb040', 6); cup(-0.15, 0.74, 0.1, '#e8e0d0');
    group([-1.6, 1.2, -2.6], 0.6, 0, 0.1, 0.1); box([0, 0, 0], [0.5, 0.65, 0.04], '#3a2a20'); box([0, 0, 0.025], [0.4, 0.55, 0.01], '#d8c8b0', 0.6);
    group([-4.5, -1.75, 3.5], 2.2, 0, 0, 0); box([0, 1.4, 0], [1.2, 2.8, 0.02], '#fff0c0', 4.5); box([-0.66, 1.4, 0.1], [0.12, 2.9, 0.3], '#d8d0b8', 0.3); box([0.66, 1.4, 0.1], [0.12, 2.9, 0.3], '#d8d0b8', 0.3); box([0, 2.9, 0.1], [1.44, 0.14, 0.3], '#d8d0b8', 0.3);
    for (let k = 0; k < 6; k++) box([0, 0.02, 0.8 + k * 0.9], [1.2 + k * 0.25, 0.01, 0.9], '#ffe8a0', 1.6 - k * 0.25);
    for (let k = 0; k < 45; k++) { const a = rr(0, TAU), r = rr(1.2, 6); group([cos(a) * r, rr(-1.5, 3.5), sin(a) * r], rr(0, TAU), rr(0, TAU), 0, rr(0.2, 0.6)); part(2, [0, 0, 0], [0.12, 0.02, 0.09], '#ffb0c0', 0.35); }
  }
  return out;
}
