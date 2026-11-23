import * as THREE from "three";

// Geometry, materials and shaders for the showroom. Pieces are drawn in code: the store has photos, not 3D scans.

// A ring-shaped tube around the Y axis. shape(u, v) scales the tube's radius, so one function draws a plain band,
// a twisted rope or beaded edges. Indexed without a seam, so the normals stay smooth all the way round.
export function tube({ R = 1, r = 0.1, height = 1, U = 256, V = 32, shape }: { R?: number; r?: number; height?: number; U?: number; V?: number; shape?: (u: number, v: number) => number }) {
  const pos = new Float32Array(U * V * 3);
  let k = 0;
  for (let i = 0; i < U; i++) {
    const u = (i / U) * Math.PI * 2;
    for (let j = 0; j < V; j++) {
      const v = (j / V) * Math.PI * 2;
      const rr = r * (shape ? shape(u, v) : 1);
      const d = R + rr * Math.cos(v);
      pos[k++] = d * Math.cos(u);
      pos[k++] = rr * Math.sin(v) * height;
      pos[k++] = d * Math.sin(u);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < U; i++)
    for (let j = 0; j < V; j++) {
      const a = i * V + j, b = ((i + 1) % U) * V + j, c = ((i + 1) % U) * V + ((j + 1) % V), d = i * V + ((j + 1) % V);
      index.push(a, d, b, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// Jewellery is lit by what it reflects, so build a small photo studio: a dark room with bright softboxes and strips.
export function studio(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: "#160709", side: THREE.BackSide })));
  const box = (w: number, h: number, power: number, color: string, [x, y, z]: number[]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  box(12, 3, 5, "#fff3e2", [0, 9, 1]); // overhead softbox
  box(1.4, 14, 9, "#ffffff", [-8, 0, 3]); // left strip
  box(1.4, 14, 7, "#ffffff", [8, 1, 2]); // right strip
  box(8, 2.2, 3, "#ffd6a0", [0, -3, 10]); // warm front fill
  box(5, 5, 2.5, "#ff8f7a", [-3, 4, -10]); // rose rim from behind
  box(0.8, 0.8, 30, "#ffffff", [4, 6, 8]); // a small hot spot for glints
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(room, 0.02).texture;
  pmrem.dispose();
  return tex;
}

export const gold = (roughness = 0.15) => new THREE.MeshPhysicalMaterial({ color: "#f2c36a", metalness: 1, roughness });

// Twinkling four-point glints, a fixed size on screen.
export function glints(count: number, place: (out: Float32Array, i: number) => void) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    place(pos, i * 3);
    seed[i] = Math.random();
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uColor: { value: new THREE.Color("#ffe7b0") } },
    vertexShader: /* glsl */ `attribute float seed; uniform float uTime; uniform float uPx; varying float vA;
      void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vA = pow(0.5 + 0.5 * sin(uTime * (0.8 + seed * 1.6) + seed * 90.0), 8.0);
        gl_PointSize = (6.0 + 30.0 * vA) * uPx; }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; varying float vA;
      void main(){ vec2 d = abs(gl_PointCoord - 0.5);
        float star = max(0.0, 1.0 - d.x * 16.0) * (1.0 - d.y * 2.0) + max(0.0, 1.0 - d.y * 16.0) * (1.0 - d.x * 2.0);
        float core = pow(max(0.0, 1.0 - length(d) * 2.0), 4.0);
        gl_FragColor = vec4(uColor, (star * 0.9 + core) * vA);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Points(g, mat);
}

// Three 22K bangles: a twisted rope kada, a polished band with beaded edges, and a satin band set with rubies and
// emeralds. One unit is a bangle's radius; the caller scales the set to the screen. Built once, then reused each
// time the home page comes back, as the twisted geometry takes a moment to compute.
const built = new Map<boolean, THREE.Group>();
export const bangles = (lite: boolean) => built.get(lite) ?? built.set(lite, makeBangles(lite)).get(lite)!;
function makeBangles(lite: boolean) {
  const set = new THREE.Group();
  const shine = gold(0.14), satin = gold(0.26);
  const q = lite ? 0.55 : 1;
  const rope = new THREE.Mesh(tube({ r: 0.115, U: Math.round(720 * q), V: lite ? 36 : 48, shape: (u, v) => 0.8 + 0.2 * Math.pow(Math.abs(Math.cos(3 * (v - 10 * u))), 0.5) }), shine);
  const beaded = new THREE.Mesh(tube({ r: 0.085, height: 2, U: Math.round(960 * q), V: lite ? 32 : 44, shape: (u, v) => 1 + 0.12 * Math.pow(Math.abs(Math.sin(v)), 26) * (0.5 + 0.5 * Math.cos(150 * u)) }), shine);
  const studded = new THREE.Group();
  studded.add(new THREE.Mesh(tube({ r: 0.09, height: 1.5, U: 220, V: 36 }), satin));
  const n = 18, dummy = new THREE.Object3D();
  const stone = (color: string, glow: string) => new THREE.MeshPhysicalMaterial({ color, emissive: glow, roughness: 0.03, clearcoat: 1, ior: 1.77, flatShading: true, envMapIntensity: 2.2 });
  const gemShape = new THREE.IcosahedronGeometry(0.068, 1);
  const ruby = new THREE.InstancedMesh(gemShape, stone("#b3122a", "#3d0008"), n / 2);
  const emerald = new THREE.InstancedMesh(gemShape, stone("#0f8a4f", "#02200f"), n / 2);
  const bezel = new THREE.InstancedMesh(new THREE.TorusGeometry(0.07, 0.016, 8, 28), shine, n);
  for (let k = 0; k < n; k++) {
    const u = (k / n) * Math.PI * 2, x = Math.cos(u), z = Math.sin(u);
    dummy.position.set(x * 1.095, 0, z * 1.095);
    dummy.lookAt(x * 5, 0, z * 5);
    dummy.scale.set(1, 1, 0.6);
    dummy.updateMatrix();
    (k % 2 ? emerald : ruby).setMatrixAt(k >> 1, dummy.matrix);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bezel.setMatrixAt(k, dummy.matrix);
  }
  studded.add(ruby, emerald, bezel);
  // Resting height and tilt of each bangle; the stage bobs them around these.
  [rope, beaded, studded].forEach((b, i) => {
    b.userData.rest = [0.6, 0.06, -0.5][i];
    b.rotation.set([0.07, -0.03, 0.05][i], 0, [0.04, -0.04, 0.05][i]);
    b.position.y = b.userData.rest;
    set.add(b);
  });
  const sparkle = glints(lite ? 12 : 22, (a, i) => {
    const u = Math.random() * Math.PI * 2, r = 1.05 + Math.random() * 0.1;
    a[i] = Math.cos(u) * r;
    a[i + 1] = (Math.random() - 0.5) * 1.4;
    a[i + 2] = Math.sin(u) * r;
  });
  set.add(sparkle);
  return set;
}

// A cast gold bar: a trapezoid section with softened edges, its long side along X. About 2.2 units long.
export function ingot() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.38, 0.42);
  s.lineTo(-0.38, 0.42);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.1, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 5, curveSegments: 1 });
  g.center();
  g.rotateY(Math.PI / 2);
  return g;
}

// A photo as a panel. It wipes up into view, eases its zoom, dissolves to a second photo and catches a gold sheen
// on hover, and sags slightly with scroll speed. `uShade` darkens the foot of the photo under a label.
export const photoVertex = /* glsl */ `
uniform float uVel;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.y += sin(uv.x * 3.14159) * uVel * 0.0012;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

export const photoFragment = /* glsl */ `
uniform sampler2D map;
uniform sampler2D map2;
uniform vec2 uImg;
uniform vec2 uImg2;
uniform vec2 uSize;
uniform float uReveal;
uniform float uHover;
uniform float uMix;
uniform float uShade;
varying vec2 vUv;
vec2 cover(vec2 uv, vec2 img) {
  float s = uSize.x / uSize.y, i = img.x / img.y;
  vec2 k = s > i ? vec2(1.0, i / s) : vec2(s / i, 1.0);
  return (uv - 0.5) * k + 0.5;
}
void main() {
  vec2 uv = (vUv - 0.5) * (1.0 - 0.06 * uHover) / (1.0 + (1.0 - uReveal) * 0.3) + 0.5;
  vec3 c = mix(texture2D(map, cover(uv, uImg)).rgb, texture2D(map2, cover(uv, uImg2)).rgb, uMix);
  float band = (vUv.x + vUv.y) * 0.5 - (uHover * 1.5 - 0.25);
  c += vec3(1.0, 0.86, 0.6) * exp(-band * band * 90.0) * uHover * (1.0 - uHover) * 1.2;
  c *= 1.0 - uShade * smoothstep(0.6, 0.0, vUv.y);
  float t = uReveal * 1.2;
  gl_FragColor = vec4(c, 1.0 - smoothstep(t - 0.2, t, vUv.y));
  #include <colorspace_fragment>
}`;

// Flat colour from the page, drawn as-is (no colour management) so it matches the CSS it replaces exactly.
export const flatVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const fillFragment = /* glsl */ `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`;
// The hero's CSS radial-gradient(120% 120% at 85% 0%, glow, deep 62%), in the same sRGB maths as the browser.
export const stageFragment = /* glsl */ `
uniform vec3 uGlow;
uniform vec3 uDeep;
varying vec2 vUv;
void main() {
  float d = length(vec2(vUv.x - 0.85, vUv.y - 1.0) / 1.2);
  gl_FragColor = vec4(mix(uGlow, uDeep, smoothstep(0.0, 0.62, d)), 1.0);
}`;
// Display-case glass: faint, with two reflection streaks that slide as the case turns.
export const glassFragment = /* glsl */ `
uniform float uTurn;
varying vec2 vUv;
void main() {
  float s = vUv.x * 0.8 + vUv.y * 0.6 - 0.35 - uTurn;
  float streak = smoothstep(0.1, 0.0, abs(s)) * 0.28 + smoothstep(0.03, 0.0, abs(s - 0.2)) * 0.22;
  gl_FragColor = vec4(vec3(1.0), 0.04 + streak);
}`;

// Gold dust drifting behind the page at different depths, so the background moves slower than the content.
export function dust(count: number) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() - 0.5;
    pos[i * 3 + 1] = Math.random();
    pos[i * 3 + 2] = -60 - Math.random() * 640;
    seed[i] = Math.random();
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScroll: { value: 0 }, uTime: { value: 0 }, uView: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 }, uColor: { value: new THREE.Color("#c9a045") } },
    vertexShader: /* glsl */ `attribute float seed; uniform float uScroll; uniform float uTime; uniform vec2 uView; uniform float uPx; varying float vA;
      void main(){ vec3 p = position;
        p.x *= uView.x * 1.4;
        p.y = mod(position.y * uView.y + uScroll * (0.15 + seed * 0.45) + sin(uTime * 0.2 + seed * 30.0) * 14.0, uView.y * 1.3) - uView.y * 0.65;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        vA = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(uTime * (0.5 + seed) + seed * 50.0), 3.0);
        gl_PointSize = (1.5 + seed * 2.5) * uPx; }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; varying float vA;
      void main(){ float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA * 0.75; gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(g, mat);
  points.frustumCulled = false;
  return points;
}
