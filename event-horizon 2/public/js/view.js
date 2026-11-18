/* EVENT HORIZON — shared 2D trajectory renderer (used by the simulator, missions and Gravity Lab).
   Draws paths that were computed by physics.js. It never computes physics itself.
   World units: Rs of a reference hole. k = (Rs of the current hole) / (reference Rs).     */
(function (root) {
  const COLORS = { cap: '#ff6a2b', crit: '#b18cff', esc: '#4fa8ff', newton: '#e8d9b0', ghost: '#9aa3c7' };
  const STAR = (() => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 700; const x = c.getContext('2d');
    x.fillStyle = '#020207'; x.fillRect(0, 0, 1200, 700);
    const g = x.createRadialGradient(900, 160, 0, 900, 160, 700); g.addColorStop(0, 'rgba(90,50,160,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1200, 700);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 700; i++) { const a = rnd(); x.fillStyle = `rgba(${210 + 45 * rnd() | 0},${210 + 35 * rnd() | 0},255,${a * a * .55})`; x.fillRect(rnd() * 1200, rnd() * 700, a > .97 ? 1.6 : .8, a > .97 ? 1.6 : .8); }
    return c;
  })();

  class PathView {
    constructor(canvas, opts = {}) {
      this.cv = canvas; this.x = canvas.getContext('2d');
      this.o = Object.assign({ halfRs: 6, cx: .56, k: 1, grid: true, bc: true, ps: true, labels: true, unit: k => k + ' Rs', speed: 9, interactive: false }, opts);
      this.paths = []; this.t0 = performance.now(); this.visible = false; this.dirty = true; this.flash = null;
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
      new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }, { threshold: .01 }).observe(canvas);
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const loop = now => { requestAnimationFrame(loop); if (this.visible) this.draw(now); };
      requestAnimationFrame(loop);
    }
    resize() { const r = this.cv.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1); this.d = d; this.cv.width = Math.max(10, r.width * d); this.cv.height = Math.max(10, r.height * d); }
    set(opts) { Object.assign(this.o, opts); }
    setPaths(paths, restart = true) {
      this.paths = paths.map(p => {
        const k = p.k ?? this.o.k;
        const pts = p.pts.map(q => [q[0] / 2 * k, q[1] / 2 * k]);
        const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        return Object.assign({}, p, { w: pts, L });
      });
      if (restart) this.t0 = performance.now();
    }
    replay() { this.t0 = performance.now(); }
    draw(now) {
      const { x, cv, o } = this, d = this.d || 1, W = cv.width, H = cv.height;
      if (!W || !H) return;
      const sc = H / 2 / o.halfRs, cx = W * o.cx, cy = H * (o.cy || .5), P = p => [cx + p[0] * sc, cy - p[1] * sc];
      const k = o.k; const T = (now - this.t0) / 1000;
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.setLineDash([]);
      x.drawImage(STAR, 0, 0, W, H);
      x.font = `${10 * d}px "IBM Plex Mono", monospace`;
      if (o.grid) {
        const step = o.halfRs > 16 ? 5 : o.halfRs > 7 ? 2 : 1;
        x.strokeStyle = 'rgba(160,150,230,.07)'; x.lineWidth = 1;
        for (let i = -80; i <= 80; i += step) {
          const gx = cx + i * sc, gy = cy - i * sc;
          if (gx > 0 && gx < W) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
          if (gy > 0 && gy < H) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
        }
        if (o.labels) { x.fillStyle = 'rgba(154,149,168,.65)'; for (let i = -80; i <= 80; i += step) { const gy = cy - i * sc; if (i !== 0 && gy > 18 * d && gy < H - 12 * d) x.fillText(o.unit(i), W - 8 * d - x.measureText(o.unit(i)).width, gy - 4 * d); } }
      }
      // b_c guides
      if (o.bc) {
        const bc = 1.5 * Math.sqrt(3) * k;
        x.setLineDash([5 * d, 6 * d]); x.strokeStyle = 'rgba(79,168,255,.38)'; x.lineWidth = d;
        [bc, -bc].forEach(y => { x.beginPath(); x.moveTo(0, cy - y * sc); x.lineTo(cx, cy - y * sc); x.stroke(); });
        x.setLineDash([]); if (o.labels) { x.fillStyle = 'rgba(79,168,255,.8)'; const l = 'critical b_c = 2.598 Rs'; x.fillText(l, cx - 1.6 * k * sc - x.measureText(l).width, cy - bc * sc - 6 * d); }
      }
      // photon sphere
      const crit = this.paths.some(p => p.main && p.cls === 'crit');
      if (o.ps) {
        const r = 1.5 * k * sc;
        if (crit && !this.reduced) { const a = .35 + .25 * Math.sin(T * 6); const g = x.createRadialGradient(cx, cy, r * .85, cx, cy, r * 1.35); g.addColorStop(0, 'rgba(177,140,255,0)'); g.addColorStop(.4, `rgba(177,140,255,${a})`); g.addColorStop(1, 'rgba(177,140,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 1.35, 0, 7); x.fill(); }
        x.setLineDash([3 * d, 4 * d]); x.strokeStyle = crit ? 'rgba(210,190,255,.95)' : 'rgba(177,140,255,.55)'; x.lineWidth = d * (crit ? 1.4 : 1);
        x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); x.setLineDash([]);
        if (o.labels && r > 22 * d) { x.fillStyle = 'rgba(177,140,255,.9)'; x.fillText('photon sphere 1.5 Rs', cx + r * .72 + 6 * d, cy + r * .72 + 12 * d); }
      }
      // paths
      for (const p of this.paths) {
        if (p.w.length < 2) continue;
        const col = p.color || COLORS[p.cls] || '#fff';
        x.save(); x.strokeStyle = col; x.globalAlpha = p.alpha ?? 1; x.lineWidth = (p.width || 2) * d;
        if (p.dash) x.setLineDash(p.dash.map(v => v * d));
        if (p.glow !== false && !p.dash) { x.shadowColor = col; x.shadowBlur = (p.main ? 14 : 6) * d; }
        x.beginPath(); p.w.forEach((q, i) => { const s = P(q); i ? x.lineTo(s[0], s[1]) : x.moveTo(s[0], s[1]); }); x.stroke(); x.restore();
        if (p.label) { const s = P(p.w[Math.min(p.w.length - 1, 1)]); x.fillStyle = col; x.globalAlpha = .9; x.fillText(p.label, Math.max(8 * d, s[0] + 4 * d), s[1] - 6 * d); x.globalAlpha = 1; }
        // exit arrow + deflection arc for escaping main paths
        if (p.main && p.cls !== 'cap') this.exitMark(p, P, sc, col, W, H);
      }
      // photon head(s)
      for (const p of this.paths) {
        if (!p.main || p.w.length < 2 || this.reduced) continue;
        const total = p.L[p.L.length - 1]; const enter = this.enterLen(p, cx / sc);
        const span = Math.min(total - enter, o.halfRs * 14);
        const cyc = span / (o.speed * o.halfRs / 6) + 1.4;
        const t = (T % cyc) * (o.speed * o.halfRs / 6); const dist = enter + t;
        if (dist > total || t > span) continue;
        let n = 1; while (n < p.L.length && p.L[n] < dist) n++;
        if (n >= p.w.length) continue;
        const f = (dist - p.L[n - 1]) / (p.L[n] - p.L[n - 1]);
        const hpt = [p.w[n - 1][0] + (p.w[n][0] - p.w[n - 1][0]) * f, p.w[n - 1][1] + (p.w[n][1] - p.w[n - 1][1]) * f];
        const s = P(hpt); const col = p.color || COLORS[p.cls];
        // short bright trail
        x.save(); x.strokeStyle = '#fff'; x.lineWidth = 2.4 * d; x.shadowColor = col; x.shadowBlur = 18 * d; x.globalAlpha = .9;
        x.beginPath(); let started = false; for (let i = Math.max(0, n - 18); i < n; i++) { const q = P(p.w[i]); started ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); started = true; } x.lineTo(s[0], s[1]); x.stroke(); x.restore();
        const g = x.createRadialGradient(s[0], s[1], 0, s[0], s[1], 16 * d); g.addColorStop(0, '#fff'); g.addColorStop(.25, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(s[0], s[1], 16 * d, 0, 7); x.fill();
        if (p.cls === 'cap' && total - dist < 0.4 * k) this.flash = { t: now, at: P(p.w[p.w.length - 1]), col };
      }
      // horizon
      const R = k * sc;
      const hg = x.createRadialGradient(cx, cy, R * .9, cx, cy, R * 1.9); hg.addColorStop(0, 'rgba(255,130,60,.55)'); hg.addColorStop(.45, 'rgba(139,92,246,.16)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = hg; x.beginPath(); x.arc(cx, cy, R * 1.9, 0, 7); x.fill();
      x.fillStyle = '#000'; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
      x.strokeStyle = 'rgba(255,179,92,.95)'; x.lineWidth = d; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
      if (o.labels && R > 10 * d) { x.fillStyle = 'rgba(236,232,244,.7)'; const l = o.horizonLabel || 'event horizon Rs'; x.fillText(l, cx - R - 8 * d - x.measureText(l).width, cy - R - 2 * d); }
      // capture flash
      if (this.flash && !this.reduced) { const e = (now - this.flash.t) / 700; if (e < 1) { x.strokeStyle = this.flash.col; x.globalAlpha = 1 - e; x.lineWidth = 2 * d; x.beginPath(); x.arc(this.flash.at[0], this.flash.at[1], (6 + 30 * e) * d, 0, 7); x.stroke(); x.globalAlpha = 1; } else this.flash = null; }
      if (this.o.overlay) this.o.overlay(x, { P, sc, cx, cy, W, H, d });
    }
    enterLen(p, leftW) { if (p.w[0][0] > -leftW) return 0; for (let i = 1; i < p.w.length; i++) if (p.w[i][0] > -leftW) return p.L[i - 1]; return 0; }
    exitMark(p, P, sc, col, W, H) {
      const { x } = this, d = this.d || 1;
      let i = p.w.length - 1; for (; i > 1; i--) { const s = P(p.w[i]); if (s[0] > 4 && s[0] < W - 4 && s[1] > 4 && s[1] < H - 4) break; }
      if (i < 2) return;
      const s = P(p.w[i]), s0 = P(p.w[Math.max(0, i - 3)]); const ang = Math.atan2(s[1] - s0[1], s[0] - s0[0]);
      x.save(); x.fillStyle = col; x.translate(s[0], s[1]); x.rotate(ang); x.beginPath(); x.moveTo(8 * d, 0); x.lineTo(-6 * d, -5 * d); x.lineTo(-6 * d, 5 * d); x.closePath(); x.fill(); x.restore();
      if (p.defl == null || p.defl > 175 || p.defl < 0.5) return;
      // deflection arc: dashed "no gravity" direction vs actual direction, at the exit point
      const Lr = 46 * d; x.save(); x.setLineDash([3 * d, 4 * d]); x.strokeStyle = 'rgba(236,232,244,.55)'; x.lineWidth = d;
      x.beginPath(); x.moveTo(s[0], s[1]); x.lineTo(s[0] + Lr * 1.4, s[1]); x.stroke(); x.setLineDash([]);
      x.strokeStyle = col; x.lineWidth = 1.2 * d; x.beginPath(); x.arc(s[0], s[1], Lr, 0, p.defl * Math.PI / 180, false); x.stroke();
      x.fillStyle = col; x.font = `${11 * d}px "IBM Plex Mono", monospace`; const mid = p.defl * Math.PI / 360;
      x.fillText(`α = ${p.defl.toFixed(p.defl < 10 ? 2 : 1)}°`, s[0] + Math.cos(mid) * (Lr + 8 * d), s[1] + Math.sin(mid) * (Lr + 8 * d) + 4 * d); x.restore();
    }
  }

  /* effective-potential inset: V(r) = (1 − Rs/r)/r² vs the photon's level 1/b² */
  function drawPotential(cv, bRs, cls, extra = []) {
    const d = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect(); cv.width = r.width * d; cv.height = r.height * d;
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, pl = 10 * d, pb = 18 * d, pt = 14 * d, iw = W - pl * 2, ih = H - pb - pt;
    const X = v => pl + (v - 1) / 7 * iw, Y = v => pt + ih - v / 0.3 * ih;
    x.clearRect(0, 0, W, H); x.font = `${9.5 * d}px "IBM Plex Mono", monospace`;
    x.strokeStyle = 'rgba(160,150,230,.12)'; x.lineWidth = 1; x.beginPath(); x.moveTo(pl, Y(0)); x.lineTo(W - pl, Y(0)); x.stroke();
    x.beginPath(); for (let i = 0; i <= 160; i++) { const rr = 1 + i / 160 * 7; const v = (1 - 1 / rr) / (rr * rr); i ? x.lineTo(X(rr), Y(v)) : x.moveTo(X(rr), Y(v)); }
    x.strokeStyle = '#ece8f4'; x.lineWidth = 1.6 * d; x.stroke();
    x.fillStyle = 'rgba(236,232,244,.75)'; x.fillText('barrier 4/27 at 1.5 Rs', X(1.65), Y(4 / 27) - 7 * d);
    const lvl = (b, col, lab, w) => { const e = 1 / (b * b); const yy = e > .3 ? Y(.3) + 2 * d : Y(e); x.strokeStyle = col; x.lineWidth = w * d; x.setLineDash(e > .3 ? [3 * d, 3 * d] : []); x.beginPath(); x.moveTo(X(1), yy); x.lineTo(X(8), yy); x.stroke(); x.setLineDash([]); if (lab) { x.fillStyle = col; x.fillText(lab + (e > .3 ? ' (off scale ↑)' : ''), X(4.2), yy - 5 * d); } };
    extra.forEach(e => lvl(e.b, e.col, '', 1));
    lvl(bRs, COLORS[cls] || '#fff', 'your beam: 1/b² = ' + (1 / (bRs * bRs)).toFixed(3), 1.8);
    x.fillStyle = 'rgba(154,149,168,.8)'; x.fillText('r / Rs →', W - pl - 54 * d, H - 5 * d); x.fillText('1', X(1) - 2 * d, H - 5 * d); x.fillText('1.5', X(1.5) - 6 * d, H - 5 * d); x.fillText('3', X(3) - 2 * d, H - 5 * d);
  }

  root.PathView = PathView; root.drawPotential = drawPotential; root.PV_COLORS = COLORS;
})(window);
