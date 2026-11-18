# EVENT HORIZON v3 — audit and change log

## Phase 1 · What the audit found in v2

### Scientific
| # | Problem in v2 | What v3 does |
|---|---|---|
| 1 | "22/22 passed" mixed real checks with tautologies (e.g. "mass × 2 → shadow × 2" tests a formula against itself) and used an arbitrary ±25% band for most rows. | 25 checks, each against an **independent** reference with a stated, meaningful tolerance (rounding of the quoted figure, 10⁻⁶ relative, or the measurement's 1σ). |
| 2 | Deflection was only cross-checked against a truncated 4th-order series. | Added Darwin's **exact** elliptic-integral deflection (Carlson R_F) and the closed-form closest approach (largest root of b² = r³/(r − R_s)). RK4 matches both to ~10⁻⁸. |
| 3 | Beams started at 10⁴ M and the final step was linearly interpolated. This gave a 2 × 10⁻⁶ bias (caught by the new Newton test) and step-size dependence at 5 × 10⁻⁶°. | Launch from 10⁶ M with an exact straight-line correction at both ends. Converged to 10⁻¹⁰° across step sizes 0.016 → 0.001 rad. |
| 4 | "The film's hole spins at 0.999 of maximum." | Corrected. The published images were rendered at 0.6; the time dilation needs near-maximal spin. Our exact Kerr calculation gives 1 − 1.3 × 10⁻¹⁴ for ×61,000 at the prograde ISCO. |
| 5 | "EHT's own models disfavour a non-spinning hole." | Removed. The 2017 EHT data could not estimate Sgr A*'s spin. |
| 6 | Shadow compared only with the emission ring, as if the two were the same. | Compared with EHT's inferred **shadow** (48.7 ± 7.0 μas) and the **ring** (51.8 ± 2.3 μas) separately, with the difference explained. |
| 7 | M87* presented as an independent test. | Labelled a consistency check: EHT derived M87*'s mass from the ring itself. |
| 8 | "Consistent with a single point mass to ±0.25%" (not supported by our sources). | Removed. |
| 9 | Fabricated precision (e.g. 53.27 μas from 3-s.f. inputs). | Values shown to justified significant figures; extra digits only where comparing methods. |
| 10 | No Newtonian comparison. | Added an exact Newtonian corpuscle model (hyperbola) plus RK4, for the Gravity Lab. |

### Technical and UX
| Problem | Fix |
|---|---|
| Up to three WebGL contexts ran at once (hero, Observatory ray-tracer, Three.js); `preserveDrawingBuffer: true` | 3D view now loads only on request (dynamic import); `preserveDrawingBuffer` off; ray-march steps 340 → 300; adaptive resolution; hero pauses when off-screen or the tab is hidden |
| No loading or error states; number input not validated | Loader, global error toast, 3D load failure message, WebGL fallback image, input validation with message |
| Nine long sections; equations repeated in three places; telemetry and what-if duplicated the simulator | 7-part flow; equations in expandable "Scientific explanation" panels |
| Uppercase CSS turned b, α and μ into look-alike capitals (B, A, M) | Symbols exempted from case transforms |
| `prefers-reduced-motion` only partly respected | All animation off; hero renders one static frame |

## Phases 2–6 · What changed

**Preserved:**
- RK4 photon engine (same equation and step size; only the launch radius and end correction changed)
- GPU ray-traced hero
- Three.js Observatory (now the simulator's "3D" view)
- Benchmark beams A/B/C
- Gravitational time-dilation calculation (now inside Mission 3)
- All literature references
- Node server and deploy configs

**New:**
- Simulator with exact/RK4/approx-labelled readouts, an effective-potential panel, pin-to-compare and reset
- Three guided missions (bend the light, photon sphere, Interstellar/Kerr)
- Gravity Lab (Newton vs Einstein, fixed physical beam, mass/distance presets)
- Live validation lab shared with `npm test`
- 90-second judge demo

**Removed:**
- Separate telemetry dashboard (its values now live in the simulator and Gravity Lab)
- Ideation/timeline section
- Ray-fan toggle
- The launch-angle (r₀, ψ) control in the UI (`launchToB` remains in physics.js and is tested)

## Phase 7 · Verification
- `npm test`: 25/25 (same checks as the browser)
- Every control was exercised in headless Chrome:
  - the b slider and number input, including invalid values
  - presets, pin, clear, reset and zoom
  - 2D/3D switch
  - all three missions to completion
  - Gravity Lab presets, model switch and sliders
  - Run validation and Copy
  - demo: full run, pause, next, previous and Esc
- Layouts checked at 1440 × 900, 820 × 1180 and 390 × 844, with no horizontal overflow

## v3.1 · Corrections after self-review
| # | Mistake | Fix | Guarded by |
|---|---|---|---|
| 1 | "Hover 3 m above the horizon" used the coordinate gap r − R_s, which is not a measurable distance | Ruler (proper) distance from the exact integral: **≈ 414 km** for Sgr A* | T3, T4 |
| 2 | "A non-spinning hole can't do it with any orbit" | Now "no **stable** orbit". Unstable circular orbits (1.5–3 R_s) can give any factor; text explains why they don't count | T5 |
| 3 | Mission 3 never mentioned that real black holes are expected to spin no faster than a ≈ 0.998 (Thorne 1974) | Stated in the mission, the conclusion, the limitations and the demo. At 0.998 the best stable orbit gives ×10.8 (1 h ≈ 11 h) | K4 |
| 4 | "Photographed in 2022" | "Observed in 2017, published in 2022" | — |
| 5 | Kerr radii shown without saying they are coordinates (orbit and horizon both read 1.000) | Caveat on the canvas and in the caption | — |
| 6 | Shadow comparison mixed our GRAVITY inputs with EHT's different priors | Note added, plus a new check using EHT's own M and D (50.3 μas, within 1σ) | O4 |
| 7 | Beams aimed beyond about 12.5 R_s started off-screen (2D) and failed to build (3D) | Zoom fits any b up to 1000 R_s; path kept far enough; 3D guards | browser test |
| 8 | Mission 1 could not be failed | Slider now reaches 1.5 R_s, and capture is shown as "lost" | browser test |
| 9 | 3D showed unlensed beam lines over a lensed background by default | Lensed sky now off by default, with a clear note when turned on | — |
| 10 | "e^2π ≈ 535× closer per extra orbit" was untested | New RK4 check: Δturns = 0.9998 | N5 |
| 11 | Hero could stutter on weak laptops | Low-power toggle (remembered), plus automatic switch if under 12 fps at minimum resolution | — |
| 12 | README had no screenshots | Six screenshots in `docs/screenshots/`; `[TeamName]` reminder | — |
| + | Mission 2 showed "2.00 turns" for 1.998 | Turns shown to 3 decimals | — |
