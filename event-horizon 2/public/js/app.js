/* EVENT HORIZON v3 — application layer.
   Simulator · intro figure · three missions · Gravity Lab · validation.
   Physics comes only from physics.js (window.EHP). Exposes window.EH for the judge demo. */
(function () {
  const P = window.EHP;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const COL = { cap: '#ff6a2b', crit: '#b18cff', esc: '#4fa8ff' };
  function toast(msg, bad) { const t = $('toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
  addEventListener('error', e => toast('Something went wrong: ' + (e.message || 'unknown error'), true));
  addEventListener('unhandledrejection', e => toast('Something went wrong: ' + (e.reason && e.reason.message || e.reason), true));

  /* ---------------- chrome: nav, scroll, reveals ---------------- */
  (function title() { const h = $('title'), txt = h.textContent; h.textContent = ''; h.setAttribute('aria-label', txt);
    [...txt].forEach((ch, i) => { const s = document.createElement('span'); s.setAttribute('aria-hidden', 'true'); s.textContent = ch === ' ' ? ' ' : ch; s.style.animationDelay = (0.35 + i * 0.06) + 's'; h.appendChild(s); }); })();
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight; $('scrollbar').style.width = (scrollY / max * 100) + '%';
    $('nav').classList.toggle('solid', scrollY > innerHeight * .6);
  }, { passive: true });
  const SECS = ['sim', 'missions', 'lab', 'validation'];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('.nav .links a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  SECS.forEach(s => io.observe($(s)));
  const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(el => rv.observe(el));

  const sgr = P.derived(4.3e6, 8.28);
  $('h-rs').textContent = P.sci(sgr.Rs, 3) + ' m'; $('h-sh').innerHTML = P.fx(sgr.shadow, 0) + ' <span class="nocase">μas</span>';

  /* ---------------- intro figure: three computed beams ---------------- */
  const intro = new PathView($('intro-cv'), { halfRs: 5.5, cx: .6, labels: false, speed: 7 });
  const bench = { A: P.trace(4), B: P.trace(5.2), C: P.trace(9) }; // intro uses a 4.5 Rs escaping beam so it fits the frame
  intro.setPaths([
    { pts: bench.C.pts, cls: 'esc', main: true, width: 2 },
    { pts: bench.B.pts, cls: 'crit', main: true, width: 2 },
    { pts: bench.A.pts, cls: 'cap', main: true, width: 2 },
  ]);

  /* ================= SIMULATOR ================= */
  const ZOOMS = [6, 3, 14];
  const sim = {
    b: 5, pins: [], zoom: 0, view: '2d', tr: null,
    pv: new PathView($('sim-cv'), { halfRs: 6, cx: .56 }),
  };
  const bRange = $('b-range'), bNum = $('b-num');
  function regimeText(b, tr, exact) {
    const pct = (b / P.BC_RS - 1) * 100;
    if (tr.status === 'captured') return `Aimed ${P.fx(Math.abs(pct), b > 2.55 ? 3 : 1)}% inside the critical distance. The photon's "energy level" sits above the gravitational barrier at the photon sphere, so nothing stops it: it spirals in and crosses the event horizon after sweeping ${P.fx(tr.sweptDeg, 0)}°. Light aimed here can never be seen again — this is the black hole's shadow.`;
    if (tr.turns > 0.75) return `Just ${P.sig(pct, 2)}% outside the critical distance. The photon arrives almost exactly on top of the barrier, circles the photon sphere ${P.fx(tr.turns, 2)} times at r ≈ ${P.fx(tr.rmin / 2, 3)} Rs, then leaks away. Light like this forms the thin bright ring around the shadow.`;
    const w = P.weakDeg(b), gap = (exact / w - 1) * 100;
    if (b < 6) return `Strong gravity. The beam is bent by ${P.fx(exact, 1)}° — ${P.fx(gap, 0)}% more than the simple weak-field rule (2R<sub>s</sub>/b = ${P.fx(w, 1)}°) predicts. Close in, the extra term in Einstein's equation dominates.`;
    if (b < 30) return `The beam escapes, bent by ${P.fx(exact, 2)}°. The weak-field rule 2R<sub>s</sub>/b gives ${P.fx(w, 2)}° — already ${P.fx(gap, 1)}% too low at this distance.`;
    return `Weak gravity. Bending ≈ 2R<sub>s</sub>/b = ${P.fx(w, 3)}°, within ${P.fx(Math.abs(gap), 2)}% of the exact value. This is the regime of starlight bending around the Sun, measured in 1919.`;
  }
  function setB(v, from) {
    const n = Number(v);
    if (!isFinite(n) || n < 0.01 || n > 1000) { bNum.classList.add('invalid'); $('b-err').textContent = 'Enter a number between 0.01 and 1000 Rs.'; return false; }
    bNum.classList.remove('invalid'); $('b-err').textContent = '';
    sim.b = n;
    if (from !== 'range') bRange.value = clamp(n, 1, 15);
    if (from !== 'num') bNum.value = +n.toFixed(6);
    // auto-zoom out if the beam would start outside the view (never zooms in by itself)
    if (n * 1.12 > ZOOMS[sim.zoom]) { const k = ZOOMS.map((z, i) => [z, i]).sort((p, q) => p[0] - q[0]).find(p => p[0] >= n * 1.12); if (k) setZoom(k[1]); }
    const tr = P.trace(n * 2, { keepR: Math.max(140, n * 2 * 6) }); sim.tr = tr;
    const c = P.classify(tr), exactR = P.closestApproach(n * 2), exactA = P.darwinDeg(n * 2);
    // readouts (each labelled by method)
    const row = (tag, k, v) => `<dt>${tag ? `<span class="tag ${tag}">${tag === 'rk4' ? 'RK4' : tag.toUpperCase()}</span>` : ''}${k}</dt><dd>${v}</dd>`;
    $('readout').innerHTML = [
      row('', 'Fate', `<span style="color:${COL[c.cls]}">${c.label}</span>`),
      row('exact', 'Closest approach', exactR === null ? 'none — falls in' : P.fx(exactR / 2, 4) + ' Rs'),
      row('rk4', 'Closest approach', tr.status === 'captured' ? 'reaches Rs' : P.fx(tr.rmin / 2, 4) + ' Rs'),
      row('rk4', 'Deflection', tr.deflDeg === null ? '—' : P.fx(tr.deflDeg, 3) + '°'),
      row('exact', 'Deflection (Darwin)', exactA === null ? '—' : P.fx(exactA, 3) + '°'),
      row('approx', 'Weak-field 2Rs/b', P.fx(P.weakDeg(n), 3) + '°' + (exactA ? ` <span style="color:var(--dim)">(${P.fx((P.weakDeg(n) / exactA - 1) * 100, 1)}%)</span>` : '')),
      row('rk4', 'Turns around the hole', P.fx(tr.turns, 3)),
      row('exact', 'b relative to b<sub>c</sub>', (n >= P.BC_RS ? '+' : '') + P.sig((n / P.BC_RS - 1) * 100, 3) + '%'),
    ].join('');
    $('explain').innerHTML = regimeText(n, tr, exactA);
    $('v-badge').className = 'vbadge ' + c.cls; $('v-badge').textContent = c.label;
    $('v-line').textContent = c.cls === 'esc' ? `bent by ${P.fx(tr.deflDeg, 2)}°` : c.cls === 'crit' ? `${P.fx(tr.turns, 2)} turns on the photon sphere` : 'crosses the event horizon';
    drawSim(); drawPotential($('pot-cv'), n, c.cls, sim.pins.slice(-3).map(p => ({ b: p.b, col: 'rgba(200,200,230,.35)', lab: 'pin ' + p.b })));
    window.EH_CUSTOM = { bRs: n, r0Rs: 5e5, tilt: 90 }; dispatchEvent(new CustomEvent('eh:custom', { detail: window.EH_CUSTOM }));
    return true;
  }
  function drawSim() {
    const tr = sim.tr, c = P.classify(tr);
    const half = Math.max(ZOOMS[sim.zoom], sim.b * 1.15); // beyond the largest preset, fit the beam automatically
    sim.pv.set({ halfRs: half }); $('zoom').innerHTML = `Zoom: ${Math.round(half)} R<sub>s</sub>`;
    sim.pv.setPaths([
      ...sim.pins.map(p => ({ pts: p.tr.pts, cls: p.cls, width: 1.2, alpha: .45, glow: false, label: 'b = ' + p.b })),
      { pts: tr.pts, cls: c.cls, main: true, width: 2.4, defl: tr.deflDeg },
    ]);
  }
  let rangeRaf = null;
  bRange.addEventListener('input', () => { cancelAnimationFrame(rangeRaf); rangeRaf = requestAnimationFrame(() => setB(+(+bRange.value).toFixed(4), 'range')); });
  bNum.addEventListener('change', () => setB(bNum.value, 'num'));
  bNum.addEventListener('keydown', e => { if (e.key === 'Enter') setB(bNum.value, 'num'); });
  document.querySelectorAll('[data-b]').forEach(btn => btn.addEventListener('click', () => {
    const v = btn.dataset.b; setB(v === 'bc-' ? +(P.BC_RS - 0.001).toFixed(6) : v === 'bc+' ? +(P.BC_RS + 0.0001).toFixed(6) : +v);
  }));
  function pin() {
    if (sim.pins.some(p => p.b === +sim.b.toFixed(4))) return toast('That trajectory is already pinned');
    if (sim.pins.length >= 6) sim.pins.shift();
    sim.pins.push({ b: +sim.b.toFixed(4), tr: sim.tr, cls: P.classify(sim.tr).cls });
    $('pins').innerHTML = sim.pins.map(p => `<span style="border-color:${COL[p.cls]}66;color:${COL[p.cls]}">b ${p.b} · ${P.classify(p.tr).label}</span>`).join('');
    drawSim(); drawPotential($('pot-cv'), sim.b, P.classify(sim.tr).cls, sim.pins.slice(-3).map(p => ({ b: p.b, col: 'rgba(200,200,230,.35)', lab: 'pin ' + p.b })));
  }
  function clearPins() { sim.pins = []; $('pins').innerHTML = ''; drawSim(); drawPotential($('pot-cv'), sim.b, P.classify(sim.tr).cls); }
  $('pin').addEventListener('click', pin); $('unpin').addEventListener('click', clearPins);
  $('reset').addEventListener('click', () => { clearPins(); setZoom(0); setView('2d'); setB(5); toast('Experiment reset'); });
  function setZoom(i) { sim.zoom = i; if (sim.tr) drawSim(); else $('zoom').innerHTML = `Zoom: ${ZOOMS[i]} R<sub>s</sub>`; }
  $('zoom').addEventListener('click', () => setZoom((sim.zoom + 1) % ZOOMS.length));
  addEventListener('resize', () => sim.tr && drawPotential($('pot-cv'), sim.b, P.classify(sim.tr).cls));

  /* 3D view — loaded only when asked for (keeps first load fast) */
  let obsLoaded = null;
  function setView(v) {
    sim.view = v; const is3 = v === '3d';
    $('obs').hidden = !is3; $('verdict').style.visibility = is3 ? 'hidden' : 'visible';
    $('v2d').classList.toggle('on', !is3); $('v3d').classList.toggle('on', is3);
    $('v2d').setAttribute('aria-selected', !is3); $('v3d').setAttribute('aria-selected', is3); $('zoom').style.display = is3 ? 'none' : '';
    if (is3 && !obsLoaded) {
      $('obs-loading').hidden = false; $('obs-loading').textContent = 'Loading 3D engine…';
      obsLoaded = import(new URL('js/observatory.js', document.baseURI).href)
        .then(() => { $('obs-loading').hidden = true; })
        .catch(err => { obsLoaded = null; $('obs-loading').textContent = '3D view could not load (' + err.message + '). The 2D view is unaffected.'; toast('3D view failed to load', true); });
    }
  }
  $('v2d').addEventListener('click', () => setView('2d')); $('v3d').addEventListener('click', () => setView('3d'));

  /* ================= MISSIONS ================= */
  const missions = { done: {}, cur: 1 };
  function showMission(n) {
    missions.cur = n;
    [1, 2, 3].forEach(i => { $('m' + i).hidden = i !== n; const t = document.querySelector(`.mtab[data-m="${i}"]`); t.classList.toggle('on', i === n); t.setAttribute('aria-selected', i === n); });
    $('m' + n).classList.add('in');
    if (n === 1) m1(); if (n === 2) m2(); if (n === 3) m3();
  }
  function complete(n, silent) {
    if (missions.done[n]) return; missions.done[n] = true;
    document.querySelector(`.mtab[data-m="${n}"]`).classList.add('done');
    const c = $(`m${n}-concl`); c.hidden = false; c.classList.add('reached');
    if (!silent) toast(`Mission 0${n} complete`);
  }
  document.querySelectorAll('.mtab').forEach(t => t.addEventListener('click', () => showMission(+t.dataset.m)));
  document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => showMission(+b.dataset.next)));
  document.querySelectorAll('[data-reveal]').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.reveal; if (n === 2) m2Concl(); if (n === 3) m3Concl(); $(`m${n}-concl`).hidden = false; }));

  // Mission 1 — bend the light
  const m1v = new PathView($('m1-cv'), { halfRs: 12, cx: .6, cy: .72, bc: false, labels: false });
  function m1() {
    const b = +$('m1-b').value, tr = P.trace(b * 2), c = P.classify(tr), a = tr.deflDeg, w = P.weakDeg(b);
    $('m1-bv').textContent = P.fx(b, 2) + ' Rs';
    m1v.set({ halfRs: Math.max(3.2, b * .78) });
    m1v.setPaths([{ pts: P.trace(b * 2, { model: 'newton' }).pts, color: 'rgba(232,217,176,.35)', dash: [5, 6], width: 1.2, glow: false }, { pts: tr.pts, cls: c.cls, main: true, defl: a, width: 2.4 }]);
    $('m1-w').textContent = P.fx(w, 1) + '°';
    if (tr.status === 'captured') {
      $('m1-a').textContent = 'lost'; $('m1-a').classList.remove('goal-hit');
      $('m1-obs').innerHTML = `<b style="color:var(--cap)">Lost it.</b> At b = ${P.fx(b, 2)} R<sub>s</sub> you are inside the critical distance (2.598 R<sub>s</sub>) and the beam fell into the black hole. Back off a little — the biggest bends live just outside that line.`;
      return;
    }
    $('m1-a').textContent = P.fx(a, 1) + '°';
    $('m1-a').classList.toggle('goal-hit', a > 90);
    $('m1-obs').innerHTML = a > 90
      ? `At b = ${P.fx(b, 2)} R<sub>s</sub> the beam turns <b>${P.fx(a, 0)}°</b> — it is heading back roughly the way it came. The weak-field rule predicts only ${P.fx(w, 0)}°.`
      : `At b = ${P.fx(b, 2)} R<sub>s</sub> the beam turns <b>${P.fx(a, 1)}°</b>. The weak-field rule 2R<sub>s</sub>/b predicts ${P.fx(w, 1)}° (${P.fx((a / w - 1) * 100, 0)}% short). The faint dashed line is Newton's prediction. ${b > 6 ? 'Move closer.' : 'Closer still…'}`;
    if (a > 90) complete(1);
  }
  $('m1-b').addEventListener('input', m1);

  // Mission 2 — challenge the photon sphere
  const m2v = new PathView($('m2-cv'), { halfRs: 3.3, cx: .6, labels: true });
  let m2best = null;
  function m2() {
    const b = +(+$('m2-b').value).toFixed(5), tr = P.trace(b * 2), c = P.classify(tr), d = (b - P.BC_RS) / P.BC_RS;
    $('m2-bv').textContent = P.fx(b, 5) + ' Rs';
    m2v.setPaths([{ pts: tr.pts, cls: c.cls, main: true, width: 2.2, defl: tr.deflDeg }]);
    $('m2-t').textContent = tr.status === 'captured' ? P.fx(tr.turns, 3) + ' (fell in)' : P.fx(tr.turns, 3);
    $('m2-f').innerHTML = `<span style="color:${COL[c.cls]}">${c.label}</span>`;
    $('m2-d').textContent = (d >= 0 ? '+' : '−') + (Math.abs(d) < 1e-3 ? P.sig(Math.abs(d) * 1e6, 2) + ' ppm' : P.sig(Math.abs(d) * 100, 2) + '%');
    const ok = tr.status === 'escaped' && tr.turns >= 2;
    $('m2-t').classList.toggle('goal-hit', ok);
    $('m2-obs').innerHTML = tr.status === 'captured' ? `Fell in after ${P.fx(tr.sweptDeg, 0)}°. You are <b>inside</b> the critical distance — move outward a little.`
      : ok ? `<b>${P.fx(tr.turns, 3)} full turns</b> and it still escaped. You are ${P.sig(d * 1e6, 2)} parts per million outside the edge.`
      : tr.turns > 0.75 ? `${P.fx(tr.turns, 3)} turns — close. Notice each extra turn needs you dramatically closer to the edge, not just a little.`
      : `Only ${P.fx(tr.turns, 2)} turns — bent by ${P.fx(tr.deflDeg, 0)}°. Move toward the edge.`;
    if (ok) { m2best = { b, tr, d }; m2Concl(); complete(2); }
  }
  function m2Concl() {
    const b = m2best ? m2best.b : P.BC_RS + 2e-4, d = (b - P.BC_RS) / P.BC_RS;
    $('m2-cc').innerHTML = `You found the edge at b = ${P.fx(b, 5)} R<sub>s</sub>. The exact critical value is b<sub>c</sub> = (3√3/2) R<sub>s</sub> = ${P.fx(P.BC_RS, 5)} R<sub>s</sub> — you were ${P.sig(Math.abs(d) * 1e6, 2)} ppm away. The photon sphere is <b>unstable</b>: each extra orbit needs the aim e<sup>2π</sup> ≈ 535× closer to b<sub>c</sub>. Every beam inside b<sub>c</sub> is lost, so from far away the hole casts a shadow 2b<sub>c</sub> wide — for Sgr A* that is <b>${P.fx(sgr.shadow, 0)} μas</b>, compared with EHT's inferred shadow of 48.7 ± 7.0 μas.`;
  }
  $('m2-b').addEventListener('input', m2);
  document.querySelectorAll('[data-nudge]').forEach(btn => btn.addEventListener('click', () => { const r = $('m2-b'); r.value = clamp(+r.value + +btn.dataset.nudge, +r.min, +r.max).toFixed(5); m2(); }));

  // Mission 3 — recreate Interstellar (Kerr, analytic)
  const m3cv = $('m3-cv'); let m3a = 0, m3vis = false;
  new IntersectionObserver(es => m3vis = es[0].isIntersecting).observe(m3cv);
  const TARGET = 7 * 8766; // 7 years in hours
  function spinOf(s) { return s <= 0 ? 0 : 1 - Math.pow(10, -s); }
  function spinStr(a, s) { return s >= 3 ? '1 − ' + P.sci(Math.pow(10, -s), 2) : P.fx(a, s >= 2 ? 5 : 3); }
  function m3() {
    const s = +$('m3-s').value, a = spinOf(s); m3a = a;
    const r = P.kerrISCO(a, true), x = P.kerrOrbitDilation(r, a);
    $('m3-av').textContent = spinStr(a, s);
    $('m3-r').textContent = P.sig(r, 4) + ' GM/c²'; $('m3-x').textContent = '×' + (x < 1000 ? P.sig(x, 4) : Math.round(x).toLocaleString('en'));
    $('m3-h').textContent = P.durStr(x);
    const ok = x >= TARGET; $('m3-x').classList.toggle('goal-hit', ok); $('m3-h').classList.toggle('goal-hit', ok);
    $('m3-obs').innerHTML = s === 0 ? `With no spin (our simulator's black hole) the closest stable orbit is 6 GM/c², and one hour there lasts just ${P.durStr(x)} on Earth. Slide the spin up.`
      : ok ? `Spin ${spinStr(a, s)}: the planet orbits at ${P.sig(r, 4)} GM/c² and <b>one hour there is ${P.durStr(x)}</b> on Earth. You've reached Miller's planet — but at a spin real black holes are not expected to reach (limit ≈ 0.998).`
      : a > P.SPIN_LIMIT ? `Spin ${spinStr(a, s)} — <b>past the ≈ 0.998 limit</b> that accretion is expected to impose on real black holes (Thorne 1974). One hour here = ${P.durStr(x)} on Earth. Keep going to see what the film needed.`
      : `Spin ${spinStr(a, s)}: the stable orbit moves in to ${P.sig(r, 3)} GM/c²; one hour there = ${P.durStr(x)} on Earth. ${s < 3 ? 'Even a very fast spin is not enough yet — keep going.' : 'Getting there — the spin must be extraordinarily close to the maximum.'}`;
    if (ok) { m3Concl(); complete(3); }
  }
  function m3Concl() {
    let s = 0; for (let k = 0; k < 2000; k++) { s = k * .01; const a = spinOf(s); if (P.kerrOrbitDilation(P.kerrISCO(a, true), a) >= TARGET) break; }
    const xh = 1 + 1 / (TARGET * TARGET - 1), ruler = P.properDistance(xh) * sgr.Rs;
    const lim = P.kerrOrbitDilation(P.kerrISCO(P.SPIN_LIMIT, true), P.SPIN_LIMIT);
    $('m3-cc').innerHTML = `On a <b>stable</b> orbit, one hour lasts seven years only if the spin is within about <b>${P.sci(Math.pow(10, -s), 1)}</b> of the theoretical maximum (exact Kerr formulas). Real black holes are expected to stop near <b>a ≈ 0.998</b>, where the best stable orbit gives ×${P.fx(lim, 1)} — one hour ≈ ${P.durStr(lim)}. So Miller's planet stretches the physics.<br><br>A non-spinning hole's best <b>stable</b> orbit gives ×1.41. Unstable circular orbits between 1.5 and 3 R<sub>s</sub> can give any factor, but the slightest nudge sends the planet away or into the hole. The other Schwarzschild option is to hover with a rocket about <b>${P.fx(ruler / 1000, 0)} km</b> above Sgr A*'s horizon (ruler distance). That's why Gargantua had to spin, and why our Schwarzschild simulator is a <b>different physical model</b> from the film's black hole. The film's published images were rendered at a lower spin, 0.6 of maximum (James et al. 2015).`;
  }
  $('m3-s').addEventListener('input', m3);
  function drawM3(now) {
    requestAnimationFrame(drawM3); if (!m3vis) return;
    const d = Math.min(2, devicePixelRatio || 1), W = m3cv.clientWidth * d, H = m3cv.clientHeight * d;
    if (m3cv.width !== W || m3cv.height !== H) { m3cv.width = W; m3cv.height = H; }
    const x = m3cv.getContext('2d'); x.fillStyle = '#020207'; x.fillRect(0, 0, W, H); x.font = `${10 * d}px "IBM Plex Mono", monospace`;
    const a = m3a;
    // left: shadow outline seen edge-on (Bardeen 1973)
    const L = { cx: W * .27, cy: H * .52, s: Math.min(W * .5, H) / 15 };
    x.fillStyle = 'rgba(154,149,168,.85)'; x.fillText('SHADOW · seen from the disc plane', 12 * d, 18 * d);
    x.setLineDash([4 * d, 4 * d]); x.strokeStyle = 'rgba(79,168,255,.6)'; x.lineWidth = d; x.beginPath(); x.arc(L.cx, L.cy, P.BC_M * L.s, 0, 7); x.stroke(); x.setLineDash([]);
    const sh = P.kerrShadow(Math.max(a, 1e-7), 90, 240);
    x.beginPath(); sh.forEach((p, i) => { const X = L.cx + p[0] * L.s, Y = L.cy - p[1] * L.s; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath();
    x.fillStyle = '#000'; x.fill(); x.strokeStyle = '#ffb35c'; x.lineWidth = 2 * d; x.shadowColor = '#ff6a2b'; x.shadowBlur = 14 * d; x.stroke(); x.shadowBlur = 0;
    x.fillStyle = 'rgba(79,168,255,.85)'; x.fillText('dashed: no spin', 12 * d, H - 26 * d); x.fillStyle = '#ffb35c'; x.fillText('solid: this spin', 12 * d, H - 12 * d);
    // right: equatorial radii, planet on the prograde ISCO
    const R = { cx: W * .76, cy: H * .38, s: Math.min(W * .45, H * .66) / 13.5 };
    x.fillStyle = 'rgba(154,149,168,.85)'; x.fillText('ORBITS · top view, units GM/c²', W * .52, 18 * d);
    const ring = (r, col, dash) => { x.setLineDash(dash ? [3 * d, 4 * d] : []); x.strokeStyle = col; x.lineWidth = d * 1.2; x.beginPath(); x.arc(R.cx, R.cy, r * R.s, 0, 7); x.stroke(); x.setLineDash([]); };
    const ri = P.kerrISCO(a, true), rpp = P.kerrPhotonOrbit(a, true), rpr = P.kerrPhotonOrbit(a, false), rh = P.kerrHorizon(a);
    ring(6, 'rgba(79,168,255,.35)', true); ring(rpr, 'rgba(177,140,255,.45)', true); ring(rpp, 'rgba(177,140,255,.9)', true); ring(ri, '#7ef0b0', false);
    [['#7ef0b0', 'planet orbit (prograde ISCO) ' + P.sig(ri, 4)], ['rgba(177,140,255,.95)', 'photon orbit with / against spin ' + P.fx(rpp, 3) + ' / ' + P.fx(rpr, 3)], ['rgba(79,168,255,.8)', 'ISCO with no spin: 6'], ['#ffb35c', 'horizon ' + P.fx(rh, 4)]]
      .forEach((l, j) => { x.fillStyle = l[0]; x.fillText(l[1], W * .52, H - (12 + 14 * (3 - j)) * d); });
    if (a > P.SPIN_LIMIT) { x.fillStyle = 'rgba(255,138,128,.9)'; x.fillText('beyond the ≈ 0.998 astrophysical spin limit', 12 * d, 32 * d); }
    x.fillStyle = '#000'; x.beginPath(); x.arc(R.cx, R.cy, rh * R.s, 0, 7); x.fill(); x.strokeStyle = '#ffb35c'; x.lineWidth = 1.4 * d; x.stroke();
    const ang = -(now / 1000) * (0.5 + 1.5 / Math.max(1, ri));
    const px = R.cx + Math.cos(ang) * ri * R.s, py = R.cy + Math.sin(ang) * ri * R.s;
    const g = x.createRadialGradient(px, py, 0, px, py, 9 * d); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#7ef0b0'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, 9 * d, 0, 7); x.fill();
  }
  requestAnimationFrame(drawM3);

  /* ================= GRAVITY LAB ================= */
  const PRE = { sgr: { M: 4.3e6, D: 8.28, b: 4 }, m87: { M: 6.5e9, D: 16800, b: 4 }, stellar: { M: 10, D: 2, b: 4 } };
  const lab = { p: 'sgr', model: 'both', pv: new PathView($('lab-cv'), { halfRs: 9, cx: .55, bc: false }) };
  const B_LO = Math.log10(1.2), B_HI = Math.log10(40);
  function labState() {
    const p = PRE[lab.p], M = p.M * Math.pow(10, +$('lab-m').value), D = p.D * Math.pow(10, +$('lab-d').value);
    const Rs0 = P.derived(p.M, p.D).Rs, bPhys = Rs0 * Math.pow(10, B_LO + (+$('lab-b').value) * (B_HI - B_LO));
    const dd = P.derived(M, D); return { M, D, Rs0, bPhys, dd, bRs: bPhys / dd.Rs, k: dd.Rs / Rs0 };
  }
  function labUpdate() {
    const s = labState(), bM = s.bRs * 2;
    const gr = P.trace(bM), nw = P.trace(bM, { model: 'newton' }), gc = P.classify(gr), nc = P.classify(nw);
    const nEx = P.newtonExact(bM), grR = P.closestApproach(bM), grA = P.darwinDeg(bM);
    $('lab-mv').textContent = P.massStr(s.M) + ` · R_s ${P.lenStr(s.dd.Rs)}`;
    $('lab-bv').textContent = P.lenStr(s.bPhys) + ` = ${P.sig(s.bRs, 3)} R_s`;
    $('lab-dv').textContent = P.distStr(s.D);
    const paths = [];
    if (lab.model !== 'gr') paths.push({ pts: nw.pts, color: '#e8d9b0', dash: [7, 6], width: 1.8, glow: false, k: s.k });
    if (lab.model !== 'newton') paths.push({ pts: gr.pts, cls: gc.cls, main: true, width: 2.4, defl: gr.deflDeg, k: s.k });
    else paths.push({ pts: nw.pts, color: '#e8d9b0', main: true, width: 2.2, defl: nw.deflDeg, k: s.k, cls: 'esc' });
    lab.pv.set({ k: s.k, unit: i => P.lenStr(Math.abs(i) * s.Rs0) , horizonLabel: 'Rs = 2GM/c²', ps: lab.model !== 'newton' });
    lab.pv.setPaths(paths, false);
    const fate = (t, c) => `<span style="color:${t.model === 'newton' ? '#f0e6c8' : COL[c.cls]}">${c.label}</span>`;
    const ang = (v) => v === null ? '—' : P.fx(v, 2) + '°';
    $('lab-table').innerHTML = `<tr><th></th><th>Einstein</th><th>Newton</th></tr>
      <tr><td>Fate</td><td class="gr">${fate(gr, gc)}</td><td class="nw">${fate(nw, nc)}</td></tr>
      <tr><td>Bending</td><td class="gr">${ang(grA)}</td><td class="nw">${ang(nEx.deflDeg)}</td></tr>
      <tr><td>Closest approach</td><td class="gr">${grR === null ? 'falls in' : P.lenStr(grR / 2 * s.dd.Rs)}</td><td class="nw">${P.lenStr(nEx.rmin / 2 * s.dd.Rs)}</td></tr>
      <tr><td>Light is lost if b &lt;</td><td class="gr">2.598 R<sub>s</sub></td><td class="nw">1.414 R<sub>s</sub>*</td></tr>
      <tr><td>Photon sphere</td><td class="gr">1.5 R<sub>s</sub></td><td class="nw">none</td></tr>
      <tr><td>Shadow at ${P.distStr(s.D)}</td><td class="gr">${s.dd.shadow < 0.01 ? P.sci(s.dd.shadow, 2) : P.sig(s.dd.shadow, 3)} μas</td><td class="nw">—</td></tr>
      <tr><td colspan="3" style="font-size:10px;color:var(--faint);text-align:left">* Newton has no horizon; this is where the path would touch a body of radius R<sub>s</sub>. Bending: Darwin exact (GR) and exact hyperbola (Newton).</td></tr>`;
    let v;
    if (gr.status === 'captured' && nw.status !== 'captured') v = `<b style="color:var(--cap)">Einstein captures this beam.</b> Newton lets it sail past at ${P.sig(nEx.rmin / 2, 3)} R<sub>s</sub> — gravity is stronger than Newton thought.`;
    else if (gr.status === 'captured') v = `<b style="color:var(--cap)">Both models lose this beam</b> — it is aimed almost straight at the hole.`;
    else v = `Einstein bends it <b>${P.fx(grA, 1)}°</b>, Newton only <b>${P.fx(nEx.deflDeg, 1)}°</b> — <b>${P.fx(grA / nEx.deflDeg, 2)}×</b> more.${s.bRs > 50 ? ' Far away the ratio settles at exactly 2.' : ''}`;
    $('lab-verdict').innerHTML = v;
  }
  ['lab-m', 'lab-b', 'lab-d'].forEach(id => $(id).addEventListener('input', labUpdate));
  function labPreset(p) { lab.p = p; document.querySelectorAll('#lab-presets button').forEach(b => b.classList.toggle('on', b.dataset.p === p)); $('lab-m').value = 0; $('lab-d').value = 0; $('lab-b').value = ((Math.log10(PRE[p].b) - B_LO) / (B_HI - B_LO)).toFixed(4); labUpdate(); }
  document.querySelectorAll('#lab-presets button').forEach(b => b.addEventListener('click', () => labPreset(b.dataset.p)));
  document.querySelectorAll('#lab-model button').forEach(b => b.addEventListener('click', () => { lab.model = b.dataset.v; document.querySelectorAll('#lab-model button').forEach(x => x.classList.toggle('on', x === b)); labUpdate(); }));

  /* ================= VALIDATION ================= */
  let lastRun = null;
  const KIND = { exact: ['EXACT', 'Exact analytic results'], rk4: ['RK4', 'Numerical integrator vs exact answers'], approx: ['APPROX', 'Approximate formulas vs exact'], obs: ['OBS', 'Predictions vs telescope measurements'] };
  function runValidation(anim = true) {
    const r = window.runSuite(); lastRun = r;
    $('v-count').innerHTML = `<span class="${r.passed === r.total ? 'pass' : ''}">${r.passed}</span> / ${r.total} passed`;
    $('v-ms').textContent = P.fx(r.ms, 1) + ' ms'; $('v-at').textContent = new Date(r.at).toLocaleTimeString();
    let html = '<tr><th>ID</th><th>Check</th><th>Reference / exact</th><th>Computed now</th><th>Tolerance</th><th>Result</th><th>Note</th></tr>'; let i = 0;
    for (const k of Object.keys(KIND)) {
      html += `<tr class="grp"><td colspan="7"><span class="tag ${k}">${KIND[k][0]}</span>${KIND[k][1]}</td></tr>`;
      r.results.filter(x => x.kind === k).forEach(x => { html += `<tr${anim ? ` class="flash" style="animation-delay:${i++ * 40}ms"` : ''}><td>${x.id}</td><td>${x.name}</td><td>${x.expected}</td><td>${x.computed}</td><td>${x.tol}</td><td><span class="pill ${x.pass ? 'pass' : 'fail'}">${x.pass ? 'PASS' : 'FAIL'}</span></td><td class="note">${x.note}</td></tr>`; });
    }
    $('v-table').innerHTML = html;
    return r;
  }
  $('v-run').addEventListener('click', () => { const r = runValidation(true); toast(`Validation re-run: ${r.passed}/${r.total} passed in ${P.fx(r.ms, 1)} ms`); });
  $('v-copy').addEventListener('click', async () => {
    if (!lastRun) return; const r = lastRun;
    const txt = `EVENT HORIZON validation — ${r.passed}/${r.total} passed, ${P.fx(r.ms, 1)} ms, ${r.at}\n` + r.results.map(x => [x.id, x.kind.toUpperCase(), x.name, x.expected, x.computed, x.tol, x.pass ? 'PASS' : 'FAIL'].join('\t')).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Results copied'); } catch (e) { toast('Clipboard blocked by the browser', true); }
  });

  /* ================= BOOT ================= */
  try {
    setB(5); showMission(1); m2(); m3(); missions.done = {}; document.querySelectorAll('.mtab').forEach(t => t.classList.remove('done')); [1, 2, 3].forEach(n => { $(`m${n}-concl`).hidden = true; $(`m${n}-concl`).classList.remove('reached'); });
    labPreset('sgr'); runValidation(false);
    $('loader-text').textContent = 'Ready';
  } catch (e) { $('loader-text').textContent = 'Error: ' + e.message; throw e; }
  setTimeout(() => $('loader').classList.add('done'), 350);

  window.EH = { setB, setZoom, pin, clearPins, setView, showMission, labPreset, labState, runValidation, sim, toast,
    setLab(m, b) { if (m !== undefined) $('lab-m').value = m; if (b !== undefined) $('lab-b').value = b; labUpdate(); },
    setM1(b) { $('m1-b').value = b; m1(); }, setM2(b) { $('m2-b').value = b; m2(); }, setM3(s) { $('m3-s').value = s; m3(); } };
})();
