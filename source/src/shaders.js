// ============================================================================
// WGSL sources
// ============================================================================

const W_NOISE = /*wgsl*/`
fn ss(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0., 1.); return t * t * (3. - 2. * t); }
fn sat(x: f32) -> f32 { return clamp(x, 0., 1.); }
fn h31(p: vec3f) -> f32 { var q = fract(p * vec3f(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
fn h33(p: vec3f) -> vec3f { var q = fract(p * vec3f(.1031, .1030, .0973)); q += dot(q, q.yxz + 33.33); return fract((q.xxy + q.yxx) * q.zyx); }
fn vn(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3f(1., 0., 0.)), u.x), mix(h31(i + vec3f(0., 1., 0.)), h31(i + vec3f(1., 1., 0.)), u.x), u.y),
             mix(mix(h31(i + vec3f(0., 0., 1.)), h31(i + vec3f(1., 0., 1.)), u.x), mix(h31(i + vec3f(0., 1., 1.)), h31(i + vec3f(1., 1., 1.)), u.x), u.y), u.z);
}
fn fbm(p: vec3f, n: i32) -> f32 {
  var a = .5; var s = 0.; var q = p;
  for (var i = 0; i < n; i++) { s += a * vn(q); q = q * 2.03 + vec3f(17.1, 31.7, 5.3); a *= .5; }
  return s / (1. - 2. * a);
}
fn wor(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); var d = 9.;
  for (var x = -1; x <= 1; x++) { for (var y = -1; y <= 1; y++) { for (var z = -1; z <= 1; z++) {
    let o = vec3f(f32(x), f32(y), f32(z)); let r = o + h33(i + o) - f; d = min(d, dot(r, r));
  } } }
  return sqrt(d);
}
`;

// ---------------------------------------------------------------- planet density (compute), planet-local coordinates
// biomes: 0 prado, 1 cristal, 2 escarpa, 3 marmore, 4 jardim
const W_DENS = W_NOISE + /*wgsl*/`
struct U { n: vec4u, o: vec4f, prm: vec4f, prm2: vec4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read_write> D: array<f32>;
fn dens(p: vec3f) -> f32 {
  let r = length(p);
  let R = u.prm.x; let A = u.prm.y; let b = u.prm.z; let s = vec3f(u.prm.w, u.prm.w * .7, u.prm.w * 1.3);
  let wq = p * .011 + s;
  let warp = vec3f(fbm(wq, 3), fbm(wq + 5.1, 3), fbm(wq + 9.3, 3)) - .5;
  let q = p + warp * 22.;
  var h = 0.;
  if (b > 4.5) {
    // praia: low swells and long gentle beaches, most of it under the sea
    h = (fbm(q * .008 + s, 3) - .5) * A * 2.6 + (fbm(q * .03 + s, 2) - .5) * A * .35;
  } else if (b < .5 || b > 3.5) {
    // rolling hills (prado / jardim)
    h = (fbm(q * .011 + s, 4) - .5) * A * 2.2 + (fbm(q * .045 + s, 3) - .5) * A * .4;
    if (b > 3.5 && b < 4.5) {
      // a few tall rock spires standing out of the meadows
      let w = wor(q * .03 + s + 2.);
      h += ss(.28, .0, w) * A * 2.6 * ss(.5, .68, fbm(q * .012 + s + 7., 2));
    }
  } else if (b < 1.5) {
    // cristal: stepped plateaus cut by winding valley paths
    let n = fbm(q * .013 + s, 4) * 4.;
    let st = floor(n) + ss(.0, .3, fract(n));
    h = (st / 4. - .5) * A * 2.2;
    let v = abs(fbm(q * .018 + s + 3., 3) - .5);
    h -= ss(.07, .0, v) * A * .7;
  } else if (b < 2.5) {
    // escarpa: ridged crags and spires
    let rd = 1. - abs(fbm(q * .018 + s, 4) * 2. - 1.);
    h = (rd * rd * 1.4 - .5) * A + (fbm(q * .06 + s, 3) - .5) * A * .4;
    let w = wor(q * .032 + s);
    h += ss(.34, .0, w) * A * 1.3 * ss(.4, .7, fbm(q * .01 + s + 7., 2));
  } else {
    // marmore: smooth swells and shallow basins
    h = (fbm(q * .009 + s, 3) - .5) * A * 2. + (fbm(q * .03 + s, 2) - .5) * A * .25;
  }
  var dd = R + h - r;
  if (b > 1.5 && b < 2.5) { dd += (fbm(p * .085 + s, 3) - .5) * 5.; }
  dd += (fbm(p * .22 + s, 2) - .5) * .9;
  return dd;
}
@compute @workgroup_size(4, 4, 4) fn main(@builtin(global_invocation_id) id: vec3u) {
  if (any(id >= u.n.xyz)) { return; }
  var d = dens(u.o.xyz + vec3f(id) * u.o.w);
  if (any(id == vec3u(0u)) || any(id == u.n.xyz - 1u)) { d = -1.; }
  D[id.x + u.n.x * (id.y + u.n.y * id.z)] = d;
}
`;

// ---------------------------------------------------------------- shared scene header
const S_G = /*wgsl*/`
struct G {
  vp: mat4x4f, ivp: mat4x4f,
  cam: vec4f,   // xyz, time
  sun: vec4f,   // dir, intensity
  res: vec4f,   // w, h, 1/w, 1/h
  prj: vec4f,   // tan(fov/2), aspect, near, radians per pixel
  camR: vec4f,  // right, exposure
  camU: vec4f,  // up, grain
  fwd: vec4f,   // forward, planet count
  nebA: vec4f,  // colour, seed
  nebB: vec4f,  // colour, strength
  nebC: vec4f,  // colour, light count
  sunS: vec4f,  // sun on screen: px x, px y, in front, nebula style
  pl: array<vec4f, 24>,  // per planet (up to 8): centre+R | atmosphere colour+top | density, scale height, sea radius, _
  li: array<vec4f, 24>,  // per light: position+intensity | colour+radius
  vel: vec4f,   // player velocity, aura 0..1
  fx: vec4f,    // speed, shake, inside the black hole 0..1, white flash
  bh: vec4f,    // black hole centre, visual radius
  bh2: vec4f,   // accretion disk normal, visible
  fx2: vec4f,   // the end: sun glare 0..1, corridor of light 0..1, at the shore 0..1, corridor time
  eye: vec4f,   // the great eye in the clouds: direction, angular radius of the iris
  eye2: vec4f,  // its up direction, blink 0..1
  misc2: vec4f, // breathing 0..1, inside a vision 0..1, _, _
};
`;
// sky functions: need W_NOISE and the uniform `g`
const S_SKYFN = /*wgsl*/`
fn nebula(d: vec3f) -> vec3f {
  let p = d * 2.1 + g.nebA.w;
  let w = vec3f(fbm(p, 3), fbm(p + 5.2, 3), fbm(p + 9.7, 3));
  let q = p + (w - .5) * 2.6;
  let n1 = fbm(q * 1.3, 4);
  var a = 0.;
  if (g.sunS.w < .5) {
    // soft swirling clouds
    a = pow(ss(.38, .82, n1), 1.5);
  } else {
    // thin branching filaments
    let r = 1. - abs(fbm(q * 1.8 + 4., 4) * 2. - 1.);
    a = pow(r, 7.) * ss(.3, .7, n1) * 1.6 + pow(ss(.5, .9, n1), 2.) * .25;
  }
  let lanes = ss(.42, .66, fbm(q * 2.9 + 3., 3));
  var col = mix(g.nebA.rgb, g.nebB.rgb, ss(.3, .7, w.x));
  col = mix(col, g.nebC.rgb, ss(.55, .85, w.y) * .7);
  return col * a * (.3 + .7 * lanes) * g.nebB.w;
}
fn stars(d: vec3f) -> vec3f {
  var c = vec3f(0.);
  let pa = g.prj.w * 1.1;
  for (var l = 0; l < 3; l++) {
    let sc = 70. * pow(2.3, f32(l));
    let q = d * sc; let i = floor(q);
    let h = h33(i + f32(l) * 13.1);
    let o = .5 + (h - .5) * .6;
    let r = length(q - i - o) / sc;
    let hb = h31(i + 7.3 + f32(l));
    let bt = sat((hb - .988) / .012);
    let b = step(.988, hb) * mix(.25, 9., bt * bt * bt) + step(.94, h.x) * (.015 + .06 * h.y * h.y);
    let tint = mix(mix(vec3f(1., .72, .55), vec3f(.62, .8, 1.), h.z), vec3f(.4, .9, 1.), step(.93, h.y) * .8);
    c += tint * b * exp(-r * r / (pa * pa)) / (1. + f32(l));
  }
  return c;
}
// the great eye, half sunk in clouds; returns colour and coverage
fn greatEye(d: vec3f) -> vec4f {
  let E = g.eye.xyz;
  if (dot(d, E) < .55) { return vec4f(0.); }
  let X = normalize(cross(g.eye2.xyz, E)); let Y = cross(E, X);
  let t = g.cam.w;
  let p = vec2f(dot(d, X), dot(d, Y)) / g.eye.w;
  let r = length(p);
  // the gaze wanders a little
  let q = p - vec2f(sin(t * .07) * .09, sin(t * .05 + 1.) * .06);
  let rq = length(q); let ang = atan2(q.y, q.x);
  let fib = .5 + .5 * sin(ang * 70. + fbm(vec3f(cos(ang) * 5., sin(ang) * 5., rq * 4.), 3) * 7.);
  var col = mix(vec3f(.05, .16, .32), vec3f(.3, .58, .85), fib * ss(1., .45, rq));
  col = mix(col, vec3f(.78, .55, .25), ss(.62, .4, rq) * (.5 + .5 * fib));
  col *= .55 + .45 * ss(1., .85, rq);
  let pupil = .36 + .03 * sin(t * .25);
  col = mix(col, vec3f(.01, .012, .02), ss(pupil + .02, pupil - .01, rq));
  let hl = length(q - vec2f(-.3, .36));
  col += vec3f(1.) * ss(.11, .05, hl) * 1.6;
  // white of the eye, then clouds all around and over the edges
  col = mix(col, vec3f(.86, .87, .9), ss(.98, 1.03, rq));
  let cl = fbm(vec3f(p * 1.6, t * .01), 5);
  let edge = r + (cl - .5) * .9;
  // a slow blink: cloud lids close from above and below
  let lid = g.eye2.w;
  let lidM = ss(1. - lid, 1. - lid + .15, abs(p.y) / 1.2 + (cl - .5) * .3);
  let cover = max(ss(1.05, 1.3, edge), lidM);
  let bill = fbm(vec3f(p * 4.2, 3.), 4);
  let lit = .6 + .5 * ss(.3, .75, bill) + .25 * dot(normalize(p + 1e-3), vec2f(.5, .6));
  let cloud = mix(vec3f(.62, .66, .78), vec3f(1.15, 1.08, 1.), lit) * mix(1., .9, ss(1.3, 2.4, r));
  col = mix(col, cloud * 1.3 + vec3f(.25, .17, .05) * ss(.6, .9, bill), cover);
  let a = ss(2.7, 2.0, edge);
  return vec4f(col * 1.4, a);
}
fn sky(d: vec3f) -> vec3f {
  var c = nebula(d) + stars(d);
  if (g.fx2.z > .5) { let e = greatEye(d); c = mix(c, e.rgb, e.a); }
  let sd = max(dot(d, g.sun.xyz), 0.);
  let gl = g.fx2.x;
  c += vec3f(1., .92, .82) * (ss(.99985 - gl * .004, .99993 - gl * .003, sd) * 80. + pow(sd, 900. - gl * 820.) * (6. + gl * 30.) + pow(sd, 60. - gl * 45.) * (.12 + gl * 2.)) * g.sun.w;
  return c;
}
`;
const S_SCENE = S_G + W_NOISE + /*wgsl*/`
struct PU { c: vec4f, p: vec4f, col: array<vec4f, 12> };
@group(0) @binding(0) var<uniform> g: G;
@group(1) @binding(0) var<uniform> pu: PU;
// col: 0 rockA 1 rockB 2 ground 3 ground2 4 low/sand 5 emissive 6 water 7 deep water 8 blade base 9 blade tip 10 crystal 11 crystal glow
` + S_SKYFN + /*wgsl*/`
// spirits and the lamp light the ground nearby
fn lights(p: vec3f, n: vec3f) -> vec3f {
  var c = vec3f(0.);
  let k = i32(g.nebC.w);
  for (var i = 0; i < k; i++) {
    let a = g.li[i * 2]; let b = g.li[i * 2 + 1];
    let L = a.xyz - p; let d2 = dot(L, L);
    if (d2 > b.w * b.w) { continue; }
    let f = ss(b.w * b.w, b.w * b.w * .3, d2);
    c += b.rgb * a.w * (max(dot(n, L * inverseSqrt(d2 + 1e-4)), 0.) * .8 + .2) * f / (1. + d2 * .35);
  }
  return c;
}
fn sunLight(n: vec3f, up: vec3f) -> f32 {
  return max(dot(n, g.sun.xyz), 0.) * ss(-.12, .22, dot(up, g.sun.xyz));
}
fn ambient(n: vec3f, up: vec3f) -> vec3f {
  let day = ss(-.3, .5, dot(up, g.sun.xyz));
  let atm = g.pl[1].rgb;
  return (mix(g.nebA.rgb * .1 + vec3f(.012, .012, .02), pu.col[3].rgb * .0 + vec3f(.05, .055, .08), day * .5)) * (.6 + .4 * dot(n, up)) + atm * 0.;
}
`;

// fullscreen triangle
const W_FS = /*wgsl*/`
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f { return vec4f(f32(i32(i & 1u) * 4 - 1), f32(i32(i >> 1u) * 4 - 1), 0., 1.); }
`;

// ---------------------------------------------------------------- sky (drawn first)
const W_SKY = S_SCENE + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  let p = vec2f(f32(i32(i & 1u) * 4 - 1), f32(i32(i >> 1u) * 4 - 1));
  return VO(vec4f(p, 0., 1.), p);
}
@fragment fn fs(v: VO) -> @location(0) vec4f {
  let w = g.ivp * vec4f(v.ndc, 1., 1.);
  let d = normalize(w.xyz / w.w - g.cam.xyz);
  return vec4f(sky(d), 1.);
}
`;

// ---------------------------------------------------------------- terrain
const W_TERR = S_SCENE + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) w: vec3f, @location(1) n: vec3f, @location(2) ao: f32 };
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec4f) -> VO {
  return VO(g.vp * vec4f(p, 1.), p, n.xyz, n.w);
}
fn bands(w: vec3f) -> vec3f {
  // marmore: flowing bands of colour, like poured paint
  let q = w * select(.018, .04, pu.p.y > 4.5) + pu.p.w + select(0., g.cam.w * .004, pu.p.y > 4.5);
  let wp = vec3f(fbm(q, 3), fbm(q + 4.3, 3), fbm(q + 8.1, 3));
  let t = fbm(q * 1.7 + wp * 2.8, 4) * 6. + fbm(w * .07 + wp * 3., 3) * 3.;
  let f = fract(t); let k = i32(floor(t)) % 5;
  var a = pu.col[2].rgb; var b = pu.col[3].rgb;
  if (k == 1) { a = pu.col[3].rgb; b = pu.col[4].rgb; }
  else if (k == 2) { a = pu.col[4].rgb; b = pu.col[9].rgb; }
  else if (k == 3) { a = pu.col[9].rgb; b = pu.col[10].rgb; }
  else if (k == 4) { a = pu.col[10].rgb; b = pu.col[2].rgb; }
  let edge = ss(.0, .05, f) * ss(1., .9, f);
  return mix(a, b, ss(.3, .7, f)) * (.55 + .45 * edge);
}
@fragment fn fs(v: VO) -> @location(0) vec4f {
  let c = pu.c.xyz;
  let up = normalize(v.w - c);
  let N = normalize(v.n);
  let slope = dot(N, up);
  let rr = length(v.w - c);
  let hs = rr - pu.p.x;   // above the sea
  let hr = rr - pu.c.w;   // above the mean radius
  let b = pu.p.y;
  let n1 = fbm(v.w * .07, 3); let n2 = vn(v.w * .5 + 3.);
  let strata = sin(rr * 1.7 + n1 * 6.) * .5 + .5;
  let rock = mix(pu.col[0].rgb, pu.col[1].rgb, sat(n2 * .7 + strata * .5));
  var ground = mix(pu.col[2].rgb, pu.col[3].rgb, ss(.35, .65, n1));
  if ((b > 2.5 && b < 3.5) || b > 4.5) { ground = bands(v.w); }
  let gm = ss(.62, .82, slope + (n1 - .5) * .25);
  var base = mix(rock, ground, gm);
  // low land: valley paths (cristal), beaches by the sea
  let low = ss(-A_LOW, -A_LOW * 1.6, hr + (n1 - .5) * 3.) * step(.5, b) * step(b, 1.5);
  let beach = select(0., ss(1.6, .3, hs + (n2 - .5)), pu.p.x > 0.) * gm;
  base = mix(base, pu.col[4].rgb, max(low, beach));
  base *= .55 + .45 * v.ao;
  // emissive specks in the ground
  let sp = pow(vn(v.w * 5.3), 22.) * 30. * pu.p.z * (.4 + .6 * gm) * ss(.45, .6, n1);
  let L = g.sun.w * sunLight(N, up);
  var col = base * (vec3f(1., .95, .88) * L + ambient(N, up) + lights(v.w, N)) + pu.col[5].rgb * sp;
  if (b > 4.5 && pu.p.x > 0.) {
    // foam lines running up the beach with the waves
    let fm = pow(.5 + .5 * sin(hs * 5. - g.cam.w * 1.3 + fbm(v.w * .15, 2) * 4.), 10.) * ss(1.4, .1, hs) * ss(-.4, .05, hs);
    col += vec3f(1., .97, 1.) * fm * (.4 + L * .6) * 1.5;
  }
  if ((b > 2.5 && b < 3.5) || b > 4.5) {
    // wet sheen on the marble
    let V = normalize(g.cam.xyz - v.w);
    let H = normalize(V + g.sun.xyz);
    col += vec3f(1., .9, .8) * pow(max(dot(N, H), 0.), 60.) * L * .6;
  }
  return vec4f(col, 1.);
}
`.replaceAll('A_LOW', '2.5');

// ---------------------------------------------------------------- ocean (unit icosphere scaled to the sea level)
const W_OCEAN = S_SCENE + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) w: vec3f };
fn waveH(w: vec3f) -> f32 {
  let t = g.cam.w;
  return .55 * sin(dot(w, vec3f(.21, .05, .13)) - t * 1.1) + .3 * sin(dot(w, vec3f(-.09, .17, .31)) - t * 1.6) + .12 * sin(dot(w, vec3f(.6, -.4, .45)) - t * 2.3);
}
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec4f) -> VO {
  var w = pu.c.xyz + p * pu.p.x;
  if (pu.p.y > 4.5) { w += p * waveH(w); }
  return VO(g.vp * vec4f(w, 1.), w);
}
@fragment fn fs(v: VO, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let up = normalize(v.w - pu.c.xyz);
  let t = g.cam.w;
  let a = v.w * .22 + vec3f(t * .25, t * .1, -t * .2);
  var N = up + (vec3f(vn(a), vn(a + 3.1), vn(a + 7.7)) - .5) * .18 + (vec3f(vn(a * 3.1), vn(a * 3.1 + 5.), vn(a * 3.1 + 9.)) - .5) * .06;
  if (pu.p.y > 4.5) {
    // slope of the swell, from finite differences across the surface
    let e = .4; let h0 = waveH(v.w);
    let gx = vec3f(waveH(v.w + vec3f(e, 0., 0.)) - h0, waveH(v.w + vec3f(0., e, 0.)) - h0, waveH(v.w + vec3f(0., 0., e)) - h0) / e;
    N = normalize(N - (gx - up * dot(gx, up)) * 1.2);
  }
  N = normalize(N - up * dot(N, up) * .0);
  let V = normalize(g.cam.xyz - v.w);
  if (!ff) { N = -N; }
  let nv = max(dot(N, V), 0.);
  let F = .02 + .98 * pow(1. - nv, 5.);
  let R = reflect(-V, N);
  let L = g.sun.w * sunLight(up, up);
  let deep = mix(pu.col[7].rgb, pu.col[6].rgb, .3 + .3 * L);
  var col = deep * (L * .6 + .05) + pu.col[6].rgb * lights(v.w, up) * .6;
  col = mix(col, sky(R) * .8, F);
  col += vec3f(1., .9, .75) * pow(max(dot(R, g.sun.xyz), 0.), 300.) * 20. * L;
  // glow of nearby spirits spreading on the water
  col += lights(v.w + up * .5, up) * pu.col[6].rgb * .0;
  return vec4f(col, mix(.86, 1., F));
}
`;

// ---------------------------------------------------------------- grass blades, bushes, flower stems (instanced strips)
const W_BLADE = S_SCENE + /*wgsl*/`
override ROWS: u32 = 4;
override FAR: f32 = 90.;
struct VO { @builtin(position) pos: vec4f, @location(0) w: vec3f, @location(1) n: vec3f, @location(2) t: f32, @location(3) k: vec4f };
@vertex fn vs(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f, @location(2) k: vec4f) -> VO {
  let row = vi >> 1u; let side = f32(vi & 1u) * 2. - 1.;
  let t = f32(row) / f32(ROWS);
  let up = b.xyz;
  let toC = g.cam.xyz - a.xyz; let dist = length(toC);
  var wd = b.w * ss(FAR, FAR * .6, dist);
  // blades on the far side of the planet collapse
  if (dot(normalize(a.xyz - pu.c.xyz), normalize(g.cam.xyz - pu.c.xyz)) < .2 && dist > 30.) { wd = 0.; }
  let T = normalize(cross(up, vec3f(.37, .81, .45)));
  let B = cross(up, T);
  let ph = k.z * 6.283;
  let sway = sin(g.cam.w * .9 + ph + dot(a.xyz, vec3f(.07, .05, .06))) * .22 + (k.w - .5) * .5;
  let sway2 = cos(g.cam.w * .7 + ph * 1.3) * .15;
  let sdir = normalize(cross(up, toC / max(dist, 1e-3)) + T * 1e-3);
  let h = a.w;
  let p = a.xyz + up * h * t + (T * sway + B * sway2) * h * t * t + sdir * side * wd * (1. - t * .85) * .5;
  let n = normalize(up * .7 + normalize(toC) * .3);
  return VO(g.vp * vec4f(p, 1.), p, n, t, k);
}
@fragment fn fs(v: VO) -> @location(0) vec4f {
  let up = normalize(v.w - pu.c.xyz);
  var base = mix(pu.col[8].rgb, pu.col[9].rgb, v.t * v.t) * (.65 + .7 * v.k.x);
  base *= .45 + .55 * v.t;
  let L = g.sun.w * sunLight(up, up) * (.75 + .25 * v.t);
  var col = base * (vec3f(1., .95, .88) * L + ambient(up, up) + lights(v.w, up));
  col += pu.col[9].rgb * v.k.y * ss(.6, 1., v.t) * 2.5;
  return vec4f(col, 1.);
}
`;

// ---------------------------------------------------------------- crystal columns and floating rocks (instanced meshes)
const W_PROP = S_SCENE + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) w: vec3f, @location(1) n: vec3f, @location(2) l: vec3f, @location(3) s: vec4f, @location(4) ln: vec3f };
fn basis(ax: vec3f, yaw: f32) -> mat3x3f {
  let r = select(vec3f(1., 0., 0.), vec3f(0., 0., 1.), abs(ax.x) > .8);
  let X0 = normalize(cross(ax, r)); let Z0 = cross(X0, ax);
  let X = X0 * cos(yaw) + Z0 * sin(yaw); let Z = cross(X, ax);
  return mat3x3f(X, ax, Z);
}
// a: base + height, b: axis + radius, c: yaw, seed, kind (0 crystal, 1 rock, 2 mushroom), _
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec4f, @location(2) a: vec4f, @location(3) b: vec4f, @location(4) c: vec4f) -> VO {
  var ax = b.xyz; var base = a.xyz;
  if (c.z > 1.5) {
    // giant mushroom: breathes slowly, the cap a little more than the stem
    let M = basis(ax, c.x);
    let br = 1. + sin(g.cam.w * .45 + c.y * 9.) * .04 * (.3 + p.y);
    let lp = vec3f(p.x * br, p.y, p.z * br) * b.w;
    let w = base + M * lp;
    return VO(g.vp * vec4f(w, 1.), w, M * n.xyz, p, vec4f(a.w, b.w, c.y, c.z), n.xyz);
  }
  if (c.z > .5) {
    // floating rock: bobs and turns slowly over the ground
    let t = g.cam.w;
    base += ax * (sin(t * .25 + c.y * 6.283) * 1.4);
  }
  let yaw = c.x + select(0., g.cam.w * .05 * (c.y - .5), c.z > .5);
  let M = basis(ax, yaw);
  var lp = vec3f(p.x * b.w, p.y * a.w, p.z * b.w);
  if (c.z > .5) { lp = p * b.w; }
  // pointed tip of the crystal
  lp.y += n.w * b.w * .45 * step(c.z, .5);
  let w = base + M * lp;
  return VO(g.vp * vec4f(w, 1.), w, M * n.xyz, vec3f(p.x, p.y, p.z), vec4f(a.w, b.w, c.y, c.z), n.xyz);
}
@fragment fn fs(v: VO, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  let up = normalize(v.w - pu.c.xyz);
  var N = normalize(v.n);
  let V = normalize(g.cam.xyz - v.w);
  if (v.s.w > 1.5) {
    // mushroom: glowing cap in drifting rings, light pouring from the gills underneath, a pale stem
    let L = g.sun.w * sunLight(N, up);
    let cap = ss(.66, .74, v.l.y);
    let rr = length(v.l.xz);
    let ring = fract(rr * 3.2 - g.cam.w * .12 + v.s.z * 7.);
    var cc = mix(pu.col[5].rgb, pu.col[11].rgb, ss(.2, .5, ring) * ss(.95, .6, ring));
    cc = mix(cc, pu.col[9].rgb, ss(.55, .9, sin(atan2(v.l.z, v.l.x) * 3. + v.s.z * 20. + g.cam.w * .2) * .5 + .5) * .5);
    let spots = ss(.62, .7, vn(v.l * 7. + v.s.z * 30.));
    let under = ss(.1, -.4, v.ln.y);
    let gills = pow(.5 + .5 * sin(atan2(v.l.z, v.l.x) * 60.), 3.) * under;
    let fr = pow(1. - abs(dot(N, V)), 2.);
    var col = cc * (.2 + L * .45) + cc * (.45 + fr * .8) * (.6 + .4 * sin(g.cam.w * .7 + v.s.z * 5.)) + vec3f(1., .95, 1.) * spots * .35;
    col += pu.col[11].rgb * gills * 1.6;
    let stem = pu.col[4].rgb * (.2 + L * .5 + fr * .5) + pu.col[11].rgb * (.06 + .25 * ss(.4, .7, v.l.y));
    return vec4f(mix(stem, col, cap) + lights(v.w, N) * .4, 1.);
  }
  if (v.s.w > .5) {
    let L = g.sun.w * sunLight(N, up);
    let rk = mix(pu.col[0].rgb, pu.col[1].rgb, vn(v.l * 3. + v.s.z * 9.)) * (.7 + .3 * fbm(v.w * .4, 2));
    return vec4f(rk * (vec3f(1., .95, .88) * L + ambient(N, up) + lights(v.w, N)), 1.);
  }
  let hgt = v.l.y * v.s.x;
  let fr = pow(1. - abs(dot(N, V)), 3.);
  let streak = pow(vn(vec3f(atan2(v.l.z, v.l.x) * 3., hgt * .12, v.s.z * 40.)), 5.);
  let L = g.sun.w * sunLight(N, up);
  var col = pu.col[10].rgb * (.22 + L * .7 + fr * 1.1) + pu.col[10].rgb * streak * 1.2;
  col += pu.col[11].rgb * (exp(-hgt / 1.8) * 1.3 + exp(-hgt / 8.) * .15);
  let H = normalize(V + g.sun.xyz);
  col += vec3f(1., .95, 1.) * pow(max(dot(N, H), 0.), 120.) * L * 5.;
  col += lights(v.w, N) * pu.col[10].rgb;
  return vec4f(col, 1.);
}
`;

// ---------------------------------------------------------------- spirits: luminous figures (instanced humanoid meshes)
const S_ORBIT = /*wgsl*/`
// orbit: a = centre + radius, b = axis u + angular speed, d = axis v + phase, e = scale, kind, hue, glow
fn orbitPos(a: vec4f, b: vec4f, d: vec4f, th: f32) -> vec3f {
  let n = normalize(cross(b.xyz, d.xyz));
  return a.xyz + a.w * (b.xyz * cos(th) + d.xyz * sin(th)) + n * sin(g.cam.w * .21 + d.w * 3.) * 2.;
}
fn spiritCol(e: vec4f) -> vec3f {
  return mix(vec3f(1., .82, .5), vec3f(.75, .88, 1.), e.z);
}
`;
const W_SPIRIT = S_SCENE + S_ORBIT + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) w: vec3f, @location(1) n: vec3f, @location(2) e: vec4f, @location(3) part: f32, @location(4) ph: f32 };
// e.w: < .6 a dark translucent soul with a glowing rim (the brightness of the rim), >= .6 a luminous one
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec4f, @location(2) a: vec4f, @location(3) b: vec4f, @location(4) d: vec4f, @location(5) e: vec4f) -> VO {
  let t = g.cam.w;
  var P: vec3f; var X: vec3f; var Y: vec3f; var Z: vec3f;
  var lp = p;
  let ph = d.w * 7.;
  // breathing, and the head turning slowly
  lp *= 1. + sin(t * .9 + ph) * .025;
  lp.x += select(0., sin(t * .45 + ph) * .05, n.w < .05);
  if (e.y > .5 && e.y < 1.5) {
    // seated on the ground: a = position, b = up, d = facing; rocks gently back and forth
    Y = b.xyz; Z = normalize(d.xyz - Y * dot(d.xyz, Y)); X = cross(Y, Z);
    lp.z += lp.y * sin(t * .6 + ph) * .07;
    lp.y += select(0., sin(t * 1.1 + ph + p.x * 4.) * .03, n.w > .3 && n.w < .7);
    P = a.xyz + Y * sin(t * .5 + ph) * .03;
  } else {
    let th = d.w + b.w * t;
    P = orbitPos(a, b, d, th);
    let fw = normalize(-b.xyz * sin(th) + d.xyz * cos(th)) * sign(b.w);
    let rad = normalize(P - a.xyz);
    let X0 = normalize(cross(rad, fw));
    let Y0 = normalize(fw * .85 + rad * .5);
    // a slow roll around the direction of flight
    let rl = sin(t * .23 + ph) * .45;
    X = X0 * cos(rl) + cross(Y0, X0) * sin(rl);
    Y = Y0;
    Z = cross(X, Y);
    // arms open and close like slow swimming
    lp.y += select(0., sin(t * .7 + ph) * .12 * abs(p.x), n.w > .3 && n.w < .7);
    // arms drift, legs trail and ripple
    let part = n.w;
    lp.x += select(0., sin(t * .8 + d.w * 5. + p.y * 2.) * .08 * sign(p.x), part > .3 && part < .7);
    lp.z += select(0., sin(t * 1.3 + p.y * 3. + d.w) * .07 * (1. - p.y), part > .7);
  }
  let w = P + (X * lp.x + Y * lp.y + Z * lp.z) * e.x;
  let nw = normalize(X * n.x + Y * n.y + Z * n.z);
  return VO(g.vp * vec4f(w, 1.), w, nw, e, n.w, ph);
}
@fragment fn fs(v: VO) -> @location(0) vec4f {
  let V = normalize(g.cam.xyz - v.w);
  let Nf = normalize(cross(dpdx(v.w), dpdy(v.w)));
  if (v.e.w < .6 && v.e.y < 1.5) { discard; }
  if (v.e.y > 1.5) {
    // crystal astronaut: faceted mirror that throws back the nebula, with spectral glints
    let N = select(-Nf, Nf, dot(Nf, V) > 0.);
    let R = reflect(-V, N);
    let spec = .5 + .5 * cos(6.283 * (dot(N, vec3f(1.3, .7, 2.1)) * 1.7 + vec3f(0., .33, .67)));
    var col = sky(R) * 1.6 + spec * vec3f(.9, .6, .45) * .35;
    col += vec3f(1.) * pow(max(dot(R, g.sun.xyz), 0.), 40.) * 12.;
    col += vec3f(1., .5, .3) * pow(1. - abs(dot(N, V)), 4.) * .8;
    return vec4f(col * g.sun.w * .5 + col * .3, 1.);
  }
  let N = normalize(v.n);
  let fr = 1. - abs(dot(N, V));
  let c = spiritCol(v.e);
  let core = mix(1.6, 4.5, pow(fr, 1.5)) * v.e.w;
  let head = select(1., 1.6, v.part < .05);
  // fade out when the camera is inside or right next to a big figure
  let near = ss(.4, 2.2, length(g.cam.xyz - v.w) / v.e.x);
  return vec4f(mix(c, vec3f(1.), .45 - fr * .3) * core * head * near, 1.);
}
// dark translucent souls: almost black inside, a soft coloured rim, slow sparks moving through
@fragment fn fsT(v: VO) -> @location(0) vec4f {
  if (v.e.w >= .6 || v.e.y > 1.5) { discard; }
  let V = normalize(g.cam.xyz - v.w);
  let N = normalize(v.n);
  let fr = 1. - abs(dot(N, V));
  let rim = pow(fr, 2.2);
  let c = spiritCol(v.e);
  let t = g.cam.w;
  let sp = pow(vn(v.w * 3.5 / v.e.x + vec3f(0., t * .4, t * .2)), 10.) * 6.;
  let flick = .85 + .15 * sin(t * 1.7 + v.ph * 3.);
  let near = ss(.3, 1.6, length(g.cam.xyz - v.w) / v.e.x);
  let head = select(1., 1.5, v.part < .05);
  let col = c * (rim * 2.4 * v.e.w * 2. * head + sp * v.e.w) + vec3f(.006, .004, .012);
  return vec4f(col * flick, sat(.18 + .7 * rim) * near * flick);
}
`;

// ---------------------------------------------------------------- visions: objects floating around a still point
// pu.c = origin of the vision; pu.col: 0 sky top, 1 sky bottom, 2 fog, 3 key light
const W_VIS = S_SCENE + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) w: vec3f, @location(1) n: vec3f, @location(2) c: vec3f, @location(3) e: vec2f };
fn qrot(q: vec4f, v: vec3f) -> vec3f { let t = 2. * cross(q.xyz, v); return v + q.w * t + cross(q.xyz, t); }
fn spin(v: vec3f, a: f32) -> vec3f { let c = cos(a); let s = sin(a); return vec3f(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec4f, @location(2) a: vec4f, @location(3) b: vec4f, @location(4) q: vec4f, @location(5) c: vec4f) -> VO {
  let t = g.cam.w;
  // the whole scene turns very slowly around you; each object bobs on its own
  let ang = t * .012;
  var lp = a.xyz + vec3f(0., sin(t * .45 + b.w * 6.283) * c.w, 0.) + qrot(q, p * b.xyz);
  let w = pu.c.xyz + spin(lp, ang);
  return VO(g.vp * vec4f(w, 1.), w, spin(qrot(q, n.xyz), ang), c.rgb, vec2f(a.w, b.w));
}
@fragment fn fs(v: VO) -> @location(0) vec4f {
  let N = normalize(v.n); let V = normalize(g.cam.xyz - v.w);
  let L = normalize(vec3f(.45, .8, .35));
  let amb = mix(pu.col[1].rgb, pu.col[0].rgb, N.y * .5 + .5) * .45;
  let rim = pow(1. - abs(dot(N, V)), 3.) * pu.col[2].rgb * .8;
  let ph = v.e.y;
  let flick = .85 + .15 * sin(g.cam.w * 13. + ph * 50.) * sin(g.cam.w * 7.3 + ph * 20.);
  var col = v.c * (pu.col[3].rgb * max(dot(N, L), 0.) * .9 + amb) + rim + v.c * v.e.x * select(1., flick, v.e.x > 3.);
  let d = length(g.cam.xyz - v.w);
  col = mix(col, pu.col[2].rgb * .8, 1. - exp(-d * .011));
  return vec4f(col, 1.);
}
`;
const W_VISSKY = S_SCENE + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO { let p = vec2f(f32(i32(i & 1u) * 4 - 1), f32(i32(i >> 1u) * 4 - 1)); return VO(vec4f(p, 0., 1.), p); }
@fragment fn fs(v: VO) -> @location(0) vec4f {
  let w = g.ivp * vec4f(v.ndc, 1., 1.);
  let d = normalize(w.xyz / w.w - g.cam.xyz);
  let t = g.cam.w;
  var c = mix(pu.col[1].rgb, pu.col[0].rgb, ss(-.5, .7, d.y));
  // slow veils of mist and a soft glow where the light comes from
  let f = fbm(d * 2.5 + vec3f(t * .01, 0., t * .007), 4);
  c = mix(c, pu.col[2].rgb * 1.1, ss(.45, .8, f) * .3);
  c += pu.col[3].rgb * pow(max(dot(d, normalize(vec3f(.45, .8, .35))), 0.), 6.) * .8;
  c += stars(d) * ss(.25, 0., dot(pu.col[0].rgb, vec3f(.33))) * .7;
  return vec4f(c, 1.);
}
`;

// ---------------------------------------------------------------- sprites: glints, flower specks, spirit trails, dust (additive)
const W_SPR = S_SCENE + S_ORBIT + /*wgsl*/`
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) c: vec4f };
fn quad(vi: u32, P: vec3f, size: f32, col: vec4f) -> VO {
  let q = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2. - 1.;
  let dist = length(P - g.cam.xyz);
  let mn = dist * g.prj.w * 1.6;
  let s = max(size, mn);
  let k = (size * size) / (s * s);
  let w = P + (g.camR.xyz * q.x + g.camU.xyz * q.y) * s * select(1., 3., col.a > .5);
  return VO(g.vp * vec4f(w, 1.), q * select(1., 3., col.a > .5), vec4f(col.rgb * k, col.a));
}
// static: a = position + size, b = colour + flags (frac part: twinkle seed, >= 1: four-point spikes)
@vertex fn vsGlint(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f) -> VO {
  let tw = select(.55 + .45 * sin(g.cam.w * (1.5 + fract(b.w) * 3.) + fract(b.w) * 40.), 1., b.w >= 2.);
  var c = b.rgb * tw;
  // only glints on the near side of their planet
  let up = normalize(a.xyz - pu.c.xyz);
  if (dot(up, normalize(g.cam.xyz - a.xyz)) < -.25) { c = vec3f(0.); }
  var P = a.xyz;
  if (b.w >= 2.) { P += up * sin(g.cam.w * .6 + a.x) * .25; }
  return quad(vi, P, a.w, vec4f(c, select(step(1., b.w), 2., b.w >= 2.)));
}
// dust drifting around the camera in a 50 m box
@vertex fn vsDust(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f) -> VO {
  let B = 50.;
  let o = a.xyz * B + vec3f(sin(g.cam.w * .05 + a.w * 9.), cos(g.cam.w * .04 + a.w * 7.), sin(g.cam.w * .03 + a.w * 5.)) * 3.;
  let P = g.cam.xyz + (fract((o - g.cam.xyz) / B) - .5) * B;
  let fade = ss(25., 8., length(P - g.cam.xyz));
  var col = b.rgb * fade * (.5 + .5 * sin(g.cam.w * 2. + a.w * 30.));
  let sp = length(g.vel.xyz);
  let st = ss(5., 50., sp);
  if (st < .01) { return quad(vi, P, .03, vec4f(col, 0.)); }
  // at speed the dust streaks past: a thin line along the velocity
  let q = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2. - 1.;
  let vd = g.vel.xyz / sp;
  let sd = normalize(cross(vd, P - g.cam.xyz));
  let len = .05 + sp * .045 * st;
  let wid = max(.012, length(P - g.cam.xyz) * g.prj.w * .8);
  let w = P + vd * q.x * len + sd * q.y * wid;
  col = (col + vec3f(.5, .6, 1.) * .5 * st) * (1. + st * (1.5 + g.vel.w * 2.));
  return VO(g.vp * vec4f(w, 1.), vec2f(0., q.y), vec4f(col, 0.));
}
// the silver cord: points along the curve, positions written every frame
@vertex fn vsCord(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f) -> VO {
  // never thinner than ~2 pixels and never dimmed: a continuous shining thread
  let q = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2. - 1.;
  let sz = max(a.w, length(a.xyz - g.cam.xyz) * g.prj.w * 1.3) * select(1., 3., b.w >= 1.);
  let w = a.xyz + (g.camR.xyz * q.x + g.camU.xyz * q.y) * sz;
  return VO(g.vp * vec4f(w, 1.), q * select(1., 3., b.w >= 1.), vec4f(b.rgb * (.8 + .4 * sin(g.cam.w * 6. + b.w * 40.)), step(1., b.w)));
}
// spirit trails: a, b, d, e = the spirit's orbit, k = place along the trail + random numbers
@vertex fn vsTrail(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f, @location(2) d: vec4f, @location(3) e: vec4f, @location(4) k: vec4f) -> VO {
  let t = g.cam.w;
  let len = 14. * e.x;
  let th = d.w + b.w * t - sign(b.w) * k.x * len / max(a.w, 1.);
  let P0 = orbitPos(a, b, d, th);
  let rnd = vec3f(k.y, k.z, k.w) - .5;
  let spread = (.12 + k.x * k.x * 2.2) * e.x;
  let wob = vec3f(sin(t * .7 + k.y * 30.), sin(t * .6 + k.z * 30.), sin(t * .5 + k.w * 30.)) * .25 * k.x;
  // the head of the trail starts a little below the figure's chest
  let fw = normalize(-b.xyz * sin(th) + d.xyz * cos(th)) * sign(b.w);
  let P = P0 - fw * .6 * e.x + (rnd * 2.) * spread + wob;
  var c = mix(vec3f(.85, .9, 1.), spiritCol(e), .5);
  if (k.y > .9) { c = vec3f(1., .45, .2); } else if (k.y > .8) { c = vec3f(.3, .8, 1.); } else if (k.y > .76) { c = vec3f(1., .25, .3); }
  let br = pow(1. - k.x, 1.4) * (1.2 + 2. * step(.95, k.z)) * e.w * select(1., .45, e.w < .6);
  var col = c * br;
  if (e.y > .5 && e.y < 1.5) { col = vec3f(0.); }
  return quad(vi, P, (.025 + .05 * k.w) * e.x, vec4f(col, step(.985, k.z)));
}
@fragment fn fs(v: VO) -> @location(0) vec4f {
  let r2 = dot(v.uv, v.uv);
  var i = exp(-r2 * 7.);
  if (v.c.a > 1.5) {
    // a square of light: hard bright face, soft glow around it
    let a = max(abs(v.uv.x), abs(v.uv.y));
    return vec4f(v.c.rgb * (ss(1.02, .96, a) * 3. + exp(-max(a - 1., 0.) * 2.2) * .5 * ss(3., 2., a)), 0.);
  }
  if (v.c.a > .5) {
    // four-point star: a small core with long thin spikes
    let a = abs(v.uv);
    i = exp(-r2 * 60.) * 2. + (exp(-a.y * 40.) * exp(-a.x * 2.5) + exp(-a.x * 40.) * exp(-a.y * 2.5)) * .6;
  }
  return vec4f(v.c.rgb * i, 0.);
}
`;

// ---------------------------------------------------------------- atmosphere + haze, applied over the resolved scene
const W_ATM = S_G + W_NOISE + W_FS + /*wgsl*/`
@group(0) @binding(0) var<uniform> g: G;
@group(0) @binding(1) var tS: texture_2d<f32>;
@group(0) @binding(2) var tD: texture_depth${AA > 1 ? '_multisampled' : ''}_2d;
` + S_SKYFN + /*wgsl*/`
// the accretion disk where a ray crosses its plane: colour + coverage
fn disk(ro: vec3f, rd: vec3f) -> vec4f {
  let n = g.bh2.xyz; let rs = g.bh.w;
  let dn = dot(rd, n);
  if (abs(dn) < 1e-4) { return vec4f(0.); }
  let t = dot(g.bh.xyz - ro, n) / dn;
  if (t <= 0.) { return vec4f(0.); }
  let p = ro + rd * t - g.bh.xyz;
  let r = length(p) / rs;
  if (r < 2.6 || r > 13.) { return vec4f(0.); }
  let u = normalize(cross(n, vec3f(.3, .1, .9))); let v = cross(n, u);
  let ang = atan2(dot(p, v), dot(p, u));
  // gas streams around faster near the middle
  let sw = ang * 2. + log(r) * 5. - g.cam.w * 3. / r;
  let gas = fbm(vec3f(cos(sw) * 2., sin(sw) * 2., r * .7), 4);
  let band = ss(2.6, 3.4, r) * ss(13., 6., r);
  let hot = ss(8., 3., r);
  // the side turning towards us is brighter
  let tang = normalize(cross(n, p));
  let dop = 1. + .75 * dot(tang, -rd);
  let col = mix(vec3f(1.4, .5, .18), vec3f(2.2, 1.6, 1.1), hot * .8) * dop * (.3 + gas * 1.2);
  return vec4f(col * 1.2, sat(band * (.25 + gas * .9)));
}
@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let px = vec2i(fc.xy);
  var c = textureLoad(tS, px, 0).rgb;
  let ndc = vec2f(fc.x * g.res.z * 2. - 1., 1. - fc.y * g.res.w * 2.);
  let wv = g.ivp * vec4f(ndc, 1., 1.);
  let dir = normalize(wv.xyz / wv.w - g.cam.xyz);
  let z = textureLoad(tD, px, 0);
  var tEnd = 1e9;
  if (z > 0.) { tEnd = (g.prj.z / z) / max(dot(dir, g.fwd.xyz), 1e-3); }
  // black hole: bends the light behind it, swallows what is inside its shadow, wears a burning disk
  if (g.bh2.w > .5) {
    let oc = g.bh.xyz - g.cam.xyz; let tb = dot(oc, dir); let rs = g.bh.w;
    if (tb > 0. && tEnd > tb - rs * 13.) {
      let perp = oc - dir * tb; let b = length(perp);
      let behind = tEnd > tb;
      if (behind) {
        if (b < rs * 2.6) {
          c = vec3f(0.);
        } else {
          let al = min(2. * rs / b * 2.2, 1.2);
          let d2 = normalize(dir + normalize(perp) * al);
          // what lies behind, seen along the bent ray: the screen if it lands on it, the sky otherwise
          let cp = g.vp * vec4f(g.cam.xyz + d2 * 2000., 1.);
          let uv = vec2f(cp.x / cp.w * .5 + .5, .5 - cp.y / cp.w * .5);
          var bent = sky(d2);
          if (cp.w > 0. && all(uv > vec2f(0.)) && all(uv < vec2f(1.))) {
            let q = vec2i(uv * g.res.xy);
            if (textureLoad(tD, q, 0) > 0.) { bent = textureLoad(tS, q, 0).rgb; }
          }
          c = mix(c, bent, ss(rs * 30., rs * 6., b));
          // photon ring
          let pr = (b - rs * 2.75) / (rs * .14);
          c += vec3f(1.6, 1.25, .9) * exp(-pr * pr) * 2.2;
          // the far side of the disk, bent up and around the shadow: a thin burning halo
          let pu = normalize(perp);
          let ang = atan2(dot(pu, normalize(cross(g.bh2.xyz, dir))), dot(pu, g.bh2.xyz));
          let hb = (b - rs * 3.25) / (rs * (.3 + .15 * sin(ang * 3. + g.cam.w * .7)));
          let hn = .55 + .45 * fbm(vec3f(cos(ang) * 3., sin(ang) * 3., g.cam.w * .15), 3);
          c += vec3f(1.6, .75, .3) * exp(-hb * hb) * hn * 1.4;
        }
      }
      let df = disk(g.cam.xyz, dir);
      let tDisk = dot(g.bh.xyz - g.cam.xyz, g.bh2.xyz) / dot(dir, g.bh2.xyz);
      if (tDisk < tEnd && (tDisk < tb || b > rs * 2.6)) { c = mix(c, df.rgb, df.a); }
    }
  }
  let np = i32(g.fwd.w);
  for (var i = 0; i < np; i++) {
    let pd = g.pl[i * 3 + 2]; if (pd.w <= 0.) { continue; }
    let pc = g.pl[i * 3];
    let n = normalize(vec3f(.35 * sin(f32(i) * 2.1 + 1.), 1., .35 * cos(f32(i) * 1.3)));
    let dn = dot(dir, n); if (abs(dn) < 1e-4) { continue; }
    let tr = dot(pc.xyz - g.cam.xyz, n) / dn;
    if (tr <= 0. || tr > tEnd) { continue; }
    // hidden behind the planet itself
    let oc = g.cam.xyz - pc.xyz; let bq = dot(oc, dir); let cq = dot(oc, oc) - pc.w * pc.w; let dq = bq * bq - cq;
    if (dq > 0. && -bq - sqrt(dq) > 0. && -bq - sqrt(dq) < tr) { continue; }
    let r = length(g.cam.xyz + dir * tr - pc.xyz) / pc.w;
    if (r < 1.55 || r > 2.7) { continue; }
    let u = (r - 1.55) / 1.15;
    let band = .5 + .5 * cos(6.283 * (u * .9 + vec3f(0., .33, .67)));
    let dens = ss(0., .08, u) * ss(1., .9, u) * (.55 + .45 * sin(u * 60.));
    // stipple: ink dots whose density follows the band
    let dot2 = step(1. - dens * .85, h31(vec3f(floor(fc.xy), 3.)));
    let lit = .35 + .65 * ss(-.3, .5, dot(n, g.sun.xyz) * sign(dn) * -1. + .3);
    c = mix(c, band * 1.6 * lit, dot2 * .9);
  }
  var T = vec3f(1.); var inS = vec3f(0.);
  for (var i = 0; i < np; i++) {
    let pc = g.pl[i * 3]; let pa = g.pl[i * 3 + 1]; let pd = g.pl[i * 3 + 2];
    let oc = g.cam.xyz - pc.xyz;
    let b = dot(oc, dir); let cc = dot(oc, oc) - pa.w * pa.w;
    let disc = b * b - cc;
    if (disc <= 0.) { continue; }
    let sq = sqrt(disc);
    let t0 = max(-b - sq, 0.); var t1 = min(-b + sq, tEnd);
    let cg = dot(oc, oc) - pc.w * pc.w * .97;
    let dg = b * b - cg;
    if (dg > 0.) { let tg = -b - sqrt(dg); if (tg > 0.) { t1 = min(t1, tg); } }
    if (t1 <= t0) { continue; }
    let n = 10; let dt = (t1 - t0) / f32(n);
    let mie = 1. + 3. * pow(max(dot(dir, g.sun.xyz), 0.), 10.);
    for (var s = 0; s < n; s++) {
      let x = g.cam.xyz + dir * (t0 + (f32(s) + .5) * dt);
      let rr = length(x - pc.xyz);
      let h = max(rr - pc.w, 0.);
      let dn = exp(-h / pd.y) * pd.x;
      let lit = ss(-.25, .35, dot((x - pc.xyz) / rr, g.sun.xyz)) * g.sun.w * .5 + .04;
      let ex = exp(-dn * dt * vec3f(1., 1.08, 1.2));
      inS += T * pa.rgb * lit * mie * (1. - ex);
      T *= ex;
    }
  }
  return vec4f(c * T + inS, 1.);
}
`;

// ---------------------------------------------------------------- bloom chain (from Abyssal Garden)
const W_BLIT = W_FS + /*wgsl*/`
@group(0) @binding(0) var t: texture_2d<f32>;
@group(0) @binding(1) var s: sampler;
fn uvOf(fc: vec4f, k: f32) -> vec2f { return fc.xy * k / vec2f(textureDimensions(t)); }
fn kar(c: vec3f) -> vec4f { let w = 1. / (1. + max(c.r, max(c.g, c.b))); return vec4f(c * w, w); }
@fragment fn fsDown0(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let uv = uvOf(fc, 2.); let e = 1. / vec2f(textureDimensions(t));
  let a = kar(min(textureSampleLevel(t, s, uv + e * vec2f(-1., -1.), 0.).rgb, vec3f(40.)));
  let b = kar(min(textureSampleLevel(t, s, uv + e * vec2f(1., -1.), 0.).rgb, vec3f(40.)));
  let c = kar(min(textureSampleLevel(t, s, uv + e * vec2f(-1., 1.), 0.).rgb, vec3f(40.)));
  let d = kar(min(textureSampleLevel(t, s, uv + e * vec2f(1., 1.), 0.).rgb, vec3f(40.)));
  let m = a + b + c + d;
  return vec4f(m.rgb / m.a, 1.);
}
@fragment fn fsDown(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let uv = uvOf(fc, 2.); let e = 1. / vec2f(textureDimensions(t));
  return (textureSampleLevel(t, s, uv + e * vec2f(-1., -1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., -1.), 0.)
        + textureSampleLevel(t, s, uv + e * vec2f(-1., 1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., 1.), 0.)) * .25;
}
@fragment fn fsUp(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let uv = uvOf(fc, .5); let e = .75 / vec2f(textureDimensions(t));
  return (textureSampleLevel(t, s, uv + e * vec2f(-1., -1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., -1.), 0.)
        + textureSampleLevel(t, s, uv + e * vec2f(-1., 1.), 0.) + textureSampleLevel(t, s, uv + e * vec2f(1., 1.), 0.)) * .25;
}
`;

// ---------------------------------------------------------------- final: bloom, sun spikes, tone map, film grain
const W_POST = S_G + W_NOISE + W_FS + /*wgsl*/`
@group(0) @binding(0) var<uniform> g: G;
@group(0) @binding(1) var sC: sampler;
@group(0) @binding(2) var tS: texture_2d<f32>;
@group(0) @binding(3) var tB: texture_2d<f32>;
@group(0) @binding(4) var tD: texture_depth${AA > 1 ? '_multisampled' : ''}_2d;
fn sat3(x: vec3f) -> vec3f { return clamp(x, vec3f(0.), vec3f(1.)); }
fn tmap(x: vec3f) -> vec3f { return sat3((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)); }
fn hh(p: vec2f) -> f32 { var q = fract(vec3f(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
fn hueRot(c: vec3f, h: f32) -> vec3f {
  let k = vec3f(.57735); let ch = cos(h);
  return max(c * ch + cross(k, c) * sin(h) + k * dot(k, c) * (1. - ch), vec3f(0.));
}
// the corridor: a tunnel of billowing clouds, light at its end, golden sparks drifting past
fn corridor(q: vec2f, t: f32, asp: f32) -> vec3f {
  var d = q; d.x *= asp;
  let r = length(d) + 1e-3; let a = atan2(d.y, d.x);
  let z = .32 / r + t * .9;
  let w = vec3f(cos(a) * 2.2, sin(a) * 2.2, z * 1.4);
  let b0 = fbm(w, 5);
  let b1 = fbm(w + vec3f(.12, .12, -.1) * (1. / (r + .2)), 5);
  let puff = ss(.3, .6, b0);
  // deep blue billows, their edges caught by the light at the end
  let rim = ss(.02, .1, b0 - b1) * ss(.3, .5, b0) * ss(.62, .38, b0);
  var wall = mix(vec3f(.05, .08, .15), vec3f(.32, .42, .6), puff * (.5 + .5 * ss(.7, .2, r)));
  wall += vec3f(.85, .9, 1.) * rim * (.4 + 1.6 * ss(.8, .15, r));
  wall = mix(wall, vec3f(1., .82, .55) * puff, ss(.4, .12, r) * .45);
  let open = ss(.24, .09, r + (b0 - .5) * .08);
  let light = mix(vec3f(.5, .65, 1.), vec3f(1.6, 1.5, 1.3), ss(.2, .0, r)) * (1. + 3. * exp(-r * 12.));
  var col = mix(wall, light, open);
  // a star of rays from the light, slowly turning
  let rays = pow(.5 + .5 * sin(a * 24. + t * .15), 30.) + pow(.5 + .5 * sin(a * 11. - t * .1 + 1.), 40.) * .7;
  col += vec3f(.8, .88, 1.) * rays * exp(-r * 3.5) * 1.6 + vec3f(1.6, 1.5, 1.3) * exp(-r * 40.) * 4.;
  let sp = step(.993, hh(vec2f(floor(a * 50.), floor(z * 5.)))) * ss(.06, .4, r);
  col += vec3f(1.5, 1.15, .6) * sp * 2.5;
  return col;
}
@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  var uv = fc.xy * g.res.zw;
  let t = g.cam.w;
  // inside the black hole: the picture folds like a mirror under rippling water
  let ins = g.fx.z;
  if (ins > 0.) {
    let asp = g.res.x * g.res.w;
    var d = uv - .5; d.x *= asp;
    let r = length(d); var a = atan2(d.y, d.x);
    a += ins * (.5 / (r + .2) + t * .12);
    let seg = 6.2831 / 6.; let am = a - seg * floor(a / seg);
    a = min(am, seg - am) + floor(t * .05) * .7;
    let rr = r * (1. + ins * .3 * sin(t * .3)) + (sin(r * 26. - t * 2.1) * .014 + sin(a * 5. + t * .7) * .01) * ins;
    // the raw swirl and its mirrored copy are each continuous; blending the pictures (not the angles) keeps it seamless
    let a0 = atan2(d.y, d.x) + ins * (.5 / (r + .2) + t * .12);
    var d0 = vec2f(cos(a0), sin(a0)) * rr; d0.x /= asp;
    d = vec2f(cos(a), sin(a)) * rr; d.x /= asp;
    let m0 = fract((d0 + .5) * .5) * 2.; let m1 = fract((d + .5) * .5) * 2.;
    uv = mix(uv, mix(1. - abs(1. - m0), 1. - abs(1. - m1), ins * .55), ins);
  }
  let q = uv - .5;
  // chromatic aberration towards the edges, stronger at speed and inside the black hole
  let ca = q * dot(q, q) * (.012 + g.vel.w * .025 + g.fx.y * .3 + ins * .05);
  var c = vec3f(textureSampleLevel(tS, sC, uv + ca, 0.).r, textureSampleLevel(tS, sC, uv, 0.).g, textureSampleLevel(tS, sC, uv - ca, 0.).b);
  let bl = textureSampleLevel(tB, sC, uv, 0.).rgb;
  c = mix(c, bl, .1) + bl * .06;
  // diffraction cross on the sun when it is in view and not hidden
  if (g.sunS.z > .5 && g.fx.z < .5) {
    let sp = vec2i(clamp(g.sunS.xy, vec2f(0.), g.res.xy - 1.));
    var vis = 0.;
    for (var k = 0; k < 5; k++) {
      let o = vec2i((k % 3) - 1, (k / 3) - 1) * 3;
      vis += select(0., .2, textureLoad(tD, clamp(sp + o, vec2i(0), vec2i(g.res.xy) - 1), 0) == 0.);
    }
    let v = fc.xy - g.sunS.xy; let sH = g.res.y;
    let hor = exp(-abs(v.y) / 1.3) * exp(-abs(v.x) / (sH * .35));
    let ver = exp(-abs(v.x) / 1.3) * exp(-abs(v.y) / (sH * .5));
    let d = length(v) / sH;
    let sc = mix(vec3f(.7, .82, 1.3), vec3f(1.3, .55, .35), ss(.0, .3, d));
    c += sc * (hor + ver) * vis * g.sun.w * 1.6 + vec3f(1., .85, .7) * exp(-d * 18.) * vis * g.sun.w * .5;
  }
  // aura: a glow that gathers around the edges of the view
  let au = g.vel.w;
  if (au > 0.) {
    let e = ss(.18, .72, length(q * vec2f(1., .8)));
    let ac = mix(vec3f(.55, .75, 1.3), vec3f(.95, .6, 1.4), .5 + .5 * sin(t * .8 + atan2(q.y, q.x) * 2.));
    c += ac * au * (e * (.38 + .12 * sin(t * 3. + length(q) * 20.)) + .03);
  }
  if (ins > 0.) {
    // colours drift through the spectrum inside
    let h = t * .1;
    let rot = mat3x3f(.299 + .701 * cos(h) + .168 * sin(h), .587 - .587 * cos(h) + .330 * sin(h), .114 - .114 * cos(h) - .497 * sin(h),
                      .299 - .299 * cos(h) - .328 * sin(h), .587 + .413 * cos(h) + .035 * sin(h), .114 - .114 * cos(h) + .292 * sin(h),
                      .299 - .3 * cos(h) + 1.25 * sin(h), .587 - .588 * cos(h) - 1.05 * sin(h), .114 + .886 * cos(h) - .203 * sin(h));
    c = mix(c, max(rot * c, vec3f(0.)), ins * .7);
  }
  c += vec3f(1., .97, .92) * g.fx.w * 6.;
  // the end of the crossing: each beat the picture swells, and a light grows in the middle, coming closer
  let ep = g.misc2.z; let pv = g.misc2.w;
  if (ep > 0.) {
    let r = length(q * vec2f(g.res.x * g.res.w, 1.));
    c *= 1. + pv * .6;
    c += vec3f(1., .92, .8) * (exp(-r * (9. - ep * 6.)) * ep * ep * 3. + exp(-r * 3.) * pv * .4);
  }
  // the end: the sun's glare whitens everything, then the corridor, then colours drift slowly at the shore
  let gl = g.fx2.x;
  c = c * (1. + gl * 2.5) + vec3f(1., .95, .88) * gl * gl * gl * 5.;
  if (g.fx2.y > 0.) { c = mix(c, corridor(q, g.fx2.w, g.res.x * g.res.w), g.fx2.y); }
  if (g.fx2.z > 0.) { c = mix(c, hueRot(c, sin(t * .05) * 1.2), g.fx2.z * .3); }
  c *= g.camR.w;
  let br = g.misc2.x;
  c = mix(c, vec3f(dot(c, vec3f(.3, .5, .2))), br * .35);
  c *= 1. - dot(q, q) * (.7 + br * 1.2);
  c = tmap(c);
  let l = dot(c, vec3f(.2126, .7152, .0722));
  // slightly faded blacks, like printed film
  c = c * .96 + vec3f(.012, .008, .016);
  c = pow(max(c, vec3f(0.)), vec3f(1. / 2.2));
  let n = (hh(fc.xy + fract(g.cam.w * 7.13) * 400.) + hh(fc.xy * 1.7 + 11.) - 1.) * g.camU.w * (.5 + l);
  return vec4f(c + n, 1.);
}
`;
