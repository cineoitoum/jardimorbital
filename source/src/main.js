// ============================================================================
// renderer, planet generation, player physics and input
// ============================================================================
const $ = (id) => document.getElementById(id);
const canvas = $('c'), info = $('i'), body = document.body;
let loaded = 0, dead;
const say = (m, to, ms) => {
  if (!dead) $('s').textContent = m;
  const a = $('b').animate({ transform: [`scaleX(${loaded})`, `scaleX(${to})`] }, { duration: ms, fill: 'forwards', easing: 'cubic-bezier(.3,.5,.5,1)' });
  loaded = to;
  return new Promise((r) => { a.ready.then(() => setTimeout(r)); setTimeout(r, document.hidden ? 0 : 1e3); });
};
const fail = (m) => { throw new Error(m, { cause: 1 }); };
if (!navigator.gpu) fail('Este jogo precisa de WebGPU. Use um Chrome ou Edge atualizado.');
const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
if (!adapter) fail('Nenhum adaptador WebGPU encontrado.');
const device = await adapter.requestDevice({ requiredLimits: { maxBufferSize: min(adapter.limits.maxBufferSize, 1 << 30), maxStorageBufferBindingSize: min(adapter.limits.maxStorageBufferBindingSize, 1 << 30) } });
device.addEventListener('uncapturederror', (e) => console.error('GPU: ' + e.error.message));
device.lost.then((l) => {
  console.error('DEVICE LOST', l.reason, l.message, performance.now() | 0, window.__frames);
  if (l.reason === 'destroyed') return;
  if (LV < 2) { keep('planetas', LV + 1); location.reload(); }
  dead = body.className = 'l e'; $('s').textContent = 'A placa de vídeo parou de responder. Recarregue a página.';
});
const ctx = canvas.getContext('webgpu'), FMT = navigator.gpu.getPreferredCanvasFormat();
// ?headless: never present to the canvas (headless test browsers lose the device when they do)
const HEADLESS = QS.has('headless');
if (!HEADLESS) ctx.configure({ device, format: FMT, alphaMode: 'opaque' });
const Q = device.queue, HDR = 'rgba16float', DEPTH = 'depth32float';
const TU = GPUTextureUsage, BU = GPUBufferUsage, SS = GPUShaderStage;
const mod = (code) => device.createShaderModule({ code });
const buf = (data, usage) => { const b = device.createBuffer({ size: max((data.byteLength + 3) & ~3, 16), usage: usage | BU.COPY_DST }); if (data.byteLength) Q.writeBuffer(b, 0, data.buffer || data, data.byteOffset || 0, data.byteLength); return b; };
const tex = (w, h, format, usage, samples = 1) => device.createTexture({ size: [w, h], format, usage, sampleCount: samples });

// ---------------------------------------------------------------- the system
let SEED = QS.has('seed') ? QS.get('seed') | 0 : (Math.random() * 1e6) | 0;
$('sd').textContent = SEED;
const SYS = makeSystem(SEED), PL = SYS.planets, SUN = SYS.sun;

// ---------------------------------------------------------------- planet density on the GPU, read back for meshing and collision
keep('planetasLoad', 1);
addEventListener('pagehide', () => keep('planetasLoad', ''));
const mDens = mod(W_DENS), pDens = device.createComputePipeline({ layout: 'auto', compute: { module: mDens, entryPoint: 'main' } });
async function density(p) {
  const half = p.R + p.hmax + 4, N = GRID, VS = (2 * half) / (N - 1), org = [-half, -half, -half];
  const u = new ArrayBuffer(64), uu = new Uint32Array(u), uf = new Float32Array(u);
  uu[0] = uu[1] = uu[2] = N; uf[4] = org[0]; uf[5] = org[1]; uf[6] = org[2]; uf[7] = VS;
  uf[8] = p.R; uf[9] = p.A; uf[10] = p.biome; uf[11] = p.seed; uf[12] = p.sea;
  const size = N * N * N * 4, bu = buf(new Uint8Array(u), BU.UNIFORM);
  const bd = device.createBuffer({ size, usage: BU.STORAGE | BU.COPY_SRC }), br = device.createBuffer({ size, usage: BU.MAP_READ | BU.COPY_DST });
  const bg = device.createBindGroup({ layout: pDens.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: bu } }, { binding: 1, resource: { buffer: bd } }] });
  const e = device.createCommandEncoder(), c = e.beginComputePass();
  c.setPipeline(pDens); c.setBindGroup(0, bg); c.dispatchWorkgroups(N / 4, N / 4, N / 4); c.end();
  e.copyBufferToBuffer(bd, 0, br, 0, size);
  Q.submit([e.finish()]);
  await br.mapAsync(GPUMapMode.READ);
  const D = new Float32Array(br.getMappedRange().slice(0));
  br.unmap(); br.destroy(); bd.destroy(); bu.destroy();
  return { D, N, VS, org: [org[0] + p.c[0], org[1] + p.c[1], org[2] + p.c[2]] };
}

// ---------------------------------------------------------------- shared meshes
const FIG = figureMesh(false), SEAT = figureMesh(true), COLM = columnMesh(), ROCK = rockMesh();
const OCEAN = icosphere(5).build();
const meshBuf = (m) => ({ vb: buf(new Uint8Array(m.vb), BU.VERTEX), ib: buf(m.ib, BU.INDEX), n: m.ib.length });
const mFig = meshBuf(FIG), mSeat = meshBuf(SEAT), mCol = meshBuf(COLM), mRock = meshBuf(ROCK), mOcean = meshBuf(OCEAN);

// ---------------------------------------------------------------- uniforms
const NG = 236, UG = new Float32Array(NG), uboG = device.createBuffer({ size: NG * 4, usage: BU.UNIFORM | BU.COPY_DST });
const bgl0 = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: {} }] });
const bgl1 = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: {} }] });
const plScene = device.createPipelineLayout({ bindGroupLayouts: [bgl0, bgl1] });
const bg0 = device.createBindGroup({ layout: bgl0, entries: [{ binding: 0, resource: { buffer: uboG } }] });

// ---------------------------------------------------------------- build every planet
const PD = []; // per planet GPU data
const spirits = []; // orbiting spirits, 16 floats each
const souls = []; // who can speak: { pos(out), kind, said, cool, scale }
const lightsStatic = []; // seated spirits: [x, y, z, intensity, r, g, b, radius]
const blade36 = (a) => {
  const n = a.length / 12, out = new ArrayBuffer(n * 36), f = new Float32Array(out), u8 = new Uint8Array(out);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 8; k++) f[i * 9 + k] = a[i * 12 + k];
    for (let k = 0; k < 4; k++) u8[i * 36 + 32 + k] = round(clamp(a[i * 12 + 8 + k], 0, 1) * 255);
  }
  return new Uint8Array(out);
};
for (const p of PL) {
  await say(`Formando ${p.name} (${BIOMES[p.biome].toLowerCase()})…`, 0.08 + 0.75 * p.i / PL.length, 900);
  const d = await density(p);
  const w = buildPlanet(p, d.D, d.N, d.VS, d.org);
  p.col_ = w.col; p.smp = w.smp; p.Dw = w.Dw; p.ground = w.ground; p.wp = w.wp;
  // crystal columns kept for collision: base, axis, height, radius
  p.cols = [];
  for (let i = 0; i < w.props.length; i += 12) if (w.props[i + 10] === 0) p.cols.push(Array.from(w.props.subarray(i, i + 8)));
  const U = new Float32Array(56);
  U.set([...p.c, p.R, p.sea, p.biome, p.emis, p.seed]);
  p.col.forEach((cc, k) => U.set([...cc, 0], 8 + k * 4));
  const ubo = buf(U, BU.UNIFORM);
  const g = {
    bg: device.createBindGroup({ layout: bgl1, entries: [{ binding: 0, resource: { buffer: ubo } }] }),
    tv: buf(new Uint8Array(w.terrain.vb), BU.VERTEX), ti: buf(w.terrain.ib, BU.INDEX), tn: w.terrain.n,
    bl: buf(blade36(w.blades), BU.VERTEX), bn: w.blades.length / 12,
    gl: buf(w.glints, BU.VERTEX), gn: w.glints.length / 8,
    pr: buf(w.props, BU.VERTEX), prCol: 0, prRock: 0,
  };
  // props: columns first, then rocks (two meshes, one instance buffer)
  const cols = [], rocks = [];
  for (let i = 0; i < w.props.length; i += 12) (w.props[i + 10] ? rocks : cols).push(...w.props.subarray(i, i + 12));
  g.pr = buf(new Float32Array([...cols, ...rocks]), BU.VERTEX); g.prCol = cols.length / 12; g.prRock = rocks.length / 12;
  // seated spirits light the ground around them
  const st = [];
  for (const s of w.seated) {
    // seated souls: half luminous, half dark with a glowing rim
    const lum = rnd() < 0.5, glow = lum ? 2.2 : rr(0.35, 0.55);
    st.push(...s.p, 0, ...s.u, 0, ...s.f, s.ph, 1, 1, s.hue, glow);
    const col = [mix(1, 0.75, s.hue), mix(0.82, 0.88, s.hue), mix(0.5, 1, s.hue)];
    lightsStatic.push([s.p[0] + s.u[0] * 0.8, s.p[1] + s.u[1] * 0.8, s.p[2] + s.u[2] * 0.8, lum ? 2.6 : 0.9, ...col, 16]);
    const at = [s.p[0] + s.u[0] * 1.1, s.p[1] + s.u[1] * 1.1, s.p[2] + s.u[2] * 1.1];
    souls.push({ pos: (o) => { o[0] = at[0]; o[1] = at[1]; o[2] = at[2]; return o; }, kind: soulKind(), said: new Set(), cool: 0, scale: 1 });
  }
  g.st = buf(new Float32Array(st), BU.VERTEX); g.sn = st.length / 16;
  PD.push(g);
  // floating spirits around this planet
  rseed(500 + p.i * 7 + (p.seed * 10 | 0));
  // floating souls: three drifting low and slow (you can catch up and listen), two higher and faster.
  // Most are dark and translucent with a glowing rim (glow < .6), some luminous
  for (let k = 0; k < 5; k++) {
    const low = k < 3, glow = rnd() < 0.7 ? rr(0.3, 0.55) : rr(0.9, 1.3);
    spirits.push(orbitSpirit(p.c, p.R + p.A * 0.6 + (low ? rr(3, 9) : rr(14, 26)), low ? rr(0.7, 1.4) : rr(2, 3.5), low ? rr(1, 1.6) : rr(1.3, 2.4), 0, rnd(), glow));
  }
  p.seatedPos = w.seated;
  await new Promise((r) => setTimeout(r));
}
// spirits crossing the space between the planets, and one crystal astronaut
{
  rseed(SEED + 99);
  const ctr = [0, 1, 2].map((k) => PL.reduce((s, p) => s + p.c[k], 0) / PL.length);
  const rad = PL.reduce((s, p) => s + hypot(p.c[0] - ctr[0], p.c[1] - ctr[1], p.c[2] - ctr[2]), 0) / PL.length;
  for (let k = 0; k < 3; k++) spirits.push(orbitSpirit(ctr, max(rad, 60) + rr(-15, 25), rr(2, 4), rr(3, 6), 0, rnd(), k ? rr(0.35, 0.55) : 1.2));
  const h = PL[0];
  spirits.push(orbitSpirit(h.c, h.R + h.hmax + 45, 2, 2.2, 2, 0, 1));
}
// every orbiting soul can speak too (the crystal astronaut is one of the old ones)
spirits.forEach((sp, i) => souls.push({ pos: (o) => orbitAt(spiritArr, i * 16, time, o), kind: sp[13] > 1.5 ? 7 : soulKind(), said: new Set(), cool: 0, scale: sp[12] }));
const spiritArr = new Float32Array(spirits.flat());
const bSpirit = buf(spiritArr, BU.VERTEX), nSpirit = spirits.length;
// trails: 160 sparks per spirit (none for the astronaut)
const TRN = 160 / (LV > 1 ? 2 : 1);
const trails = [];
for (const s of spirits) { if (s[13] > 1.5) continue; for (let i = 0; i < TRN; i++) trails.push(...s, rnd() ** 1.3, rnd(), rnd(), rnd()); }
const bTrail = buf(new Float32Array(trails), BU.VERTEX), nTrail = trails.length / 20;
// dust around the camera
const dust = [];
rseed(4);
for (let i = 0; i < 1200 / THIN; i++) { const t = rnd(); dust.push(rnd(), rnd(), rnd(), rnd(), mix(0.6, 1, t) * 0.5, mix(0.75, 0.9, t) * 0.5, mix(1, 0.8, t) * 0.5, 0); }
const bDust = buf(new Float32Array(dust), BU.VERTEX), nDust = dust.length / 8;

// ---------------------------------------------------------------- pipelines
await say('Acendendo as estrelas…', 0.88, 600);
const A = (shaderLocation, offset, format) => ({ shaderLocation, offset, format });
const vbSolid = { arrayStride: 16, attributes: [A(0, 0, 'float32x3'), A(1, 12, 'snorm8x4')] };
const inst = (stride, n, first = 0) => ({ arrayStride: stride, stepMode: 'instance', attributes: Array.from({ length: n }, (_, k) => A(first + k, k * 16, 'float32x4')) });
const ibBlade = { arrayStride: 36, stepMode: 'instance', attributes: [A(0, 0, 'float32x4'), A(1, 16, 'float32x4'), A(2, 32, 'unorm8x4')] };
const ADD = { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } };
const ALPHA = { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } };
const scenePipe = (m, vsE, fsE, buffers, o = {}) => device.createRenderPipeline({ layout: plScene,
  vertex: { module: m, entryPoint: vsE, buffers, constants: o.constants },
  fragment: { module: m, entryPoint: fsE, targets: [{ format: HDR, blend: o.blend }], constants: o.fconstants },
  primitive: { topology: o.strip ? 'triangle-strip' : 'triangle-list', cullMode: o.cull || 'none' },
  depthStencil: { format: DEPTH, depthWriteEnabled: o.dw ?? !o.blend, depthCompare: o.dc || 'greater' }, multisample: { count: AA } });
const mSky = mod(W_SKY), mTerr = mod(W_TERR), mOce = mod(W_OCEAN), mBlade = mod(W_BLADE), mProp = mod(W_PROP), mSpir = mod(W_SPIRIT), mSpr = mod(W_SPR);
const pSky = scenePipe(mSky, 'vs', 'fs', [], { dw: false, dc: 'always' });
const pTerr = scenePipe(mTerr, 'vs', 'fs', [vbSolid]);
const pOcean = scenePipe(mOce, 'vs', 'fs', [vbSolid], { blend: ALPHA, dw: true });
const pBlade = scenePipe(mBlade, 'vs', 'fs', [ibBlade], { strip: true, constants: { ROWS: 4, FAR: LV > 1 ? 70 : 110 } });
const pProp = scenePipe(mProp, 'vs', 'fs', [vbSolid, inst(48, 3, 2)]);
const pSpirit = scenePipe(mSpir, 'vs', 'fs', [vbSolid, inst(64, 4, 2)]);
const pSpiritT = scenePipe(mSpir, 'vs', 'fsT', [vbSolid, inst(64, 4, 2)], { blend: ALPHA, cull: 'back' });
const pCord = scenePipe(mSpr, 'vsCord', 'fs', [inst(32, 2)], { strip: true, blend: ADD });
const pGlint = scenePipe(mSpr, 'vsGlint', 'fs', [inst(32, 2)], { strip: true, blend: ADD });
const pDust = scenePipe(mSpr, 'vsDust', 'fs', [inst(32, 2)], { strip: true, blend: ADD });
const pTrail = scenePipe(mSpr, 'vsTrail', 'fs', [inst(80, 5)], { strip: true, blend: ADD });
const mAtm = mod(W_ATM), mBlit = mod(W_BLIT), mPost = mod(W_POST);
const pAtm = device.createRenderPipeline({ layout: 'auto', vertex: { module: mAtm, entryPoint: 'vs' }, fragment: { module: mAtm, entryPoint: 'fs', targets: [{ format: HDR }] } });
const bglBlit = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: SS.FRAGMENT, texture: {} }, { binding: 1, visibility: SS.FRAGMENT, sampler: {} }] });
const plBlit = device.createPipelineLayout({ bindGroupLayouts: [bglBlit] });
const blitPipe = (entry, add) => device.createRenderPipeline({ layout: plBlit, vertex: { module: mBlit, entryPoint: 'vs' },
  fragment: { module: mBlit, entryPoint: entry, targets: [{ format: HDR, blend: add ? ADD : undefined }] } });
const pDown0 = blitPipe('fsDown0'), pDown = blitPipe('fsDown'), pUp = blitPipe('fsUp', true);
const pPost = device.createRenderPipeline({ layout: 'auto', vertex: { module: mPost, entryPoint: 'vs' }, fragment: { module: mPost, entryPoint: 'fs', targets: [{ format: FMT }] } });
const sClamp = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
// surface compile errors before the scene starts (any one would leave the screen black)
for (const m of [mSky, mTerr, mOce, mBlade, mProp, mSpir, mSpr, mAtm, mBlit, mPost, mDens]) {
  const ci = await m.getCompilationInfo();
  for (const msg of ci.messages) if (msg.type === 'error') fail(`Shader: ${msg.message} (linha ${msg.lineNum})`);
}

// ---------------------------------------------------------------- render targets
let W = 0, H = 0, scale = 1, T = {};
const DPR = min(devicePixelRatio || 1, 2), PIXMAX = 2560 * 1440;
function resize() {
  let w = innerWidth * DPR * scale, h = innerHeight * DPR * scale;
  const k = sqrt(min(1, PIXMAX / (w * h))); w = max(16, round(w * k)); h = max(16, round(h * k));
  if (w === W && h === H) return;
  W = canvas.width = w; H = canvas.height = h;
  for (const t of Object.values(T)) if (t.destroy) t.destroy();
  const RT = TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING;
  T = { scene: tex(W, H, HDR, RT), comp: tex(W, H, HDR, RT), depth: tex(W, H, DEPTH, RT, AA) };
  if (AA > 1) T.ms = tex(W, H, HDR, TU.RENDER_ATTACHMENT, AA);
  if (HEADLESS) T.off = tex(W, H, FMT, TU.RENDER_ATTACHMENT);
  T.bl = []; let bw = W, bh = H;
  for (let i = 0; i < 6 && bw > 8 && bh > 8; i++) { bw = max(1, bw >> 1); bh = max(1, bh >> 1); T.bl.push(tex(bw, bh, HDR, RT)); }
  T.bl.forEach((t, i) => (T['b' + i] = t));
  T.atmBG = device.createBindGroup({ layout: pAtm.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uboG } }, { binding: 1, resource: T.scene.createView() }, { binding: 2, resource: T.depth.createView() }] });
  const bb = (v) => device.createBindGroup({ layout: bglBlit, entries: [{ binding: 0, resource: v }, { binding: 1, resource: sClamp }] });
  T.blBG = T.bl.map((t) => bb(t.createView())); T.compBG = bb(T.comp.createView());
  T.postBG = device.createBindGroup({ layout: pPost.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uboG } }, { binding: 1, resource: sClamp }, { binding: 2, resource: T.comp.createView() }, { binding: 3, resource: T.bl[0].createView() }, { binding: 4, resource: T.depth.createView() }] });
}
resize();
addEventListener('resize', resize);

// ---------------------------------------------------------------- player
const pos = new Float64Array(3), vel = new Float64Array(3), gv = new Float64Array(3);
let B = [0, 0, 0, 1], pitch = 0, groundT = 0, time = 0, lamp = 0, inWater = 0, near = -1;
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qrot = (q, v) => {
  const [x, y, z, w] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx];
};
const qnorm = (q) => { const l = hypot(...q) || 1; return q.map((c) => c / l); };
// where the ground is along a ray out from a planet's centre (radius, or 0)
function surfaceAlong(p, d) {
  for (let r = p.R + p.hmax + 2; r > p.R - p.A * 3; r -= 0.25) if (p.Dw(p.c[0] + d[0] * r, p.c[1] + d[1] * r, p.c[2] + d[2] * r) > 0) return r;
  return 0;
}
// stand on planet i, on the day side not far from the terminator so the light is low and warm
function spawn(i, orbit) {
  const p = PL[i];
  rseed(SEED + i * 13 + (time * 1000 | 0));
  let d = SUN, best = 0;
  for (let k = 0; k < 120; k++) {
    const v = normalize3([rr(-1, 1), rr(-1, 1), rr(-1, 1)]), s = dot3(v, SUN);
    if (s < 0.15 || s > 0.6) continue;
    const r = surfaceAlong(p, v); if (!r || (p.sea && r < p.sea + 1)) continue;
    // prefer flat ground
    const r2 = surfaceAlong(p, normalize3([v[0] + 0.02, v[1], v[2]]));
    const flat = 1 / (1 + abs(r2 - r) * 3);
    if (flat > best) { best = flat; d = v; }
  }
  const r = orbit ? p.R + p.hmax + 30 : (surfaceAlong(p, d) || p.R) + 1.9;
  for (let k = 0; k < 3; k++) { pos[k] = p.c[k] + d[k] * r; vel[k] = 0; }
  groundT = 0;
  B = qFromY(d[0], d[1], d[2]);
  // face along the terminator, with the sun to one side
  const f = qrot(B, [0, 0, -1]), t = normalize3(cross3(d, SUN)), yaw = atan2(dot3(cross3(f, t), d), dot3(f, t));
  B = qnorm(qmul(B, [0, sin(yaw / 2), 0, cos(yaw / 2)])); pitch = 0.05;
}
// distance into the rock at (x, y, z) for planet p, in metres (> 0 inside), clamped to one voxel
function sdist(p, x, y, z) {
  const c = p.col_, gx = (x - c.org[0]) / c.VS, gy = (y - c.org[1]) / c.VS, gz = (z - c.org[2]) / c.VS;
  if (gx < 0 || gy < 0 || gz < 0 || gx >= c.N - 1 || gy >= c.N - 1 || gz >= c.N - 1) return -c.VS;
  const ix = gx | 0, iy = gy | 0, iz = gz | 0, u = gx - ix, v = gy - iy, w = gz - iz, NB = c.NB;
  const cv = (X, Y, Z) => { const b = c.CI[(X >> 2) + NB * ((Y >> 2) + NB * (Z >> 2))]; return b > 1 ? c.CG[(b - 2) * 64 + (X & 3) + 4 * (Y & 3) + 16 * (Z & 3)] : b ? 127 : -127; };
  const a0 = cv(ix, iy, iz), a1 = cv(ix + 1, iy, iz), a2 = cv(ix, iy + 1, iz), a3 = cv(ix + 1, iy + 1, iz);
  const b0 = cv(ix, iy, iz + 1), b1 = cv(ix + 1, iy, iz + 1), b2 = cv(ix, iy + 1, iz + 1), b3 = cv(ix + 1, iy + 1, iz + 1);
  const A0 = mix(mix(a0, a1, u), mix(a2, a3, u), v), B0 = mix(mix(b0, b1, u), mix(b2, b3, u), v);
  return mix(A0, B0, w) / 127 * c.VS;
}
const CR = 0.85, FOOT = 0.85;
function collide(mv, up) {
  const n = floor(hypot(mv[0], mv[1], mv[2]) / 0.35) + 1;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) pos[k] += mv[k] / n;
    for (const p of PL) {
      const dc = hypot(pos[0] - p.c[0], pos[1] - p.c[1], pos[2] - p.c[2]);
      if (dc > p.R + p.hmax + 6) continue;
      for (let it = 0; it < 3; it++) {
        const sx = pos[0] - up[0] * FOOT, sy = pos[1] - up[1] * FOOT, sz = pos[2] - up[2] * FOOT;
        const s = sdist(p, sx, sy, sz) + CR; if (s <= 0) break;
        const e = 0.35;
        let gx = sdist(p, sx + e, sy, sz) - sdist(p, sx - e, sy, sz), gy = sdist(p, sx, sy + e, sz) - sdist(p, sx, sy - e, sz), gz = sdist(p, sx, sy, sz + e) - sdist(p, sx, sy, sz - e);
        const l = hypot(gx, gy, gz);
        // deep inside (flat field): push straight out from the planet
        if (l < 0.02) { gx = p.c[0] - sx; gy = p.c[1] - sy; gz = p.c[2] - sz; const m = hypot(gx, gy, gz); gx /= m; gy /= m; gz /= m; } else { gx /= l; gy /= l; gz /= l; }
        pos[0] -= gx * s; pos[1] -= gy * s; pos[2] -= gz * s;
        const vn = vel[0] * gx + vel[1] * gy + vel[2] * gz;
        if (vn > 0) { vel[0] -= gx * vn; vel[1] -= gy * vn; vel[2] -= gz * vn; }
        if (-(gx * up[0] + gy * up[1] + gz * up[2]) > 0.5) groundT = 0.15;
      }
      // crystal columns: cylinders with a standable top
      for (const cl of p.cols) {
        const sx = pos[0] - up[0] * FOOT - cl[0], sy = pos[1] - up[1] * FOOT - cl[1], sz = pos[2] - up[2] * FOOT - cl[2];
        const y = sx * cl[4] + sy * cl[5] + sz * cl[6], top = cl[3] + cl[7] * 0.3;
        if (y < -2 || y > top + CR) continue;
        const rx = sx - cl[4] * y, ry = sy - cl[5] * y, rz = sz - cl[6] * y, rd = hypot(rx, ry, rz), pen = cl[7] * 0.95 + CR - rd;
        if (pen <= 0) continue;
        const penTop = top + CR - y;
        if (penTop < pen) {
          for (let k = 0; k < 3; k++) pos[k] += cl[4 + k] * penTop;
          const vn = dot3(vel, [cl[4], cl[5], cl[6]]); if (vn < 0) for (let k = 0; k < 3; k++) vel[k] -= cl[4 + k] * vn;
          groundT = 0.15;
        } else {
          const nx = rx / (rd || 1), ny = ry / (rd || 1), nz = rz / (rd || 1);
          pos[0] += nx * pen; pos[1] += ny * pen; pos[2] += nz * pen;
          const vn = vel[0] * nx + vel[1] * ny + vel[2] * nz; if (vn < 0) { vel[0] -= nx * vn; vel[1] -= ny * vn; vel[2] -= nz * vn; }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- input
let kf = 0, kb = 0, kl = 0, kr = 0, ku = 0, kd = 0, ks = 0, kj = 0, jumpReq = 0, mdx = 0, mdy = 0, menu = true, hud = false;
const key = (e, v) => {
  switch (e.code) {
    case 'KeyW': kf = v; break; case 'KeyS': kb = v; break; case 'KeyA': kl = v; break; case 'KeyD': kr = v; break;
    case 'KeyE': ku = v; break; case 'KeyQ': kd = v; break; case 'ShiftLeft': case 'ShiftRight': ks = v; break;
    case 'KeyR': if (v && !e.repeat) { if (cord.on) cord.on = false; else castCord(qrot(qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)]), [0, 0, -1])); } break;
    case 'Space': if (v && !kj) jumpReq = 1; kj = v; e.preventDefault(); break;
    default: if (v && !e.repeat) {
      if (e.code === 'KeyH') { hud = !hud; info.textContent = ''; }
      else if (e.code === 'KeyM') mute();
      else if (e.code === 'KeyF') lamp = !lamp;
      else if (e.code === 'Escape') ui(true);
      else if (e.code >= 'Digit1' && e.code <= 'Digit9') { const i = e.code.charCodeAt(5) - 49; if (i < PL.length) spawn(i, true); }
    }
  }
};
addEventListener('keydown', (e) => { if (menu && e.code !== 'KeyH' && e.code !== 'KeyM') return; sound(); key(e, 1); });
addEventListener('keyup', (e) => key(e, 0));
const release = () => { kf = kb = kl = kr = ku = kd = ks = kj = 0; cord.on = false; };
const capture = () => { sound(); const p = canvas.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => canvas.requestPointerLock()).catch(() => 0); };
canvas.addEventListener('click', () => { if (!menu) capture(); });
// right button: hold to keep the silver cord
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => { if (e.button === 2 && !menu && !trav) castCord(qrot(qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)]), [0, 0, -1])); });
addEventListener('mouseup', (e) => { if (e.button === 2) cord.on = false; });
addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas) { mdx += e.movementX; mdy += e.movementY; } });
document.addEventListener('pointerlockchange', () => {
  const on = document.pointerLockElement === canvas;
  body.classList.toggle('p', on);
  if (!on && !menu) ui(true);
});
function ui(show) {
  menu = show; release();
  body.className = show ? 'm' : 'g';
  if (show && document.pointerLockElement) document.exitPointerLock();
  if (!show) capture();
}
$('d').onclick = () => ui(false);
$('o').onclick = () => ui(true);
$('ns').onclick = () => { const u = new URL(location); u.searchParams.set('seed', (Math.random() * 1e6) | 0); location = u; };
document.querySelectorAll('#q button').forEach((b, i) => {
  const lv = 2 - i; if (lv === LV) b.className = 'on';
  b.onclick = () => { keep('planetas', lv); const u = new URL(location); u.searchParams.set('seed', SEED); u.searchParams.delete('q'); location = u; };
});

// ---------------------------------------------------------------- per frame: physics
const lkS = [0, 0];
// aura: the high-speed mode (Shift). It does not burn anything: a glow gathers around you and you steer like a ship.
// Holding one direction builds acceleration; to brake, push the other way. No automatic braking out in space.
let aura = 0, auraHold = 0, auraDir = [0, 0, 0], shake = 0, flash = 0, brakeLock = 0;
// the silver cord: hooks the ground you look at and reels you in, softly
const cord = { on: false, a: [0, 0, 0], len: 0, t: 0 };
// black hole: bhNear 0..1 as you approach, bhIn 0..1 while crossing it
let bhNear = 0, bhIn = 0, trav = null;
const BH = SYS.bh;
function castCord(look) {
  for (let d = 2; d < 160; d += 0.5) {
    const x = pos[0] + look[0] * d, y = pos[1] + look[1] * d, z = pos[2] + look[2] * d;
    for (const p of PL) {
      if (hypot(x - p.c[0], y - p.c[1], z - p.c[2]) > p.R + p.hmax + 2) continue;
      if (p.Dw(x, y, z) > 0) { cord.on = true; cord.a = [x, y, z]; cord.len = d; cord.t = 0; speakSound('cord'); return; }
    }
  }
}
const turb = (t, k) => sin(t * 1.7 + k) * 0.6 + sin(t * 3.1 + k * 2.3) * 0.3 + sin(t * 7.3 + k * 4.1) * 0.1;
function step(dt) {
  // mouse look, lightly smoothed
  const kq = 1 - exp(-dt * 25);
  lkS[0] += mdx * 0.0022; lkS[1] += mdy * 0.0022; mdx = mdy = 0;
  const dyw = lkS[0] * kq, dpt = lkS[1] * kq; lkS[0] -= dyw; lkS[1] -= dpt;
  B = qnorm(qmul(B, [0, sin(-dyw / 2), 0, cos(-dyw / 2)]));
  pitch = clamp(pitch - dpt, -1.5, 1.5);
  if (trav) return crossing(dt);
  // gravity: turn the body so its feet point down the pull (slowly while in aura: you steer more like a ship)
  gravity(PL, pos[0], pos[1], pos[2], gv, BH);
  const gm = hypot(gv[0], gv[1], gv[2]);
  let up = qrot(B, [0, 1, 0]);
  if (gm > 0.03) {
    const tg = [-gv[0] / gm, -gv[1] / gm, -gv[2] / gm], ax = cross3(up, tg), s = hypot(...ax), c = dot3(up, tg);
    if (s > 1e-7) {
      const rate = (groundT > 0 ? 9 : 2.2 * min(1, gm / 0.6)) * (aura > 0.5 && groundT <= 0 ? 0.3 : 1), ang = atan2(s, c) * (1 - exp(-dt * rate));
      B = qnorm(qmul([ax[0] / s * sin(ang / 2), ax[1] / s * sin(ang / 2), ax[2] / s * sin(ang / 2), cos(ang / 2)], B));
      up = qrot(B, [0, 1, 0]);
    }
  }
  const F = qrot(B, [0, 0, -1]), Rt = qrot(B, [1, 0, 0]);
  const cq = qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)]), look = qrot(cq, [0, 0, -1]), cR = qrot(cq, [1, 0, 0]), cU = qrot(cq, [0, 1, 0]);
  inWater = 0; near = -1; let nd = 1e9;
  for (const p of PL) { const d = hypot(pos[0] - p.c[0], pos[1] - p.c[1], pos[2] - p.c[2]); if (d - p.R < nd) { nd = d - p.R; near = p.i; } if (p.sea && d < p.sea + 0.3) inWater = 1; }
  const inAtm = near >= 0 && nd < PL[near].hmax + PL[near].H * 3;
  const mf = kf - kb, mr = kr - kl;
  const auraOn = ks && !inWater;
  const speed = hypot(vel[0], vel[1], vel[2]);
  if (auraOn) {
    let tx = look[0] * mf + cR[0] * mr + cU[0] * (ku - kd + kj), ty = look[1] * mf + cR[1] * mr + cU[1] * (ku - kd + kj), tz = look[2] * mf + cR[2] * mr + cU[2] * (ku - kd + kj);
    const tl = hypot(tx, ty, tz);
    if (tl > 0.01) {
      tx /= tl; ty /= tl; tz /= tl;
      auraHold = tx * auraDir[0] + ty * auraDir[1] + tz * auraDir[2] > 0.85 ? auraHold + dt : 0;
      auraDir = [tx, ty, tz];
      // pushing against the motion brakes harder, and the sideways drift fades while braking
      const sp0 = speed || 1, opp = -(tx * vel[0] + ty * vel[1] + tz * vel[2]) / sp0;
      const acc = (6 + 40 * pow(min(auraHold / 5, 1), 1.6)) * (opp > 0.3 ? 2.2 : 1);
      if (opp > 0.3) { const kk = exp(-dt * 0.8); for (let i = 0; i < 3; i++) { const along = -opp * sp0 * [tx, ty, tz][i]; vel[i] = along + (vel[i] - along) * kk; } }
      vel[0] += tx * acc * dt; vel[1] += ty * acc * dt; vel[2] += tz * acc * dt;
      groundT = 0;
    } else { auraHold = 0; brakeLock = 0; }
    for (let i = 0; i < 3; i++) vel[i] += gv[i] * dt;
    // turbulence: the faster you go, the more the air (or whatever this is) shakes you
    const amp = 0.5 * pow(speed, 0.75);
    vel[0] += turb(time, 0) * amp * dt; vel[1] += turb(time, 5) * amp * dt; vel[2] += turb(time, 9) * amp * dt;
    if (inAtm) { const kk = exp(-0.15 * dt); for (let i = 0; i < 3; i++) vel[i] *= kk; }
  } else {
    auraHold = 0; brakeLock = 0;
    let wx = F[0] * mf + Rt[0] * mr, wy = F[1] * mf + Rt[1] * mr, wz = F[2] * mf + Rt[2] * mr;
    const wl = hypot(wx, wy, wz); if (wl > 1) { wx /= wl; wy /= wl; wz /= wl; }
    if (groundT > 0 && !inWater) {
      // walking: slow and floaty, it takes a moment to get going and to stop
      const sp = 3.2, vr = dot3(vel, up), vn = min(vr, 0) - gm * dt, k = 1 - exp(-dt * 2.6), tw = [wx * sp, wy * sp, wz * sp];
      for (let i = 0; i < 3; i++) { const vt = vel[i] - up[i] * vr; vel[i] = vt + (tw[i] - vt) * k + up[i] * vn; }
      if (jumpReq) { for (let i = 0; i < 3; i++) vel[i] += up[i] * 5.5; groundT = 0; }
    } else {
      for (let i = 0; i < 3; i++) vel[i] += gv[i] * dt;
      const air = inWater ? 4 : 1.6;
      vel[0] += wx * air * dt; vel[1] += wy * air * dt; vel[2] += wz * air * dt;
      // holding Space in the air: you glide, falling slower
      if (kj) { const vn = dot3(vel, up); if (vn < 0) for (let i = 0; i < 3; i++) vel[i] -= up[i] * vn * min(1, dt * 1.5); }
      for (let i = 0; i < 3; i++) vel[i] += cU[i] * (ku - kd) * 2 * dt;
      let drag = inAtm ? 0.12 : 0.01;
      if (inWater) { drag = 2.2; for (let i = 0; i < 3; i++) vel[i] += up[i] * gm * 1.25 * dt; }
      const kk = exp(-drag * dt); for (let i = 0; i < 3; i++) vel[i] *= kk;
    }
  }
  jumpReq = 0;
  // the silver cord pulls like a loose elastic and reels in
  if (cord.on) {
    cord.t += dt;
    const d = [cord.a[0] - pos[0], cord.a[1] - pos[1], cord.a[2] - pos[2]], L = hypot(...d);
    cord.len = max(3.5, cord.len - (5 + cord.t * 3) * dt);
    if (L > 200) cord.on = false;
    else if (L > cord.len) {
      const u = d.map((x) => x / L), str = min((L - cord.len) * 2.2, 25), vr = dot3(vel, u);
      for (let i = 0; i < 3; i++) vel[i] += u[i] * str * dt;
      if (vr < 0) for (let i = 0; i < 3; i++) vel[i] -= u[i] * vr * min(1, dt * 3);
    }
  }
  const cap = auraOn ? 90 : 60, vm = hypot(vel[0], vel[1], vel[2]); if (vm > cap) for (let i = 0; i < 3; i++) vel[i] *= cap / vm;
  groundT -= dt;
  collide([vel[0] * dt, vel[1] * dt, vel[2] * dt], up);
  aura += ((auraOn ? 1 : 0) - aura) * (1 - exp(-dt * 4));
  // black hole: closer than the point of no return and it takes you
  const dbh = hypot(pos[0] - BH.c[0], pos[1] - BH.c[1], pos[2] - BH.c[2]);
  bhNear = sstep(220, BH.nr, dbh);
  if (dbh < BH.nr) startCrossing();
  return cq;
}
// ---------------------------------------------------------------- crossing the black hole
const thoughtEl = $('th');
function startCrossing() {
  cord.on = false;
  trav = { t: 0, dur: rr(130, 175), next: 7, list: thoughtSequence(12), k: 0, show: -99 };
}
function crossing(dt) {
  const T = trav;
  T.t += dt;
  bhIn = sstep(0, 5, T.t) * sstep(T.dur, T.dur - 6, T.t);
  // drifting slowly round the middle, looking wherever you want
  const a = T.t * 0.05;
  for (let k = 0; k < 3; k++) vel[k] = 0;
  pos[0] = BH.c[0] + cos(a) * 3; pos[1] = BH.c[1] + sin(a * 0.7) * 2; pos[2] = BH.c[2] + sin(a) * 3;
  B = qnorm(qmul(B, [sin(dt * 0.02), 0, sin(dt * 0.013), 1]));
  // thoughts, far apart
  if (T.t > T.next && T.k < T.list.length && T.t < T.dur - 12) {
    thoughtEl.textContent = T.list[T.k++]; thoughtEl.className = 'on'; T.show = T.t; speakSound('thought');
    T.next = T.t + rr(10, 16);
  }
  if (T.t - T.show > 6.5) thoughtEl.className = '';
  if (T.t >= T.dur) {
    // thrown out on the other side of the system, towards the planets
    thoughtEl.className = '';
    const c = BH.ctr, d = normalize3([c[0] - BH.c[0], c[1] - BH.c[1], c[2] - BH.c[2]]);
    for (let k = 0; k < 3; k++) { pos[k] = c[k] + d[k] * (BH.far + 70); vel[k] = -d[k] * 16; }
    trav = null; bhIn = 0; flash = 1; groundT = 0;
  }
  return qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)]);
}

// ---------------------------------------------------------------- per frame: camera, uniforms, draw
const FOV = 1.25, NEAR = 0.08;
const mmul = (a, b) => { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
function minv(m) {
  const i = new Float64Array(16);
  i[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  i[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  i[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  i[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  i[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  i[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  i[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  i[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  i[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  i[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  i[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  i[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  i[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  i[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  i[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  i[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
  const d = 1 / (m[0] * i[0] + m[1] * i[4] + m[2] * i[8] + m[3] * i[12]);
  for (let k = 0; k < 16; k++) i[k] *= d;
  return i;
}
const tmp3 = [0, 0, 0];
let fovNow = 1.25, expo = 1, lastVP = null;
const MOOD_EXPO = { leve: 1.08, enigmatico: 0.95, sinistro: 0.72 };
function uniforms(cq) {
  // the view widens with speed and inside the black hole, and shakes with speed and near the hole
  const spd = hypot(vel[0], vel[1], vel[2]);
  fovNow += (FOV + 0.38 * sstep(8, 75, spd) * (0.4 + 0.6 * aura) + 0.35 * bhIn - fovNow) * 0.08;
  shake = 0.006 * sstep(15, 90, spd) * (0.3 + aura) + 0.02 * bhNear * (1 - bhIn);
  if (shake > 1e-4) {
    const t = time * 9, q = [turb(t, 1) * shake, turb(t, 4) * shake, turb(t, 7) * shake * 0.5, 1];
    cq = qnorm(qmul(cq, q));
  }
  const r = qrot(cq, [1, 0, 0]), u = qrot(cq, [0, 1, 0]), b = qrot(cq, [0, 0, 1]);
  const V = new Float64Array([r[0], u[0], b[0], 0, r[1], u[1], b[1], 0, r[2], u[2], b[2], 0, -dot3(r, pos), -dot3(u, pos), -dot3(b, pos), 1]);
  const f = 1 / Math.tan(fovNow / 2), asp = W / H, P = new Float64Array(16);
  P[0] = f / asp; P[5] = f; P[11] = -1; P[14] = NEAR;
  // the light follows the mood of the planet you are near
  let et = 1;
  for (const p of PL) { const w = sstep(p.hmax + 160, p.hmax + 30, hypot(pos[0] - p.c[0], pos[1] - p.c[1], pos[2] - p.c[2]) - p.R); et = mix(et, MOOD_EXPO[p.mood], w); }
  expo += (et - expo) * 0.02;
  const vp = mmul(P, V), ivp = minv(vp);
  UG.set(vp, 0); UG.set(ivp, 16);
  UG.set([pos[0], pos[1], pos[2], time], 32);
  UG.set([...SUN, 2.6], 36);
  UG.set([W, H, 1 / W, 1 / H], 40);
  UG.set([1 / f, asp, NEAR, 2 / (f * H)], 44);
  UG.set([...r, expo], 48);
  UG.set([...u, LV > 1 ? 0.03 : 0.045], 52);
  UG.set([-b[0], -b[1], -b[2], PL.length], 56);
  UG.set([...SYS.neb[0], SYS.nebSeed], 60);
  UG.set([...SYS.neb[1], 0.55], 64);
  // sun on screen
  const cx = vp[0] * SUN[0] + vp[4] * SUN[1] + vp[8] * SUN[2], cy = vp[1] * SUN[0] + vp[5] * SUN[1] + vp[9] * SUN[2], cw = vp[3] * SUN[0] + vp[7] * SUN[1] + vp[11] * SUN[2];
  UG.set([(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * H, cw > 0 ? 1 : 0, SYS.nebStyle], 72);
  PL.forEach((p, i) => UG.set([...p.c, p.R, ...p.atm, p.R + p.hmax + p.H * 4, p.dens, p.H, p.sea, 0], 76 + i * 12));
  // lights: the lamp, then the nearest spirits
  const L = [];
  if (lamp) { const lf = qrot(cq, [0, 0, -1]); L.push([pos[0] + lf[0] * 0.5, pos[1] + lf[1] * 0.5, pos[2] + lf[2] * 0.5, 1.6, 1, 0.92, 0.8, 30, 0]); }
  // the aura lights the ground you skim over
  if (aura > 0.05) L.push([pos[0] - u[0] * 0.5, pos[1] - u[1] * 0.5, pos[2] - u[2] * 0.5, 2.5 * aura, 0.6, 0.7, 1.3, 26, 0]);
  const cand = lightsStatic.map((l) => [...l, hypot(l[0] - pos[0], l[1] - pos[1], l[2] - pos[2])]);
  for (let i = 0; i < nSpirit; i++) {
    const o = i * 16; if (spiritArr[o + 13] > 1.5) continue;
    orbitAt(spiritArr, o, time, tmp3);
    const hue = spiritArr[o + 14], sc = spiritArr[o + 12];
    cand.push([...tmp3, 1.4 * spiritArr[o + 15] * min(sc, 2.5), mix(1, 0.75, hue), mix(0.82, 0.88, hue), mix(0.5, 1, hue), 14 * min(sc, 2.5), hypot(tmp3[0] - pos[0], tmp3[1] - pos[1], tmp3[2] - pos[2])]);
  }
  cand.sort((a, b2) => a[8] - b2[8]);
  for (const c of cand) { if (L.length >= 12) break; L.push(c); }
  L.forEach((l, i) => UG.set([l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7]], 124 + i * 8));
  UG.set([...SYS.neb[2], L.length], 68);
  UG.set([vel[0], vel[1], vel[2], aura], 220);
  UG.set([spd, shake, bhIn, flash], 224);
  UG.set([...BH.c, BH.rs], 228);
  UG.set([...BH.n, bhIn > 0.5 ? 0 : 1], 232);
  lastVP = vp;
  Q.writeBuffer(uboG, 0, UG);
}
const SKIP = (QS.get('skip') || '').split(',');
// the silver cord: points along a loose, sagging, slightly waving curve from your hand to the anchor
const CORDN = 260, cordArr = new Float32Array(CORDN * 8), bCord = device.createBuffer({ size: cordArr.byteLength, usage: BU.VERTEX | BU.COPY_DST });
function updateCord(cq) {
  const R = qrot(cq, [1, 0, 0]), U = qrot(cq, [0, 1, 0]), Fw = qrot(cq, [0, 0, -1]);
  const h = [0, 1, 2].map((k) => pos[k] + Fw[k] * 0.7 + R[k] * 0.28 - U[k] * 0.32);
  const d = [0, 1, 2].map((k) => cord.a[k] - h[k]), L = hypot(...d);
  const gl = hypot(gv[0], gv[1], gv[2]) || 1, down = [gv[0] / gl, gv[1] / gl, gv[2] / gl];
  const slack = clamp(1.25 - L / max(cord.len, 1), 0.08, 0.6), side = normalize3(cross3(d, down));
  for (let i = 0; i < CORDN; i++) {
    const t = pow(i / (CORDN - 1), 1.7), sag = 4 * t * (1 - t) * L * 0.18 * slack, wv = sin(t * 9.4 - time * 5) * 0.12 * slack * L * 0.05 * sin(PI * t);
    for (let k = 0; k < 3; k++) cordArr[i * 8 + k] = h[k] + d[k] * t + down[k] * sag + side[k] * wv;
    const sp = (i * 7919 % 97) / 97;
    cordArr[i * 8 + 3] = sp > 0.93 ? 0.05 : 0.022;
    cordArr[i * 8 + 4] = 0.85; cordArr[i * 8 + 5] = 0.9; cordArr[i * 8 + 6] = 1.05;
    cordArr[i * 8 + 7] = sp + (sp > 0.97 ? 1 : 0);
  }
  Q.writeBuffer(bCord, 0, cordArr);
}
let snapTex = null;
function render() {
  const e = device.createCommandEncoder();
  const ca = AA > 1 ? { view: T.ms.createView(), resolveTarget: T.scene.createView(), loadOp: 'clear', storeOp: 'discard', clearValue: [0, 0, 0, 1] }
    : { view: T.scene.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] };
  const r = e.beginRenderPass({ colorAttachments: [ca], depthStencilAttachment: { view: T.depth.createView(), depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'store' } });
  r.setBindGroup(0, bg0);
  r.setBindGroup(1, PD[0].bg); if (!SKIP.includes('sky')) { r.setPipeline(pSky); r.draw(3); }
  PL.forEach((p, i) => {
    const g = PD[i]; r.setBindGroup(1, g.bg);
    if (!SKIP.includes('terr')) { r.setPipeline(pTerr); r.setVertexBuffer(0, g.tv); r.setIndexBuffer(g.ti, 'uint32'); r.drawIndexed(g.tn); }
    if (g.prCol && !SKIP.includes('prop')) { r.setPipeline(pProp); r.setVertexBuffer(0, mCol.vb); r.setVertexBuffer(1, g.pr); r.setIndexBuffer(mCol.ib, 'uint32'); r.drawIndexed(mCol.n, g.prCol); }
    if (g.prRock && !SKIP.includes('prop')) { r.setPipeline(pProp); r.setVertexBuffer(0, mRock.vb); r.setVertexBuffer(1, g.pr, g.prCol * 48); r.setIndexBuffer(mRock.ib, 'uint32'); r.drawIndexed(mRock.n, g.prRock); }
    if (g.bn && !SKIP.includes('blade')) { r.setPipeline(pBlade); r.setVertexBuffer(0, g.bl); r.draw(10, g.bn); }
    if (g.sn && !SKIP.includes('spirit')) { r.setPipeline(pSpirit); r.setVertexBuffer(0, mSeat.vb); r.setVertexBuffer(1, g.st); r.setIndexBuffer(mSeat.ib, 'uint32'); r.drawIndexed(mSeat.n, g.sn); }
  });
  r.setBindGroup(1, PD[0].bg);
  if (!SKIP.includes('spirit')) r.setPipeline(pSpirit), r.setVertexBuffer(0, mFig.vb), r.setVertexBuffer(1, bSpirit), r.setIndexBuffer(mFig.ib, 'uint32'), r.drawIndexed(mFig.n, nSpirit);
  PL.forEach((p, i) => { if (!p.sea || SKIP.includes('ocean')) return; r.setBindGroup(1, PD[i].bg); r.setPipeline(pOcean); r.setVertexBuffer(0, mOcean.vb); r.setIndexBuffer(mOcean.ib, 'uint32'); r.drawIndexed(mOcean.n); });
  PL.forEach((p, i) => { const g = PD[i]; if (!g.gn || SKIP.includes('spr')) return; r.setBindGroup(1, g.bg); r.setPipeline(pGlint); r.setVertexBuffer(0, g.gl); r.draw(4, g.gn); });
  r.setBindGroup(1, PD[0].bg);
  if (!SKIP.includes('spr')) {
  // dark translucent souls, after everything solid
  if (!SKIP.includes('spirit')) {
    r.setPipeline(pSpiritT); r.setVertexBuffer(0, mFig.vb); r.setVertexBuffer(1, bSpirit); r.setIndexBuffer(mFig.ib, 'uint32'); r.drawIndexed(mFig.n, nSpirit);
    PL.forEach((p, i) => { const g = PD[i]; if (!g.sn) return; r.setBindGroup(1, g.bg); r.setVertexBuffer(0, mSeat.vb); r.setVertexBuffer(1, g.st); r.setIndexBuffer(mSeat.ib, 'uint32'); r.drawIndexed(mSeat.n, g.sn); });
    r.setBindGroup(1, PD[0].bg);
  }
  if (cord.on) { r.setPipeline(pCord); r.setVertexBuffer(0, bCord); r.draw(4, CORDN); }
  r.setPipeline(pTrail); r.setVertexBuffer(0, bTrail); r.draw(4, nTrail);
  r.setPipeline(pDust); r.setVertexBuffer(0, bDust); r.draw(4, nDust);
  }
  r.end();
  // atmosphere and haze
  let p2 = e.beginRenderPass({ colorAttachments: [{ view: T.comp.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
  if (!SKIP.includes('atmpass')) { p2.setPipeline(pAtm); p2.setBindGroup(0, T.atmBG); p2.draw(3); } p2.end();
  // bloom: down the chain, then back up adding each level
  for (let i = 0; i < (SKIP.includes('bloom') ? 0 : T.bl.length); i++) {
    const b = e.beginRenderPass({ colorAttachments: [{ view: T.bl[i].createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
    b.setPipeline(i ? pDown : pDown0); b.setBindGroup(0, i ? T.blBG[i - 1] : T.compBG); b.draw(3); b.end();
  }
  for (let i = SKIP.includes('bloom') ? 0 : T.bl.length - 1; i > 0; i--) {
    const b = e.beginRenderPass({ colorAttachments: [{ view: T.bl[i - 1].createView(), loadOp: 'load', storeOp: 'store' }] });
    b.setPipeline(pUp); b.setBindGroup(0, T.blBG[i]); b.draw(3); b.end();
  }
  const f = e.beginRenderPass({ colorAttachments: [{ view: (snapTex || (HEADLESS ? T.off : ctx.getCurrentTexture())).createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
  if (!SKIP.includes('post')) { f.setPipeline(pPost); f.setBindGroup(0, T.postBG); f.draw(3); } f.end();
  Q.submit([e.finish()]);
}

// ---------------------------------------------------------------- loop
let last = performance.now(), dynT = 0, dynN = 0, hN = 0, hT = 0, hMax = 0, labelT = 0, lastNear = -1;
const label = $('n');
// ---------------------------------------------------------------- souls speaking
// come close to a soul and look at it: it says something, written on the screen next to it
const talkEl = $('t'), tmpS = [0, 0, 0];
let talk = null, lastTalk = -99;
function talkUpdate(dt) {
  if (trav) { if (talk) { talkEl.className = ''; talk = null; } return; }
  const look = qrot(qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)]), [0, 0, -1]);
  if (!talk && time - lastTalk > 3) {
    let best = null, bd = 1e9;
    for (const s of souls) {
      if (s.cool > time) continue;
      s.pos(tmpS);
      const dx = tmpS[0] - pos[0], dy = tmpS[1] - pos[1], dz = tmpS[2] - pos[2], d = hypot(dx, dy, dz);
      if (d > 7 + 2.5 * s.scale || (dx * look[0] + dy * look[1] + dz * look[2]) / d < 0.35) continue;
      if (d < bd) { bd = d; best = s; }
    }
    if (best) {
      const line = soulLine(best.kind, best.said);
      talk = { s: best, line, t: 0, dur: 3.5 + line.length * 0.07 };
      best.cool = time + 25; lastTalk = time; speakSound('soul');
    }
  }
  if (!talk) return;
  talk.t += dt;
  talk.s.pos(tmpS);
  const d = hypot(tmpS[0] - pos[0], tmpS[1] - pos[1], tmpS[2] - pos[2]);
  // written out letter by letter, beside the soul
  talkEl.textContent = talk.line.slice(0, max(1, talk.t * 32 | 0));
  const up = qrot(B, [0, 1, 0]), m = lastVP, x = tmpS[0] + up[0] * 1.2 * talk.s.scale, y = tmpS[1] + up[1] * 1.2 * talk.s.scale, z = tmpS[2] + up[2] * 1.2 * talk.s.scale;
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw > 0.1) {
    const sx = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / cw * 0.5 + 0.5) * innerWidth, sy = (0.5 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw * 0.5) * innerHeight;
    talkEl.style.left = clamp(sx, 160, innerWidth - 160) + 'px'; talkEl.style.top = clamp(sy, 60, innerHeight - 60) + 'px';
  }
  talkEl.className = cw > 0.1 ? 'on' : '';
  if (talk.t > talk.dur || d > 30) { talkEl.className = ''; talk = null; }
}
function frame(now) {
  window.__frames = (window.__frames || 0) + 1;
  requestAnimationFrame(frame);
  const dtr = now - last; last = now;
  const dt = min(dtr / 1000, 0.05);
  time += dt;
  // resolution follows the frame rate: aim for 60 fps
  if (dtr < 500) { dynT += dtr; dynN++; }
  if (dynT > 1000 && !HEADLESS) {
    const a = dynT / dynN; let k = 1;
    if (a > 19) k = 0.88; else if (a < 13 && scale < 1) k = 1.08;
    const s2 = clamp(scale * k, 0.5, 1); if (s2 !== scale) { scale = s2; resize(); }
    dynT = dynN = 0;
  }
  // headless tests drive the simulation themselves (__game.frameStep) and only ask for pictures
  if (HEADLESS) {
    if (window.__snapReq) { window.__snapReq = 0; uniforms(qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)])); snap().then((u) => (window.__snapRes = u), (e) => (window.__snapRes = 'ERR ' + e.message)); }
    return;
  }
  const cq = menu ? qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)]) : step(dt);
  if (menu) { B = qnorm(qmul(B, [0, sin(-dt * 0.02), 0, cos(-dt * 0.02)])); }
  uniforms(cq);
  if (cord.on) updateCord(cq);
  if (!menu) talkUpdate(dt);
  flash = max(0, flash - dt * 0.6);
  render();
  // the planet's name when you arrive on it
  if (!menu && groundT > 0 && near !== lastNear) { const p = PL[near]; lastNear = near; label.textContent = `${p.name} · ${BIOMES[p.biome]} · ${MOOD_NAMES[p.mood]} · ${p.g.toFixed(1)} m/s²`; label.className = 'on'; labelT = 5; }
  if (labelT > 0 && (labelT -= dt) <= 0) label.className = '';
  if (hud) {
    hN++; hT += dtr; if (dtr > hMax) hMax = dtr;
    if (hT > 500) {
      const gm = hypot(gv[0], gv[1], gv[2]);
      info.textContent = `${(hN * 1000 / hT).toFixed(0)} fps · pior ${hMax.toFixed(1)} ms · ${W}x${H}\ngravidade ${gm.toFixed(2)} m/s² · velocidade ${hypot(vel[0], vel[1], vel[2]).toFixed(1)} m/s · ${groundT > 0 ? 'no chão' : inWater ? 'na água' : 'no ar'}`;
      hN = hT = hMax = 0;
    }
  }
}

// ---------------------------------------------------------------- start
spawn(max(0, PL.findIndex((p) => p.mood === 'leve')), false);
{ const p = PL.find((q) => hypot(pos[0] - q.c[0], pos[1] - q.c[1], pos[2] - q.c[2]) < q.R + q.hmax + 5); lastNear = p ? p.i : -1; }
await say('Pronto', 1, 300);
keep('planetasLoad', '');
$('pn').textContent = PL.map((p) => `${p.name} (${BIOMES[p.biome]})`).join(' · ');
body.className = 'm';
async function readTex(t, x, y) {
  const b = device.createBuffer({ size: 256, usage: BU.MAP_READ | BU.COPY_DST }), e = device.createCommandEncoder();
  e.copyTextureToBuffer({ texture: t, origin: [x, y] }, { buffer: b, bytesPerRow: 256 }, [1, 1]); Q.submit([e.finish()]);
  await b.mapAsync(GPUMapMode.READ); const h = new Uint16Array(b.getMappedRange().slice(0, 8)); b.unmap();
  const f = (v) => { const s = v >> 15 ? -1 : 1, ex = (v >> 10) & 31, m = v & 1023; return ex === 31 ? (m ? NaN : s * Infinity) : ex ? s * 2 ** (ex - 15) * (1 + m / 1024) : s * 2 ** -14 * m / 1024; };
  return Array.from(h, f);
}
// development: render one frame into a texture and return it as a PNG data URL (headless browsers cannot screenshot WebGPU)
async function snap() {
  snapTex = device.createTexture({ size: [W, H], format: FMT, usage: TU.RENDER_ATTACHMENT | TU.COPY_SRC });
  render();
  const bpr = ceil(W * 4 / 256) * 256, b = device.createBuffer({ size: bpr * H, usage: BU.MAP_READ | BU.COPY_DST }), e = device.createCommandEncoder();
  e.copyTextureToBuffer({ texture: snapTex }, { buffer: b, bytesPerRow: bpr }, [W, H]); Q.submit([e.finish()]);
  await b.mapAsync(GPUMapMode.READ);
  const src = new Uint8Array(b.getMappedRange()), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c2 = cv.getContext('2d'), im = c2.createImageData(W, H), bgr = FMT.startsWith('bgra');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * bpr + x * 4, o = (y * W + x) * 4; im.data[o] = src[i + (bgr ? 2 : 0)]; im.data[o + 1] = src[i + 1]; im.data[o + 2] = src[i + (bgr ? 0 : 2)]; im.data[o + 3] = 255; }
  b.unmap(); b.destroy(); snapTex.destroy(); snapTex = null;
  c2.putImageData(im, 0, 0); return cv.toDataURL('image/png');
}
// development: put the camera at `from`, looking at `to`, upright for the nearest planet
function lookFrom(from, to) {
  for (let k = 0; k < 3; k++) { pos[k] = from[k]; vel[k] = 0; }
  let pn = PL[0], bd = 1e9; for (const p of PL) { const d = hypot(from[0] - p.c[0], from[1] - p.c[1], from[2] - p.c[2]) - p.R; if (d < bd) { bd = d; pn = p; } }
  const up = normalize3([from[0] - pn.c[0], from[1] - pn.c[1], from[2] - pn.c[2]]), dir = normalize3([to[0] - from[0], to[1] - from[1], to[2] - from[2]]);
  B = qFromY(up[0], up[1], up[2]);
  const f = qrot(B, [0, 0, -1]), h = normalize3([dir[0] - up[0] * dot3(dir, up), dir[1] - up[1] * dot3(dir, up), dir[2] - up[2] * dot3(dir, up)]);
  const yaw = atan2(dot3(cross3(f, h), up), dot3(f, h));
  B = qnorm(qmul(B, [0, sin(yaw / 2), 0, cos(yaw / 2)])); pitch = Math.asin(clamp(dot3(dir, up), -1, 1)); groundT = 0;
}
window.__game = { proj: (x, y, z) => { const m = lastVP, w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * W, (0.5 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5) * H, w]; }, press: (code, v) => key({ code, repeat: false, preventDefault() {} }, v), cast: () => castCord(qrot(qmul(B, [sin(pitch / 2), 0, 0, cos(pitch / 2)]), [0, 0, -1])), cord, BH, get trav() { return trav; }, get aura() { return aura; }, talkText: () => talkEl.textContent, souls, frameStep: (dt) => { const cq = step(dt); time += dt; uniforms(cq); if (cord.on) updateCord(cq); talkUpdate(dt); flash = max(0, flash - dt * 0.6); }, lookFrom, seated: () => PL.flatMap((p) => p.seatedPos.map((s) => ({ p: s.p, u: s.u, f: s.f }))), spiritAt: (i) => orbitAt(spiritArr, i * 16, time, [0, 0, 0]), get time() { return time; }, freeze: () => { time = 1000; }, up: () => qrot(B, [0, 1, 0]), view: (i, pt, orbit = true) => { spawn(i, orbit); pitch = pt; }, setPitch: (pt) => { pitch = pt; }, snap, readTex: async (n, x, y) => readTex(n === 'bl' ? T.bl[0] : T[n], x, y), dbg: () => ({ UG: Array.from(UG), B, pitch, W, H, scale }), PL, pos, vel, spawn, step: (n, dt) => { for (let i = 0; i < n; i++) step(dt); }, setMenu: (m) => { menu = m; body.className = m ? 'm' : 'g'; }, keys: (o) => { if ('f' in o) kf = o.f; if ('j' in o) { if (o.j && !kj) jumpReq = 1; kj = o.j; } if ('s' in o) ks = o.s; }, look: (dx, dy) => { mdx += dx; mdy += dy; }, get groundT() { return groundT; } };
requestAnimationFrame(frame);
