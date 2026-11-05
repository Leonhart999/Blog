// The Rookery (about page): the top of a tower at dusk, with ravens on a
// perch. They watch the cursor and croak when clicked. Writing a letter below
// sends one of them off with the scroll before the mail client opens.
import { THREE, place, loadLibrary, easeInOut } from '../stage.js';
import { makeRaven, poseRaven, faceRaven, makeScroll, glowSprite } from '../props.js';
import { mountRoom, tooltip, parallax, fitDistance, addTorch } from './common.js';
import { caw, wings } from '../sfx.js';

export function mount(container) {
  return mountRoom(container, build, { fov: 36 });
}

function build(stage, lib) {
  const { scene } = stage;
  const root = new THREE.Group();
  scene.add(root);

  // ---- tower top ---------------------------------------------------------------
  const stone = new THREE.MeshStandardMaterial({ color: 0x7a7168, roughness: 0.95, flatShading: true });
  const R = 4.2;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.05, 0.5, 24), stone);
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  root.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.05, R * 0.98, 14, 24, 1, true), stone);
  wall.position.y = -7.4;
  root.add(wall);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const h = i % 2 ? 0.55 : 1.05;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, h, 0.45), stone);
    m.position.set(Math.cos(a) * (R - 0.15), h / 2, Math.sin(a) * (R - 0.15));
    m.rotation.y = -a + Math.PI / 2;
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }
  for (let x = -2; x <= 2; x += 4) for (let z = -2; z <= 2; z += 4) place(lib, 'floor_tile_large', root, x, 0.01, z, 0, 0.98);

  // perch
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.85 });
  const perch = new THREE.Group();
  perch.position.set(0.6, 0, -0.4);
  root.add(perch);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 8), wood);
    post.position.set(s * 1.5, 0.85, 0);
    post.castShadow = true;
    perch.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 8), wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 1.62;
  bar.castShadow = true;
  perch.add(bar);
  place(lib, 'trunk_medium_A', root, -2.2, 0, 0.6, 30, 0.8);
  place(lib, 'barrel_small', root, 2.8, 0, 1.2, 0, 0.7);
  const scrollPile = [makeScroll({ length: 0.5 }), makeScroll({ length: 0.45, ribbon: 0x2b4566 })];
  scrollPile.forEach((s, i) => { s.position.set(-2.2 + i * 0.1, 0.62 + i * 0.1, 0.6); s.rotation.y = 0.5 + i; root.add(s); });
  const lantern = addTorch(lib, root, -1.4, 0.6, -2.9, 0, { light: true });

  // distant landscape (estate models, scaled up and far below)
  loadLibrary(document.getElementById('estate-model')?.dataset.model || '').then((estate) => {
    const far = [['mountain_A_grass_trees', -40, -90, 8, -26], ['mountain_C_grass_trees', 34, -100, 9, -28], ['mountain_B_grass', 0, -120, 10, -30], ['hills_A_trees', -20, -60, 6, -20], ['hills_B_trees', 22, -64, 6, -20]];
    for (const [n, x, z, s, y] of far) place(estate, n, root, x, y, z, (x * 7) % 360, s);
    for (let i = 0; i < 5; i++) {
      const c = place(estate, i % 2 ? 'cloud_small' : 'cloud_big', clouds, -40 + i * 20, -9 + (i % 3) * 2, -55 - (i % 2) * 15, 0, 2.6 + (i % 2) * 0.6);
      c.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
    }
    stage.wake();
  }).catch(() => { /* backdrop is optional */ });
  const clouds = new THREE.Group();
  root.add(clouds);

  // ---- ravens --------------------------------------------------------------------
  const tip = tooltip(stage);
  const ravens = [];
  const spots = [[-0.9, 1.67, 0, 0.2], [0.2, 1.67, 0, -0.2], [1.1, 1.67, 0, 0.4], [-3.2, 1.05, -2.4, 0.9]];
  spots.forEach(([x, y, z, rot], i) => {
    const r = makeRaven();
    const g = r.group;
    g.scale.setScalar(1.25);
    const home = new THREE.Vector3(x, y, z).add(i < 3 ? perch.position : new THREE.Vector3());
    g.position.copy(home);
    g.rotation.y = rot;
    root.add(g);
    poseRaven(r, 0);
    const st = { r, home, rot, hop: 0, flap: 0, tilt: 0, nextTilt: 2 + Math.random() * 4, flying: null, seed: i * 1.7, cawT: 0, blinkT: 1 + Math.random() * 3 };
    ravens.push(st);
    stage.interact(g, {
      hover(on) { if (on && !st.flying) tip.show('<b>渡鸦</b><span>点一下，它会叫两声</span>', g.position.clone().add(new THREE.Vector3(0, 1.0, 0))); else tip.hide(); },
      click() {
        if (st.flying) return;
        caw(); st.hop = 1; st.flap = 1; st.cawT = 0.65;
        stage.busyUntil = stage.t + 2;
      },
    });
  });

  // ---- sending a letter -----------------------------------------------------------
  const letterScroll = makeScroll({ length: 0.28, radius: 0.035 });
  letterScroll.visible = false;
  root.add(letterScroll);
  document.addEventListener('rookery-send', (e) => {
    const st = ravens.find((r) => !r.flying) || ravens[0];
    st.flying = { t: 0, href: e.detail?.href, from: st.r.group.position.clone() };
    letterScroll.visible = true;
    wings(6);
    caw();
    st.cawT = 0.65;
    stage.busyUntil = stage.t + 5;
    stage.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    stage.wake();
  });

  // ---- light ------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xffe0c0, 0x5a4a3a, 1.3);
  const sun = new THREE.DirectionalLight(0xffb880, 2.4);
  sun.position.set(-10, 7, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
  scene.add(hemi, sun);
  const moon = glowSprite(0xfff6dc, 6, 0);
  moon.position.set(14, 16, -40);
  scene.add(moon);

  const look = new THREE.Vector3(0, 1.2, -0.6);
  const base = new THREE.Vector3(0, 3.5, 8);
  let sway = parallax(stage, base, look, { x: 0.7, y: 0.3 });
  const resize = () => {
    const wide = stage.width > 900;
    const share = wide ? 0.64 : 1;
    look.x = wide ? -2.1 : 0.3;
    base.x = look.x + 0.4;
    const d = fitDistance(stage, 6.2 / share, 3.6);
    base.y = look.y + d * 0.3;
    base.z = look.z + d * 0.95;
    sway = parallax(stage, base, look, { x: 0.7, y: 0.3 });
  };
  resize();
  new ResizeObserver(resize).observe(stage.container);

  const ray = new THREE.Raycaster();
  const gaze = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -4);
  const tmp = new THREE.Vector3();
  return (dt, t) => {
    sway(dt);
    const n = stage.night;
    hemi.intensity = 1.3 - n * 0.9;
    hemi.color.setHex(0xffe0c0).lerp(new THREE.Color(0x52608e), n);
    sun.intensity = 2.4 - n * 1.6;
    sun.color.setHex(0xffb880).lerp(new THREE.Color(0xaabcff), n);
    moon.material.opacity = n * 0.9;
    lantern.update(dt, t, 0.4 + n * 0.8);
    lantern.fire.light.intensity *= 0.2 + n;
    clouds.position.x = Math.sin(t * 0.02) * 6;

    // where the cursor points, projected onto a plane in front of the tower
    if (stage.pointerInside) {
      ray.setFromCamera(stage.pointer, stage.camera);
      ray.ray.intersectPlane(plane, gaze);
    } else gaze.set(Math.sin(t * 0.3) * 3, 2, 4);

    for (const st of ravens) {
      const g = st.r.group;
      if (st.flying) {
        const f = st.flying;
        f.t += dt / 3.2;
        const k = easeInOut(Math.min(1, f.t));
        const p = new THREE.Vector3(
          f.from.x + k * 9 + Math.sin(k * 3) * 2,
          f.from.y + k * 7 + Math.sin(k * Math.PI) * 1.5,
          f.from.z - k * 26,
        );
        tmp.copy(p).sub(g.position);
        g.position.copy(p);
        if (tmp.lengthSq() > 1e-6) g.rotation.y = Math.atan2(tmp.x, tmp.z);
        g.rotation.x = -0.15;
        st.r.torso.rotation.x += (-0.05 - st.r.torso.rotation.x) * Math.min(1, dt * 6);
        poseRaven(st.r, 1, Math.sin(t * 16) * 0.75);
        letterScroll.position.copy(g.position).add(new THREE.Vector3(0, 0.05, 0));
        letterScroll.rotation.y = g.rotation.y + Math.PI / 2;
        if (f.t >= 1) {
          const href = f.href;
          st.flying = null;
          letterScroll.visible = false;
          g.position.copy(st.home);
          g.rotation.set(0, st.rot, 0);
          st.r.torso.rotation.x = -0.5;
          poseRaven(st.r, 0);
          st.hop = 1;
          if (href) location.href = href;
        }
        continue;
      }
      // idle: look toward the cursor, occasionally tilt the head
      tmp.copy(gaze);
      g.worldToLocal(tmp);
      const yaw = Math.atan2(tmp.x, tmp.z);
      st.r.head.rotation.y += (Math.max(-1.3, Math.min(1.3, yaw)) - st.r.head.rotation.y) * Math.min(1, dt * 5);
      st.nextTilt -= dt;
      if (st.nextTilt < 0) { st.tilt = (Math.random() - 0.5) * 0.9; st.nextTilt = 1.5 + Math.random() * 4; }
      st.r.head.rotation.z += (st.tilt - st.r.head.rotation.z) * Math.min(1, dt * 4);
      st.hop = Math.max(0, st.hop - dt * 2.2);
      st.flap = Math.max(0, st.flap - dt * 1.5);
      g.position.y = st.home.y + Math.sin(st.hop * Math.PI) * 0.3;
      poseRaven(st.r, st.flap > 0 ? 0.9 : 0.02 + Math.sin(t * 2 + st.seed) * 0.02, st.flap > 0 ? Math.sin(t * 25) * 0.7 : 0);
      st.r.tail.rotation.x += Math.sin(t * 1.5 + st.seed) * 0.05;
      // croak: the beak opens twice, matching the two calls
      st.cawT = Math.max(0, st.cawT - dt);
      const beak = st.cawT > 0 ? Math.max(0, Math.sin((0.65 - st.cawT) / 0.32 * Math.PI)) : 0;
      // blink every few seconds
      st.blinkT -= dt;
      if (st.blinkT < -0.12) st.blinkT = 2 + Math.random() * 4;
      faceRaven(st.r, beak, st.blinkT < 0 ? 1 : 0);
      // breathing
      st.r.torso.scale.set(1, 1 + Math.sin(t * 2.2 + st.seed) * 0.015, 1);
    }
    tip.place();
  };
}
