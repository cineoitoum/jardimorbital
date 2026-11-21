// ============================================================================
// per-planet content: terrain mesh, collision, plants, crystals, rocks, spirits (load-time only)
// ============================================================================

// ---------------------------------------------------------------- meshes shared by every planet
// humanoid figure: aux tags the part (0 head, .1 torso, .5 arms, .9 legs) for the vertex animation
function figureMesh(seated) {
  const m = new Mesh();
  const ball = (cx, cy, cz, r, aux) => {
    const s = icosphere(2), o = m.p.length / 3;
    for (let k = 0; k < s.p.length; k += 3) m.v(cx + s.p[k] * r, cy + s.p[k + 1] * r * 1.12, cz + s.p[k + 2] * r, aux);
    for (let k = 0; k < s.i.length; k++) m.i.push(s.i[k] + o);
  };
  const limb = (pts, r0, r1, aux) => m.tube(pts, (k) => mix(r0, r1, k / (pts.length - 1)), 7, true, () => aux);
  if (!seated) {
    ball(0, 1.63, 0.02, 0.12, 0);
    limb([[0, 1.48, 0], [0, 1.3, 0.02], [0, 1.1, 0.01], [0, 0.95, 0]], 0.08, 0.13, 0.1);
    m.tube([[0, 1.46, 0], [0, 1.36, 0.01], [0, 1.15, 0], [0, 0.96, 0]], (k) => [0.07, 0.17, 0.14, 0.15][k], 9, true, () => 0.1);
    for (const s of [-1, 1]) {
      limb([[s * 0.17, 1.42, 0], [s * 0.36, 1.2, -0.06], [s * 0.5, 0.98, -0.14], [s * 0.56, 0.86, -0.16]], 0.055, 0.035, 0.5);
      limb([[s * 0.09, 0.98, 0], [s * 0.11, 0.55, -0.05], [s * 0.08, 0.12, -0.14], [s * 0.07, 0.0, -0.22]], 0.08, 0.04, 0.9);
    }
    // centred on the chest
    for (let k = 1; k < m.p.length; k += 3) m.p[k] -= 1.1;
  } else {
    // sitting on the heels, bowed over the hands (origin on the ground)
    ball(0, 0.98, 0.3, 0.12, 0);
    m.tube([[0, 0.3, 0], [0, 0.55, 0.06], [0, 0.75, 0.15], [0, 0.86, 0.22]], (k) => [0.15, 0.13, 0.15, 0.07][k], 9, true, () => 0.1);
    for (const s of [-1, 1]) {
      limb([[s * 0.17, 0.8, 0.16], [s * 0.24, 0.58, 0.3], [s * 0.14, 0.42, 0.44], [s * 0.06, 0.4, 0.5]], 0.05, 0.035, 0.5);
      limb([[s * 0.1, 0.28, 0], [s * 0.2, 0.14, 0.38], [s * 0.14, 0.06, 0.1], [s * 0.1, 0.05, -0.08]], 0.085, 0.05, 0.9);
    }
  }
  return m.build();
}
// hexagonal column of unit radius and height (flat faces); the top centre is tagged aux 1 and raised into a point
function columnMesh() {
  const m = new Mesh(), S = 6;
  for (let s = 0; s < S; s++) {
    const a0 = s / S * TAU, a1 = (s + 1) / S * TAU;
    const a = m.v(cos(a0), 0, sin(a0), 0), b = m.v(cos(a1), 0, sin(a1), 0), c = m.v(cos(a1), 1, sin(a1), 0), d = m.v(cos(a0), 1, sin(a0), 0);
    m.quad(a, d, c, b);
    const e = m.v(cos(a0), 1, sin(a0), 0), f = m.v(cos(a1), 1, sin(a1), 0), t = m.v(0, 1, 0, 1);
    m.tri(e, t, f);
  }
  return m.build();
}
// giant mushroom of unit height: a slender stem and a domed cap with a flat underside (gills)
function mushroomMesh() {
  const m = new Mesh(), S = 22;
  const lathe = (prof) => {
    const rings = prof.map(([r, y]) => Array.from({ length: S }, (_, k) => m.v(cos(k / S * TAU) * r, y, sin(k / S * TAU) * r, 0)));
    for (let j = 0; j < rings.length - 1; j++) for (let k = 0; k < S; k++) m.quad(rings[j][k], rings[j][(k + 1) % S], rings[j + 1][(k + 1) % S], rings[j + 1][k]);
  };
  lathe([[0.09, 0], [0.085, 0.25], [0.072, 0.5], [0.07, 0.65], [0.078, 0.71]]);
  lathe([[0.075, 0.7], [0.3, 0.7], [0.5, 0.7], [0.62, 0.735], [0.6, 0.82], [0.47, 0.92], [0.24, 0.985], [0.001, 1]]);
  return m.build();
}
function rockMesh() {
  rseed(77);
  const m = icosphere(2, (x, y, z) => { const r = 0.75 + 0.5 * fbm(x * 1.6 + 3, y * 1.6, z * 1.6, 3); return [x * r, y * r * 0.8, z * r]; });
  m.aux = m.aux.map(() => 0);
  return m.build();
}

// ---------------------------------------------------------------- planet generation
// D: density grid (> 0 in rock), N per side, VS metres per voxel, org: world position of voxel (0,0,0)
function buildPlanet(p, D, N, VS, org) {
  const c = p.c, smp = sampler3(D, N, N, N);
  const Dw = (x, y, z) => smp((x - org[0]) / VS, (y - org[1]) / VS, (z - org[2]) / VS);
  // --- terrain mesh
  const sn = surfaceNets(D, N, N, N), nv = sn.nv, gp = sn.pos;
  const vb = new ArrayBuffer(nv * 16), vf = new Float32Array(vb), v8 = new Int8Array(vb);
  const wp = new Float32Array(nv * 3), wn = new Float32Array(nv * 3);
  for (let k = 0; k < nv; k++) {
    const x = gp[k * 3], y = gp[k * 3 + 1], z = gp[k * 3 + 2], e = 0.8;
    let nx = smp(x - e, y, z) - smp(x + e, y, z), ny = smp(x, y - e, z) - smp(x, y + e, z), nz = smp(x, y, z - e) - smp(x, y, z + e);
    const l = hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const X = org[0] + x * VS, Y = org[1] + y * VS, Z = org[2] + z * VS;
    // cavities are darker: how far the open air reaches 3 m out from the surface
    const ao = clamp(-smp(x + nx * 3 / VS, y + ny * 3 / VS, z + nz * 3 / VS) / 3, 0, 1);
    wp[k * 3] = vf[k * 4] = X; wp[k * 3 + 1] = vf[k * 4 + 1] = Y; wp[k * 3 + 2] = vf[k * 4 + 2] = Z;
    wn[k * 3] = nx; wn[k * 3 + 1] = ny; wn[k * 3 + 2] = nz;
    v8[k * 16 + 12] = round(nx * 127); v8[k * 16 + 13] = round(ny * 127); v8[k * 16 + 14] = round(nz * 127); v8[k * 16 + 15] = round(ao * 127);
  }
  const terrain = { vb, ib: new Uint32Array(sn.idx), n: sn.ni };

  // --- collision: distance to the rock (> 0 inside, ±1 voxel) kept only in 4x4x4 bricks that hold the surface
  const NB = N / 4, CI = new Uint32Array(NB * NB * NB), S1 = N, S2 = N * N;
  let CG = new Int8Array(64 * 8192), nb = 0;
  const q = new Int8Array(64);
  for (let bz = 0; bz < NB; bz++) for (let by = 0; by < NB; by++) for (let bx = 0; bx < NB; bx++) {
    let lo = 127, hi = -127;
    for (let z = 0; z < 4; z++) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const X = bx * 4 + x, Y = by * 4 + y, Z = bz * 4 + z, i = X + S1 * Y + S2 * Z;
      let v;
      if (X < 1 || Y < 1 || Z < 1 || X > N - 2 || Y > N - 2 || Z > N - 2) v = -127;
      else {
        const gx = D[i + 1] - D[i - 1], gy = D[i + S1] - D[i - S1], gz = D[i + S2] - D[i - S2], gl = sqrt(gx * gx + gy * gy + gz * gz) / 2;
        v = round(clamp(D[i] / max(gl, 0.05), -1, 1) * 127);
      }
      q[x + 4 * y + 16 * z] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    const bi = bx + NB * (by + NB * bz);
    if (lo === hi && (lo === 127 || lo === -127)) { CI[bi] = lo > 0 ? 1 : 0; continue; }
    if ((nb + 1) * 64 > CG.length) { const c2 = new Int8Array(CG.length * 2); c2.set(CG); CG = c2; }
    CG.set(q, nb * 64); CI[bi] = nb + 2; nb++;
  }
  const col = { N, NB, VS, org, CI, CG: CG.slice(0, nb * 64) };

  // --- dressing
  rseed(1000 + p.i * 31 + (p.seed * 100 | 0));
  const blades = [], glints = [], props = [], seated = [];
  const b = p.biome, upAt = (k) => { const x = wp[k * 3] - c[0], y = wp[k * 3 + 1] - c[1], z = wp[k * 3 + 2] - c[2], l = hypot(x, y, z); return [x / l, y / l, z / l, l]; };
  const hSea = (r) => (p.sea ? r - p.sea : 99);
  const tang = (u) => { const t = normalize3(cross3(u, abs(u[0]) > 0.8 ? [0, 0, 1] : [1, 0, 0])); return [t, cross3(u, t)]; };
  const blade = (x, y, z, h, u, w, shade, tip, lean) => blades.push(x, y, z, h, u[0], u[1], u[2], w, shade, tip, rnd(), lean);
  const glint = (x, y, z, size, r, g, bl, spike) => glints.push(x, y, z, size, r, g, bl, rnd() + (spike ? 1 : 0));
  // candidate ground vertices: flat enough, above the water
  const ground = [];
  for (let k = 0; k < nv; k++) {
    const u = upAt(k), sl = wn[k * 3] * u[0] + wn[k * 3 + 1] * u[1] + wn[k * 3 + 2] * u[2];
    if (sl > 0.7 && hSea(u[3]) > 0.4) ground.push(k);
  }
  const pick = (n, fn) => { for (let j = 0; j < n && ground.length; j++) fn(ground[rnd() * ground.length | 0]); };
  const around = (k, spread, fn) => {
    const u = upAt(k), [t1, t2] = tang(u), a = rr(-spread, spread), bb = rr(-spread, spread);
    fn(wp[k * 3] + t1[0] * a + t2[0] * bb, wp[k * 3 + 1] + t1[1] * a + t2[1] * bb, wp[k * 3 + 2] + t1[2] * a + t2[2] * bb, u, k);
  };
  const maskAt = (k, sc, th) => fbm(wp[k * 3] * sc + 5, wp[k * 3 + 1] * sc, wp[k * 3 + 2] * sc + 9, 2) > th;
  const tilt = (u, a) => { const [t1, t2] = tang(u), x = rr(-a, a), y = rr(-a, a); return normalize3([u[0] + t1[0] * x + t2[0] * y, u[1] + t1[1] * x + t2[1] * y, u[2] + t1[2] * x + t2[2] * y]); };
  const sink = (x, y, z, u, d) => [x - u[0] * d, y - u[1] * d, z - u[2] * d];
  const C = p.col;
  if (b === 0 || b === 4) {
    // meadows: dense grass; jardim's has pink tips and flower heads, prado's orange specks
    const n = (b === 0 ? 260000 : 200000) / THIN;
    pick(n, (k) => around(k, VS * 0.7, (x, y, z, u) => {
      const [X, Y, Z] = sink(x, y, z, u, 0.12);
      const fl = b === 4 && rnd() < 0.18;
      blade(X, Y, Z, rr(0.35, 1.1) * (fl ? 1.3 : 1), tilt(u, 0.25), rr(0.05, 0.09) * (1 + LV * 0.4), rr(0, 1), fl ? 0.12 : 0, rnd());
    }));
    const nf = (b === 0 ? 22000 : 60000) / THIN;
    const fc = b === 0 ? [[1, 0.42, 0.12], [1, 0.2, 0.08], [1, 0.75, 0.3]] : [[1, 0.35, 0.8], [0.65, 0.4, 1], [1, 0.75, 0.95], [0.9, 0.2, 0.55]];
    pick(nf * 3, (k) => {
      if (!maskAt(k, 0.03, b === 0 ? 0.45 : 0.4)) return;
      around(k, VS * 0.7, (x, y, z, u) => {
        const h = rr(0.25, 0.9), f = fc[rnd() * fc.length | 0], br = b === 0 ? 0.8 : 0.55;
        glint(x + u[0] * h, y + u[1] * h, z + u[2] * h, rr(0.05, 0.09), f[0] * br, f[1] * br, f[2] * br, 0);
      });
    });
  } else if (b === 1) {
    // cristal: dark purple bushes, cyan glints, clusters of tall columns
    pick(9000 / THIN, (k) => {
      if (!maskAt(k, 0.05, 0.42)) return;
      const u = upAt(k), x = wp[k * 3], y = wp[k * 3 + 1], z = wp[k * 3 + 2], sz = rr(0.6, 1.6);
      for (let j = 0; j < 14; j++) {
        const [t1, t2] = tang(u), a = rr(-0.5, 0.5) * sz, bb = rr(-0.5, 0.5) * sz;
        blade(x + t1[0] * a + t2[0] * bb - u[0] * 0.15, y + t1[1] * a + t2[1] * bb - u[1] * 0.15, z + t1[2] * a + t2[2] * bb - u[2] * 0.15, rr(0.4, 1.1) * sz, tilt(u, 0.7), rr(0.18, 0.32), rr(0, 1), 0, rnd());
      }
      for (let j = 0; j < 6; j++) {
        const [t1, t2] = tang(u), a = rr(-1, 1) * sz, bb = rr(-1, 1) * sz, h = rr(0.05, 1.2) * sz;
        glint(x + t1[0] * a + t2[0] * bb + u[0] * h, y + t1[1] * a + t2[1] * bb + u[1] * h, z + t1[2] * a + t2[2] * bb + u[2] * h, rr(0.025, 0.07), 0.35, 1.4, 1.6, rnd() < 0.06);
      }
    });
    // glowing gravel along the valley paths
    pick(30000 / THIN, (k) => {
      const u = upAt(k); if (u[3] > p.R - 1.5) return;
      around(k, VS * 0.7, (x, y, z, uu) => glint(x + uu[0] * 0.08, y + uu[1] * 0.08, z + uu[2] * 0.08, rr(0.02, 0.05), 0.3, 1.2, 1.4, rnd() < 0.02));
    });
    for (let cl = 0; cl < 16; cl++) {
      const k = ground[rnd() * ground.length | 0], u = upAt(k), [t1, t2] = tang(u), n = 6 + (rnd() * 22 | 0), big = rr(0.6, 1.4);
      for (let j = 0; j < n; j++) {
        const a = rr(-1, 1) * 5 * big, bb = rr(-1, 1) * 5 * big, fall = 1 - hypot(a, bb) / (7.5 * big);
        const x = wp[k * 3] + t1[0] * a + t2[0] * bb - u[0] * 2, y = wp[k * 3 + 1] + t1[1] * a + t2[1] * bb - u[1] * 2, z = wp[k * 3 + 2] + t1[2] * a + t2[2] * bb - u[2] * 2;
        const h = max(3, (6 + rnd() * rnd() * 34) * big * max(fall, 0.25)), ax = tilt(u, 0.07);
        props.push(x, y, z, h, ax[0], ax[1], ax[2], rr(0.6, 2.2) * big, rr(0, TAU), rnd(), 0, 0);
      }
    }
  } else if (b === 2) {
    // escarpa: sparse tall stalks with ember tips
    pick(14000 / THIN, (k) => around(k, VS * 0.7, (x, y, z, u) => {
      const [X, Y, Z] = sink(x, y, z, u, 0.1);
      blade(X, Y, Z, rr(0.8, 2.6), tilt(u, 0.2), rr(0.03, 0.06), rr(0, 1), rnd() < 0.3 ? 0.35 : 0, rnd());
    }));
    pick(2500 / THIN, (k) => around(k, VS, (x, y, z, u) => glint(x + u[0] * 0.1, y + u[1] * 0.1, z + u[2] * 0.1, rr(0.02, 0.045), 0.8, 0.25, 0.1, 0)));
  } else {
    // marmore: fine sparkle on the wet paint
    pick(8000 / THIN, (k) => around(k, VS * 0.7, (x, y, z, u) => glint(x + u[0] * 0.05, y + u[1] * 0.05, z + u[2] * 0.05, rr(0.015, 0.035), 1.2, 1.1, 1.0, rnd() < 0.04)));
  }
  // the point of light of this planet's feeling: an orb a little above open ground, and a column of light above it
  let beacon = null, beaconAt = [0, 0];
  if (p.feel) {
    const bc = VIS_ENV[p.feel].beam;
    for (let tries = 0; tries < 3000 && !beacon; tries++) {
      const k = ground[rnd() * ground.length | 0]; if (k === undefined) break;
      const u = upAt(k), sl = wn[k * 3] * u[0] + wn[k * 3 + 1] * u[1] + wn[k * 3 + 2] * u[2];
      if (sl < 0.9 || hSea(u[3]) < 2) continue;
      beacon = { p: [wp[k * 3], wp[k * 3 + 1], wp[k * 3 + 2]], u: u.slice(0, 3) };
    }
    if (beacon) {
      const { p: q, u } = beacon, at = (h) => [q[0] + u[0] * h, q[1] + u[1] * h, q[2] + u[2] * h];
      // a square of white light floating low over the ground, tinted by the feeling at its edges
      // only a square of light, floating above the ground
      beaconAt = [glints.length / 8, 1];
      glints.push(...at(2.6), 1.1, 2.2 + bc[0] * 0.3, 2.2 + bc[1] * 0.3, 2.2 + bc[2] * 0.3, 2.5);
    }
  }
  const shore = {};
  if (b === 5) {
    // the place to stand: a little above the water, on sand that slopes down to the sea
    const sand = ground.filter((k) => { const hs = hSea(upAt(k)[3]); return hs > 0.6 && hs < 16; });
    let best = sand[0], bs = -1;
    const isSea = (x, y, z) => { const X = x - c[0], Y = y - c[1], Z = z - c[2], l = hypot(X, Y, Z), r = p.sea - 0.4; return Dw(c[0] + X / l * r, c[1] + Y / l * r, c[2] + Z / l * r) < 0; };
    for (let tries = 0; tries < 300; tries++) {
      const k = sand[rnd() * sand.length | 0], u = upAt(k), hs = hSea(u[3]);
      if (hs < 5 || hs > 12) continue;
      // look all around: the direction with the most open water ahead, and water close by
      const [t1, t2] = tang(u);
      for (let j = 0; j < 16; j++) {
        const a = j / 16 * TAU, f = normalize3([t1[0] * cos(a) + t2[0] * sin(a), t1[1] * cos(a) + t2[1] * sin(a), t1[2] * cos(a) + t2[2] * sin(a)]);
        let sea = 0, first = 99;
        for (let d = 6; d <= 180; d += 6) if (isSea(wp[k * 3] + f[0] * d, wp[k * 3 + 1] + f[1] * d, wp[k * 3 + 2] + f[2] * d)) { sea++; if (first > d) first = d; }
        const sun = p.sun ? 6 * max(0, dot3(f, p.sun)) + 4 * (1 - min(1, abs(dot3(u, p.sun) - 0.25) * 2)) : 0;
        const sc = sea + (first < 40 ? 8 : 0) + sun + rnd() * 0.5;
        if (sc > bs) { bs = sc; best = k; shore.f = f; }
      }
    }
    const cu = upAt(best);
    shore.p = [wp[best * 3] + cu[0] * 1.7, wp[best * 3 + 1] + cu[1] * 1.7, wp[best * 3 + 2] + cu[2] * 1.7]; shore.u = cu.slice(0, 3);
    const near = (k, r) => hypot(wp[k * 3] - shore.p[0], wp[k * 3 + 1] - shore.p[1], wp[k * 3 + 2] - shore.p[2]) < r;
    // souls sitting along the waterline, looking at the waves (most of them within sight of the camera)
    for (let tries = 0; tries < 60000 && seated.length < 90; tries++) {
      const k = sand[rnd() * sand.length | 0], u = upAt(k), hs = hSea(u[3]);
      if (hs < 0.4 || hs > 9 || !near(k, seated.length < 45 ? 40 : 170) || near(k, 5)) continue;
      if (seated.some((q) => hypot(q.p[0] - wp[k * 3], q.p[1] - wp[k * 3 + 1], q.p[2] - wp[k * 3 + 2]) < 3)) continue;
      const n = [wn[k * 3], wn[k * 3 + 1], wn[k * 3 + 2]], f = normalize3([n[0] - u[0] * dot3(n, u) + rr(-0.15, 0.15), n[1] - u[1] * dot3(n, u) + rr(-0.15, 0.15), n[2] - u[2] * dot3(n, u) + rr(-0.15, 0.15)]);
      seated.push({ p: [wp[k * 3] - u[0] * 0.05, wp[k * 3 + 1] - u[1] * 0.05, wp[k * 3 + 2] - u[2] * 0.05], u: u.slice(0, 3), f, hue: rnd(), ph: rnd() });
    }
    // giant mushrooms on the sand and a little inland
    for (let tries = 0; tries < 20000 && props.length < 36 * 12; tries++) {
      const k = sand[rnd() * sand.length | 0], u = upAt(k), hs = hSea(u[3]);
      if (hs < 1.5 || near(k, 22) || !near(k, props.length < 22 * 12 ? 110 : 400) || seated.some((q) => hypot(q.p[0] - wp[k * 3], q.p[1] - wp[k * 3 + 1], q.p[2] - wp[k * 3 + 2]) < 4)) continue;
      const ax = tilt(u, 0.12), h = 3 + rnd() * rnd() * 12;
      props.push(wp[k * 3] - u[0] * 0.2, wp[k * 3 + 1] - u[1] * 0.2, wp[k * 3 + 2] - u[2] * 0.2, h, ax[0], ax[1], ax[2], h, rr(0, TAU), rnd(), 2, 0);
    }
    // threads of light between neighbouring souls, and from you to the two nearest: loose, sagging a little
    const th = [], thread = (a, b2) => {
      const L = hypot(b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]), n = max(8, L * 5 | 0);
      for (let i = 0; i <= n; i++) {
        const t = i / n, sg = 4 * t * (1 - t) * (0.25 + L * 0.05), x = mix(a[0], b2[0], t), y = mix(a[1], b2[1], t), z = mix(a[2], b2[2], t), d = normalize3([x - c[0], y - c[1], z - c[2]]);
        const sp = rnd();
        th.push(x - d[0] * sg, y - d[1] * sg, z - d[2] * sg, sp > 0.95 ? 0.04 : 0.014, 0.75, 0.8, 1, sp + (sp > 0.985 ? 1 : 0));
      }
    };
    const chest = (q) => [q.p[0] + q.u[0] * 0.75, q.p[1] + q.u[1] * 0.75, q.p[2] + q.u[2] * 0.75];
    seated.forEach((q, i) => {
      const nb = seated.map((o, j) => [j, hypot(o.p[0] - q.p[0], o.p[1] - q.p[1], o.p[2] - q.p[2])]).filter(([j, d]) => j > i && d < 16).sort((x, y) => x[1] - y[1]).slice(0, 2);
      for (const [j] of nb) thread(chest(q), chest(seated[j]));
    });
    const me = [shore.p[0] - shore.u[0] * 0.5, shore.p[1] - shore.u[1] * 0.5, shore.p[2] - shore.u[2] * 0.5];
    seated.map((q) => [q, hypot(q.p[0] - me[0], q.p[1] - me[1], q.p[2] - me[2])]).sort((x, y) => x[1] - y[1]).slice(0, 2).forEach(([q]) => thread(me, chest(q)));
    shore.threads = new Float32Array(th);
    // shimmer on the wet sand
    pick(16000 / THIN, (k) => { const hs = hSea(upAt(k)[3]); if (hs > 6) return; around(k, VS * 0.7, (x, y, z, u) => glint(x + u[0] * 0.05, y + u[1] * 0.05, z + u[2] * 0.05, rr(0.015, 0.04), ...(rnd() < 0.5 ? [1.2, 0.6, 1.1] : [0.5, 1.1, 1.2]), rnd() < 0.05)); });
  }
  // floating rocks: jardim has many, the others a few
  const nRocks = b === 4 ? 70 : b === 1 || b === 5 ? 0 : 14;
  for (let j = 0; j < nRocks; j++) {
    const k = ground[rnd() * ground.length | 0]; if (k === undefined) break;
    const u = upAt(k), h = rr(4, 30), s = rr(0.4, 1) ** 2 * 5 + 0.4;
    props.push(wp[k * 3] + u[0] * h, wp[k * 3 + 1] + u[1] * h, wp[k * 3 + 2] + u[2] * h, 1, u[0], u[1], u[2], s, rr(0, TAU), rnd(), 1, 0);
  }
  // seated spirits: by the water if there is any, else in the low ground
  for (let tries = 0, n = 0; tries < 4000 && n < 2 && b !== 5; tries++) {
    const k = ground[rnd() * ground.length | 0]; if (k === undefined) break;
    const u = upAt(k), hs = hSea(u[3]);
    if (p.sea ? hs > 1.6 : u[3] > p.R - p.A * 0.3) continue;
    if (seated.some((s) => hypot(s.p[0] - wp[k * 3], s.p[1] - wp[k * 3 + 1], s.p[2] - wp[k * 3 + 2]) < 30)) continue;
    const [t1] = tang(u), x = wp[k * 3] - u[0] * 0.05, y = wp[k * 3 + 1] - u[1] * 0.05, z = wp[k * 3 + 2] - u[2] * 0.05;
    seated.push({ p: [x, y, z], u: u.slice(0, 3), f: t1, hue: rnd() * 0.4, ph: rnd() });
    n++;
  }
  return { terrain, col, blades: new Float32Array(blades), glints: new Float32Array(glints), props: new Float32Array(props), seated, smp, Dw, ground, wp, shore, beacon, beaconAt };
}

// small vector helpers
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function normalize3(a) { const l = hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// floating spirits: orbits around a centre (a planet, or the whole system)
function orbitSpirit(center, r, speed, scale, kind, hue, glow) {
  const u = normalize3([rr(-1, 1), rr(-1, 1), rr(-1, 1)]), v = normalize3(cross3(u, normalize3([rr(-1, 1), rr(-1, 1), rr(-1, 1)])));
  return [center[0], center[1], center[2], r, u[0], u[1], u[2], (speed / r) * (rnd() < 0.5 ? -1 : 1), v[0], v[1], v[2], rr(0, TAU), scale, kind, hue, glow];
}
// same as orbitPos() in the shaders
function orbitAt(s, o, t, out) {
  const th = s[o + 11] + s[o + 7] * t, ct = cos(th), st = sin(th);
  const n = normalize3(cross3([s[o + 4], s[o + 5], s[o + 6]], [s[o + 8], s[o + 9], s[o + 10]])), bob = sin(t * 0.21 + s[o + 11] * 3) * 2;
  for (let k = 0; k < 3; k++) out[k] = s[o + k] + s[o + 3] * (s[o + 4 + k] * ct + s[o + 8 + k] * st) + n[k] * bob;
  return out;
}
