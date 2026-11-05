// The Workshop (project notes): a forge with bellows driven by a gear train,
// and an anvil. Drag a gear to pump the bellows; the hotter the forge, the
// brighter the sparks when the hammer falls.
import { THREE, place } from '../stage.js';
import { makeFire, makeGear, makeAnvil, makeHammer, glowTexture } from '../props.js';
import { mountRoom, buildHall, addTorch, indoorLights, tooltip, parallax, fitDistance } from './common.js';
import { clang } from '../sfx.js';

export function mount(container) {
  return mountRoom(container, build);
}

const COUNT_KEY = 'castle-anvil-count';

function build(stage, lib) {
  const { scene } = stage;
  const room = new THREE.Group();
  scene.add(room);
  buildHall(lib, room, { floor: 'floor_wood_large_dark', walls: ['wall', 'wall', 'wall_doorway', 'wall'], width: 16, depth: 8, z0: -2.4 });
  place(lib, 'pillar', room, -4.1, 0, -2.2);
  place(lib, 'pillar', room, 4.1, 0, -2.2);
  place(lib, 'barrel_large', room, -4.3, 0, 0.6, 0, 0.6);
  place(lib, 'barrel_small_stack', room, 4.6, 0, -0.6, 30, 0.7);
  place(lib, 'crates_stacked', room, 5.6, 0, 0.8, -20, 0.5);
  place(lib, 'sword_shield', room, -0.2, 2.6, -2.35, 0, 0.75);
  place(lib, 'keyring_hanging', room, 1.2, 2.5, -2.35, 0, 0.8);
  const torches = [addTorch(lib, room, -4.6, 1.6, -2.3, 0, { light: false })];

  // ---- forge -----------------------------------------------------------------
  const stone = new THREE.MeshStandardMaterial({ color: 0x5d5752, roughness: 0.95, flatShading: true });
  const soot = new THREE.MeshStandardMaterial({ color: 0x1c1816, roughness: 1 });
  const forge = new THREE.Group();
  forge.position.set(-2.4, 0, -1.4);
  room.add(forge);
  const fb = (w, h, d, x, y, z, m = stone) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; forge.add(b); return b; };
  fb(1.9, 0.9, 1.3, 0, 0.45, 0);                       // base
  fb(1.5, 0.12, 1.0, 0, 0.92, 0.05, soot);             // fire bed
  fb(0.2, 0.6, 1.2, -0.85, 1.2, 0); fb(0.2, 0.6, 1.2, 0.85, 1.2, 0); fb(1.9, 0.6, 0.2, 0, 1.2, -0.55);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.05, 1.0, 4, 1, true), stone);
  hood.rotation.y = Math.PI / 4;
  hood.position.set(0, 2.3, -0.1);
  hood.material.side = THREE.DoubleSide;
  forge.add(hood);
  fb(0.5, 1.6, 0.5, 0, 3.55, -0.1);                    // chimney
  // glowing coals
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0xff5a1a, emissiveIntensity: 0.6, roughness: 0.8, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + Math.random() * 0.05, 0), coalMat);
    c.position.set((Math.random() - 0.5) * 1.2, 1.0 + Math.random() * 0.05, (Math.random() - 0.5) * 0.7 + 0.05);
    c.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    forge.add(c);
  }
  const fire = makeFire({ size: 0.75, embers: 50 });
  fire.group.position.set(0, 1.0, 0.05);
  fire.light.distance = 10;
  fire.light.castShadow = true;
  fire.light.shadow.mapSize.set(512, 512);
  forge.add(fire.group);

  // ---- bellows -----------------------------------------------------------------
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.85 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x4a2d1b, roughness: 0.9 });
  const bellows = new THREE.Group();
  bellows.position.set(-1.05, 0.95, -1.2);
  bellows.rotation.y = -0.35;
  room.add(bellows);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.5), wood);
  const upperPivot = new THREE.Group();
  upperPivot.position.set(-0.42, 0.03, 0);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.5), wood);
  upper.position.x = 0.45;
  upperPivot.add(upper);
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.85, 10, 1, false, 0, Math.PI), leather);
  bag.rotation.z = Math.PI / 2;
  bag.position.set(0.02, 0.02, 0);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.7, roughness: 0.4 }));
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-0.6, 0.04, 0);
  bellows.add(lower, upperPivot, bag, nozzle);
  [lower, upper, bag].forEach((m) => { m.castShadow = true; });

  // ---- gear train ----------------------------------------------------------------
  const train = new THREE.Group();
  train.position.set(2.0, 1.75, -2.05);
  room.add(train);
  const brass = 0x9a7434, iron = 0x50545a;
  const spec = [
    { teeth: 28, color: brass, at: [0, 0] },
    { teeth: 14, color: iron, angle: -0.5 },
    { teeth: 20, color: brass, angle: 0.9 },
    { teeth: 12, color: iron, angle: -1.9 },
  ];
  const module = 0.05;
  const gears = [];
  spec.forEach((s, i) => {
    const g = makeGear({ teeth: s.teeth, module, thickness: 0.08, color: s.color, spokes: s.teeth > 16 ? 5 : 0 });
    if (i === 0) g.position.set(...s.at, 0);
    else {
      const prev = gears[i - 1];
      const dist = prev.g.userData.pitch + g.userData.pitch;
      g.position.set(prev.g.position.x + Math.cos(s.angle) * dist, prev.g.position.y + Math.sin(s.angle) * dist, (i % 2) * 0.01);
    }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8 }));
    axle.rotation.x = Math.PI / 2;
    g.add(axle);
    train.add(g);
    gears.push({ g, teeth: s.teeth, angle: s.angle || 0 });
  });
  // a backing board for the train
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 0.06), new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 }));
  board.position.set(0.15, -0.45, -0.1);
  board.receiveShadow = true;
  train.add(board);
  // crank rod from the last gear down to the bellows (drawn as a thin line)
  const rodMat = new THREE.LineBasicMaterial({ color: 0x2a2420 });
  const rodGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const rod = new THREE.Line(rodGeo, rodMat);
  room.add(rod);

  // gear kinematics: each gear's angle follows the driver's
  let theta = 0, omega = 0.4;
  const solveGears = () => {
    gears[0].g.rotation.z = theta;
    for (let i = 1; i < gears.length; i++) {
      const a = gears[i - 1], b = gears[i];
      const ratio = a.teeth / b.teeth;
      const alpha = Math.atan2(b.g.position.y - a.g.position.y, b.g.position.x - a.g.position.x);
      b.g.rotation.z = -ratio * a.g.rotation.z + alpha * (1 + ratio) + Math.PI / b.teeth;
    }
  };
  const tip = tooltip(stage);
  const dragGear = (e) => {
    if (e.phase === 'move') {
      // map pointer motion to rotation around the gear centre
      omega = omega * 0.5 + (-e.dx * 0.012 + e.dy * 0.008) * 30;
      stage.busyUntil = stage.t + 4;
    }
  };
  gears.forEach((gg) => stage.interact(gg.g, {
    cursor: 'grab',
    drag: dragGear,
    hover(on) { if (on) tip.show('<b>拖动齿轮</b><span>转得越快，风箱鼓得越猛</span>', train.localToWorld(new THREE.Vector3(0, 0.95, 0.2))); else tip.hide(); },
  }));

  // ---- anvil, hammer, sparks ------------------------------------------------------
  const anvil = makeAnvil();
  anvil.position.set(0.9, 0, 0.5);
  anvil.rotation.y = -0.25;
  room.add(anvil);
  const ingotMat = new THREE.MeshStandardMaterial({ color: 0x3a2a24, emissive: 0xff6a20, emissiveIntensity: 0.4, roughness: 0.5 });
  const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.12), ingotMat);
  ingot.position.set(0.1, 1.44, 0);
  anvil.add(ingot);
  const hammerPivot = new THREE.Group();
  hammerPivot.position.set(0.85, 1.6, 0);
  anvil.add(hammerPivot);
  const hammer = makeHammer();
  hammer.rotation.z = Math.PI / 2;      // handle points along -x from the grip
  hammer.position.set(0, 0, 0);
  hammerPivot.add(hammer);
  const strikePoint = new THREE.Vector3();

  const N = 160;
  const sp = new Float32Array(N * 3), sv = new Float32Array(N * 3), sl = new Float32Array(N).fill(0);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sMat = new THREE.PointsMaterial({ map: glowTexture(), color: 0xffb04a, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks = new THREE.Points(sGeo, sMat);
  sparks.frustumCulled = false;
  room.add(sparks);
  const flash = new THREE.PointLight(0xffa040, 0, 5, 2);
  room.add(flash);
  let next = 0;
  const burstSparks = (origin, power) => {
    const count = Math.round(30 + power * 70);
    for (let k = 0; k < count; k++) {
      const i = next = (next + 1) % N;
      sp[i * 3] = origin.x; sp[i * 3 + 1] = origin.y; sp[i * 3 + 2] = origin.z;
      const a = Math.random() * Math.PI * 2, up = 1.5 + Math.random() * 3 * (0.5 + power);
      const out = 1 + Math.random() * 2.5 * (0.5 + power);
      sv[i * 3] = Math.cos(a) * out; sv[i * 3 + 1] = up; sv[i * 3 + 2] = Math.sin(a) * out;
      sl[i] = 0.6 + Math.random() * 0.8;
    }
  };

  let count = 0;
  try { count = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0; } catch { /* storage unavailable */ }
  const countEl = document.getElementById('anvil-count');
  const heatEl = document.getElementById('forge-heat');
  if (countEl) countEl.textContent = String(count);
  let swing = -1;              // -1 idle, 0..1 animating
  const strike = () => {
    if (swing >= 0 && swing < 0.55) return;
    swing = 0;
    stage.busyUntil = stage.t + 2;
    stage.wake();
  };
  stage.interact(anvil, {
    hover(on) { if (on) tip.show('<b>敲一下</b><span>炉越热，火星越多</span>', anvil.localToWorld(new THREE.Vector3(0, 2.0, 0))); else tip.hide(); },
    click: strike,
  });
  document.getElementById('anvil-strike')?.addEventListener('click', strike);

  const lights = indoorLights(stage, { day: 0.85, night: 0.18, key: 1.0, keyNight: 0.1, keyPos: [5, 8, 6] });

  const look = new THREE.Vector3(0, 1.4, -0.8);
  const base = new THREE.Vector3(0, 3, 7);
  let sway = parallax(stage, base, look, { x: 0.5, y: 0.2 });
  const resize = () => {
    const wide = stage.width > 900;
    const share = wide ? 0.64 : 1;
    look.x = wide ? -1.7 : 0.2;
    base.x = look.x + 0.6;
    const d = fitDistance(stage, 8.4 / share, 4.2);
    base.y = look.y + d * 0.3;
    base.z = look.z + d * 0.95;
    sway = parallax(stage, base, look, { x: 0.5, y: 0.2 });
  };
  resize();
  new ResizeObserver(resize).observe(stage.container);

  let heat = 0.15;
  const crankLocal = new THREE.Vector3(0.18, 0, 0.05);
  return (dt, t) => {
    sway(dt);
    lights();
    // gears coast down; a slow idle turn keeps them alive
    omega += (0.25 - omega) * Math.min(1, dt * 0.6);
    theta += omega * dt;
    solveGears();
    const last = gears[gears.length - 1].g;
    const speed = Math.abs(omega);
    heat += (Math.min(1, speed / 6) - heat) * dt * (speed > 1 ? 0.5 : 0.15);
    if (heatEl) heatEl.textContent = String(Math.round(heat * 100));
    // bellows squeeze in time with the last gear's crank
    const squeeze = 0.5 + 0.5 * Math.sin(last.rotation.z);
    upperPivot.rotation.z = 0.08 + squeeze * 0.28;
    bag.scale.set(1, 0.4 + squeeze * 0.9, 1);
    const crank = last.localToWorld(crankLocal.clone());
    const tipPos = upper.localToWorld(new THREE.Vector3(0.4, 0.03, 0));
    rodGeo.setFromPoints([crank, tipPos]);

    const power = 0.45 + heat * 1.1;
    fire.update(t, dt, power, Math.sin(t * 0.9) * 0.1 + heat * 0.25);
    coalMat.emissiveIntensity = 0.4 + heat * 1.6 + Math.sin(t * 5) * 0.08;
    ingotMat.emissiveIntensity = 0.2 + heat * 2.2;
    torches.forEach((tc) => tc.update(dt, t, 0.8));

    // hammer: lift, fall, impact
    if (swing >= 0) {
      swing += dt * 1.6;
      let a;
      if (swing < 0.45) a = (swing / 0.45) * 1.15;                     // raise
      else if (swing < 0.55) a = 1.15 - ((swing - 0.45) / 0.1) * 1.4; // fall
      else a = -0.25 + Math.min(1, (swing - 0.55) / 0.45) * 0.25;      // rebound
      hammerPivot.rotation.z = a;
      if (swing >= 0.55 && !hammerPivot.userData.hit) {
        hammerPivot.userData.hit = true;
        ingot.getWorldPosition(strikePoint).add(new THREE.Vector3(0, 0.06, 0));
        burstSparks(strikePoint, heat);
        flash.position.copy(strikePoint);
        flash.intensity = 6 + heat * 10;
        clang(0.6 + heat * 0.4);
        count += 1;
        try { localStorage.setItem(COUNT_KEY, String(count)); } catch { /* storage unavailable */ }
        if (countEl) countEl.textContent = String(count);
      }
      if (swing >= 1) { swing = -1; hammerPivot.userData.hit = false; hammerPivot.rotation.z = 0; }
    }
    flash.intensity *= Math.pow(0.02, dt);
    for (let i = 0; i < N; i++) {
      if (sl[i] <= 0) { sp[i * 3 + 1] = -99; continue; }
      sl[i] -= dt;
      sv[i * 3 + 1] -= 9.8 * dt;
      sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt;
      if (sp[i * 3 + 1] < 0.02) { sp[i * 3 + 1] = 0.02; sv[i * 3 + 1] *= -0.35; sv[i * 3] *= 0.6; sv[i * 3 + 2] *= 0.6; }
    }
    sGeo.attributes.position.needsUpdate = true;
    sMat.color.setHSL(0.08 + heat * 0.03, 1, 0.55 + heat * 0.15);
    tip.place();
  };
}
