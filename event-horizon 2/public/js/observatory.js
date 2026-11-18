/* EVENT HORIZON — 3D Observatory (Three.js).
   Two layers, kept honest:
   • VISUAL layer  — GPU ray-traced Schwarzschild lensing behind the scene (raytracer.js).
   • DATA layer    — beam tubes are the RK4 solutions from physics.js, drawn to scale in Rs.  */
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';

const wrap = document.getElementById('obs');
const rtCanvas = document.getElementById('obs-rt');
const glCanvas = document.getElementById('obs-3d');
const $ = id => document.getElementById(id);

/* ---------- renderer / scene / camera ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 2000);
const controls = new OrbitControls(camera, glCanvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minDistance = 2.2; controls.maxDistance = 70; controls.enablePan = true;
controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.8;
const rt = createRaytracer(rtCanvas, 0.5);
const state = { lensing: false, showPS: true, showDisc: true, autorot: false, tilt: 90, custom: { bRs: 4, r0Rs: 5000 }, solo: null };

/* ---------- static objects ---------- */
const horizon = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
scene.add(horizon);
const horizonRim = new THREE.Mesh(new THREE.SphereGeometry(1.004, 64, 48), new THREE.MeshBasicMaterial({ color: 0xff8a3d, wireframe: true, transparent: true, opacity: .06 }));
scene.add(horizonRim);
const psMat = new THREE.MeshBasicMaterial({ color: 0xa98bff, wireframe: true, transparent: true, opacity: .1, depthWrite: false });
const photonSphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 36, 24), psMat);
scene.add(photonSphere);
const iscoRing = new THREE.Mesh(new THREE.RingGeometry(2.985, 3.015, 160), new THREE.MeshBasicMaterial({ color: 0xff9d4d, transparent: true, opacity: .55, side: THREE.DoubleSide }));
iscoRing.rotation.x = -Math.PI / 2; scene.add(iscoRing);

// flat-space reference disc (shown only when lensing is OFF)
const discMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: { T: { value: 0 } },
  vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec2 vP; uniform float T;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
    void main(){ float r=length(vP); float a=atan(vP.y,vP.x)+T*1.2*pow(r,-1.5);
      float s=.6+.4*sin(r*9.+3.*sin(a*2.+r))*sin(r*3.3+a);
      float I=smoothstep(2.8,3.3,r)*smoothstep(12.,6.,r)*pow(3.2/r,1.4)*s;
      vec3 c=mix(vec3(.5,.08,.03),vec3(1.,.5,.15),clamp(I*1.6,0.,1.)); c=mix(c,vec3(1.,.92,.8),clamp(I*I*1.4,0.,1.));
      gl_FragColor=vec4(c*I*1.6, I); }`
});
const flatDisc = new THREE.Mesh(new THREE.RingGeometry(2.8, 12, 192, 1), discMat);
flatDisc.rotation.x = -Math.PI / 2; scene.add(flatDisc);
const stars = (() => {
  const n = 2500, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 400;
    p[i * 3] = r * Math.sqrt(1 - u * u) * Math.cos(t); p[i * 3 + 1] = r * u; p[i * 3 + 2] = r * Math.sqrt(1 - u * u) * Math.sin(t); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: .7 }));
})();
scene.add(stars);

// sprite textures
function glowTex(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.35)') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(.2, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function ringTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.strokeStyle = 'white'; x.lineWidth = 6; x.shadowColor = 'white'; x.shadowBlur = 12; x.beginPath(); x.arc(64, 64, 50, 0, 7); x.stroke();
  return new THREE.CanvasTexture(c);
}
const GLOW = glowTex(), RING = ringTex();

/* ---------- beams (DATA layer) ---------- */
const BEAMS = {
  A: { bRs: 2.0, color: 0xff6a2b, css: '#ff6a2b' },
  B: { bRs: 2.6, color: 0xb18cff, css: '#b18cff' },
  C: { bRs: 10, color: 0x4fa8ff, css: '#4fa8ff' },
  U: { bRs: 4.0, color: 0xffffff, css: '#ffffff' },
};
const beamGroup = new THREE.Group(); scene.add(beamGroup);
const fxGroup = new THREE.Group(); scene.add(fxGroup);
const SPEED = 8.5; // Rs per second (display speed, identical for all beams)

function to3D(xRs, yRs) {
  const t = state.tilt * Math.PI / 180;
  return new THREE.Vector3(xRs, yRs * Math.sin(t), yRs * Math.cos(t));
}
function buildBeam(key) {
  const B = BEAMS[key];
  if (B.obj) { beamGroup.remove(B.obj); B.obj.traverse(o => { o.geometry && o.geometry.dispose(); }); B.obj = null; }
  const opts = key === 'U' && state.custom.r0Rs < 2500 ? { r0: state.custom.r0Rs * 2 } : {};
  const reach = Math.max(34, B.bRs * 1.6);                 // keep wide beams visible
  opts.keepR = Math.max(140, reach * 2.2);
  const tr = trace(B.bRs * 2, opts);
  B.tr = tr;
  let pts = tr.pts.map(p => [p[0] / 2, p[1] / 2]).filter(p => Math.hypot(p[0], p[1]) < reach);
  if (pts.length < 2) pts = tr.pts.map(p => [p[0] / 2, p[1] / 2]);
  if (pts.length < 2) return; // nothing drawable
  const v3 = pts.map(p => to3D(p[0], p[1]));
  const curve = new THREE.CatmullRomCurve3(v3, false, 'centripetal');
  const segs = Math.min(1600, Math.max(80, v3.length * 2));
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, key === 'U' ? .028 : .04, 6, false),
    new THREE.MeshBasicMaterial({ color: B.color }));
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, .14, 6, false),
    new THREE.MeshBasicMaterial({ color: B.color, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }));
  const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: B.color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  head.scale.set(1.1, 1.1, 1); const headCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false }));
  headCore.scale.set(.35, .35, 1); head.add(headCore);
  const g = new THREE.Group(); g.add(core, glow, head); beamGroup.add(g);
  Object.assign(B, { obj: g, core, glow, head, curve, segs, len: curve.getLength(), t0: null, done: false, flashed: false });
  setProgress(B, 1); head.visible = false;
}
function setProgress(B, f) {
  const n = Math.floor(Math.max(0, Math.min(1, f)) * B.segs) * 6 * 6;
  B.core.geometry.setDrawRange(0, n); B.glow.geometry.setDrawRange(0, n);
  if (f > 0 && f < 1) { B.head.visible = true; B.head.position.copy(B.curve.getPointAt(Math.min(.9999, f))); }
}
function rebuildAll() { Object.keys(BEAMS).forEach(buildBeam); }

/* outcome effects */
function flash(pos, color, scale = 3) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: RING, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.copy(pos); s.userData = { t: 0, scale }; fxGroup.add(s);
}
function arrow(B) {
  const p1 = B.curve.getPointAt(1), p0 = B.curve.getPointAt(.985);
  const dir = p1.clone().sub(p0).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.22, .6, 16), new THREE.MeshBasicMaterial({ color: B.color }));
  cone.position.copy(p1); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  cone.userData = { t: 0, life: 4 }; fxGroup.add(cone);
}
function chip(key, cls, text) {
  const el = $('obs-st-' + key); if (!el) return;
  el.className = 'chip ' + cls; el.querySelector('em').textContent = text;
}
function launch(key) {
  const keys = key === 'all' ? ['A', 'B', 'C', 'U'] : [key];
  state.solo = key === 'all' ? null : key;
  const now = performance.now();
  Object.entries(BEAMS).forEach(([k, B]) => {
    if (!B.obj) return;
    const on = keys.includes(k);
    B.obj.visible = on || key === 'all';
    if (on) { B.t0 = now; B.done = false; B.flashed = false; setProgress(B, 0); chip(k, 'run', 'In flight…'); }
  });
}

/* ---------- camera presets ---------- */
const PRESETS = {
  cinematic: { pos: [5, 4, 33], tgt: [-1, 3.2, 0] },
  edge: { pos: [0, .4, 30], tgt: [-1, 2.5, 0] },
  top: { pos: [0, 30, .01], tgt: [0, 0, 0] },
  plane: { pos: [0, 0, 34], tgt: [-3, 3, 0] },
  close: { pos: [2.6, .7, 5.2], tgt: [0, 0, 0] },
  wide: { pos: [-14, 9, 34], tgt: [0, 0, 0] },
};
let tween = null;
function goto(name) {
  const P = PRESETS[name]; if (!P) return;
  tween = { t0: performance.now(), dur: 1500, fromP: camera.position.clone(), fromT: controls.target.clone(),
            toP: new THREE.Vector3(...P.pos), toT: new THREE.Vector3(...P.tgt) };
  document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === name));
}
camera.position.set(...PRESETS.cinematic.pos); controls.target.set(0, 0, 0); controls.update();

/* ---------- UI wiring ---------- */
document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => goto(b.dataset.cam)));
$('obs-reset').addEventListener('click', () => { goto('cinematic'); state.autorot = false; $('obs-rot').classList.remove('on'); });
$('obs-rot').addEventListener('click', e => { state.autorot = !state.autorot; e.currentTarget.classList.toggle('on', state.autorot); });
$('obs-lens').addEventListener('click', e => {
  if (!rt) return; state.lensing = !state.lensing; e.currentTarget.classList.toggle('on', state.lensing);
  e.currentTarget.textContent = state.lensing ? 'Lensed sky: on' : 'Lensed sky: off';
});
$('obs-ps').addEventListener('click', e => { state.showPS = !state.showPS; e.currentTarget.classList.toggle('on', state.showPS); });
$('obs-disc').addEventListener('click', e => { state.showDisc = !state.showDisc; e.currentTarget.classList.toggle('on', state.showDisc); });
document.querySelectorAll('[data-launch]').forEach(b => b.addEventListener('click', () => {
  launch(b.dataset.launch);
  window.dispatchEvent(new CustomEvent('eh:launched', { detail: { key: b.dataset.launch } }));
}));
window.addEventListener('eh:launch', e => launch(e.detail.key));
window.addEventListener('eh:custom', e => {
  const d = e.detail; let rebuild = false;
  if (d.tilt !== undefined && d.tilt !== state.tilt) { state.tilt = d.tilt; rebuild = true; }
  if (d.bRs !== undefined && (d.bRs !== BEAMS.U.bRs || d.r0Rs !== state.custom.r0Rs)) { BEAMS.U.bRs = d.bRs; state.custom.r0Rs = d.r0Rs; rebuild = true; }
  if (rebuild) { if (d.tilt !== undefined) rebuildAll(); else buildBeam('U'); }
  $('obs-ub').textContent = BEAMS.U.bRs.toFixed(2);
});

/* ---------- size ---------- */
function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (rt) rt.resize();
}
new ResizeObserver(resize).observe(wrap);

/* ---------- loop ---------- */
let visible = false, firstSeen = false;
new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !firstSeen) { firstSeen = true; setTimeout(() => launch('all'), 500); } }, { threshold: .25 }).observe(wrap);
const t0 = performance.now(); let last = t0;
const tmp = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  if (!visible) { last = now; return; }
  const dt = now - last; last = now; const T = (now - t0) / 1000;
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(tween.fromP, tween.toP, e); controls.target.lerpVectors(tween.fromT, tween.toT, e);
    if (k >= 1) tween = null;
  }
  controls.autoRotate = state.autorot; controls.autoRotateSpeed = .5;
  controls.update();

  // beams
  let nearCrit = false;
  for (const [k, B] of Object.entries(BEAMS)) {
    if (!B.obj || B.t0 === null) continue;
    const f = ((now - B.t0) / 1000 * SPEED) / B.len;
    if (!B.done) {
      setProgress(B, f);
      if (B.head.visible) { tmp.copy(B.head.position); if (tmp.length() < 2.1 && B.tr.status !== 'captured') nearCrit = true; B.head.material.opacity = 1; }
      if (f >= 1) {
        B.done = true; B.head.visible = false; setProgress(B, 1);
        const c = classify(B.tr);
        if (B.tr.status === 'captured') { flash(B.curve.getPointAt(1), B.color, 3.2); chip(k, 'cap', 'Captured at R_s'); }
        else { arrow(B); chip(k, c.cls, c.cls === 'crit' ? `${B.tr.turns.toFixed(2)} turns · escaped` : `Escaped · α ${B.tr.deflDeg !== null ? B.tr.deflDeg.toFixed(2) + '°' : ''}`); }
      }
    }
  }
  // photon sphere pulse while a beam skims it
  const pulse = nearCrit ? .22 + .08 * Math.sin(T * 14) : .1;
  psMat.opacity += (pulse - psMat.opacity) * .15; psMat.color.setHex(nearCrit ? 0xd6c4ff : 0xa98bff);
  photonSphere.visible = state.showPS; photonSphere.rotation.y = T * .05;
  iscoRing.visible = state.showPS;
  // fx
  for (const o of [...fxGroup.children]) {
    o.userData.t += dt / 1000;
    if (o.isSprite) { const s = o.userData.scale * (.3 + o.userData.t * 1.4); o.scale.set(s, s, 1); o.material.opacity = Math.max(0, 1 - o.userData.t / 1.3); if (o.userData.t > 1.3) fxGroup.remove(o); }
    else if (o.userData.life) { if (o.userData.t > o.userData.life) fxGroup.remove(o); }
  }
  // layers
  flatDisc.visible = !state.lensing && state.showDisc; stars.visible = !state.lensing; discMat.uniforms.T.value = T;
  horizonRim.visible = !state.lensing;
  rtCanvas.style.opacity = state.lensing ? 1 : 0;
  if (rt && state.lensing) {
    rt.adapt(dt, .25, .7);
    camera.updateMatrixWorld();
    const m = camera.matrixWorld.elements;
    const rtv = [m[0], m[1], m[2]], up = [m[4], m[5], m[6]], fw = [-m[8], -m[9], -m[10]];
    const focal = .5 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const d = camera.position.length();
    rt.render({ ro: camera.position.toArray(), fw, rt: rtv, up, focal, esc: Math.max(45, d + 10), disc: state.showDisc, t: T });
  }
  renderer.render(scene, camera);
  $('obs-cam').textContent = `r_cam ${camera.position.length().toFixed(1)} Rs · ${rt && state.lensing ? (rt.fps ? rt.fps.toFixed(0) + ' fps' : '') : 'flat'}`;
}
if (window.EH_CUSTOM) { BEAMS.U.bRs = EH_CUSTOM.bRs; state.custom.r0Rs = EH_CUSTOM.r0Rs; state.tilt = EH_CUSTOM.tilt; $('obs-ub').textContent = EH_CUSTOM.bRs.toFixed(2); }
rebuildAll(); resize(); requestAnimationFrame(frame);
if (!rt) { $('obs-lens').textContent = 'Lensing unavailable (no WebGL)'; state.lensing = false; }
window.EHObs = { launch, goto, state, BEAMS };
