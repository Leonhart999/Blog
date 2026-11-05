// Shared runtime for the 3D rooms: renderer, camera, day/night blending,
// pointer picking (hover, click, drag), and a render loop that pauses when
// the stage is off-screen. Each room supplies its own scene and update().
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export { THREE };

const libCache = new Map();

/** Load a merged model bundle once per page; returns { name: Object3D }. */
export function loadLibrary(url) {
  if (!libCache.has(url)) {
    const p = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then((g) => {
      const lib = {};
      g.scene.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      for (const n of g.scene.children) lib[n.name] = n;
      return lib;
    });
    libCache.set(url, p);
  }
  return libCache.get(url);
}

/** Clone a model from a library, positioned and rotated (rot in degrees). */
export function place(lib, name, parent, x = 0, y = 0, z = 0, rot = 0, scale = 1) {
  const src = lib[name];
  if (!src) { console.warn('missing model', name); return new THREE.Group(); }
  const o = src.clone();
  o.position.set(x, y, z);
  o.rotation.y = rot * Math.PI / 180;
  o.scale.setScalar(scale);
  parent.add(o);
  return o;
}

export function isNightTheme() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Create a stage inside `container`.
 * opts: { fov, near, far, shadows, exposure, update(dt, t, stage), resize(stage) }
 * Returns null when WebGL is unavailable (the container gets .is-fallback).
 */
export function createStage(container, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
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
  renderer.toneMappingExposure = opts.exposure ?? 1;
  if (opts.shadows !== false) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  container.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, opts.near ?? 0.1, opts.far ?? 200);
  const animate = !reduceMotion();

  const stage = {
    THREE, renderer, scene, camera, canvas, container,
    width: 1, height: 1,
    night: isNightTheme() ? 1 : 0,
    nightTarget: isNightTheme() ? 1 : 0,
    animate,
    t: 0,
    pointer: new THREE.Vector2(9, 9),   // NDC; 9 = outside
    pointerInside: false,
    hovered: null,
    wake,
    interact,
    pick,
    project,
  };

  // ---- interaction registry ------------------------------------------------
  const handlers = new Map();          // root object -> { hover, click, drag, cursor }
  let pickables = [];
  function interact(root, h) {
    handlers.set(root, h);
    root.traverse((o) => { if (o.isMesh) o.userData.interactRoot = root; });
    pickables = [];
    for (const r of handlers.keys()) r.traverse((o) => { if (o.isMesh) pickables.push(o); });
  }
  const raycaster = new THREE.Raycaster();
  function pick() {
    if (!stage.pointerInside) return null;
    raycaster.setFromCamera(stage.pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      const root = hit.object.userData.interactRoot;
      if (root && root.visible !== false) return { root, point: hit.point, object: hit.object };
    }
    return null;
  }
  function setHover(root) {
    if (root === stage.hovered) return;
    if (stage.hovered) handlers.get(stage.hovered)?.hover?.(false);
    stage.hovered = root;
    if (root) handlers.get(root)?.hover?.(true);
    canvas.style.cursor = root ? (handlers.get(root)?.cursor || 'pointer') : '';
  }
  /** World point -> CSS pixel position inside the container. */
  function project(v) {
    const p = v.clone().project(camera);
    return { x: (p.x * 0.5 + 0.5) * stage.width, y: (-p.y * 0.5 + 0.5) * stage.height, behind: p.z > 1 };
  }

  // ---- pointer -------------------------------------------------------------
  let down = null;
  const setPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    stage.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    stage.pointerInside = true;
  };
  canvas.addEventListener('pointermove', (e) => {
    setPointer(e);
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      down.moved += Math.abs(e.clientX - down.lx) + Math.abs(e.clientY - down.ly);
      if (down.drag) down.drag({ dx: e.clientX - down.lx, dy: e.clientY - down.ly, tx: dx, ty: dy, event: e, phase: 'move' });
      down.lx = e.clientX; down.ly = e.clientY;
    }
    wake();
  });
  canvas.addEventListener('pointerdown', (e) => {
    setPointer(e);
    const hit = pick();
    const h = hit && handlers.get(hit.root);
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0, hit, drag: h?.drag || opts.drag || null };
    if (down.drag) {
      canvas.setPointerCapture(e.pointerId);
      down.drag({ dx: 0, dy: 0, tx: 0, ty: 0, event: e, phase: 'start', hit });
    }
    wake();
  });
  const end = (e, cancelled) => {
    if (!down) return;
    if (down.drag) down.drag({ dx: 0, dy: 0, tx: 0, ty: 0, event: e, phase: 'end' });
    if (!cancelled && down.moved < 6 && down.hit) handlers.get(down.hit.root)?.click?.(down.hit);
    down = null;
    wake();
  };
  canvas.addEventListener('pointerup', (e) => end(e, false));
  canvas.addEventListener('pointercancel', (e) => end(e, true));
  canvas.addEventListener('pointerleave', () => { if (!down) { stage.pointerInside = false; setHover(null); } });

  // ---- theme ---------------------------------------------------------------
  const onTheme = () => { stage.nightTarget = isNightTheme() ? 1 : 0; wake(); };
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);

  // ---- size ----------------------------------------------------------------
  const resize = () => {
    stage.width = container.clientWidth || 1;
    stage.height = container.clientHeight || 1;
    renderer.setSize(stage.width, stage.height, false);
    camera.aspect = stage.width / stage.height;
    camera.updateProjectionMatrix();
    opts.resize?.(stage);
    wake();
  };
  new ResizeObserver(resize).observe(container);

  // ---- loop ----------------------------------------------------------------
  const clock = new THREE.Clock();
  let visible = true, running = false, idle = 0;
  stage.busyUntil = 0;                 // rooms push this forward while something animates
  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    stage.t += dt;
    if (Math.abs(stage.nightTarget - stage.night) > 0.001) stage.night += (stage.nightTarget - stage.night) * Math.min(1, dt * 2.4);
    else stage.night = stage.nightTarget;
    if (!down) setHover(pick()?.root || null);
    opts.update?.(dt, stage.t, stage);
    renderer.render(scene, camera);
    opts.afterRender?.(stage);
    // Without ambient animation, sleep once nothing is moving.
    const settled = !animate && !down && stage.night === stage.nightTarget && stage.t > stage.busyUntil;
    if (settled) { if (++idle > 3) { running = false; return; } } else idle = 0;
    requestAnimationFrame(frame);
  }
  function wake() {
    if (running || !visible) return;
    running = true;
    idle = 0;
    clock.getDelta();
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(container);
  document.addEventListener('visibilitychange', wake);

  resize();
  return stage;
}

/** Linear blend between day and night values. */
export const dn = (stage, day, night) => day + (night - day) * stage.night;

export function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
export function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

/** Small deterministic RNG. */
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Read the JSON blob a page embeds for its room. */
export function roomData(id = 'room-data') {
  try { return JSON.parse(document.getElementById(id)?.textContent || '{}'); } catch { return {}; }
}
