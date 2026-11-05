// Estate diorama for the homepage hero.
//
// Builds a floating hex-tile manor from the KayKit Medieval Hexagon Pack (CC0,
// Kay Lousberg) plus a few procedural models made for this site: the rock
// underside of the island, the waterfall, the HE banner on the keep, and the
// ravens. Buildings double as a map: each one links to a part of the blog.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { makeRaven, poseRaven } from './props.js';
const ROW = Math.sqrt(3);          // z distance between hex rows (pointy-top, inradius 1)
const DEG = Math.PI / 180;

// Axial hex coordinate -> world position (tile centre on the ground plane).
const hexPos = (q, r) => new THREE.Vector3(2 * q + r, 0, ROW * r);
const key = (q, r) => q + ',' + r;

// Small deterministic RNG so the decoration is identical on every visit.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Map layout. rot is in multiples of 60 degrees (counter-clockwise from above).
// ---------------------------------------------------------------------------
const RADIUS = 4;

const SPOTS = {
  keep:        { q: 0,  r: 0,  model: 'building_castle_red',       rot: 0 },
  scriptorium: { q: -2, r: 0,  model: 'building_church_red',       rot: 0 },
  workshop:    { q: 2,  r: -1, model: 'building_blacksmith_red',   rot: -1 },
  inn:         { q: -1, r: 3,  model: 'building_tavern_red',       rot: 0 },
  market:      { q: 1,  r: 1,  model: 'building_market_red',       rot: 0 },
  rookery:     { q: 4,  r: -2, model: 'building_tower_B_red',      rot: 0 },
};

// Hand-placed tiles. Anything not listed becomes grass with seeded decoration.
const TILES = {
  // roads from the keep
  [key(-1, 0)]: { tile: 'hex_road_A', rot: 0 },
  [key(1, 0)]:  { tile: 'hex_road_B', rot: 0 },
  [key(0, 1)]:  { tile: 'hex_road_A', rot: 2 },
  [key(0, 2)]:  { tile: 'hex_river_crossing_A', rot: 0 },
  [key(0, 3)]:  { tile: 'hex_road_A', rot: 2 },
  [key(0, 4)]:  { tile: 'hex_road_M', rot: -1 },
  // the river, from the mill pond in the west to the waterfall in the east
  [key(-4, 2)]: { tile: 'hex_water', rot: 0, items: [['waterlily_A', 0.3, -0.2, 0], ['waterplant_A', -0.4, 0.3, 0]] },
  [key(-3, 2)]: { tile: 'hex_river_A', rot: 0 },
  [key(-2, 2)]: { tile: 'hex_river_A_curvy', rot: 0 },
  [key(-1, 2)]: { tile: 'hex_river_A', rot: 0 },
  [key(1, 2)]:  { tile: 'hex_river_A_curvy', rot: 3 },
  [key(2, 2)]:  { tile: 'hex_river_A', rot: 0 },
  // farmland and the windmill
  [key(-3, 3)]: { items: [['building_windmill_red', 0, 0, 0]] },
  [key(-2, 3)]: { items: [['building_grain', 0, 0, 0]] },
  [key(-4, 3)]: { items: [['building_grain', 0, 0, 1]] },
  [key(-3, 4)]: { items: [['building_grain', 0, 0, 0]] },
  [key(-4, 4)]: { items: [['trees_A_small', 0, 0, 2]] },
  [key(-1, 4)]: { items: [['building_grain', 0, 0, 1]] },
  [key(-2, 4)]: { items: [['building_dirt', 0, 0, 0], ['wheelbarrow', 0.3, 0.2, 1], ['sack', -0.4, -0.1, 0]] },
  // village
  [key(-2, 1)]: { items: [['building_watermill_red', 0, 0, 0]] },
  [key(1, -1)]: { items: [['building_well_red', 0, 0, 0], ['barrel', 0.6, 0.4, 0]] },
  [key(-1, 1)]: { items: [['building_home_A_red', 0, 0, 0]] },
  [key(1, 3)]:  { items: [['building_home_B_red', 0, 0, 2]] },
  [key(-1, -1)]: { items: [['building_home_B_red', 0, 0, 0]] },
  [key(3, -1)]: { items: [['building_home_A_red', 0, 0, -1]] },
  [key(-2, -1)]: { items: [['building_lumbermill_red', 0, 0, 0], ['resource_lumber', 0.7, 0.5, 1]] },
  [key(3, 0)]:  { items: [['tent', -0.2, 0.1, -1], ['target', 0.5, -0.4, -1], ['weaponrack', -0.6, -0.5, 0]] },
  [key(2, 1)]:  { items: [['building_archeryrange_red', 0, 0, -1]] },
  // the north: forest and mountains behind the keep
  [key(0, -4)]: { items: [['mountain_A_grass_trees', 0, 0, 0]] },
  [key(1, -4)]: { items: [['mountain_C_grass_trees', 0, 0, 1]] },
  [key(-1, -3)]: { items: [['mountain_B_grass', 0, 0, 2]] },
  [key(2, -4)]: { items: [['hills_A_trees', 0, 0, 0]] },
  [key(-4, 0)]: { items: [['mountain_C_grass_trees', 0, 0, 3]] },
  [key(-3, -1)]: { items: [['mountain_A_grass_trees', 0, 0, 1]] },
};

const FOREST = ['trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium', 'hills_B_trees'];
const MEADOW = ['tree_single_A', 'tree_single_B', 'trees_A_small', 'trees_B_small', 'rock_single_A', 'rock_single_C', 'hill_single_A', 'hill_single_B'];

// Colour grade applied to the KayKit atlas so the toy-bright palette sits
// closer to vellum, oak and faded heraldry.
function gradeMaterial(mat, grade) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSat = grade.sat;
    shader.uniforms.uTint = grade.tint;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSat;\nuniform vec3 uTint;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, uSat) * uTint;`);
  };
  mat.customProgramCacheKey = () => 'graded';
}

// ---------------------------------------------------------------------------
// Procedural models made for this page
// ---------------------------------------------------------------------------

// Rocky underside that turns the tile map into a floating island.
function makeIslandRock(rand) {
  const rings = [
    { y: -0.92, r: 8.3, c: 0x7b5b3c },
    { y: -2.1, r: 7.7, c: 0x6e5137 },
    { y: -3.5, r: 6.1, c: 0x5f5a54 },
    { y: -5.1, r: 4.1, c: 0x56514c },
    { y: -6.7, r: 2.2, c: 0x4a4541 },
    { y: -8.0, r: 0.8, c: 0x413d3a },
  ];
  const seg = 26;
  const pts = rings.map((ring, i) => {
    const row = [];
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2 + (i % 2) * (Math.PI / seg);
      const rr = ring.r * (i === 0 ? 1 : 0.84 + rand() * 0.3);
      row.push(new THREE.Vector3(Math.cos(a) * rr, ring.y + (i ? (rand() - 0.5) * 0.5 : 0), Math.sin(a) * rr));
    }
    return row;
  });
  const tip = new THREE.Vector3((rand() - 0.5) * 0.6, -9.3, (rand() - 0.5) * 0.6);
  const pos = [], col = [];
  const color = new THREE.Color();
  const tri = (a, b, c, hex) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    color.setHex(hex).multiplyScalar(0.86 + rand() * 0.28);
    for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
  };
  for (let i = 0; i < pts.length - 1; i++) {
    for (let s = 0; s < seg; s++) {
      const a = pts[i][s], b = pts[i][(s + 1) % seg], c = pts[i + 1][s], d = pts[i + 1][(s + 1) % seg];
      tri(a, c, b, rings[i].c);
      tri(b, c, d, rings[i + 1].c);
    }
  }
  const last = pts[pts.length - 1];
  for (let s = 0; s < seg; s++) tri(last[s], tip, last[(s + 1) % seg], 0x3a3633);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
}

// A few loose boulders orbiting under the island.
function makeFloatingRocks(rand) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5d5752, flatShading: true, roughness: 1 });
  const top = new THREE.MeshStandardMaterial({ color: 0x8a8f3c, flatShading: true, roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const s = 0.35 + rand() * 0.5;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
    rock.scale.y = 1.5;
    rock.position.y = -s * 0.6;
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.95, s * 0.8, s * 0.22, 6), top);
    g.add(rock, grass);
    const a = (i / 4) * Math.PI * 2 + rand();
    g.userData = { a, rad: 7.2 + rand() * 1.8, y: -3.8 - rand() * 2.4, speed: 0.04 + rand() * 0.03, bob: rand() * 6 };
    group.add(g);
  }
  return group;
}

// Waterfall pouring off the east end of the river.
function makeWaterfall() {
  const segs = 40;
  const geo = new THREE.PlaneGeometry(1, 1, 1, segs);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = 0.5 - p.getY(i);                    // 0 at the lip, 1 at the bottom
    const w = p.getX(i) * (0.82 + t * 0.55);
    p.setXYZ(i, Math.sqrt(t) * 1.3, -0.18 - Math.pow(t, 1.7) * 9.0, w);
  }
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uNight;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float t = 1.0 - vUv.y;
        float streak = n(vec2(vUv.x * 14.0, t * 6.0 - uTime * 2.4)) * 0.6 + n(vec2(vUv.x * 30.0, t * 12.0 - uTime * 3.6)) * 0.4;
        vec3 deep = mix(vec3(0.33,0.55,0.66), vec3(0.16,0.25,0.38), uNight);
        vec3 foam = mix(vec3(0.95,0.97,0.94), vec3(0.62,0.70,0.82), uNight);
        vec3 c = mix(deep, foam, smoothstep(0.35, 0.85, streak));
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float a = edge * (0.92 - smoothstep(0.45, 1.0, t)) * (0.55 + streak * 0.5);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

// Soft round sprite texture used for mist, window glow and fireflies.
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Swallow-tailed banner with the HE device, flown from the keep.
function makeBanner(glyph) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8e2a22';
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#d9b25f';
  g.lineWidth = 14;
  g.strokeRect(14, 14, 484, 228);
  g.fillStyle = '#e2bf6a';
  g.font = '600 168px "Songti SC","STSong","Noto Serif SC","SimSun",serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(glyph, 190, 136);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  // Swallow-tail outline in banner space (x: 0..1 along the fly, y: 0..1).
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(1, 0); shape.lineTo(0.72, 0.5); shape.lineTo(1, 1); shape.lineTo(0, 1); shape.lineTo(0, 0);
  const geo = new THREE.ShapeGeometry(shape, 1);
  // Re-tessellate as a grid so the cloth can wave.
  const grid = new THREE.PlaneGeometry(1, 1, 24, 6);
  grid.translate(0.5, 0.5, 0);
  const gp = grid.attributes.position, uv = grid.attributes.uv;
  // Cut the swallow tail by folding vertices that fall inside the notch onto its edge.
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), y = gp.getY(i);
    const notch = 1 - 0.28 * (1 - Math.abs(y - 0.5) * 2);
    if (x > notch) gp.setX(i, notch);
    uv.setXY(i, gp.getX(i), gp.getY(i));
  }
  geo.dispose();
  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.85 });
  const banner = new THREE.Mesh(grid, mat);
  banner.castShadow = true;
  banner.userData.base = Float32Array.from(gp.array);
  return banner;
}

function waveBanner(banner, t) {
  const p = banner.geometry.attributes.position;
  const base = banner.userData.base;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1];
    p.setZ(i, Math.sin(x * 7.5 - t * 4.2 + y * 0.8) * 0.09 * x + Math.sin(x * 3.1 - t * 2.3) * 0.05 * x);
    p.setY(i, y - x * x * 0.08);
  }
  p.needsUpdate = true;
  banner.geometry.computeVertexNormals();
}

// Ravens circling the keep (the same model as in the rookery, wings spread).
function makeRavens(rand) {
  const group = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const r = makeRaven();
    const bird = r.group;
    r.torso.rotation.x = 0;               // level body in flight
    r.head.position.set(0, 0.36, 0.28);
    r.legs.forEach((l) => { l.visible = false; });
    bird.userData = { r, a: rand() * Math.PI * 2, rad: 3.2 + rand() * 3.4, y: 5.2 + rand() * 1.8, speed: 0.22 + rand() * 0.12, phase: rand() * 9 };
    bird.scale.setScalar(0.9);
    group.add(bird);
  }
  return group;
}

// ---------------------------------------------------------------------------
// Lighting presets (day = late afternoon, night = moonlit with lit windows)
// ---------------------------------------------------------------------------
const LIGHT = {
  day:   { hemiSky: 0xfff1d2, hemiGround: 0x6b5a3a, hemi: 1.55, sun: 0xffd6a0, sunI: 2.7, sunPos: [-14, 19, 11], sat: 0.74, tint: [1.06, 0.99, 0.86], lamps: 0, exposure: 1.0 },
  night: { hemiSky: 0x5a6a9a, hemiGround: 0x15151f, hemi: 0.78, sun: 0xb4c4ff, sunI: 1.3, sunPos: [12, 20, -9],   sat: 0.6,  tint: [0.86, 0.9, 1.08],  lamps: 1, exposure: 1.05 },
};

export async function mountEstate(container, opts = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'estate-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    container.classList.add('is-fallback');
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);

  const hemi = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 70 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun, sun.target);

  const grade = { sat: { value: 0.74 }, tint: { value: new THREE.Vector3(1, 1, 1) } };

  let gltf;
  try {
    gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(opts.modelUrl);
  } catch (err) {
    console.warn('Estate model failed to load', err);
    container.classList.add('is-fallback');
    renderer.dispose();
    canvas.remove();
    return null;
  }

  const lib = {};
  let atlasMat = null;
  for (const node of gltf.scene.children) lib[node.name] = node;
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      if (!atlasMat) { atlasMat = o.material; gradeMaterial(atlasMat, grade); }
      o.material = atlasMat;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const hoverMat = atlasMat.clone();
  gradeMaterial(hoverMat, grade);
  hoverMat.emissive = new THREE.Color(0xd9a441);
  hoverMat.emissiveIntensity = 0.32;

  const place = (name, pos, rot = 0, parent = scene) => {
    const src = lib[name];
    if (!src) { console.warn('missing model', name); return null; }
    const obj = src.clone();
    obj.position.copy(pos);
    obj.rotation.y = rot * 60 * DEG;
    parent.add(obj);
    return obj;
  };

  const rand = rng(1425);
  const island = new THREE.Group();
  scene.add(island);

  // Tiles and decoration
  const spotAt = {};
  for (const [id, s] of Object.entries(SPOTS)) spotAt[key(s.q, s.r)] = id;
  for (let q = -RADIUS; q <= RADIUS; q++) {
    for (let r = Math.max(-RADIUS, -q - RADIUS); r <= Math.min(RADIUS, -q + RADIUS); r++) {
      const k = key(q, r);
      const pos = hexPos(q, r);
      const spec = TILES[k] || {};
      place(spec.tile || 'hex_grass', pos, spec.rot || 0, island);
      if (spotAt[k]) continue;
      if (spec.items) {
        for (const [name, dx, dz, rot] of spec.items) place(name, pos.clone().add(new THREE.Vector3(dx, 0, dz)), rot, island);
        continue;
      }
      if (spec.tile) continue;
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      const north = r < 0 || (r === 0 && q < -1);
      const roll = rand();
      let name = null;
      if (north && ring >= 3) name = FOREST[Math.floor(rand() * FOREST.length)];
      else if (roll < 0.55) name = MEADOW[Math.floor(rand() * MEADOW.length)];
      if (name) place(name, pos, Math.floor(rand() * 6), island);
    }
  }

  // Section buildings
  const spots = {};
  for (const [id, s] of Object.entries(SPOTS)) {
    const obj = place(s.model, hexPos(s.q, s.r), s.rot, island);
    const meshes = [];
    obj.traverse((o) => { if (o.isMesh) { meshes.push(o); o.userData.spot = id; } });
    const box = new THREE.Box3().setFromObject(obj);
    spots[id] = { obj, meshes, anchor: new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y + 0.35, (box.min.z + box.max.z) / 2) };
  }

  // Flags on the lists and the watchtower
  place('flag_red', hexPos(2, 1).add(new THREE.Vector3(0.75, 0, 0.35)), 0, island)?.scale.setScalar(1.6);

  // Island underside and loose rocks
  island.add(makeIslandRock(rand));
  const floaters = makeFloatingRocks(rand);
  scene.add(floaters);

  // Waterfall at the east end of the river (tile 2,2 -> east edge)
  const fallBase = hexPos(2, 2).add(new THREE.Vector3(1, 0, 0));
  const waterfall = makeWaterfall();
  waterfall.position.copy(fallBase);
  island.add(waterfall);
  const glowTex = glowTexture();
  const mist = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }));
    s.userData.phase = i / 6;
    island.add(s);
    mist.push(s);
  }

  // Banner on the keep: find the highest point of the castle model.
  const keep = spots.keep.obj;
  keep.updateMatrixWorld(true);
  const top = new THREE.Vector3(0, -Infinity, 0);
  const v = new THREE.Vector3();
  keep.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (v.y > top.y) top.copy(v);
    }
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x3b2a1c }));
  pole.position.copy(top).add(new THREE.Vector3(0, 0.45, 0));
  const banner = makeBanner(opts.glyph || '何');
  banner.scale.set(1.15, 0.5, 1);
  banner.position.copy(top).add(new THREE.Vector3(0.02, 0.48, 0));
  scene.add(pole, banner);
  spots.keep.anchor.y = Math.max(spots.keep.anchor.y, top.y + 1.35);

  // Ravens
  const ravens = makeRavens(rand);
  scene.add(ravens);

  // Clouds (separate translucent material)
  const cloudMat = atlasMat.clone();
  cloudMat.transparent = true;
  cloudMat.opacity = 0.88;
  const clouds = [];
  [['cloud_big', 1.4], ['cloud_small', 1.2], ['cloud_big', 1.0], ['cloud_small', 0.9]].forEach(([name, s], i) => {
    const c = lib[name].clone();
    c.traverse((o) => { if (o.isMesh) { o.material = cloudMat; o.castShadow = false; o.receiveShadow = false; } });
    c.scale.setScalar(s);
    c.userData = { x0: -14 + i * 8.5, z: -10 - (i % 2) * 3.5, y: 2.6 + (i % 3) * 1.1, s, speed: 0.35 + i * 0.08 };
    scene.add(c);
    clouds.push(c);
  });

  // Night lamps: warm point lights and glow sprites at the inhabited buildings.
  const lampSpots = [
    [hexPos(0, 0), 1.3, 0.9], [hexPos(-1, 3), 0.7, 0.8], [hexPos(-2, 0), 0.9, 0.8], [hexPos(2, -1), 0.6, 0.9],
    [hexPos(-1, 1), 0.5, 0.7], [hexPos(1, 3), 0.5, 0.7], [hexPos(3, -1), 0.5, 0.7], [hexPos(4, -2), 1.8, 0.8],
  ];
  const lamps = lampSpots.map(([p, h, s], i) => {
    const light = i < 4 ? new THREE.PointLight(0xffa64d, 0, 5.5, 1.6) : null;
    const pos = p.clone().add(new THREE.Vector3(0.55, h, 0.75));
    if (light) { light.position.copy(pos); scene.add(light); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb35c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(pos);
    glow.scale.setScalar(s);
    scene.add(glow);
    return { light, glow, phase: i * 1.9 };
  });

  // Fireflies (night only)
  const flyCount = 60;
  const flyGeo = new THREE.BufferGeometry();
  const flyBase = new Float32Array(flyCount * 3);
  for (let i = 0; i < flyCount; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 8;
    flyBase.set([Math.cos(a) * rr, 0.25 + rand() * 1.4, Math.sin(a) * rr], i * 3);
  }
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xffd27a, size: 0.32, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(flies);

  // -------------------------------------------------------------------------
  // Theme (day / night) with a smooth blend
  // -------------------------------------------------------------------------
  const cA = new THREE.Color(), cB = new THREE.Color();
  const isNight = () => document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  let night = isNight() ? 1 : 0, nightTarget = night;
  const applyLight = (m) => {
    const d = LIGHT.day, n = LIGHT.night;
    const mix = (a, b) => a + (b - a) * m;
    hemi.color.copy(cA.setHex(d.hemiSky).lerp(cB.setHex(n.hemiSky), m));
    hemi.groundColor.copy(cA.setHex(d.hemiGround).lerp(cB.setHex(n.hemiGround), m));
    hemi.intensity = mix(d.hemi, n.hemi);
    sun.color.copy(cA.setHex(d.sun).lerp(cB.setHex(n.sun), m));
    sun.intensity = mix(d.sunI, n.sunI);
    sun.position.set(mix(d.sunPos[0], n.sunPos[0]), mix(d.sunPos[1], n.sunPos[1]), mix(d.sunPos[2], n.sunPos[2]));
    grade.sat.value = mix(d.sat, n.sat);
    grade.tint.value.set(mix(d.tint[0], n.tint[0]), mix(d.tint[1], n.tint[1]), mix(d.tint[2], n.tint[2]));
    renderer.toneMappingExposure = mix(d.exposure, n.exposure);
    waterfall.material.uniforms.uNight.value = m;
    cloudMat.opacity = mix(0.88, 0.45);
    for (const s of mist) s.material.color.copy(cA.setHex(0xffffff).lerp(cB.setHex(0x8796b8), m));
  };
  applyLight(night);
  const themeObserver = new MutationObserver(() => { nightTarget = isNight() ? 1 : 0; wake(); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { nightTarget = isNight() ? 1 : 0; wake(); });

  // -------------------------------------------------------------------------
  // Camera, drag to turn, pins
  // -------------------------------------------------------------------------
  const target = new THREE.Vector3(0, -0.7, 0.6);
  const flyTarget = new THREE.Vector3();
  let fly = null;
  function flyTo(id) {
    if (fly || !spots[id]) return;
    fly = { id, t: 0, to: spots[id].anchor.clone().add(new THREE.Vector3(0, -0.6, 0)) };
    container.classList.add('is-flying');
    if (reduceMotion) { opts.onSelect?.(id); return; }
    wake();
  }
  // Coming back with the browser's back button restores the page from cache.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) { fly = null; container.classList.remove('is-flying'); container.style.removeProperty('--fly'); wake(); }
  });
  const view = { az: 18 * DEG, drag: 0, vel: 0, polar: 57 * DEG, dist: 40 };
  let width = 1, height = 1;

  const resize = () => {
    width = container.clientWidth || 1;
    height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const shift = parseFloat(getComputedStyle(container).getPropertyValue('--estate-shift')) || 0;
    // Fit the island: wider screens can afford a closer camera.
    const fitW = shift > 0 ? 0.58 : 0.96;              // share of the width the island may use
    const needW = 21.5 / fitW;                         // world units across the view
    const vFov = camera.fov * DEG;
    const distW = needW / (2 * Math.tan(vFov / 2) * camera.aspect);
    const distH = 22 / (2 * Math.tan(vFov / 2));
    view.dist = Math.max(distW, distH);
    camera.setViewOffset(width, height, -shift * width, 0, width, height);
    camera.updateProjectionMatrix();
    wake();
  };
  new ResizeObserver(resize).observe(container);

  // Drag (mouse, pen, or horizontal touch swipe) turns the estate.
  let dragging = false, lastX = 0, moved = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; moved = 0;
    canvas.setPointerCapture(e.pointerId);
    container.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      view.drag -= dx * 0.006;
      view.vel = -dx * 0.006;
      wake();
    } else if (e.pointerType === 'mouse') {
      pointer.set((e.offsetX / width) * 2 - 1, -(e.offsetY / height) * 2 + 1);
      pickPending = true;
      wake();
    }
  });
  const endDrag = () => { dragging = false; container.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', (e) => {
    endDrag();
    if (moved < 5) {
      pointer.set((e.offsetX / width) * 2 - 1, -(e.offsetY / height) * 2 + 1);
      const id = pick();
      if (id) flyTo(id);
    }
  });
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { if (!dragging) setHover(null); });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9, 9);
  const pickables = Object.values(spots).flatMap((s) => s.meshes);
  let pickPending = false;
  const pick = () => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.spot : null;
  };

  let hovered = null;
  const pins = {};
  container.querySelectorAll('[data-spot]').forEach((el) => {
    pins[el.dataset.spot] = el;
    el.addEventListener('mouseenter', () => setHover(el.dataset.spot, true));
    el.addEventListener('mouseleave', () => setHover(null, true));
    el.addEventListener('focus', () => setHover(el.dataset.spot, true));
    el.addEventListener('blur', () => setHover(null, true));
  });
  function setHover(id) {
    if (id === hovered) return;
    if (hovered) {
      spots[hovered].meshes.forEach((m) => { m.material = atlasMat; });
      pins[hovered]?.classList.remove('is-hot');
    }
    hovered = id;
    if (id) {
      spots[id].meshes.forEach((m) => { m.material = hoverMat; });
      pins[id]?.classList.add('is-hot');
    }
    canvas.style.cursor = id ? 'pointer' : '';
    wake();
  }

  const tmp = new THREE.Vector3();
  const placePins = () => {
    for (const [id, el] of Object.entries(pins)) {
      tmp.copy(spots[id].anchor).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * width, y = (-tmp.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  };

  // -------------------------------------------------------------------------
  // Render loop (paused when off-screen or hidden)
  // -------------------------------------------------------------------------
  const clock = new THREE.Clock();
  let visible = true, running = false, t = 0, idleFrames = 0;
  const animate = !reduceMotion;

  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    if (animate) t += dt;

    if (!dragging) { view.drag += view.vel; view.vel *= 0.92; }
    if (Math.abs(nightTarget - night) > 0.001) night += (nightTarget - night) * Math.min(1, dt * 2.2);
    else night = nightTarget;
    applyLight(night);

    const az = view.az + view.drag + (animate ? Math.sin(t * 0.07) * 14 * DEG : 0);
    // Flying into a building: glide the target to it and close in.
    let dist = view.dist, polar = view.polar;
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / 0.9);
      const k = fly.t * fly.t * (3 - 2 * fly.t);
      flyTarget.copy(target).lerp(fly.to, k);
      dist = view.dist * (1 - 0.78 * k);
      polar = view.polar - 0.18 * k;
      container.style.setProperty('--fly', k.toFixed(3));
      if (fly.t >= 1 && !fly.done) { fly.done = true; opts.onSelect?.(fly.id); }
    } else flyTarget.copy(target);
    camera.position.set(
      flyTarget.x + dist * Math.sin(polar) * Math.sin(az),
      flyTarget.y + dist * Math.cos(polar),
      flyTarget.z + dist * Math.sin(polar) * Math.cos(az),
    );
    camera.lookAt(flyTarget);

    // Moving parts
    island.position.y = animate ? Math.sin(t * 0.6) * 0.08 : 0;
    pole.position.y = top.y + 0.45 + island.position.y;
    banner.position.y = top.y + 0.48 + island.position.y;
    waveBanner(banner, t);
    banner.rotation.y = az * 0.15 - 0.3;
    waterfall.material.uniforms.uTime.value = t;
    mist.forEach((s) => {
      const k = (s.userData.phase + t * 0.12) % 1;
      s.position.copy(fallBase).add(new THREE.Vector3(1.0 + k * 1.2, -8.2 + k * 1.6, (s.userData.phase - 0.5) * 1.4));
      s.scale.setScalar(1.2 + k * 2.4);
      s.material.opacity = 0.28 * Math.sin(k * Math.PI) * (1 - night * 0.5);
    });
    floaters.children.forEach((g) => {
      const u = g.userData;
      g.position.set(Math.cos(u.a + t * u.speed) * u.rad, u.y + Math.sin(t * 0.8 + u.bob) * 0.25, Math.sin(u.a + t * u.speed) * u.rad);
      g.rotation.y = t * 0.2 + u.bob;
    });
    clouds.forEach((c) => {
      // Clouds drift west to east behind the island and shrink away at the ends.
      const u = c.userData;
      const x = ((u.x0 + t * u.speed + 17) % 34 + 34) % 34 - 17;
      const fade = Math.min(1, (17 - Math.abs(x)) / 4);
      c.position.set(x, u.y, u.z);
      c.scale.setScalar(u.s * Math.max(0.001, fade));
    });
    ravens.visible = night < 0.6;
    ravens.children.forEach((b) => {
      const u = b.userData;
      const a = u.a + t * u.speed;
      b.position.set(Math.cos(a) * u.rad, u.y + Math.sin(t * 0.9 + u.phase) * 0.3, Math.sin(a) * u.rad);
      b.rotation.y = -a;
      b.rotation.z = -0.25;                 // bank into the turn
      // flap in bursts, then glide
      const beat = Math.sin(t * 0.7 + u.phase) > -0.2 ? Math.sin(t * 9 + u.phase) * 0.55 : 0.1;
      poseRaven(u.r, 1, beat);
    });
    lamps.forEach((l) => {
      const flick = 0.85 + Math.sin(t * 7 + l.phase) * 0.08 + Math.sin(t * 13.3 + l.phase * 2) * 0.05;
      if (l.light) l.light.intensity = night * 5.5 * flick;
      l.glow.material.opacity = night * 0.85 * flick;
    });
    const fp = flies.geometry.attributes.position;
    for (let i = 0; i < flyCount; i++) {
      fp.setXYZ(i, flyBase[i * 3] + Math.sin(t * 0.5 + i) * 0.4, flyBase[i * 3 + 1] + Math.sin(t * 0.9 + i * 1.3) * 0.25, flyBase[i * 3 + 2] + Math.cos(t * 0.4 + i * 0.7) * 0.4);
    }
    fp.needsUpdate = true;
    flies.material.opacity = night * (0.6 + Math.sin(t * 2) * 0.2);

    if (pickPending && !dragging) { pickPending = false; setHover(pick()); }

    renderer.render(scene, camera);
    placePins();

    // Without animation, stop once the camera and theme blend settle.
    if (!animate && !fly && Math.abs(view.vel) < 1e-4 && night === nightTarget && !dragging) {
      if (++idleFrames > 2) { running = false; return; }
    } else idleFrames = 0;
    requestAnimationFrame(frame);
  }
  function wake() {
    if (running || !visible) return;
    running = true;
    clock.getDelta();
    requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }).observe(container);
  document.addEventListener('visibilitychange', wake);

  resize();
  container.classList.add('is-ready');
  wake();
  return { setHover, flyTo };
}
