/* EVENT HORIZON — shared GPU ray tracer (VISUAL ONLY).
   Each pixel's ray is bent with the Schwarzschild photon acceleration
   a = −(3/2) h² r̂ / r⁴ (units Rs = 1) and tested against a thin disc in the y = 0 plane.
   Used by the hero and by the 3D Observatory background. No number on the site comes from it. */
function createRaytracer(canvas, initScale) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision highp float;
uniform vec2 R;uniform float T;uniform vec3 Ro,Fw,Rt,Up;uniform float F,Esc,Disc,Dop,Bright;
float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 sky(vec3 d){
 vec3 c=vec3(0.);
 float n=fbm(d*2.1+vec3(3.,1.,7.)), n2=fbm(d*4.3+vec3(9.,2.,5.));
 float band=exp(-pow(d.y*2.4+0.35*d.x,2.)*2.);
 c+=vec3(.20,.09,.36)*pow(n,2.4)*band*1.1;     /* violet dust lane */
 c+=vec3(.05,.12,.30)*pow(n2,2.8)*1.0;          /* cosmic blue haze */
 c+=vec3(.30,.12,.05)*pow(n*n2,3.)*band*1.4;    /* warm knots */
 for(int k=0;k<3;k++){float sc=k==0?90.:(k==1?180.:340.);
   vec3 q=d*sc;vec3 id=floor(q);vec3 f=fract(q)-.5;float h=hash(id+float(k)*13.1);
   float th=k==0?.992:(k==1?.985:.975);
   if(h>th){float r=length(f);float b=(h-th)/(1.-th);
     vec3 tint=mix(vec3(1.,.8,.62),vec3(.7,.8,1.),hash(id*1.7));
     c+=tint*smoothstep(.22,0.,r)*b*(k==0?3.6:1.6);}}
 return c;}
vec3 disk(vec3 p,vec3 dir,out float al){
 float r=length(p.xz);
 float inner=smoothstep(2.75,3.25,r), outer=smoothstep(12.,6.5,r);
 if(inner*outer<=0.){al=0.;return vec3(0.);}
 float ang=atan(p.z,p.x)+T*1.1*pow(r,-1.5);
 float n=fbm(vec3(cos(ang)*2.2,sin(ang)*2.2,r*2.6));
 float n2=fbm(vec3(cos(ang)*6.,sin(ang)*6.,r*7.));
 float I=inner*outer*pow(3.2/r,1.5)*(.35+.95*n)*(.75+.5*n2);
 vec3 vd=normalize(vec3(-p.z,0.,p.x));float v=sqrt(.5/r);
 float g=sqrt(1.-v*v)/(1.-v*dot(vd,-dir))*sqrt(1.-1./r);
 I*=mix(1.,pow(g,3.),Dop);
 float t=clamp(I*g,0.,2.);
 vec3 deep=vec3(.42,.06,.04),warm=vec3(1.,.42,.10),hot=vec3(1.,.90,.76);
 vec3 c=mix(deep,warm,smoothstep(0.,.45,t));c=mix(c,hot,smoothstep(.45,1.25,t));
 c=mix(c,c*vec3(.85,.9,1.25),smoothstep(1.05,1.6,g)*.6); /* approaching side shifts bluer */
 al=clamp(I*1.15,0.,.97);
 return c*I*2.4;}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
 vec3 v=normalize(Fw*F+uv.x*Rt+uv.y*Up);
 vec3 p=Ro;vec3 hv=cross(p,v);float h2=dot(hv,hv);
 vec3 col=vec3(0.);float tr=1.;bool hit=false;
 for(int i=0;i<300;i++){
   float r=length(p);
   float dt=clamp(.06*r,.012,1.6);
   vec3 a=-1.5*h2*p/pow(r,5.);
   vec3 v2=v+a*dt;vec3 p2=p+v2*dt;
   if(Disc>.5&&p.y*p2.y<0.){float t=p.y/(p.y-p2.y);vec3 c=mix(p,p2,t);float al;vec3 dc=disk(c,normalize(v2),al);col+=tr*dc*al;tr*=1.-al;}
   p=p2;v=v2;
   if(dot(p,p)<1.){hit=true;break;}
   if(r>Esc&&dot(p,v)>0.)break;
   if(tr<.02)break;
 }
 if(!hit)col+=tr*sky(normalize(v));
 col*=Bright;
 col=vec3(1.)-exp(-col*1.5);
 col=pow(col,vec3(.92));
 col*=1.-.42*dot(uv,uv);
 col+=(hash(vec3(gl_FragCoord.xy,floor(T*24.)))-.5)*.03;
 gl_FragColor=vec4(col,1.);}`;
  function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; }
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['R', 'T', 'Ro', 'Fw', 'Rt', 'Up', 'F', 'Esc', 'Disc', 'Dop', 'Bright'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

  let scale = initScale || 0.55;
  const rt = {
    gl, fps: 0,
    get scale() { return scale; },
    resize() {
      canvas.width = Math.max(240, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(140, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    /* cam: {ro, fw, rt, up, focal, esc, disc, dop, bright, t} */
    render(cam) {
      gl.uniform2f(U.R, canvas.width, canvas.height); gl.uniform1f(U.T, cam.t);
      gl.uniform3fv(U.Ro, cam.ro); gl.uniform3fv(U.Fw, cam.fw); gl.uniform3fv(U.Rt, cam.rt); gl.uniform3fv(U.Up, cam.up);
      gl.uniform1f(U.F, cam.focal); gl.uniform1f(U.Esc, cam.esc || 45);
      gl.uniform1f(U.Disc, cam.disc === false ? 0 : 1); gl.uniform1f(U.Dop, cam.dop ?? .7); gl.uniform1f(U.Bright, cam.bright ?? 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    /* adaptive resolution: call once per frame with frame time (ms) */
    _f: 0, _acc: 0,
    adapt(dt, lo = .26, hi = .8) {
      this._f++; this._acc += dt;
      if (this._acc > 1000) {
        this.fps = this._f * 1000 / this._acc;
        if (this.fps < 28 && scale > lo) { scale *= .85; this.resize(); }
        else if (this.fps > 55 && scale < hi) { scale *= 1.07; this.resize(); }
        this._f = 0; this._acc = 0;
      }
    }
  };
  rt.resize();
  return rt;
}
/* camera basis from yaw/pitch orbit around origin */
function orbitCam(dist, yaw, pitch, roll = 0) {
  const ro = [dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), dist * Math.cos(pitch) * Math.cos(yaw)];
  const n = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const fw = n(ro.map(x => -x)); const rt = n(cross(fw, [0, 1, 0])); const up = cross(rt, fw);
  const c = Math.cos(roll), s = Math.sin(roll);
  return { ro, fw, rt: rt.map((x, i) => x * c + up[i] * s), up: up.map((x, i) => x * c - rt[i] * s) };
}
