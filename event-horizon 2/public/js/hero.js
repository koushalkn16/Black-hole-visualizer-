/* Hero: ray-traced Sagittarius A* (ARTISTIC visual layer — bends light correctly to first order,
   disc emission is not radiative transfer). Optimised: adaptive resolution, paused off-screen,
   single static frame when the user prefers reduced motion. */
(function hero() {
  const cv = document.getElementById('bh'), dust = document.getElementById('dust');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroEl = document.querySelector('.hero');
  const $ = id => document.getElementById(id);
  let rt = null;
  try { rt = createRaytracer(cv, Math.min(0.5, 900 / innerWidth)); } catch (e) { rt = null; }
  if (!rt) { $('fallback').hidden = false; cv.style.display = 'none'; $('h-fps').textContent = 'WebGL unavailable · static image'; }
  else addEventListener('resize', () => rt.resize());

  // drifting dust: cheap 2D particles that slowly orbit the centre (purely decorative)
  const dx = dust.getContext('2d'); let parts = [];
  function sizeDust() { const d = Math.min(1.5, devicePixelRatio || 1); dust.width = dust.clientWidth * d; dust.height = dust.clientHeight * d;
    parts = Array.from({ length: 110 }, () => ({ r: 0.18 + Math.random() * 0.75, a: Math.random() * 6.283, s: (0.02 + Math.random() * 0.05) * (Math.random() < .5 ? 1 : -1) * .3, z: Math.random() })); }
  sizeDust(); addEventListener('resize', sizeDust);

  const hover = [0, 0], tgt = [0, 0], mo = [0, 0]; let drag = null;
  heroEl.addEventListener('pointermove', e => {
    hover[0] = e.clientX / innerWidth - .5; hover[1] = e.clientY / innerHeight - .5;
    heroEl.style.setProperty('--mx', hover[0]); heroEl.style.setProperty('--my', hover[1]);
    if (drag) { tgt[0] = drag[2] + (e.clientX - drag[0]) / innerWidth; tgt[1] = Math.max(-.9, Math.min(.9, drag[3] + (e.clientY - drag[1]) / innerHeight)); }
  });
  cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, tgt[0], tgt[1]]; cv.setPointerCapture(e.pointerId); });
  addEventListener('pointerup', () => drag = null);
  let visible = true; new IntersectionObserver(es => visible = es[0].isIntersecting).observe(heroEl);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) last = performance.now(); });
  const t0 = performance.now(); let last = t0, drawnStatic = false, frameNo = 0, slowSince = null;
  // low-power mode: render the black hole every 4th frame (manual toggle, or automatic on very slow GPUs)
  let low = false; try { low = localStorage.getItem('eh-lowpower') === '1'; } catch (e) {}
  const lpBtn = $('lowpow');
  function setLow(v, auto) { low = v; lpBtn.setAttribute('aria-pressed', v); lpBtn.textContent = 'Low-power: ' + (v ? 'on' : 'off') + (auto ? ' (auto)' : ''); try { localStorage.setItem('eh-lowpower', v ? '1' : '0'); } catch (e) {} }
  setLow(low); lpBtn.addEventListener('click', () => setLow(!low));

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = now - last; last = now;
    const T = reduced ? 8 : (now - t0) / 1000;
    frameNo++;
    if (rt && !low && rt.fps && rt.fps < 12 && rt.scale <= .23) { slowSince = slowSince || now; if (now - slowSince > 3000) setLow(true, true); } else slowSince = null;
    if (rt && !(reduced && drawnStatic) && !(low && frameNo % 4)) {
      if (!low) rt.adapt(dt, .22, .65);
      mo[0] += (tgt[0] + hover[0] * .12 - mo[0]) * .05; mo[1] += (tgt[1] + hover[1] * .08 - mo[1]) * .05;
      const intro = Math.min(1, T / 6), ease = 1 - Math.pow(1 - intro, 3);
      const cam = orbitCam(25 - 9 * ease, T * .03 + mo[0] * 3 - .6 * (1 - ease), Math.max(-1.3, Math.min(1.3, .09 + mo[1] * 1.2)), -.06);
      rt.render({ ...cam, focal: 1.55, esc: 45, t: T, bright: .25 + .75 * Math.min(1, T / 1.5) });
      drawnStatic = true;
      if (rt.fps) $('h-fps').textContent = `${rt.fps.toFixed(0)} fps · render scale ${(rt.scale * 100).toFixed(0)}%`;
    }
    if (!reduced) {
      const W = dust.width, H = dust.height, cx = W / 2, cy = H * .48, R = Math.min(W, H) * .6;
      dx.clearRect(0, 0, W, H);
      for (const p of parts) { p.a += p.s * dt / 1000 / p.r; const x = cx + Math.cos(p.a) * p.r * R + hover[0] * 30 * p.z, y = cy + Math.sin(p.a) * p.r * R * .32 + hover[1] * 20 * p.z;
        dx.fillStyle = `rgba(255,${190 + 50 * p.z | 0},${150 + 90 * p.z | 0},${.12 + .35 * p.z})`; dx.fillRect(x, y, 1 + p.z * 1.2, 1 + p.z * 1.2); }
    }
  }
  requestAnimationFrame(frame);
})();
