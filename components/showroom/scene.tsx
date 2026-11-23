"use client";

import { advance, Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import Lenis from "lenis";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { awake, poke, registry, type Piece, type Spec } from ".";
import { bangles, dust, fillFragment, flatVertex, glassFragment, gold, ingot, photoFragment, photoVertex, stageFragment, studio } from "./gold";

// One canvas fixed behind the page. The camera is set so one world unit is one CSS pixel on the z = 0 plane, so a
// mesh placed from an element's getBoundingClientRect() sits exactly behind it, and depth is real perspective.

const FOV = 35;
const started = performance.now(); // pieces already on screen when the showroom starts appear at once
const motion = { vel: 0 }; // scroll speed in px per frame, for the photos' sag
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const camZ = (h: number) => h / 2 / Math.tan((FOV * Math.PI) / 360);
const onScreen = (r: DOMRect, h: number) => r.bottom > -80 && r.top < h + 80;
type Size = { width: number; height: number };
type Props = { piece: Piece; lite: boolean };

// Centres an object on an element's box at depth z. A deeper object is moved and scaled so it still covers the box.
function place(o: THREE.Object3D, r: DOMRect, size: Size, z = 0, fit = true) {
  const k = (camZ(size.height) - z) / camZ(size.height);
  o.position.set((r.left + r.width / 2 - size.width / 2) * k, (size.height / 2 - r.top - r.height / 2) * k, z);
  if (fit) o.scale.set(r.width * k, r.height * k, 1);
}

// "#84253a" or "rgb(244, 239, 232)" as raw 0–1 sRGB, for shaders that must match the CSS colour exactly.
function rgb(css: string) {
  const hex = css.trim().match(/^#([0-9a-f]{6})$/i);
  const n = hex ? parseInt(hex[1], 16) : 0;
  const [r, g, b] = hex ? [n >> 16, (n >> 8) & 255, n & 255] : (css.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]);
  return new THREE.Vector3(r / 255, g / 255, b / 255);
}

const textures = new Map<string, Promise<THREE.Texture>>();
function loadTexture(url: string) {
  let t = textures.get(url);
  if (!t) {
    t = new Promise((ok, fail) =>
      new THREE.TextureLoader().setCrossOrigin("anonymous").load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          ok(tex);
        },
        undefined,
        fail,
      ),
    );
    textures.set(url, t);
  }
  return t;
}

// A store photo from Cloudinary, sized to the element (in 200px steps, so pieces share downloads).
function usePhoto(src: string | undefined, el: HTMLElement) {
  const [tex, setTex] = useState<{ src: string; tex: THREE.Texture } | null>(null);
  useEffect(() => {
    if (!src) return;
    const width = clamp(Math.ceil((el.clientWidth * Math.min(devicePixelRatio, 2)) / 200) * 200, 400, 1600);
    let live = true;
    loadTexture(cloudinaryLoader({ src, width })).then(
      (t) => live && setTex({ src, tex: t }),
      () => {}, // the flat photo simply stays
    );
    return () => void (live = false);
  }, [src, el]);
  return tex && tex.src === src ? tex.tex : null;
}

const photoUniforms = () => ({
  map: { value: null as THREE.Texture | null },
  map2: { value: null as THREE.Texture | null },
  uImg: { value: new THREE.Vector2(1, 1) },
  uImg2: { value: new THREE.Vector2(1, 1) },
  uSize: { value: new THREE.Vector2(1, 1) },
  uReveal: { value: 0 },
  uHover: { value: 0 },
  uMix: { value: 0 },
  uShade: { value: 0 },
  uVel: { value: 0 },
});
type PhotoUniforms = ReturnType<typeof photoUniforms>;
const imgSize = (t: THREE.Texture) => {
  const i = t.image as HTMLImageElement;
  return new THREE.Vector2(i.naturalWidth || 1, i.naturalHeight || 1);
};

// Tells the page the 3D version is drawn, so the flat one underneath can step aside.
const ready = (piece: Piece) => void (piece.el.dataset.three = "ready");

// First sight of a photo: hand it its textures, then wipe it in, unless it was already on screen at start-up.
function show(piece: Piece, u: PhotoUniforms, tex: THREE.Texture, r: DOMRect, h: number) {
  u.map.value = tex;
  u.uImg.value.copy(imgSize(tex));
  if (piece.born < started && r.top < h) u.uReveal.value = 1;
  else gsap.to(u.uReveal, { value: 1, duration: 1.6, ease: "expo.out", onUpdate: () => poke(100) });
  ready(piece);
}

// A photo as a panel: tilts toward the cursor in real perspective, lifts, dissolves to its second photo.
function PhotoPanel({ piece, lite }: Props) {
  const spec = piece.spec as Extract<Spec, { kind: "photo" }>;
  const tex = usePhoto(spec.src, piece.el);
  const tex2 = usePhoto(spec.src2, piece.el);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const st = useRef({ shown: false, hover: 0, tx: 0, ty: 0 });
  const uniforms = useMemo(() => photoUniforms(), []);
  useFrame(({ size }, dt) => {
    const m = mesh.current, u = mat.current?.uniforms as PhotoUniforms | undefined;
    if (!m || !u || !tex) return;
    const r = piece.el.getBoundingClientRect();
    m.visible = onScreen(r, size.height);
    if (!m.visible) return;
    const s = st.current;
    if (!s.shown) {
      s.shown = true;
      u.uShade.value = spec.shade ?? 0;
      show(piece, u, tex, r, size.height);
    }
    u.map2.value = tex2 ?? tex;
    if (tex2) u.uImg2.value.copy(imgSize(tex2));
    const k = Math.min(1, dt * 6), want = piece.hover ? 1 : 0;
    s.hover += (want - s.hover) * k;
    s.tx += (piece.px - s.tx) * k;
    s.ty += (piece.py - s.ty) * k;
    if (Math.abs(want - s.hover) > 0.002) poke(100);
    place(m, r, size, s.hover * 40);
    let turn = s.tx * 0.25 * s.hover;
    if (spec.curve) {
      // The collection row bends like a curved showcase wall: panels toward the edges turn in and step back.
      const nx = clamp((r.left + r.width / 2 - size.width / 2) / (size.width / 2), -1.3, 1.3);
      turn -= nx * 0.35;
      m.position.z -= Math.abs(nx) * r.width * 0.3;
    }
    m.rotation.set(-s.ty * 0.2 * s.hover + (1 - u.uReveal.value) * 0.5, turn, 0);
    u.uHover.value = s.hover;
    u.uMix.value = tex2 ? s.hover : 0;
    u.uVel.value = lite ? 0 : motion.vel;
    u.uSize.value.set(r.width, r.height);
  });
  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[1, 1, lite ? 1 : 24, lite ? 1 : 24]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={photoVertex} fragmentShader={photoFragment} transparent />
    </mesh>
  );
}

// The home hero: the theme's studio backdrop with the three bangles turning above the headline.
function Stage({ piece, lite }: Props) {
  const back = useRef<THREE.Mesh>(null);
  const set = useRef<THREE.Group>(null);
  const model = useMemo(() => bangles(lite), [lite]);
  const uniforms = useMemo(() => ({ uGlow: { value: new THREE.Vector3() }, uDeep: { value: new THREE.Vector3() } }), []);
  const st = useRef({ ready: false, spin: -0.6, tx: 0, ty: 0 });
  useFrame(({ size, clock, gl }, dt) => {
    const b = back.current, g = set.current;
    if (!b || !g) return;
    const r = piece.el.getBoundingClientRect();
    b.visible = g.visible = onScreen(r, size.height);
    if (!b.visible) return;
    poke(120);
    const s = st.current;
    if (!s.ready) {
      s.ready = true;
      const css = getComputedStyle(document.documentElement);
      const u = (b.material as THREE.ShaderMaterial).uniforms;
      u.uGlow.value.copy(rgb(css.getPropertyValue("--hero-bg").match(/#[0-9a-f]{6}/i)?.[0] ?? "#84253a"));
      u.uDeep.value.copy(rgb(css.getPropertyValue("--hero-solid")));
      ready(piece);
    }
    place(b, r, size, -800);
    // The bangles fill the space above the headline, whatever the screen's shape.
    const text = (piece.el.querySelector(".hero-copy > *") ?? piece.el).getBoundingClientRect().top;
    const room = Math.max(text - r.top, r.height * 0.3);
    const p = clamp(-r.top / r.height, 0, 1); // how far the hero has scrolled away
    const k = Math.min(1, dt * 3);
    s.tx += ((piece.hover ? piece.px : 0) - s.tx) * k;
    s.ty += ((piece.hover ? piece.py : 0) - s.ty) * k;
    s.spin += dt * 0.25;
    // Wide screens have little room above the headline, so the bangles move beside it, larger.
    const side = r.width >= 1100 && r.width / r.height > 1.45;
    g.scale.setScalar(side ? Math.min(r.width * 0.092, r.height * 0.22) : Math.min(r.width * 0.24, room * 0.36));
    const x = side ? r.width * 0.85 : r.width / 2, y = side ? r.height * 0.46 : room * 0.5;
    // They drift down against the scroll, so they linger as the hero leaves.
    g.position.set(r.left + x - size.width / 2, size.height / 2 - r.top - y - p * r.height * 0.3, 0);
    g.rotation.set(0.62 - p * 0.7 + s.ty * 0.3, s.spin + s.tx * 0.6, 0.08);
    g.children.forEach((c, i) => {
      if (c.userData.rest === undefined) return;
      c.position.y = c.userData.rest + Math.sin(clock.elapsedTime * 0.7 + i * 1.7) * 0.025;
      c.rotation.y = i * 0.6 + s.spin * 0.12 * i;
    });
    const glint = (g.children.at(-1) as THREE.Points).material as THREE.ShaderMaterial;
    glint.uniforms.uTime.value = clock.elapsedTime;
    glint.uniforms.uPx.value = gl.getPixelRatio();
  });
  return (
    <>
      <mesh ref={back} visible={false} renderOrder={-2}>
        <planeGeometry />
        <shaderMaterial uniforms={uniforms} vertexShader={flatVertex} fragmentShader={stageFragment} depthWrite={false} />
      </mesh>
      <primitive ref={set} object={model} visible={false} />
    </>
  );
}

// The product photo in a glass display case with gold edges. It follows the pointer or finger, and sways when idle.
function Case({ piece, lite }: Props) {
  const spec = piece.spec as Extract<Spec, { kind: "case" }>;
  const tex = usePhoto(spec.src, piece.el);
  const group = useRef<THREE.Group>(null);
  const photo = useRef<THREE.ShaderMaterial>(null);
  const glass = useRef<THREE.ShaderMaterial>(null);
  const frame = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(() => photoUniforms(), []);
  const glassUniforms = useMemo(() => ({ uTurn: { value: 0 } }), []);
  const metal = useMemo(() => gold(0.2), []);
  const st = useRef({ shown: false, rx: 0, ry: 0, edge: new THREE.Object3D() });
  useFrame(({ size, clock }, dt) => {
    const g = group.current, u = photo.current?.uniforms as PhotoUniforms | undefined, f = frame.current, gu = glass.current?.uniforms;
    if (!g || !u || !f || !gu || !tex) return;
    const r = piece.el.getBoundingClientRect();
    g.visible = onScreen(r, size.height);
    if (!g.visible) return;
    poke(120);
    const s = st.current;
    if (!s.shown) {
      s.shown = true;
      u.map2.value = tex;
      show(piece, u, tex, r, size.height);
    }
    const w = r.width, h = r.height, d = w * (size.width < 900 ? 0.07 : 0.14), t = Math.max(3, w * 0.008);
    // The glass front lines up with the photo's box on the page, and the photo sits back inside the case.
    place(g, r, size, 0, false);
    g.scale.setScalar((camZ(size.height) - d) / camZ(size.height));
    g.children[0].scale.set(w, h, 1);
    g.children[1].scale.set(w, h, 1);
    g.children[1].position.z = d;
    // Twelve edges: the back and front rectangles, and the four posts between them.
    const bars: number[][] = [];
    for (const z of [0, d]) bars.push([0, h / 2, z, w + t, t, t], [0, -h / 2, z, w + t, t, t], [-w / 2, 0, z, t, h, t], [w / 2, 0, z, t, h, t]);
    for (const x of [-w / 2, w / 2]) for (const y of [-h / 2, h / 2]) bars.push([x, y, d / 2, t, t, d]);
    bars.forEach(([x, y, z, sx, sy, sz], i) => {
      s.edge.position.set(x, y, z);
      s.edge.scale.set(sx, sy, sz);
      s.edge.updateMatrix();
      f.setMatrixAt(i, s.edge.matrix);
    });
    f.instanceMatrix.needsUpdate = true;
    const active = performance.now() - piece.at < 1500;
    const tx = active ? piece.px : Math.sin(clock.elapsedTime * 0.4) * 0.15;
    const ty = active ? piece.py : Math.sin(clock.elapsedTime * 0.3) * 0.08;
    const k = Math.min(1, dt * 4);
    s.ry += (tx * 0.6 - s.ry) * k;
    s.rx += (ty * 0.4 - s.rx) * k;
    g.rotation.set(s.rx + (1 - u.uReveal.value) * 0.5, s.ry, 0);
    gu.uTurn.value = s.ry * 0.8;
    u.uSize.value.set(w, h);
    u.uVel.value = lite ? 0 : motion.vel * 0.5;
  });
  return (
    <group ref={group} visible={false}>
      <mesh>
        <planeGeometry args={[1, 1, lite ? 1 : 16, lite ? 1 : 16]} />
        <shaderMaterial ref={photo} uniforms={uniforms} vertexShader={photoVertex} fragmentShader={photoFragment} transparent />
      </mesh>
      <mesh>
        <planeGeometry />
        <shaderMaterial ref={glass} uniforms={glassUniforms} vertexShader={flatVertex} fragmentShader={glassFragment} transparent depthWrite={false} />
      </mesh>
      <instancedMesh ref={frame} args={[undefined, undefined, 12]} material={metal}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}

// The calculator's gold bar. Its size follows the weight typed in (by volume, so the cube root of the grams).
function Ingot({ piece }: Props) {
  const geometry = useMemo(() => ingot(), []);
  // Tipped so its top face catches the overhead softbox; a little rough so the flat faces glow rather than mirror the dark room.
  const metal = useMemo(() => Object.assign(gold(0.24), { envMapIntensity: 1.4 }), []);
  const mesh = useRef<THREE.Mesh>(null);
  const st = useRef({ ready: false, scale: 0, spin: 0.6 });
  useFrame(({ size }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const r = piece.el.getBoundingClientRect();
    m.visible = onScreen(r, size.height);
    if (!m.visible) return;
    poke(120);
    const s = st.current;
    if (!s.ready) {
      s.ready = true;
      ready(piece);
    }
    const grams = clamp(piece.live, 0, 1000);
    const want = grams > 0 ? r.height * 0.36 * clamp(Math.cbrt(grams / 10), 0.4, 2.4) : 0.001;
    s.scale += (want - s.scale) * Math.min(1, dt * 5);
    s.spin += dt * 0.35;
    place(m, r, size, 0, false);
    m.scale.setScalar(s.scale);
    m.rotation.set(0.8 + (piece.hover ? piece.py * 0.3 : 0), s.spin + (piece.hover ? piece.px * 0.8 : 0), 0.12);
  });
  return <mesh ref={mesh} geometry={geometry} material={metal} visible={false} />;
}

// A section's background colour, redrawn deep in the scene so photos inside the section can show in 3D.
function Fill({ piece }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Vector3() } }), []);
  const drawn = useRef(false);
  useFrame(({ size }) => {
    const m = mesh.current;
    if (!m) return;
    const r = piece.el.getBoundingClientRect();
    m.visible = onScreen(r, size.height);
    if (!m.visible) return;
    if (!drawn.current) {
      drawn.current = true;
      (m.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(rgb(getComputedStyle(piece.el).backgroundColor));
      ready(piece);
    }
    place(m, r, size, -800);
  });
  return (
    <mesh ref={mesh} visible={false} renderOrder={-2}>
      <planeGeometry />
      <shaderMaterial uniforms={uniforms} vertexShader={flatVertex} fragmentShader={fillFragment} depthWrite={false} />
    </mesh>
  );
}

// A heading's letters rise in, tipping forward, the first time it scrolls into view.
function Letters({ piece }: Props) {
  const done = useRef(false);
  useLayoutEffect(() => {
    const chars = piece.el.querySelectorAll(".split-char");
    const r = piece.el.getBoundingClientRect();
    if (piece.born < started && r.top < innerHeight && r.bottom > 0) {
      done.current = true;
      return;
    }
    gsap.set(chars, { yPercent: 110, rotateX: -75, opacity: 0 });
    return () => void gsap.set(chars, { clearProps: "all" });
  }, [piece]);
  useFrame(({ size }) => {
    if (done.current) return;
    const r = piece.el.getBoundingClientRect();
    if (r.top > size.height * 0.92 || r.bottom < 0) return;
    done.current = true;
    gsap.to(piece.el.querySelectorAll(".split-char"), { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.022 });
  });
  return null;
}

function Dust({ lite }: { lite: boolean }) {
  const points = useMemo(() => dust(lite ? 36 : 80), [lite]);
  const ref = useRef<THREE.Points>(null);
  useFrame(({ size, clock, gl }) => {
    const u = (ref.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    if (!u) return;
    u.uScroll.value = scrollY;
    u.uTime.value = clock.elapsedTime;
    u.uView.value.set(size.width, size.height);
    u.uPx.value = gl.getPixelRatio();
  });
  return <primitive ref={ref} object={points} />;
}

// Keeps the camera at the distance where one unit is one CSS pixel, and uses neutral tone mapping for true gold.
function Rig() {
  useFrame(({ camera, size, gl }) => {
    if (gl.toneMapping !== THREE.NeutralToneMapping) {
      gl.toneMapping = THREE.NeutralToneMapping;
      gl.toneMappingExposure = 1.1;
    }
    const z = camZ(size.height);
    if (camera.position.z !== z) {
      camera.position.set(0, 0, z);
      camera.far = z * 4;
      camera.updateProjectionMatrix();
    }
  }, -1);
  return null;
}

const views = { photo: PhotoPanel, stage: Stage, case: Case, ingot: Ingot, fill: Fill, text: Letters };

export default function Scene({ lite }: { lite: boolean }) {
  useSyncExternalStore(registry.subscribe, registry.version, registry.version);
  const pieces = registry.list();

  // One clock for everything: GSAP's ticker moves Lenis's smooth scroll, then draws the frame, so the 3D never
  // lags a frame behind the page. Phones keep their native scrolling.
  useEffect(() => {
    const lenis = lite ? null : new Lenis({ autoRaf: false, lerp: 0.12, anchors: { offset: -96 } });
    let lastY = scrollY;
    const tick = (time: number) => {
      lenis?.raf(time * 1000);
      motion.vel += (clamp(scrollY - lastY, -40, 40) - motion.vel) * 0.2;
      lastY = scrollY;
      if (Math.abs(motion.vel) > 0.05) poke(80);
      if (awake()) advance(time * 1000);
    };
    const wake = () => poke();
    gsap.ticker.add(tick);
    addEventListener("scroll", wake, { passive: true, capture: true }); // capture also hears sideways rows scrolling
    addEventListener("resize", wake);
    document.documentElement.dataset.three = "on";
    poke(1500);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      removeEventListener("scroll", wake, { capture: true });
      removeEventListener("resize", wake);
      delete document.documentElement.dataset.three;
    };
  }, [lite]);

  return (
    <Canvas
      frameloop="never"
      dpr={[1, lite ? 1.5 : 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: FOV, near: 5, far: 10000, position: [0, 0, 1000] }}
      onCreated={({ gl, scene }) => {
        scene.environment = studio(gl);
        poke();
      }}
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}
    >
      <Rig />
      <Dust lite={lite} />
      {pieces.map((p) => {
        const View = views[p.spec.kind];
        return <View key={p.id} piece={p} lite={lite} />;
      })}
    </Canvas>
  );
}
