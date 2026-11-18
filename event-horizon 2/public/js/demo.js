/* EVENT HORIZON — 90-second judge demonstration.
   Drives the real controls through window.EH; every number on screen is computed live. */
(function () {
  const $ = id => document.getElementById(id);
  const P = window.EHP, EH = () => window.EH;
  const lerp = (a, b, t) => a + (b - a) * t, ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const go = (sel, block = 'start') => { const el = sel.startsWith('#') || sel.startsWith('.') ? document.querySelector(sel) : $(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block }); };
  let spot = null; const spotlight = sel => { if (spot) spot.classList.remove('spot'); spot = sel ? document.querySelector(sel) : null; if (spot) spot.classList.add('spot'); };

  const STEPS = [
    { dur: 6000, title: 'The problem', cap: 'A black hole is invisible. We only ever see what it does to light. EVENT HORIZON lets you predict exactly what happens to a beam that passes one.',
      enter() { go('top'); spotlight(null); } },
    { dur: 8000, title: 'Three fates', cap: 'Light near a black hole can bend, orbit, or vanish. These three paths are solved from Einstein\'s equations in your browser — nothing is pre-animated.',
      enter() { go('#intro-cv', 'center'); spotlight('#intro-cv'); } },
    { dur: 14000, title: 'Gravitational lensing', cap: 'Aim closer and the beam bends harder. Watch the bending angle climb — and the textbook weak-field formula fall further behind.',
      enter() { go('.simgrid'); spotlight('.simgrid'); EH().setView('2d'); EH().clearPins(); EH().setB(12); EH().pin(); },
      tick(t) { EH().setB(+lerp(12, 4, ease(Math.min(1, t * 1.15))).toFixed(4)); } },
    { dur: 12000, title: 'The photon sphere', cap: 'Approaching the critical distance b_c = 2.598 Rs, light starts circling the black hole before it escapes. That orbit is the photon sphere.',
      enter() { EH().pin(); EH().setZoom(0); }, tick(t) { EH().setB(+lerp(4, 2.6, ease(Math.min(1, t * 1.2))).toFixed(4)); }, exit() { EH().setB(2.6); EH().pin(); } },
    { dur: 8000, title: 'Capture vs escape', cap: 'Cross the line and the beam is gone. The difference between escape and capture is a hair: 2.60 Rs escapes, 2.59 Rs falls in.',
      enter() { EH().setB(2.59); }, tick(t) { if (t > .55) EH().setB(2.0); } },
    { dur: 10000, title: 'Recreate Interstellar', cap: 'Gargantua spins; our simulator\'s black hole doesn\'t. Exact Kerr formulas show one hour lasts seven years only at a spin within ~10⁻¹⁴ of maximum — beyond the ≈ 0.998 that real black holes are expected to reach.',
      enter() { go('.mtabs'); EH().showMission(3); spotlight('#m3'); EH().setM3(0); }, tick(t) { EH().setM3(+lerp(0, 13.9, ease(Math.min(1, t * 1.15))).toFixed(2)); } },
    { dur: 12000, title: 'Gravity Lab', cap: 'Same beam, heavier black hole. Newton\'s light still escapes; Einstein\'s is captured. Far away, Einstein bends light exactly twice as much as Newton.',
      enter() { go('.labgrid'); spotlight('.labgrid'); EH().labPreset('sgr'); }, tick(t) { EH().setLab(+lerp(0, .3, ease(Math.min(1, t * 1.25))).toFixed(3)); } },
    { dur: 10000, title: 'The science check', cap: '…',
      enter(step) { go('.vbar'); spotlight('#v-table'); const r = EH().runValidation(true); step.capNow = `${r.passed} of ${r.total} checks just ran in ${P.fx(r.ms, 0)} ms. The integrator matches Darwin's exact formula to 1 part in 10⁸; our 53 μas shadow sits inside EHT's measured 48.7 ± 7.0 μas.`; } },
    { dur: 8000, title: 'Key discovery', cap: 'Every ray aimed inside 2.6 Schwarzschild radii is lost forever. That one number draws the 53-microarcsecond shadow the Event Horizon Telescope observed in 2017 and published in 2022.',
      enter() { go('.simgrid'); spotlight('.simgrid'); EH().setB(2.6); } },
  ];
  const TOTAL = STEPS.reduce((a, s) => a + s.dur, 0);
  let i = -1, el = 0, running = false, paused = false, last = 0, raf = null;

  function show(n) {
    if (i >= 0 && STEPS[i].exit) STEPS[i].exit();
    i = n; el = 0; const s = STEPS[i]; s.capNow = null;
    try { s.enter && s.enter(s); } catch (e) { console.error(e); }
    $('demo-step').textContent = `${String(i + 1).padStart(2, '0')} / ${STEPS.length} · ${s.title}`;
    $('demo-cap').textContent = s.capNow || s.cap;
  }
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = now - last; last = now; if (paused) return;
    el += dt; const s = STEPS[i];
    if (s.tick) { try { s.tick(Math.min(1, el / s.dur)); } catch (e) { console.error(e); } }
    const done = STEPS.slice(0, i).reduce((a, x) => a + x.dur, 0) + Math.min(el, s.dur);
    $('demo-prog').style.width = (done / TOTAL * 100) + '%';
    if (el >= s.dur) { if (i < STEPS.length - 1) show(i + 1); else finish(); }
  }
  function open() {
    if (running) return; running = true; paused = false; document.body.classList.add('demo-on');
    $('demo').hidden = false; $('demo-pause').textContent = 'Pause'; show(0); last = performance.now(); raf = requestAnimationFrame(frame);
    $('demo-exit').focus();
  }
  function close() { running = false; cancelAnimationFrame(raf); if (i >= 0 && STEPS[i].exit) STEPS[i].exit(); i = -1; $('demo').hidden = true; document.body.classList.remove('demo-on'); spotlight(null); }
  function finish() { $('demo-cap').textContent = 'End of demonstration. Everything you saw is live — explore it yourself.'; $('demo-step').textContent = 'Done'; running = false; setTimeout(() => { if (!running) close(); }, 4000); }
  $('demo-open').addEventListener('click', open);
  $('demo-open-2').addEventListener('click', e => { e.preventDefault(); open(); });
  $('demo-exit').addEventListener('click', close);
  $('demo-pause').addEventListener('click', () => { paused = !paused; $('demo-pause').textContent = paused ? 'Resume' : 'Pause'; });
  $('demo-next').addEventListener('click', () => { if (i < STEPS.length - 1) show(i + 1); });
  $('demo-prev').addEventListener('click', () => { if (i > 0) show(i - 1); });
  addEventListener('keydown', e => {
    if (!running) return;
    if (e.key === 'Escape') close();
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); $('demo-pause').click(); }
    else if (e.key === 'ArrowRight') $('demo-next').click(); else if (e.key === 'ArrowLeft') $('demo-prev').click();
  });
  if (location.hash === '#demo') setTimeout(open, 1200);
  window.EHDemo = { open, close, STEPS };
})();
