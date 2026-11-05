// Procedural models made for the rooms: flames and fire, books, gears, the
// anvil and hammer, ravens, dice, scrolls, quill and inkpot, cloth banners and
// market stalls. Everything is built from three.js primitives and canvas
// textures, so no extra model files are needed.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CJK_SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif';

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let glowTex = null;
export function glowTexture() {
  if (!glowTex) {
    glowTex = canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    });
  }
  return glowTex;
}

export function glowSprite(color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

/** Break a string into lines that fit `maxWidth` (works for CJK, which has no spaces). */
export function wrapText(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------------------
// Flame: a camera-facing quad with a flickering teardrop shader
// ---------------------------------------------------------------------------
const flameVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
    mv.xy += position.xy * scale;
    gl_Position = projectionMatrix * mv;
  }`;
const flameFrag = `
  varying vec2 vUv;
  uniform float uTime; uniform float uSeed; uniform float uLean; uniform float uPower;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  void main() {
    vec2 p = vUv - vec2(0.5, 0.12);
    float y = clamp(p.y / 0.85, 0.0, 1.0);
    p.x -= uLean * y * y * 0.35;
    float wob = (n(vec2(y * 3.0 - uTime * 3.2, uSeed)) - 0.5) * 0.22 * y;
    p.x += wob;
    float width = 0.28 * (1.0 - y) * smoothstep(-0.12, 0.25, p.y) * (0.7 + 0.3 * uPower);
    float d = abs(p.x) / max(width, 0.001);
    float body = (1.0 - smoothstep(0.55, 1.0, d)) * step(-0.12, p.y) * (1.0 - smoothstep(0.75, 1.0, y / max(uPower, 0.3)));
    float core = (1.0 - smoothstep(0.0, 0.5, d)) * (1.0 - smoothstep(0.1, 0.55, y));
    vec3 col = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.78, 0.32), smoothstep(0.0, 0.7, 1.0 - d));
    col = mix(col, vec3(1.0, 0.97, 0.85), core);
    float a = body * (0.85 + 0.15 * n(vec2(uTime * 6.0, uSeed)));
    gl_FragColor = vec4(col * (1.2 + core), a);
  }`;

export function makeFlame({ size = 0.4, seed = Math.random() * 10 } = {}) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: flameVert, fragmentShader: flameFrag,
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uLean: { value: 0 }, uPower: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1).translate(0, 0.38, 0), mat);
  mesh.scale.set(size, size, size);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return {
    mesh,
    update(t, lean = 0, power = 1) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uLean.value = lean;
      mat.uniforms.uPower.value = power;
      mesh.visible = power > 0.02;
    },
  };
}

/** Fire: several flames, a glow, rising embers and a flickering point light. */
export function makeFire({ size = 1, light = true, embers = 40 } = {}) {
  const group = new THREE.Group();
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const f = makeFlame({ size: size * (i === 0 ? 1.25 : 0.7 + Math.random() * 0.3), seed: i * 3.7 });
    const a = (i / 5) * Math.PI * 2;
    f.mesh.position.set(i ? Math.cos(a) * 0.16 * size : 0, 0, i ? Math.sin(a) * 0.12 * size : 0);
    group.add(f.mesh);
    flames.push(f);
  }
  const glow = glowSprite(0xff8a3c, size * 2.2, 0.55);
  glow.position.y = size * 0.35;
  group.add(glow);

  const n = embers;
  const pos = new Float32Array(n * 3);
  const life = new Float32Array(n).map(() => Math.random());
  const seeds = new Float32Array(n).map(() => Math.random());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTexture(), color: 0xffa040, size: 0.07 * size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false;
  group.add(points);

  let pl = null;
  if (light) {
    pl = new THREE.PointLight(0xff8a3c, 6, 9 * size, 1.6);
    pl.position.y = size * 0.5;
    pl.castShadow = false;
    group.add(pl);
  }
  let burst = 0;
  return {
    group, light: pl,
    flare() { burst = 1; },
    update(t, dt, power = 1, lean = 0) {
      burst = Math.max(0, burst - dt * 0.7);
      const p = power + burst * 0.9;
      flames.forEach((f, i) => f.update(t + i * 0.3, lean + Math.sin(t * 1.3 + i) * 0.15, p * (i === 0 ? 1 : 0.8)));
      glow.material.opacity = 0.35 + 0.25 * p + Math.sin(t * 9) * 0.04;
      glow.scale.setScalar(size * (1.6 + p * 0.8));
      if (pl) pl.intensity = (4 + 4 * p) * (0.86 + Math.sin(t * 11) * 0.06 + Math.sin(t * 17.3) * 0.05);
      const speed = 0.35 + p * 0.5;
      for (let i = 0; i < n; i++) {
        life[i] += dt * speed * (0.5 + seeds[i]);
        if (life[i] > 1) { life[i] -= 1; seeds[i] = Math.random(); }
        const k = life[i];
        pos[i * 3] = Math.sin(seeds[i] * 40 + t * 2) * 0.25 * size * k + (seeds[i] - 0.5) * 0.3 * size;
        pos[i * 3 + 1] = k * size * (1.5 + p);
        pos[i * 3 + 2] = Math.cos(seeds[i] * 30 + t * 1.7) * 0.2 * size * k;
      }
      geo.attributes.position.needsUpdate = true;
      points.material.opacity = 0.9 * Math.min(1, p);
    },
  };
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------
const LEATHER = ['#7a2a1e', '#2f4a3a', '#2c3e5c', '#5b3a22', '#6a4a1c', '#3d2a3f', '#4a1f1f', '#36474a'];

/** A closed book standing upright; the spine faces +z. */
export function makeBook({ w = 0.16, h = 0.62, d = 0.46, color, title = '', sub = '', rand = Math.random, gilt = false } = {}) {
  const leather = color || LEATHER[Math.floor(rand() * LEATHER.length)];
  const spine = canvasTexture(64, 256, (g, W, H) => {
    g.fillStyle = leather; g.fillRect(0, 0, W, H);
    // leather grain
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${rand() * 0.12})`; g.fillRect(rand() * W, rand() * H, 2, 2); }
    g.fillStyle = gilt ? '#d9b25f' : 'rgba(210,170,88,.55)';
    [18, 26, H - 26, H - 18].forEach((y) => g.fillRect(4, y, W - 8, 3));
    if (title) {
      g.fillStyle = '#e8c977';
      g.font = `700 30px ${CJK_SERIF}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...title].slice(0, 6);
      const step = Math.min(32, (H - 90) / chars.length);
      chars.forEach((ch, i) => g.fillText(ch, W / 2, 50 + i * step + step / 2));
      if (sub) { g.font = `600 13px "Cinzel",serif`; g.fillText(sub, W / 2, H - 40); }
    }
  });
  const cover = new THREE.MeshStandardMaterial({ color: leather, roughness: 0.75 });
  const spineMat = new THREE.MeshStandardMaterial({ map: spine, roughness: 0.7 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xe9dcb9, roughness: 0.9 });
  // face order: +x, -x, +y, -y, +z (spine), -z (fore-edge)
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [cover, cover, pages, pages, spineMat, pages]);
  box.position.y = h / 2;
  box.castShadow = true; box.receiveShadow = true;
  const g = new THREE.Group();
  g.add(box);
  g.userData.size = { w, h, d };
  return g;
}

// ---------------------------------------------------------------------------
// Gears
// ---------------------------------------------------------------------------
export function makeGear({ teeth = 16, module = 0.12, thickness = 0.12, color = 0x8a6a3a, spokes = 4, metalness = 0.3 } = {}) {
  const pitch = (teeth * module) / 2;
  const outer = pitch + module;
  const root = pitch - module * 1.25;
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[root, a - step * 0.5], [root, a - step * 0.26], [outer, a - step * 0.14], [outer, a + step * 0.14], [root, a + step * 0.26]];
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && k === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  // spoke holes
  const hubR = Math.max(module * 1.6, root * 0.22);
  const rimR = root * 0.78;
  if (spokes > 0 && rimR - hubR > module) {
    for (let s = 0; s < spokes; s++) {
      const a0 = (s / spokes) * Math.PI * 2 + 0.22, a1 = ((s + 1) / spokes) * Math.PI * 2 - 0.22;
      const hole = new THREE.Path();
      hole.absarc(0, 0, rimR, a0, a1, false);
      hole.absarc(0, 0, hubR * 1.6, a1, a0, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const axle = new THREE.Path();
  axle.absarc(0, 0, module * 0.6, 0, Math.PI * 2, true);
  shape.holes.push(axle);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 10 });
  geo.translate(0, 0, -thickness / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.45 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  g.userData = { teeth, module, pitch };
  return g;
}

// ---------------------------------------------------------------------------
// Anvil, hammer, stump
// ---------------------------------------------------------------------------
export function makeAnvil() {
  const s = new THREE.Shape();
  // side profile in the x/y plane (horn to the left)
  s.moveTo(-0.95, 0.78);
  s.quadraticCurveTo(-0.55, 0.66, -0.38, 0.62);
  s.lineTo(-0.36, 0.5);
  s.quadraticCurveTo(-0.22, 0.42, -0.2, 0.28);
  s.lineTo(-0.34, 0.12); s.lineTo(-0.38, 0); s.lineTo(0.38, 0); s.lineTo(0.34, 0.12); s.lineTo(0.2, 0.28);
  s.quadraticCurveTo(0.22, 0.42, 0.36, 0.5);
  s.lineTo(0.6, 0.52); s.lineTo(0.6, 0.78);
  s.lineTo(-0.95, 0.78);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -0.17);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a5d64, metalness: 0.35, roughness: 0.42 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.6, 14), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 }));
  stump.position.y = 0.3;
  stump.castShadow = true; stump.receiveShadow = true;
  mesh.position.y = 0.6;
  const g = new THREE.Group();
  g.add(stump, mesh);
  g.userData.top = 0.6 + 0.8;
  return g;
}

export function makeHammer() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 }));
  handle.position.y = 0.35;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.11), new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.35, roughness: 0.4 }));
  head.position.y = 0.7;
  handle.castShadow = head.castShadow = true;
  g.add(handle, head);
  return g;   // pivot at the grip end
}

// ---------------------------------------------------------------------------
// Raven
// ---------------------------------------------------------------------------
// A low-poly raven built from a lathed body, a wedge tail, fingered wings
// with real thickness, a heavy two-part beak, shaggy throat hackles, and
// legs with four toes. Faces +z, feet at y = 0, about 0.6 units tall.
// Wing pivots use Euler order ZYX: x = roll around the span, y = sweep
// back, z = raise/flap around the body axis.

function featherMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x16141b, roughness: 0.5, metalness: 0.04, flatShading: true,
    sheen: 0.45, sheenColor: new THREE.Color(0x34457a), sheenRoughness: 0.45,
  });
}

/** Wing outline in its own plane: x along the span, y toward the trailing edge (negative). */
function wingShape(L) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.02);
  s.quadraticCurveTo(L * 0.3, 0.07, L * 0.55, 0.035);       // leading edge, wrist bump
  s.quadraticCurveTo(L * 0.82, 0.0, L, -0.07);              // hand to the tip
  // primaries: five fingers stepping back from the tip
  const fingers = 5;
  for (let i = 0; i < fingers; i++) {
    const k = i / fingers;
    const x0 = L * (1 - k * 0.42), y0 = -0.07 - k * 0.16;
    s.lineTo(x0 - L * 0.035, y0 - 0.02);
    s.lineTo(x0 - L * 0.085, y0 - 0.075);
  }
  // secondaries: soft scallops back to the body
  const sx = L * 0.5, sy = -0.29;
  s.lineTo(sx, sy);
  for (let i = 1; i <= 4; i++) {
    const x = sx * (1 - i / 4);
    s.quadraticCurveTo(x + sx / 8, sy - 0.035, x, sy + 0.01 + i * 0.012);
  }
  s.lineTo(0, -0.17);
  s.lineTo(0, 0.02);
  return s;
}

export function makeRaven() {
  const feather = featherMaterial();
  const wingMat = feather.clone();
  wingMat.side = THREE.DoubleSide;
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x1f1c1f, roughness: 0.35, metalness: 0.1, flatShading: true });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0b0a0c, roughness: 0.1 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2826, roughness: 0.6, flatShading: true });
  const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  const g = new THREE.Group();

  // torso: everything that pitches with the body
  const torso = new THREE.Group();
  torso.position.set(0, 0.3, 0);
  torso.rotation.x = -0.5;            // chest up, tail down, as a perched bird sits
  g.add(torso);

  // body: lathe profile along the bird's length (rear -> chest)
  const prof = [[0, -0.27], [0.05, -0.25], [0.1, -0.17], [0.14, -0.06], [0.155, 0.04], [0.145, 0.12], [0.11, 0.19], [0.06, 0.23], [0, 0.24]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const bodyGeo = new THREE.LatheGeometry(prof, 9);
  bodyGeo.rotateX(Math.PI / 2);       // lathe axis y -> bird axis z
  bodyGeo.scale(0.88, 1, 1);          // a little narrower than deep
  const body = shadow(new THREE.Mesh(bodyGeo, feather));
  torso.add(body);

  // tail: a wedge of overlapping feathers, extruded for thickness
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.015, -0.22);
  const ts = new THREE.Shape();
  ts.moveTo(-0.05, 0); ts.lineTo(0.05, 0); ts.lineTo(0.085, -0.17); ts.lineTo(0.05, -0.24); ts.lineTo(0, -0.27); ts.lineTo(-0.05, -0.24); ts.lineTo(-0.085, -0.17); ts.lineTo(-0.05, 0);
  const tailGeo = new THREE.ExtrudeGeometry(ts, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
  tailGeo.translate(0, 0, -0.02);
  tailGeo.rotateX(Math.PI / 2);       // shape y (toward the tip) -> -z
  const tail = shadow(new THREE.Mesh(tailGeo, feather));
  tailPivot.add(tail);
  tailPivot.rotation.x = 0.3;
  tailPivot.userData.rest = 0.3;
  torso.add(tailPivot);

  // wings
  const L = 0.6;
  const wingGeo = new THREE.ExtrudeGeometry(wingShape(L), { depth: 0.014, bevelEnabled: false, curveSegments: 4 });
  wingGeo.translate(0, 0, -0.007);
  wingGeo.rotateX(Math.PI / 2);       // chord -> -z (backward)
  // a little camber: lift the middle of the chord
  const wp = wingGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), z = wp.getZ(i);
    wp.setY(i, wp.getY(i) + Math.sin(Math.min(1, Math.max(0, -z / 0.3)) * Math.PI) * 0.018 * (1 - (x / L) * 0.5));
  }
  wingGeo.computeVertexNormals();
  const mkWing = (side) => {
    const pivot = new THREE.Group();
    pivot.rotation.order = 'ZYX';
    pivot.position.set(0.09 * side, 0.1, 0.13);
    const m = shadow(new THREE.Mesh(wingGeo, wingMat));
    m.scale.x = side;
    pivot.add(m);
    pivot.userData.side = side;
    torso.add(pivot);
    return pivot;
  };
  const wingL = mkWing(1), wingR = mkWing(-1);

  // head: kept level, so it lives outside the pitched torso
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.15);
  g.add(head);
  const skullGeo = new THREE.IcosahedronGeometry(0.095, 1);
  skullGeo.scale(0.88, 0.92, 1.12);
  const skull = shadow(new THREE.Mesh(skullGeo, feather));
  head.add(skull);
  // throat hackles: a shaggy beard under the beak
  const hackleGeo = new THREE.ConeGeometry(0.06, 0.13, 5);
  hackleGeo.rotateX(Math.PI * 0.82);
  const hackles = shadow(new THREE.Mesh(hackleGeo, feather));
  hackles.position.set(0, -0.07, 0.04);
  head.add(hackles);
  // heavy beak: upper mandible curves down at the tip, lower one can open
  const upperGeo = new THREE.ConeGeometry(0.042, 0.16, 5, 3);
  upperGeo.rotateX(Math.PI / 2);
  upperGeo.translate(0, 0, 0.085);
  const up = upperGeo.attributes.position;
  for (let i = 0; i < up.count; i++) {
    const z = up.getZ(i);
    up.setY(i, up.getY(i) * 1.15 - Math.pow(Math.max(0, z) / 0.17, 2.2) * 0.03);
  }
  upperGeo.computeVertexNormals();
  const upper = shadow(new THREE.Mesh(upperGeo, beakMat));
  upper.position.set(0, 0.0, 0.075);
  head.add(upper);
  const lowerPivot = new THREE.Group();
  lowerPivot.position.set(0, -0.022, 0.07);
  const lowerGeo = new THREE.ConeGeometry(0.026, 0.13, 5);
  lowerGeo.rotateX(Math.PI / 2);
  lowerGeo.translate(0, 0, 0.065);
  lowerGeo.scale(1, 0.7, 1);
  const lower = shadow(new THREE.Mesh(lowerGeo, beakMat));
  lowerPivot.add(lower);
  head.add(lowerPivot);
  // eyes with a catch-light
  const eyes = [1, -1].map((s) => {
    const e = new THREE.Group();
    e.position.set(0.062 * s, 0.025, 0.055);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), eyeMat);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 4, 3), shineMat);
    shine.position.set(0.008 * s, 0.006, 0.01);
    e.add(ball, shine);
    head.add(e);
    return e;
  });

  // legs and feet: three toes forward, one back
  const legs = [-0.05, 0.05].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0, 0.02);
    const tarsus = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.17, 5), legMat));
    tarsus.position.y = 0.09;
    tarsus.rotation.x = 0.12;
    leg.add(tarsus);
    const toe = (yaw, len) => {
      const geo = new THREE.CylinderGeometry(0.006, 0.008, len, 4);
      geo.translate(0, len / 2, 0);
      const t = shadow(new THREE.Mesh(geo, legMat));
      t.rotation.set(Math.PI / 2 - 0.08, 0, 0);
      const holder = new THREE.Group();
      holder.rotation.y = yaw;
      holder.position.y = 0.008;
      holder.add(t);
      leg.add(holder);
    };
    toe(-0.35, 0.07); toe(0, 0.08); toe(0.35, 0.07); toe(Math.PI, 0.05);
    g.add(leg);
    return leg;
  });

  return { group: g, torso, body, head, wingL, wingR, tail: tailPivot, beak: lowerPivot, eyes, legs };
}

const lerp = (a, b, k) => a + (b - a) * k;

/** Pose wings: open = 0 folded along the body .. 1 spread for flight; flap adds a beat. */
export function poseRaven(r, open, flap = 0) {
  const roll = lerp(-1.22, -0.04, open);
  const sweep = lerp(1.66, 0.2, open);
  const raise = lerp(0.1, 0.18, open) + flap * open;
  // a folded wing tucks the hand under the arm, so it is much shorter
  const span = lerp(0.62, 1, open);
  for (const w of [r.wingL, r.wingR]) {
    const s = w.userData.side;
    w.rotation.set(roll, sweep * s, raise * s);
    w.children[0].scale.set(s * span, 1, lerp(0.85, 1, open));
  }
  // lift the tail a little in flight
  r.tail.rotation.x = r.tail.userData.rest - open * 0.1;
}

/** Open the beak (0 closed .. 1 wide) and blink (0 open .. 1 shut). */
export function faceRaven(r, beak = 0, blink = 0) {
  r.beak.rotation.x = beak * 0.45;
  for (const e of r.eyes) e.scale.y = Math.max(0.1, 1 - blink);
}

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------
// Face value per BoxGeometry group: +x, -x, +y, -y, +z, -z (opposites sum to 7).
export const DIE_FACES = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export function makeDie(size = 0.32, color = '#efe3c6', pip = '#5a1a14') {
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  const mats = DIE_FACES.map((v) => new THREE.MeshStandardMaterial({
    roughness: 0.45,
    map: canvasTexture(128, 128, (g) => {
      g.fillStyle = color; g.fillRect(0, 0, 128, 128);
      g.fillStyle = v === 1 ? '#8e2a22' : pip;
      for (const [x, y] of PIPS[v]) { g.beginPath(); g.arc(64 + x * 32, 64 + y * 32, v === 1 ? 17 : 11, 0, Math.PI * 2); g.fill(); }
    }),
  }));
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 3, size * 0.14), mats);
  mesh.castShadow = true;
  return mesh;
}

/** Quaternion that turns the face showing `value` to +y. */
export function dieRestQuaternion(value, spinY = 0) {
  const i = DIE_FACES.indexOf(value);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...FACE_NORMALS[i]), new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinY).multiply(q);
}

// ---------------------------------------------------------------------------
// Scroll, quill, inkpot
// ---------------------------------------------------------------------------
export function makeScroll({ length = 0.5, radius = 0.05, color = 0xe8d7ae, ribbon = 0x8e2a22 } = {}) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  paper.rotation.z = Math.PI / 2;
  const tie = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.04, radius * 0.18, 6, 16), new THREE.MeshStandardMaterial({ color: ribbon, roughness: 0.6 }));
  tie.rotation.y = Math.PI / 2;
  const ends = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a20 })); e.rotation.z = Math.PI / 2; e.position.x = s * (length / 2 + 0.02); return e; });
  [paper, tie, ...ends].forEach((m) => { m.castShadow = true; g.add(m); });
  return g;
}

export function makeQuill() {
  const g = new THREE.Group();
  const fs = new THREE.Shape();
  fs.moveTo(0, 0); fs.quadraticCurveTo(0.07, 0.25, 0.02, 0.62); fs.quadraticCurveTo(-0.03, 0.4, -0.05, 0.18); fs.lineTo(0, 0);
  const vane = new THREE.Mesh(new THREE.ShapeGeometry(fs, 10), new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.8, side: THREE.DoubleSide }));
  vane.position.y = 0.12;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.78, 5), new THREE.MeshStandardMaterial({ color: 0xd8cfb8 }));
  shaft.position.y = 0.39;
  g.add(vane, shaft);
  return g;
}

export function makeInkpot() {
  const pts = [[0, 0], [0.09, 0], [0.1, 0.02], [0.1, 0.1], [0.06, 0.14], [0.045, 0.15], [0.045, 0.18], [0.05, 0.19], [0, 0.19]].map(([x, y]) => new THREE.Vector2(x, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), new THREE.MeshPhysicalMaterial({ color: 0x1d2433, roughness: 0.15, metalness: 0.1, clearcoat: 1 }));
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Cloth: banners and awnings that ripple
// ---------------------------------------------------------------------------
/** A banner hanging from its top edge, origin at top centre. */
export function makeCloth(map, w = 0.6, h = 0.9, { swallow = false, seg = [10, 14] } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, seg[0], seg[1]);
  geo.translate(0, -h / 2, 0);
  const p = geo.attributes.position;
  if (swallow) {
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (w / 2), y = -p.getY(i) / h;  // y: 0 top .. 1 bottom
      const notch = 1 - 0.22 * (1 - Math.abs(x));
      if (y > notch) p.setY(i, -notch * h);
    }
  }
  const base = Float32Array.from(p.array);
  const mat = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return {
    mesh,
    update(t, wind = 1, phase = 0) {
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const k = -y / h;                       // 0 at the rod
        p.setZ(i, Math.sin(t * 2.1 + x * 4 + k * 3 + phase) * 0.05 * k * wind + Math.sin(t * 3.3 + k * 6 + phase) * 0.025 * k * wind);
        p.setX(i, x + Math.sin(t * 1.4 + phase) * 0.03 * k * k * wind);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

/** Market stall: four posts, a counter and a striped scalloped awning. */
export function makeStall({ w = 2.2, d = 1.2, h = 1.9, stripes = ['#8e2a22', '#efe3c6'] } = {}) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.85 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), wood);
    post.position.set(sx * (w / 2 - 0.05), h / 2, sz * (d / 2 - 0.05));
    post.castShadow = true;
    g.add(post);
  }
  const counter = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d * 0.55), wood);
  counter.position.set(0, 0.35, d * 0.2);
  counter.castShadow = counter.receiveShadow = true;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.06, d * 0.6), new THREE.MeshStandardMaterial({ color: 0x9a6b40, roughness: 0.8 }));
  top.position.set(0, 0.73, d * 0.2);
  top.receiveShadow = true;
  g.add(counter, top);
  const tex = canvasTexture(512, 256, (c, W, H) => {
    const n = 8;
    for (let i = 0; i < n; i++) { c.fillStyle = stripes[i % stripes.length]; c.fillRect((i * W) / n, 0, W / n + 1, H); }
    c.fillStyle = 'rgba(0,0,0,.08)';
    for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
  });
  tex.wrapS = THREE.RepeatWrapping;
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.3, d + 0.4, 12, 6), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
  awning.rotation.x = -Math.PI / 2 + 0.32;
  awning.position.set(0, h + 0.05, 0.05);
  awning.castShadow = true;
  // scalloped valance
  const val = canvasTexture(512, 64, (c, W, H) => {
    const n = 12;
    for (let i = 0; i < n; i++) {
      c.fillStyle = stripes[i % stripes.length];
      c.beginPath(); c.moveTo((i * W) / n, 0); c.lineTo(((i + 1) * W) / n, 0); c.lineTo(((i + 1) * W) / n, H * 0.5);
      c.arc(((i + 0.5) * W) / n, H * 0.5, W / n / 2, 0, Math.PI); c.closePath(); c.fill();
    }
  });
  const valance = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.3, 0.22), new THREE.MeshStandardMaterial({ map: val, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  valance.position.set(0, h - 0.13, d / 2 + 0.25);
  g.add(awning, valance);
  g.userData.awning = awning;
  return g;
}

/** Grade the KayKit atlas material toward the site's palette. */
export function gradeMaterial(mat, sat = 0.78, tint = [1.04, 0.98, 0.9]) {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, ${sat.toFixed(2)}) * vec3(${tint.map((x) => x.toFixed(2)).join(',')});`);
  };
  mat.customProgramCacheKey = () => `graded-${sat}-${tint.join(',')}`;
  mat.needsUpdate = true;
}

/** Apply gradeMaterial to every distinct material in a library. */
export function gradeLibrary(lib, sat, tint) {
  const seen = new Set();
  for (const root of Object.values(lib)) root.traverse((o) => {
    if (o.isMesh && !seen.has(o.material)) { seen.add(o.material); gradeMaterial(o.material, sat, tint); }
  });
}
