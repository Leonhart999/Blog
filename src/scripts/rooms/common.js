// Helpers shared by the room scripts: mounting, the stone hall shell,
// torches and candles with live flames, dust motes, and the HTML tooltip.
import { THREE, createStage, loadLibrary, place, roomData, dn } from '../stage.js';
import { makeFlame, makeFire, glowSprite, gradeLibrary } from '../props.js';

const ROOMS_URL = () => document.querySelector('[data-rooms-model]')?.dataset.roomsModel;

/**
 * Mount a room. `build(stage, lib, data)` adds objects to stage.scene and
 * returns an update(dt, t) function.
 */
export async function mountRoom(container, build, stageOpts = {}) {
  let update = null;
  const stage = createStage(container, {
    fov: 34,
    ...stageOpts,
    update: (dt, t, s) => update?.(dt, t, s),
  });
  if (!stage) return null;
  let lib;
  try {
    lib = await loadLibrary(ROOMS_URL());
  } catch (err) {
    console.warn('room models failed to load', err);
    container.classList.add('is-fallback');
    stage.canvas.remove();
    return null;
  }
  gradeLibrary(lib, 0.8, [1.03, 0.98, 0.92]);
  update = build(stage, lib, roomData());
  container.classList.add('is-ready');
  stage.wake();
  return stage;
}

/** Floor tiles and a back wall made of KayKit pieces. Tiles and walls are 4 units wide. */
export function buildHall(lib, parent, { floor = 'floor_tile_large', walls = [], width = 16, depth = 8, z0 = -2, side = true } = {}) {
  for (let x = -width / 2 + 2; x < width / 2; x += 4) {
    for (let z = z0 + 2; z < z0 + depth; z += 4) place(lib, floor, parent, x, 0, z);
  }
  const n = Math.ceil(width / 4);
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + 2 + i * 4;
    place(lib, walls[i] || 'wall', parent, x, 0, z0 - 0.5);
  }
  if (side) {
    for (const s of [-1, 1]) {
      for (let z = z0 + 2; z < z0 + depth - 2; z += 4) place(lib, 'wall', parent, s * (width / 2 + 0.5), 0, z, 90);
    }
  }
}

/** Wall torch with a live flame and light; returns update(t, night). */
export function addTorch(lib, parent, x, y, z, rot = 0, { light = true } = {}) {
  const torch = place(lib, 'torch_mounted', parent, x, y, z, rot);
  const tip = new THREE.Vector3(0, 0.72, 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot * Math.PI / 180);
  const fire = makeFire({ size: 0.42, light, embers: 10 });
  fire.group.position.set(x + tip.x, y + tip.y, z + tip.z);
  parent.add(fire.group);
  return { torch, fire, update: (dt, t, power) => fire.update(t, dt, power) };
}

/** Candle model with a small flame and optional point light. */
export function addCandle(lib, parent, name, x, y, z, { light = false, scale = 1 } = {}) {
  const c = place(lib, name, parent, x, y, z, 0, scale);
  const box = new THREE.Box3().setFromObject(c);
  const flame = makeFlame({ size: 0.22 * scale });
  flame.mesh.position.set(x, box.max.y - 0.02, z);
  parent.add(flame.mesh);
  const glow = glowSprite(0xffb35c, 0.5 * scale, 0.5);
  glow.position.copy(flame.mesh.position).add(new THREE.Vector3(0, 0.08 * scale, 0));
  parent.add(glow);
  let pl = null;
  if (light) {
    pl = new THREE.PointLight(0xffa64d, 2, 4 * scale, 1.8);
    pl.position.copy(glow.position);
    parent.add(pl);
  }
  return {
    candle: c, flame, glow, light: pl,
    update(t, power = 1, lean = 0) {
      flame.update(t, lean, power);
      glow.visible = power > 0.05;
      glow.material.opacity = 0.45 * power * (0.9 + Math.sin(t * 13 + x) * 0.1);
      if (pl) pl.intensity = 2.4 * power * (0.9 + Math.sin(t * 11 + z) * 0.08);
    },
  };
}

/** Floating dust caught in the light. */
export function makeDust(parent, { count = 120, box = [10, 4, 5], center = [0, 2, 0], color = 0xffe2b0 } = {}) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count).map(() => Math.random());
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center[0] + (Math.random() - 0.5) * box[0];
    pos[i * 3 + 1] = center[1] + (Math.random() - 0.5) * box[1];
    pos[i * 3 + 2] = center[2] + (Math.random() - 0.5) * box[2];
  }
  const base = pos.slice();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  parent.add(pts);
  return (t) => {
    for (let i = 0; i < count; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + seed[i] * 20) * 0.4;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + seed[i] * 31) * 0.3;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + seed[i] * 17) * 0.3;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

/** Standard indoor lighting: hemisphere fill plus a key light; blends with night. */
export function indoorLights(stage, { day = 1.1, night = 0.32, key = 1.6, keyNight = 0.3, keyPos = [-4, 9, 6], sky = 0xffe8c8, ground = 0x3a2a1c } = {}) {
  const hemi = new THREE.HemisphereLight(sky, ground, day);
  const sun = new THREE.DirectionalLight(0xffe0b0, key);
  sun.position.set(...keyPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 40 });
  sun.shadow.bias = -0.0008;
  stage.scene.add(hemi, sun, sun.target);
  return () => {
    hemi.intensity = dn(stage, day, night);
    sun.intensity = dn(stage, key, keyNight);
    hemi.color.setHex(sky).lerp(new THREE.Color(0x6070a0), stage.night * 0.6);
  };
}

/** Tooltip that follows a 3D point. */
export function tooltip(stage) {
  const el = stage.container.querySelector('#room-tip');
  let target = null;
  return {
    show(html, point) { if (!el) return; el.innerHTML = html; el.hidden = false; target = point; this.place(); },
    hide() { if (el) el.hidden = true; target = null; },
    place() {
      if (!el || !target) return;
      const p = stage.project(target);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    },
  };
}

/** Gentle camera sway that follows the pointer. */
export function parallax(stage, base, look, { x = 0.6, y = 0.25 } = {}) {
  const cur = new THREE.Vector2();
  return (dt) => {
    const tx = stage.pointerInside ? stage.pointer.x : 0;
    const ty = stage.pointerInside ? stage.pointer.y : 0;
    cur.x += (tx - cur.x) * Math.min(1, dt * 2.5);
    cur.y += (ty - cur.y) * Math.min(1, dt * 2.5);
    stage.camera.position.set(base.x + cur.x * x, base.y + cur.y * y, base.z);
    stage.camera.lookAt(look);
  };
}

export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Fit the camera distance so a scene `width` x `height` fills the view. */
export function fitDistance(stage, width, height) {
  const v = stage.camera.fov * Math.PI / 180;
  const dH = height / (2 * Math.tan(v / 2));
  const dW = width / (2 * Math.tan(v / 2) * stage.camera.aspect);
  return Math.max(dH, dW);
}
