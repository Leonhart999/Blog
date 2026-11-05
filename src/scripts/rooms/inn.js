// The Inn (essays): a tavern with a hearth and a dice table. Rolling the
// dice picks a post for you; the faces that land decide which one.
import { THREE, place } from '../stage.js';
import { makeFire, makeDie, DIE_FACES } from '../props.js';
import { mountRoom, buildHall, addCandle, indoorLights, tooltip, parallax, fitDistance, escapeHtml } from './common.js';
import { dice as diceSound, whoosh, startCrackle, stopCrackle } from '../sfx.js';

export function mount(container) {
  return mountRoom(container, build);
}

const FACE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((n) => new THREE.Vector3(...n));

function build(stage, lib, data) {
  const { scene } = stage;
  const room = new THREE.Group();
  scene.add(room);
  buildHall(lib, room, { floor: 'floor_wood_large', walls: ['wall_shelves', 'wall', 'wall_window_open', 'wall'], width: 16, depth: 8, z0: -2.4 });
  place(lib, 'pillar', room, 4.1, 0, -2.2);
  place(lib, 'banner_patternB_yellow', room, 2.0, 0, -2.85);

  // ---- hearth ----------------------------------------------------------------
  const stone = new THREE.MeshStandardMaterial({ color: 0x6b625a, roughness: 0.95, flatShading: true });
  const sootMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 1 });
  const hearth = new THREE.Group();
  hearth.position.set(-2.1, 0, -2.05);
  room.add(hearth);
  const hb = (w, h, d, x, y, z, m = stone) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; hearth.add(b); return b; };
  hb(0.45, 1.6, 0.8, -1.0, 0.8, 0); hb(0.45, 1.6, 0.8, 1.0, 0.8, 0);
  hb(2.6, 0.5, 0.9, 0, 1.85, 0);
  hb(2.9, 0.12, 1.05, 0, 2.15, 0.05, new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.8 }));   // mantel
  hb(1.6, 1.6, 0.1, 0, 0.8, -0.35, sootMat);
  hb(2.4, 0.08, 1.2, 0, 0.04, 0.15);
  hb(1.6, 1.8, 0.6, 0, 3.0, -0.1);                      // chimney breast
  const logMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.9 });
  [[-0.2, 0.3, 0.4], [0.2, -0.3, -0.3], [0, 0.0, 0.1]].forEach(([x, ry, rz], i) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.9, 7), logMat);
    l.rotation.set(0, ry, Math.PI / 2 + rz * 0.3);
    l.position.set(x, 0.17 + i * 0.09, 0.05);
    l.castShadow = true;
    hearth.add(l);
  });
  const fire = makeFire({ size: 0.85, embers: 60 });
  fire.group.position.set(0, 0.22, 0.05);
  fire.light.distance = 12;
  fire.light.castShadow = true;
  fire.light.shadow.mapSize.set(512, 512);
  hearth.add(fire.group);
  addCandle(lib, hearth, 'candle_triple', -0.9, 2.21, 0.1, { scale: 0.7 });
  place(lib, 'bottle_A_labeled_green', hearth, 0.6, 2.21, 0.1, 0, 0.5);
  place(lib, 'bottle_A_brown', hearth, 0.9, 2.21, 0.05, 0, 0.45);
  const candles = [];

  // ---- furniture -----------------------------------------------------------------
  place(lib, 'table_long_decorated_A', room, 3.4, 0, 0.2, 90, 0.85);
  place(lib, 'keg_decorated', room, 5.6, 0, -1.4, -30, 0.7);
  place(lib, 'barrel_small_stack', room, -4.6, 0, -1.0, 20, 0.7);
  place(lib, 'stool', room, 2.2, 0, 1.3);
  place(lib, 'stool', room, -1.3, 0, 1.6, 30);
  place(lib, 'chair', room, -2.3, 0, -0.2, 140);
  const table = place(lib, 'table_medium', room, -0.2, 0, 0.7, 0, 1);
  const top = new THREE.Box3().setFromObject(table).max.y;
  place(lib, 'plate', room, -0.75, top, 0.2, 0, 0.5);
  place(lib, 'bottle_B_green', room, 0.45, top, 0.2, 0, 0.45);
  candles.push(addCandle(lib, room, 'candle_lit', 0.35, top, 1.2, { light: true, scale: 0.55 }));

  // ---- dice ---------------------------------------------------------------------
  const DS = 0.22;
  const dice = [makeDie(DS), makeDie(DS, '#f3e8cc', '#2b4566')];
  const bounds = { minX: -0.95, maxX: 0.75, minZ: -0.1, maxZ: 1.5, y: top + DS / 2 };
  const state = dice.map((m, i) => {
    m.position.set(-0.45 + i * 0.4, bounds.y, 0.9);
    m.quaternion.copy(restQ(2 + i * 3, i));
    room.add(m);
    return { m, v: new THREE.Vector3(), w: new THREE.Vector3(), settled: true, value: 0 };
  });
  function restQ(value, yaw) {
    const idx = DIE_FACES.indexOf(value);
    const q = new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[idx], new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q);
  }
  const topValue = (q) => {
    let best = -2, val = 1;
    FACE_NORMALS.forEach((n, i) => { const y = n.clone().applyQuaternion(q).y; if (y > best) { best = y; val = DIE_FACES[i]; } });
    return val;
  };

  let rolling = false, rollT = 0, rolls = 0;
  const btn = document.getElementById('dice-roll');
  const card = document.getElementById('fate-card');
  const roll = () => {
    if (rolling) return;
    rolling = true; rollT = 0; rolls += 1;
    if (card) card.hidden = true;
    if (btn) btn.disabled = true;
    state.forEach((s, i) => {
      s.settled = false;
      s.m.position.set(bounds.maxX - 0.1, top + 0.9 + i * 0.25, bounds.minZ + 0.3 + i * 0.3);
      s.v.set(-2.2 - Math.random() * 1.2, 0.5 + Math.random(), 0.6 + Math.random() * 1.2);
      s.w.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 30);
      s.m.quaternion.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    });
    setTimeout(diceSound, 300);
    stage.busyUntil = stage.t + 4;
    stage.wake();
  };
  btn?.addEventListener('click', roll);
  const tip = tooltip(stage);
  state.forEach((s) => stage.interact(s.m, {
    hover(on) { if (on && !rolling) tip.show('<b>掷骰子</b><span>让命运挑一篇文章</span>', s.m.position.clone().add(new THREE.Vector3(0, 0.35, 0))); else tip.hide(); },
    click: roll,
  }));

  const showFate = () => {
    const all = data.all || [];
    const a = state[0].value, b = state[1].value;
    if (!card) return;
    if (!all.length) { card.innerHTML = `<p class="fate-dice">${a} + ${b} = ${a + b}</p><p>旅店里还没有故事可讲。</p>`; card.hidden = false; return; }
    const pick = all[(a * 6 + b + rolls) % all.length];
    card.innerHTML = `<p class="fate-dice">骰面 <b>${a}</b> + <b>${b}</b> = <b>${a + b}</b></p>`
      + `<p class="fate-label">命运为你挑中了</p>`
      + `<a class="fate-title" href="${escapeHtml(pick.url)}">${escapeHtml(pick.title)}</a>`
      + `<p class="fate-meta">${escapeHtml(pick.hall)} · ${escapeHtml(pick.date)}</p>`
      + `<a class="room-btn" href="${escapeHtml(pick.url)}">去读读 →</a>`;
    card.hidden = false;
  };

  // ---- stoking ------------------------------------------------------------------
  let stopTimer = null;
  const stoke = () => {
    fire.flare();
    whoosh();
    startCrackle();
    clearTimeout(stopTimer);
    stopTimer = setTimeout(stopCrackle, 9000);
    stage.busyUntil = stage.t + 3;
    stage.wake();
  };
  document.getElementById('fire-stoke')?.addEventListener('click', stoke);
  stage.interact(fire.group, {
    hover(on) { if (on) tip.show('<b>添把柴</b>', hearth.localToWorld(new THREE.Vector3(0, 1.6, 0.5))); else tip.hide(); },
    click: stoke,
  });
  // the fire's flames are additive quads; give it a clickable proxy
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set(0, 0.6, 0.1);
  hearth.add(proxy);
  stage.interact(proxy, {
    hover(on) { if (on) tip.show('<b>添把柴</b>', hearth.localToWorld(new THREE.Vector3(0, 1.5, 0.5))); else tip.hide(); },
    click: stoke,
  });
  window.addEventListener('pagehide', stopCrackle);

  const lights = indoorLights(stage, { day: 0.8, night: 0.16, key: 1.1, keyNight: 0.08, keyPos: [4, 8, 2] });

  const look = new THREE.Vector3(-0.6, 1.2, -0.4);
  const base = new THREE.Vector3(0, 3, 7);
  let sway = parallax(stage, base, look, { x: 0.45, y: 0.2 });
  const resize = () => {
    const wide = stage.width > 900;
    const share = wide ? 0.64 : 1;
    look.x = wide ? -2.6 : -0.8;
    base.x = look.x + 0.8;
    const d = fitDistance(stage, 6.4 / share, 3.8);
    base.y = look.y + d * 0.38;
    base.z = look.z + d * 0.92;
    sway = parallax(stage, base, look, { x: 0.45, y: 0.2 });
  };
  resize();
  new ResizeObserver(resize).observe(stage.container);

  const g = new THREE.Vector3(0, -9.8, 0);
  const dq = new THREE.Quaternion();
  return (dt, t) => {
    sway(dt);
    lights();
    fire.update(t, dt, 0.85 + stage.night * 0.3);
    candles.forEach((c) => c.update(t, 1));

    if (rolling) {
      rollT += dt;
      // simple rigid-body integration with table and edge bounces
      const steps = 3, h = dt / steps;
      for (let k = 0; k < steps; k++) {
        for (const s of state) {
          if (s.settled) continue;
          s.v.addScaledVector(g, h);
          s.m.position.addScaledVector(s.v, h);
          const ang = s.w.length();
          if (ang > 1e-4) { dq.setFromAxisAngle(s.w.clone().divideScalar(ang), ang * h); s.m.quaternion.premultiply(dq); }
          if (s.m.position.y < bounds.y) {
            s.m.position.y = bounds.y;
            if (s.v.y < 0) s.v.y *= -0.38;
            s.v.x *= 0.82; s.v.z *= 0.82;
            s.w.multiplyScalar(0.7);
            // rolling contact couples spin to travel
            s.w.x += s.v.z * 2; s.w.z -= s.v.x * 2;
          }
          if (s.m.position.x < bounds.minX) { s.m.position.x = bounds.minX; s.v.x = Math.abs(s.v.x) * 0.5; }
          if (s.m.position.x > bounds.maxX) { s.m.position.x = bounds.maxX; s.v.x = -Math.abs(s.v.x) * 0.5; }
          if (s.m.position.z < bounds.minZ) { s.m.position.z = bounds.minZ; s.v.z = Math.abs(s.v.z) * 0.5; }
          if (s.m.position.z > bounds.maxZ) { s.m.position.z = bounds.maxZ; s.v.z = -Math.abs(s.v.z) * 0.5; }
        }
        // keep the two dice apart
        const [a, b] = state;
        const d = a.m.position.clone().sub(b.m.position);
        const dist = d.length();
        if (dist < DS * 1.05 && dist > 1e-4) {
          d.normalize().multiplyScalar((DS * 1.05 - dist) / 2);
          a.m.position.add(d); b.m.position.sub(d);
          const tmp = a.v.clone(); a.v.lerp(b.v, 0.6); b.v.lerp(tmp, 0.6);
        }
      }
      // settle: once slow, ease onto the face that is most up
      for (const s of state) {
        if (s.settled) continue;
        const slow = s.v.length() < 0.25 && s.m.position.y < bounds.y + 0.01 && rollT > 0.9;
        if (slow || rollT > 3) {
          s.value = topValue(s.m.quaternion);
          const e = new THREE.Euler().setFromQuaternion(s.m.quaternion, 'YXZ');
          s.target = restQ(s.value, e.y);
          s.settled = true;
        }
      }
      for (const s of state) if (s.settled && s.target) { s.m.quaternion.slerp(s.target, Math.min(1, dt * 10)); s.m.position.y += (bounds.y - s.m.position.y) * Math.min(1, dt * 10); }
      if (state.every((s) => s.settled) && rollT > 1.2) {
        if (state.every((s) => s.m.quaternion.angleTo(s.target) < 0.02)) {
          rolling = false;
          state.forEach((s) => { s.m.quaternion.copy(s.target); s.target = null; });
          if (btn) btn.disabled = false;
          showFate();
        }
      }
    }
    tip.place();
  };
}
