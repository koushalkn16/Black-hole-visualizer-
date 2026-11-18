# EVENT HORIZON — validation report

Generated 2026-11-14T15:43:33.674Z with Node v22.23.4. 31/31 checks passed in 31.3 ms.

Every value below was computed during this run by `public/js/tests.js` — the same file the website executes in the browser.

## Exact analytic

| ID | Check | Expected / reference | Computed | Tolerance | Result |
|---|---|---|---|---|---|
| S1 | Schwarzschild radius, Sgr A* | 1.27 × 10¹⁰ m (brief, 3 s.f.) | 1.270 × 10¹⁰ m | ±0.005 × 10¹⁰ (rounding) | PASS |
| S2 | Photon sphere 3GM/c² | 1.9 × 10¹⁰ m (brief, 2 s.f.) | 1.90 × 10¹⁰ m | ±0.05 × 10¹⁰ (rounding) | PASS |
| S3 | Critical impact b_c = 3√3 GM/c² | 3.3 × 10¹⁰ m (brief, 2 s.f.) | 3.30 × 10¹⁰ m | ±0.05 × 10¹⁰ (rounding) | PASS |
| S4 | ISCO 6GM/c² | 3.8 × 10¹⁰ m (brief, 2 s.f.) | 3.81 × 10¹⁰ m | ±0.05 × 10¹⁰ (rounding) | PASS |
| N4 | Weak field: GR bends twice Newton (b = 1000 Rs) | ratio 2.00 | 2.0030 | ±0.01 | PASS |
| K1 | Kerr at a = 0 → Schwarzschild | r+ = 2, r_ph = 3, ISCO = 6 (M) | 2.00000, 3.00000, 6.00000 | 10⁻¹² | PASS |
| K2 | Kerr at a → 1 limits | r_ph 1 / 4, ISCO 1 / 9 (M) | 1.000 / 4.000 / 1.000 / 9.000 | 10⁻³ | PASS |
| K3 | Kerr shadow radius as a → 0 | 3√3 = 5.19615 M | 5.19615 M | relative 10⁻⁴ | PASS |
| T1 | Static time dilation at 1.5 Rs | √3 = 1.7320508 | 1.7320508 | 10⁻¹² | PASS |
| T2 | Orbital time dilation at ISCO, a = 0 | √2 = 1.4142136 | 1.4142136 | 10⁻¹² | PASS |
| T3 | Ruler distance from horizon to r = 2 Rs | 2.295587149 Rs (numerical integral) | 2.295587149 Rs (closed form) | relative 10⁻⁹ | PASS |
| T4 | “1 h = 7 yr” hover point for Sgr A*: ruler distance | ≈ 2Rs/61,362 = 414 km | 414 km (coordinate gap only 3.4 m) | relative 10⁻⁶ | PASS — Corrects v2/v3, which quoted the 3 m coordinate gap |
| T5 | Unstable circular orbit at 2 Rs: time dilation | 2 exactly (stable orbits max out at √2) | 2.0000000 | 10⁻¹² | PASS — Diverges toward the photon sphere |
| K4 | Kerr ISCO at the a = 0.998 spin limit | 1.23697 M (energy minimum) | 1.23697 M (closed form) · dilation ×10.79 | relative 10⁻⁵ | PASS — At the realistic spin limit 1 h on the planet ≈ 11 h on Earth |

## Numerical (RK4) vs exact

| ID | Check | Expected / reference | Computed | Tolerance | Result |
|---|---|---|---|---|---|
| B1 | Beam A (b = 2.0 Rs) fate | captured (exact: b < b_c) | captured | must match | PASS |
| B2 | Beam B closest approach | 1.534328 Rs (exact cubic root) | 1.534328 Rs | relative 1 × 10⁻⁵ | PASS |
| B3 | Beam B fate (b = 2.6 Rs, 0.07% above b_c) | escapes after ≥ 1 turn | escaped, 1.58 turns | must match | PASS |
| B4 | Beam C deflection (b = 10 Rs) | 13.529596° (Darwin, elliptic integrals) | 13.529596° | relative 1 × 10⁻⁶ | PASS |
| B5 | Beam C vs brief | 13°–14° | 13.53° | inside range | PASS |
| B6 | Capture boundary at b_c ± 0.01% | captured / escapes | captured / escaped | must match | PASS |
| N1 | Step-size convergence (h = 0.008 vs 0.001) | |Δα| < 10⁻⁶° | 5.3 × 10⁻⁹° | 10⁻⁶° | PASS |
| N2 | First integral conserved (beams A, B, C) | max residual < 10⁻⁹ | 3.7 × 10⁻¹³ | 10⁻⁹ | PASS |
| N3 | Newtonian model vs exact hyperbola (b = 10 Rs) | 5.724810° | 5.724811° | relative 1 × 10⁻⁶ | PASS |
| N5 | Aim e^2π ≈ 535× closer to b_c → one extra turn | Δturns = 1 | 0.9998 | ±0.01 | PASS — Supports the Mission 2 statement |

## Approximate formula vs exact

| ID | Check | Expected / reference | Computed | Tolerance | Result |
|---|---|---|---|---|---|
| A1 | Weak-field 2Rs/b at b = 1000 Rs | 0.114761° exact | 0.114592° | relative 0.2% | PASS |
| A2 | Weak-field 2Rs/b at b = 10 Rs | 13.53° exact | 11.46° (-15.3%) | expected to under-predict by 10–20% | PASS — Shows why the brief needs the exact equation near the hole |
| A3 | 4th-order series at b = 10 Rs | 13.5296° exact | 13.5131° | relative 0.2% | PASS |

## Model vs observation

| ID | Check | Expected / reference | Computed | Tolerance | Result |
|---|---|---|---|---|---|
| O1 | Sgr A* shadow vs EHT inferred shadow | 48.7 ± 7.0 μas | 53.3 μas | within 1σ | PASS — Our inputs: GRAVITY mass 4.30 × 10⁶ M☉ and 8.28 kpc — not the priors EHT used (see O4) |
| O2 | Sgr A* shadow vs EHT emission ring | 51.8 ± 2.3 μas | 53.3 μas | within 1σ | PASS |
| O4 | Sgr A* shadow using EHT's own mass/distance priors | 48.7 ± 7.0 μas | 50.3 μas | within 1σ | PASS — EHT inferred the shadow assuming M = 4.0 × 10⁶ M☉, D = 8.15 kpc |
| O3 | M87* shadow vs EHT ring | 42 ± 3 μas | 39.7 μas | within 1σ | PASS |

