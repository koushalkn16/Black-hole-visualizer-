/* EVENT HORIZON — physics core (v3)
   Runs in the browser (classic script → globals) and in Node (npm test).
   Nothing here draws. Every number on the site comes from this file.

   Method labels used across the UI:
     EXACT   closed-form analytic result (no approximation)
     RK4     numerical integration of the exact geodesic equation
     APPROX  approximate analytic formula (weak field / truncated series)
   Units: geometric (G = c = 1) with M = 1 unless stated; 1 Rs = 2 M.              */

/* ---------- constants (SI) ---------- */
const G = 6.6743e-11;              // m³ kg⁻¹ s⁻² (CODATA 2018)
const C = 299792458;               // m/s (exact)
const MSUN = 1.98847e30;           // kg (IAU 2015 nominal)
const KPC = 3.0856775814913673e19; // m
const UAS = 4.84813681109536e-12;  // rad per micro-arcsecond
const AU = 1.495978707e11;         // m (exact)
const BC_M = 3 * Math.sqrt(3);     // critical impact parameter in M
const BC_RS = BC_M / 2;            // ≈ 2.598076 Rs

/* ---------- EXACT: scales for mass M (M☉) and distance D (kpc) ---------- */
function derived(Msun, Dkpc) {
  const M = Msun * MSUN, m = G * M / (C * C);
  return {
    M, m, Rs: 2 * m, rph: 3 * m, bc: BC_M * m, isco: 6 * m, D: Dkpc * KPC,
    shadow: 2 * BC_M * m / (Dkpc * KPC) / UAS, // μas, exact for a distant static observer
    thetaG: m / (Dkpc * KPC) / UAS,            // GM/(c²D) in μas
  };
}

/* ---------- RK4: photon (GR) or Newtonian corpuscle geodesic ----------
   GR      d²u/dφ² + u = 3u²                (null geodesic, Schwarzschild)
   Newton  d²u/dφ² + u = 1/b²               (particle launched at speed c, inverse-square force)
   b in M. opts: r0 start radius (M, default 1e6 ≈ infinity), h step (rad), model 'gr' | 'newton'.     */
function trace(b, opts = {}) {
  const r0 = opts.r0 || 1e6, h = opts.h || 0.002, keepR = opts.keepR || 140;
  const newton = opts.model === 'newton';
  const far = r0 >= 5e3;
  const ib2 = 1 / (b * b);
  const first = newton ? (u => ib2 + 2 * u * ib2 - u * u) : (u => ib2 - u * u + 2 * u * u * u);
  const f = newton ? ((u, d) => [d, ib2 - u]) : ((u, d) => [d, 3 * u * u - u]);
  let u = 1 / r0; const u0 = u;
  const uEnd = Math.min(u0, 1 / 2000);
  let du = Math.sqrt(Math.max(0, first(u)));
  const phi0 = Math.PI - Math.asin(Math.min(1, b * u0));
  let s = 0, rmin = r0, status = 'escaped', steps = 0, maxRes = 0;
  const pts = [[Math.cos(phi0) * r0, Math.sin(phi0) * r0]]; let k = 0;
  while (true) {
    const k1 = f(u, du), k2 = f(u + h / 2 * k1[0], du + h / 2 * k1[1]),
          k3 = f(u + h / 2 * k2[0], du + h / 2 * k2[1]), k4 = f(u + h * k3[0], du + h * k3[1]);
    u += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    du += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    s += h; steps++;
    const res = Math.abs(du * du - first(u)) * b * b;
    if (res > maxRes) maxRes = res;
    const r = 1 / u; if (u > 0 && r < rmin) rmin = r;
    const phi = phi0 - s;
    if (r < keepR && r > 0 && (k++ % 3 === 0)) pts.push([Math.cos(phi) * r, Math.sin(phi) * r]);
    if (u >= 0.5) { status = 'captured'; pts.push([Math.cos(phi) * 2, Math.sin(phi) * 2]); break; }
    if (du < 0 && u <= uEnd) { status = 'escaped'; break; }
    if (s > 12 * Math.PI) { status = 'trapped'; break; }
  }
  if (pts.length > 1 && Math.hypot(pts[0][0], pts[0][1]) > keepR) pts.shift();
  // asymptotic deflection: swept angle minus that of a straight line through the same two end points
  // (exact for the flat far field; u may step slightly below 0, the straight-line formula continues smoothly)
  const defl = (status === 'escaped' && far) ? s - (Math.PI - Math.asin(b * u0) - Math.asin(Math.max(-1, Math.min(1, b * u)))) : null;
  return { b, model: newton ? 'newton' : 'gr', status, pts, deflRad: defl, deflDeg: defl === null ? null : defl * 180 / Math.PI,
           rmin, turns: s / (2 * Math.PI), sweptDeg: s * 180 / Math.PI, steps, maxRes, r0 };
}
function deflectionDeg(b, h) { const t = trace(b, { h, keepR: 1 }); return t.status === 'escaped' ? t.deflDeg : null; }

/* ---------- EXACT: closest approach for b > b_c (largest root of b² = r³/(r − 2)) ---------- */
function closestApproach(b) {
  if (b <= BC_M) return null;
  return 2 * b / Math.sqrt(3) * Math.cos(Math.acos(-BC_M / b) / 3);
}

/* ---------- EXACT: Darwin (1959) deflection via elliptic integrals (Carlson R_F) ---------- */
function carlsonRF(x, y, z) {
  for (let i = 0; i < 200; i++) {
    const l = Math.sqrt(x * y) + Math.sqrt(y * z) + Math.sqrt(z * x);
    x = (x + l) / 4; y = (y + l) / 4; z = (z + l) / 4;
    const A = (x + y + z) / 3;
    if (Math.max(Math.abs(x - A), Math.abs(y - A), Math.abs(z - A)) / A < 1e-13) break;
  }
  const A = (x + y + z) / 3, X = 1 - x / A, Y = 1 - y / A, Z = 1 - z / A, E2 = X * Y - Z * Z, E3 = X * Y * Z;
  return (1 - E2 / 10 + E3 / 14 + E2 * E2 / 24 - 3 * E2 * E3 / 44) / Math.sqrt(A);
}
function darwinDeg(b) {
  const r0 = closestApproach(b); if (r0 === null) return null;
  const s = Math.sqrt((r0 - 2) * (r0 + 6));
  const k2 = (s - r0 + 6) / (2 * s), sin2 = (s - r0 + 2) / (s - r0 + 6);
  const K = carlsonRF(0, 1 - k2, 1);
  const F = Math.sqrt(sin2) * carlsonRF(1 - sin2, 1 - k2 * sin2, 1);
  return (4 * Math.sqrt(r0 / s) * (K - F) - Math.PI) * 180 / Math.PI;
}

/* ---------- EXACT: Newtonian corpuscle at speed c (hyperbola) ----------
   e = √(1 + b²), deflection 2·arcsin(1/e), closest approach b²/(1 + e)   (M = 1)       */
function newtonExact(b) {
  const e = Math.sqrt(1 + b * b);
  return { deflDeg: 2 * Math.asin(1 / e) * 180 / Math.PI, rmin: b * b / (1 + e), e };
}

/* ---------- APPROX ---------- */
function weakDeg(bRs) { return 2 / bRs * 180 / Math.PI; }                 // 4M/b = 2Rs/b
function seriesDeg(b) {                                                   // Keeton & Petters 2005, 4th order
  const x = 1 / b;
  return (4 * x + (15 * Math.PI / 4) * x * x + (128 / 3) * x ** 3 + (3465 * Math.PI / 64) * x ** 4) * 180 / Math.PI;
}

/* ---------- EXACT: launch conditions, potential, time dilation ---------- */
function launchToB(r0Rs, psiDeg) { return r0Rs * Math.sin(psiDeg * Math.PI / 180) / Math.sqrt(1 - 1 / r0Rs); }
function photonV(rRs) { return (1 - 1 / rRs) / (rRs * rRs); }             // peak 4/27 at 1.5 Rs
function dilation(rRs) { return 1 / Math.sqrt(1 - 1 / rRs); }             // static observer dt/dτ
/* EXACT: proper (ruler) radial distance from the horizon to r, in Rs.
   ∫ dr/√(1 − Rs/r) = √(x(x−1)) + ln(√x + √(x−1)),  x = r/Rs.  Near the horizon ≈ 2√(x − 1).
   (The coordinate difference r − Rs is NOT a distance anyone could measure.)            */
function properDistance(xRs) { return Math.sqrt(xRs * (xRs - 1)) + Math.log(Math.sqrt(xRs) + Math.sqrt(xRs - 1)); }
/* EXACT: dt/dτ on a Schwarzschild circular geodesic at r (Rs units). Exists for r > 1.5 Rs,
   stable only for r ≥ 3 Rs; it diverges as r → 1.5 Rs (photon sphere).                    */
function circularOrbitDilation(rRs) { return 1 / Math.sqrt(1 - 1.5 / rRs); }
const SPIN_LIMIT = 0.998; // Thorne (1974): accretion spins a hole up to about a = 0.998

/* ---------- EXACT: Kerr (spin a in units of M, 0 ≤ a < 1), equatorial ----------
   Bardeen, Press & Teukolsky 1972; Bardeen 1973 (shadow).                            */
function kerrHorizon(a) { return 1 + Math.sqrt(1 - a * a); }
function kerrPhotonOrbit(a, prograde) { return 2 * (1 + Math.cos(2 / 3 * Math.acos(prograde ? -a : a))); }
function kerrISCO(a, prograde) {
  const Z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
  const Z2 = Math.sqrt(3 * a * a + Z1 * Z1);
  return 3 + Z2 + (prograde ? -1 : 1) * Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2));
}
/* energy per unit rest mass of a prograde circular equatorial orbit (minimum = ISCO) */
function kerrOrbitEnergy(r, a) { return (Math.pow(r, 1.5) - 2 * Math.sqrt(r) + a) / (Math.pow(r, 0.75) * Math.sqrt(Math.pow(r, 1.5) - 3 * Math.sqrt(r) + 2 * a)); }
/* dt/dτ for a prograde circular equatorial geodesic at radius r */
function kerrOrbitDilation(r, a) {
  return (Math.pow(r, 1.5) + a) / (Math.pow(r, 0.75) * Math.sqrt(Math.pow(r, 1.5) - 3 * Math.sqrt(r) + 2 * a));
}
/* shadow outline seen by a distant observer at inclination i (deg), returns [[x, y], ...] in M */
function kerrShadow(a, incDeg = 90, n = 360) {
  const i = incDeg * Math.PI / 180, out = [];
  if (a < 1e-9) { for (let k = 0; k <= n; k++) { const t = 2 * Math.PI * k / n; out.push([BC_M * Math.cos(t), BC_M * Math.sin(t)]); } return out; }
  const r1 = kerrPhotonOrbit(a, true), r2 = kerrPhotonOrbit(a, false);
  const upper = [], lower = [];
  for (let k = 0; k <= n; k++) {
    const r = r1 + (r2 - r1) * (0.5 - 0.5 * Math.cos(Math.PI * k / n));
    const xi = (r * r * (3 - r) - a * a * (r + 1)) / (a * (r - 1));
    const eta = r ** 3 * (4 * a * a - r * (r - 3) ** 2) / (a * a * (r - 1) ** 2);
    const x = -xi / Math.sin(i);
    const y2 = eta + a * a * Math.cos(i) ** 2 - xi * xi / Math.tan(i) ** 2;
    if (y2 < 0) continue;
    upper.push([x, Math.sqrt(y2)]); lower.push([x, -Math.sqrt(y2)]);
  }
  return upper.concat(lower.reverse());
}

/* ---------- classification for display ---------- */
function classify(tr) {
  if (tr.model === 'newton') return tr.status === 'captured'
    ? { cls: 'cap', label: 'Hits R_s', text: 'Dips inside R_s (Newton has no horizon — this only means it would hit a body that size)' }
    : { cls: 'esc', label: 'Escapes', text: 'Newtonian hyperbola — always escapes in this model' };
  if (tr.status === 'captured') return { cls: 'cap', label: 'Captured', text: 'Crosses the event horizon — cannot return' };
  if (tr.status === 'trapped') return { cls: 'crit', label: 'Trapped', text: 'Circling the photon sphere (> 6 turns)' };
  if (tr.turns > 0.75) return { cls: 'crit', label: 'Near-critical', text: `Circles ${tr.turns.toFixed(2)} turns near the photon sphere, then escapes` };
  return { cls: 'esc', label: 'Escapes', text: tr.deflDeg !== null ? `Escapes, bent by ${tr.deflDeg.toFixed(2)}°` : 'Escapes to infinity' };
}

/* ---------- formatting (significant figures, never fake precision) ---------- */
const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function sci(x, sf = 3) {
  if (!isFinite(x)) return '—'; if (x === 0) return '0';
  let e = Math.floor(Math.log10(Math.abs(x))); let mm = x / Math.pow(10, e);
  if (Math.abs(+mm.toFixed(sf - 1)) >= 10) { e += 1; mm /= 10; }
  return mm.toFixed(sf - 1) + ' × 10' + String(e).split('').map(c => SUP[c]).join('');
}
const fx = (x, d = 2) => Number(x).toFixed(d);
function sig(x, sf = 3) { if (!isFinite(x)) return '—'; if (x === 0) return '0'; const d = Math.max(0, sf - 1 - Math.floor(Math.log10(Math.abs(x)))); return Number(x).toFixed(Math.min(12, d)); }
function massStr(Msun) { return sci(Msun, 3) + ' M☉'; }
function distStr(kpc) { return kpc >= 1000 ? sig(kpc / 1000, 3) + ' Mpc' : (kpc >= 1 ? sig(kpc, 3) + ' kpc' : sig(kpc * 1000, 3) + ' pc'); }
function lenStr(m) { if (m >= AU * 0.5) return sig(m / AU, 3) + ' AU'; if (m >= 1e6) return sci(m / 1000, 3) + ' km'; if (m >= 1000) return sig(m / 1000, 3) + ' km'; return sig(m, 3) + ' m'; }
function durStr(h) { if (h < 1 / 60) return sig(h * 3600, 3) + ' s'; if (h < 1) return sig(h * 60, 3) + ' min'; if (h < 48) return sig(h, 3) + ' h'; if (h < 24 * 730) return sig(h / 24, 3) + ' days'; return sig(h / 8766, 3) + ' years'; }

const EHP_API = { G, C, MSUN, KPC, UAS, AU, BC_M, BC_RS, derived, trace, deflectionDeg, closestApproach, carlsonRF, darwinDeg,
    newtonExact, weakDeg, seriesDeg, launchToB, photonV, dilation, properDistance, circularOrbitDilation, SPIN_LIMIT, kerrOrbitEnergy, kerrHorizon, kerrPhotonOrbit, kerrISCO, kerrOrbitDilation,
    kerrShadow, classify, sci, fx, sig, massStr, distStr, lenStr, durStr };
if (typeof module !== 'undefined' && module.exports) module.exports = EHP_API;
if (typeof window !== 'undefined') window.EHP = EHP_API;
