/* EVENT HORIZON — validation suite.
   The SAME file runs in the browser (Validation section) and in Node (npm test).
   Every check is executed live; nothing here is a stored result.
   kind:  exact  = closed-form value vs reference value
          rk4    = numerical integrator vs an exact analytic answer
          approx = approximate formula vs exact answer (documents its error)
          obs    = model prediction vs an astronomical measurement                 */
(function (root) {
  const P = (typeof module !== 'undefined' && module.exports) ? require('./physics.js') : root.EHP;

  function runSuite() {
    const out = [];
    const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
    function add(id, kind, name, expected, computed, tolText, pass, note) { out.push({ id, kind, name, expected, computed, tol: tolText, pass: !!pass, note: note || '' }); }
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    const sgr = P.derived(4.3e6, 8.28);

    // ---- exact scales vs the brief's quoted values (tolerance = rounding of the quoted figure)
    add('S1', 'exact', 'Schwarzschild radius, Sgr A*', '1.27 × 10¹⁰ m (brief, 3 s.f.)', P.sci(sgr.Rs, 4) + ' m', '±0.005 × 10¹⁰ (rounding)', Math.abs(sgr.Rs - 1.27e10) <= 0.005e10);
    add('S2', 'exact', 'Photon sphere 3GM/c²', '1.9 × 10¹⁰ m (brief, 2 s.f.)', P.sci(sgr.rph, 3) + ' m', '±0.05 × 10¹⁰ (rounding)', Math.abs(sgr.rph - 1.9e10) <= 0.05e10);
    add('S3', 'exact', 'Critical impact b_c = 3√3 GM/c²', '3.3 × 10¹⁰ m (brief, 2 s.f.)', P.sci(sgr.bc, 3) + ' m', '±0.05 × 10¹⁰ (rounding)', Math.abs(sgr.bc - 3.3e10) <= 0.05e10);
    add('S4', 'exact', 'ISCO 6GM/c²', '3.8 × 10¹⁰ m (brief, 2 s.f.)', P.sci(sgr.isco, 3) + ' m', '±0.05 × 10¹⁰ (rounding)', Math.abs(sgr.isco - 3.8e10) <= 0.05e10);

    // ---- RK4 vs exact analytic answers
    const A = P.trace(4), B = P.trace(5.2), Cc = P.trace(20);
    add('B1', 'rk4', 'Beam A (b = 2.0 Rs) fate', 'captured (exact: b < b_c)', A.status, 'must match', A.status === 'captured');
    const rB = P.closestApproach(5.2);
    add('B2', 'rk4', 'Beam B closest approach', P.sig(rB / 2, 7) + ' Rs (exact cubic root)', P.sig(B.rmin / 2, 7) + ' Rs', 'relative 1 × 10⁻⁵', rel(B.rmin, rB) < 1e-5);
    add('B3', 'rk4', 'Beam B fate (b = 2.6 Rs, 0.07% above b_c)', 'escapes after ≥ 1 turn', `${B.status}, ${B.turns.toFixed(2)} turns`, 'must match', B.status === 'escaped' && B.turns >= 1);
    const dC = P.darwinDeg(20);
    add('B4', 'rk4', 'Beam C deflection (b = 10 Rs)', P.sig(dC, 8) + '° (Darwin, elliptic integrals)', P.sig(Cc.deflDeg, 8) + '°', 'relative 1 × 10⁻⁶', rel(Cc.deflDeg, dC) < 1e-6);
    add('B5', 'rk4', 'Beam C vs brief', '13°–14°', P.fx(Cc.deflDeg, 2) + '°', 'inside range', Cc.deflDeg > 13 && Cc.deflDeg < 14);
    const lo = P.trace(P.BC_M * (1 - 1e-4)), hi = P.trace(P.BC_M * (1 + 1e-4));
    add('B6', 'rk4', 'Capture boundary at b_c ± 0.01%', 'captured / escapes', `${lo.status} / ${hi.status}`, 'must match', lo.status === 'captured' && hi.status !== 'captured');
    const d8 = P.deflectionDeg(20, 0.008), d1 = P.deflectionDeg(20, 0.001);
    add('N1', 'rk4', 'Step-size convergence (h = 0.008 vs 0.001)', '|Δα| < 10⁻⁶°', P.sci(Math.abs(d8 - d1), 2) + '°', '10⁻⁶°', Math.abs(d8 - d1) < 1e-6);
    const res = Math.max(A.maxRes, B.maxRes, Cc.maxRes);
    add('N2', 'rk4', 'First integral conserved (beams A, B, C)', 'max residual < 10⁻⁹', P.sci(res, 2), '10⁻⁹', res < 1e-9);
    const nT = P.trace(20, { model: 'newton' }), nE = P.newtonExact(20);
    add('N3', 'rk4', 'Newtonian model vs exact hyperbola (b = 10 Rs)', P.sig(nE.deflDeg, 7) + '°', P.sig(nT.deflDeg, 7) + '°', 'relative 1 × 10⁻⁶', rel(nT.deflDeg, nE.deflDeg) < 1e-6);
    const wG = P.darwinDeg(2000), wN = P.newtonExact(2000).deflDeg;
    add('N4', 'exact', 'Weak field: GR bends twice Newton (b = 1000 Rs)', 'ratio 2.00', P.fx(wG / wN, 4), '±0.01', Math.abs(wG / wN - 2) < 0.01);

    // ---- approximate formulas vs exact (documents where they are and aren't good)
    add('A1', 'approx', 'Weak-field 2Rs/b at b = 1000 Rs', P.sig(wG, 6) + '° exact', P.sig(P.weakDeg(1000), 6) + '°', 'relative 0.2%', rel(P.weakDeg(1000), wG) < 0.002);
    add('A2', 'approx', 'Weak-field 2Rs/b at b = 10 Rs', P.fx(dC, 2) + '° exact', P.fx(P.weakDeg(10), 2) + '° (' + P.fx((P.weakDeg(10) / dC - 1) * 100, 1) + '%)', 'expected to under-predict by 10–20%', P.weakDeg(10) < dC && rel(P.weakDeg(10), dC) > 0.1 && rel(P.weakDeg(10), dC) < 0.2, 'Shows why the brief needs the exact equation near the hole');
    add('A3', 'approx', '4th-order series at b = 10 Rs', P.fx(dC, 4) + '° exact', P.fx(P.seriesDeg(20), 4) + '°', 'relative 0.2%', rel(P.seriesDeg(20), dC) < 0.002);

    // ---- observations (1σ = quoted 68% interval)
    add('O1', 'obs', 'Sgr A* shadow vs EHT inferred shadow', '48.7 ± 7.0 μas', P.fx(sgr.shadow, 1) + ' μas', 'within 1σ', Math.abs(sgr.shadow - 48.7) <= 7.0, 'Our inputs: GRAVITY mass 4.30 × 10⁶ M☉ and 8.28 kpc — not the priors EHT used (see O4)');
    add('O2', 'obs', 'Sgr A* shadow vs EHT emission ring', '51.8 ± 2.3 μas', P.fx(sgr.shadow, 1) + ' μas', 'within 1σ', Math.abs(sgr.shadow - 51.8) <= 2.3, '');
    const m87 = P.derived(6.5e9, 16800);
    const ehtPrior = P.derived(4.0e6, 8.15);
    add('O4', 'obs', 'Sgr A* shadow using EHT\'s own mass/distance priors', '48.7 ± 7.0 μas', P.fx(ehtPrior.shadow, 1) + ' μas', 'within 1σ', Math.abs(ehtPrior.shadow - 48.7) <= 7.0, 'EHT inferred the shadow assuming M = 4.0 × 10⁶ M☉, D = 8.15 kpc');
    add('O3', 'obs', 'M87* shadow vs EHT ring', '42 ± 3 μas', P.fx(m87.shadow, 1) + ' μas', 'within 1σ', Math.abs(m87.shadow - 42) <= 3, '');

    // ---- exact limits (Kerr reduces to Schwarzschild; known closed-form values)
    const k0 = [P.kerrHorizon(0), P.kerrPhotonOrbit(0, true), P.kerrISCO(0, true)];
    add('K1', 'exact', 'Kerr at a = 0 → Schwarzschild', 'r+ = 2, r_ph = 3, ISCO = 6 (M)', k0.map(v => P.sig(v, 6)).join(', '), '10⁻¹²', Math.abs(k0[0] - 2) + Math.abs(k0[1] - 3) + Math.abs(k0[2] - 6) < 1e-12);
    const a1 = 1 - 1e-12, k1 = [P.kerrPhotonOrbit(a1, true), P.kerrPhotonOrbit(a1, false), P.kerrISCO(a1, true), P.kerrISCO(a1, false)];
    add('K2', 'exact', 'Kerr at a → 1 limits', 'r_ph 1 / 4, ISCO 1 / 9 (M)', k1.map(v => P.sig(v, 4)).join(' / '), '10⁻³', Math.abs(k1[0] - 1) < 1e-3 && Math.abs(k1[1] - 4) < 1e-3 && Math.abs(k1[2] - 1) < 1e-3 && Math.abs(k1[3] - 9) < 1e-3);
    const sh = P.kerrShadow(1e-6, 90, 720); let rr = 0; sh.forEach(p => rr += Math.hypot(p[0], p[1])); rr /= sh.length;
    add('K3', 'exact', 'Kerr shadow radius as a → 0', '3√3 = 5.19615 M', P.sig(rr, 6) + ' M', 'relative 10⁻⁴', rel(rr, P.BC_M) < 1e-4);
    add('T1', 'exact', 'Static time dilation at 1.5 Rs', '√3 = 1.7320508', P.sig(P.dilation(1.5), 8), '10⁻¹²', Math.abs(P.dilation(1.5) - Math.sqrt(3)) < 1e-12);
    add('T2', 'exact', 'Orbital time dilation at ISCO, a = 0', '√2 = 1.4142136', P.sig(P.kerrOrbitDilation(6, 0), 8), '10⁻¹²', Math.abs(P.kerrOrbitDilation(6, 0) - Math.SQRT2) < 1e-12);

    // proper distance: closed form vs independent numerical quadrature (substitution r = Rs(1 + t²) removes the singularity)
    const simpson = (dx) => { const n = 2000, h = Math.sqrt(dx) / n; let s = 0; for (let i = 0; i <= n; i++) { const tt = i * h, f = 2 * Math.sqrt(1 + tt * tt); s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * f; } return s * h / 3; };
    add('T3', 'exact', 'Ruler distance from horizon to r = 2 Rs', P.sig(simpson(1), 10) + ' Rs (numerical integral)', P.sig(P.properDistance(2), 10) + ' Rs (closed form)', 'relative 10⁻⁹', rel(P.properDistance(2), simpson(1)) < 1e-9);
    const F = 7 * 8766, xh = 1 + 1 / (F * F - 1);
    add('T4', 'exact', '“1 h = 7 yr” hover point for Sgr A*: ruler distance', '≈ 2Rs/61,362 = ' + P.fx(2 * sgr.Rs / F / 1000, 0) + ' km', P.fx(P.properDistance(xh) * sgr.Rs / 1000, 0) + ' km (coordinate gap only ' + P.fx((xh - 1) * sgr.Rs, 1) + ' m)', 'relative 10⁻⁶', rel(P.properDistance(xh) * sgr.Rs, 2 * sgr.Rs / F) < 1e-6, 'Corrects v2/v3, which quoted the 3 m coordinate gap');
    add('T5', 'exact', 'Unstable circular orbit at 2 Rs: time dilation', '2 exactly (stable orbits max out at √2)', P.sig(P.circularOrbitDilation(2), 8), '10⁻¹²', Math.abs(P.circularOrbitDilation(2) - 2) < 1e-12 && P.circularOrbitDilation(1.5001) > 100, 'Diverges toward the photon sphere');
    // ISCO from the closed form vs numerically minimising the orbital energy (independent route)
    const aT = P.SPIN_LIMIT; let lo2 = P.kerrPhotonOrbit(aT, true) + 1e-6, hi2 = 9;
    for (let k = 0; k < 200; k++) { const m1 = lo2 + (hi2 - lo2) / 3, m2 = hi2 - (hi2 - lo2) / 3; if (P.kerrOrbitEnergy(m1, aT) < P.kerrOrbitEnergy(m2, aT)) hi2 = m2; else lo2 = m1; }
    const iscoNum = (lo2 + hi2) / 2, iscoCF = P.kerrISCO(aT, true);
    add('K4', 'exact', 'Kerr ISCO at the a = 0.998 spin limit', P.sig(iscoNum, 6) + ' M (energy minimum)', P.sig(iscoCF, 6) + ' M (closed form) · dilation ×' + P.fx(P.kerrOrbitDilation(iscoCF, aT), 2), 'relative 10⁻⁵', rel(iscoCF, iscoNum) < 1e-5, 'At the realistic spin limit 1 h on the planet ≈ 11 h on Earth');
    // e^{2π} rule for near-critical orbits (used in Mission 2)
    const e0 = 1e-4, tA = P.trace(P.BC_M * (1 + e0)).turns, tB = P.trace(P.BC_M * (1 + e0 / Math.exp(2 * Math.PI))).turns;
    add('N5', 'rk4', 'Aim e^2π ≈ 535× closer to b_c → one extra turn', 'Δturns = 1', P.fx(tB - tA, 4), '±0.01', Math.abs(tB - tA - 1) < 0.01, 'Supports the Mission 2 statement');

    const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    return { results: out, ms, passed: out.filter(r => r.pass).length, total: out.length, at: new Date().toISOString() };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { runSuite };
  else root.runSuite = runSuite;
})(typeof window !== 'undefined' ? window : globalThis);
