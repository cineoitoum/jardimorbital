// ============================================================================
// quality level, chosen before anything is built (adapted from Abyssal Garden)
// ============================================================================
// LV: 0 High, 1 Medium, 2 Low. Lower levels keep every 2nd / 4th blade and glint, use a coarser planet grid,
// and Low drops anti-aliasing. localStorage.planetas = "level". planetasLoad is set while the world is built:
// still set on the next visit means that load crashed the tab, so this one runs a level lower.
const mob = matchMedia('(pointer:coarse)').matches, mem = navigator.deviceMemory;
const keep = (k, v) => { try { localStorage[k] = v; } catch {} };
let SV = [], LV, bad;
try { SV = (localStorage.planetas || '').split(','); bad = localStorage.planetasLoad; } catch {}
const QS = new URLSearchParams(location.search);
LV = QS.has('q') ? +QS.get('q') : SV[0] ? +SV[0] : mob ? 2 : mem <= 4 ? 2 : 0;
if (bad && LV < 2 && !QS.has('q')) { SV = [++LV]; keep('planetas', LV); }
const THIN = 1 << LV, AA = LV > 1 ? 1 : 4, GRID = [224, 192, 152][LV];
