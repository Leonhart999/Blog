// The Market (tags): banners hang from a rope across the square, one per tag,
// each with its own generated coat of arms. Click a banner to filter the posts
// below. Visitors can forge a banner of their own with the heraldry tool.
import { THREE, place, loadLibrary } from '../stage.js';
import { canvasTexture, makeCloth, makeStall, CJK_SERIF } from '../props.js';
import { mountRoom, tooltip, parallax, fitDistance, escapeHtml, addTorch } from './common.js';
import { arms, armsSvg } from '../../lib/heraldry.js';
import { chime } from '../sfx.js';

export function mount(container) {
  return mountRoom(container, build, { fov: 36 });
}

/** Draw a banner: field colour, gilt border, the arms, and the tag name. */
function bannerTexture(name, onReady) {
  const a = arms(name);
  const W = 256, H = 400;
  const tex = canvasTexture(W, H, (g) => paint(g, null));
  function paint(g, img) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = a.field.key === 'argent' || a.field.key === 'or' ? '#6b2018' : a.field.hex;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.12)';
    for (let y = 0; y < H; y += 5) g.fillRect(0, y, W, 2);
    g.strokeStyle = '#d2aa58'; g.lineWidth = 8; g.strokeRect(10, 10, W - 20, H - 20);
    if (img) g.drawImage(img, W / 2 - 80, 50, 160, 190);
    g.fillStyle = '#f3e7cd'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 40;
    g.font = `700 ${size}px "Cinzel",${CJK_SERIF}`;
    while (g.measureText(name).width > W - 50 && size > 18) { size -= 2; g.font = `700 ${size}px "Cinzel",${CJK_SERIF}`; }
    g.fillText(name, W / 2, 300);
  }
  const img = new Image();
  img.onload = () => {
    const c = tex.image;
    paint(c.getContext('2d'), img);
    tex.needsUpdate = true;
    onReady?.();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(armsSvg(a, { size: 160 }));
  return tex;
}

function build(stage, lib, data) {
  const { scene } = stage;
  const root = new THREE.Group();
  scene.add(root);

  // ---- square -----------------------------------------------------------------
  for (let x = -12; x <= 12; x += 4) for (let z = -8; z <= 4; z += 4) place(lib, 'floor_tile_large', root, x, 0, z);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x8f9a4a, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.06;
  grass.receiveShadow = true;
  root.add(grass);

  const stallA = makeStall({ stripes: ['#8e2a22', '#efe3c6'] });
  stallA.position.set(-4.6, 0, -3.2); stallA.rotation.y = 0.35;
  const stallB = makeStall({ stripes: ['#2b4566', '#e6c47c'], w: 2.6 });
  stallB.position.set(4.4, 0, -3.6); stallB.rotation.y = -0.4;
  root.add(stallA, stallB);
  place(lib, 'crates_stacked', root, -6.4, 0, -2.0, 30, 0.45);
  place(lib, 'barrel_large', root, 6.3, 0, -2.4, 0, 0.45);
  place(lib, 'barrel_small', root, 5.6, 0, -1.6, 0, 0.6);
  place(lib, 'box_small', root, -3.4, 0, -1.4, 15, 0.7);
  place(lib, 'coin_stack_small', stallA, 0.3, 0.76, 0.2, 0, 0.45);
  place(lib, 'bottle_A_labeled_green', stallA, -0.5, 0.76, 0.2, 0, 0.4);
  place(lib, 'plate_food_A', stallB, 0.4, 0.76, 0.2, 0, 0.45);
  place(lib, 'bottle_B_green', stallB, -0.6, 0.76, 0.25, 0, 0.4);
  const lanterns = [addTorch(lib, root, -4.6, 1.2, -2.5, 0, { light: true }), addTorch(lib, root, 4.4, 1.2, -2.9, 0, { light: true })];

  // the village behind, from the estate models (scaled up)
  loadLibrary(document.getElementById('estate-model')?.dataset.model || '').then((estate) => {
    const back = [
      ['building_home_A_red', -8, -11, 20], ['building_tavern_red', -3.5, -12.5, 0], ['building_church_red', 2.5, -13, -10],
      ['building_home_B_red', 7.5, -11, -30], ['building_windmill_red', 12, -14, 0], ['trees_A_large', -12, -12, 0], ['trees_B_large', 10, -9, 0],
      ['building_market_red', -11, -7, 60], ['trees_A_medium', 13, -6, 0],
    ];
    for (const [n, x, z, r] of back) place(estate, n, root, x, 0, z, r, 2.6);
    stage.wake();
  }).catch(() => { /* backdrop is optional */ });

  // ---- rope and banners --------------------------------------------------------
  const tags = data.tags || [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.85 });
  // Up to 10 banners per rope; more tags get more ropes, further back and higher.
  const PER_ROPE = 10;
  const rows = Math.max(1, Math.ceil(tags.length / PER_ROPE));
  const perRow = Math.ceil(tags.length / rows) || 1;
  const span = Math.max(7, Math.min(13, 2.2 + perRow * 1.15));
  const ropeY = 3.4, ropeZ = -0.6;
  const rowY = (r) => ropeY + r * 0.9;
  const rowZ = (r) => ropeZ - r * 1.7;
  const finialMat = new THREE.MeshStandardMaterial({ color: 0xc9a14f, metalness: 0.5, roughness: 0.4 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7350 });
  const sag = 0.55;
  const ropeAt = (u, r = 0) => new THREE.Vector3((u - 0.5) * span, rowY(r) - sag * (1 - Math.pow(2 * u - 1, 2)), rowZ(r));
  for (let r = 0; r < rows; r++) {
    for (const s of [-1, 1]) {
      const h = rowY(r) + 0.4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 8), poleMat);
      pole.position.set(s * span / 2, h / 2, rowZ(r));
      pole.castShadow = true;
      root.add(pole);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), finialMat);
      finial.position.set(s * span / 2, h + 0.05, rowZ(r));
      root.add(finial);
    }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 21 }, (_, i) => ropeAt(i / 20, r))), 40, 0.018, 5), ropeMat);
    root.add(rope);
  }

  const tip = tooltip(stage);
  const selected = new Set();
  const banners = [];
  const slots = (n) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));

  const hang = (name, count, u, custom = false, row = 0) => {
    const tex = bannerTexture(name, () => stage.wake());
    const cloth = makeCloth(tex, 0.78, 1.2, { swallow: true });
    const holder = new THREE.Group();
    holder.position.copy(ropeAt(u, row));
    holder.add(cloth.mesh);
    root.add(holder);
    const b = { name, count, holder, cloth, phase: Math.random() * 6, hot: 0, hotT: 0, lift: 0, custom, drop: custom ? 1 : 0 };
    banners.push(b);
    stage.interact(holder, {
      hover(on) {
        b.hotT = on ? 1 : 0;
        if (on) tip.show(custom ? `<b>${escapeHtml(name)}</b><span>你刚铸成的旗帜</span>` : `<b>${escapeHtml(name)}</b><span>${count} 篇 · 点击${selected.has(name) ? '取消' : ''}筛选</span>`, holder.position.clone().add(new THREE.Vector3(0, 0.25, 0)));
        else tip.hide();
      },
      click() {
        if (custom) return;
        if (selected.has(name)) selected.delete(name); else selected.add(name);
        chime();
        applyFilter();
        tip.hide();
      },
    });
    return b;
  };
  // the most used tags hang on the front rope
  for (let r = 0; r < rows; r++) {
    const list = tags.slice(r * perRow, (r + 1) * perRow);
    slots(list.length).forEach((u, i) => hang(list[i].name, list[i].count, u, false, r));
  }

  // ---- filtering the list below --------------------------------------------------
  const entries = [...document.querySelectorAll('[data-tags]')];
  const status = document.getElementById('tag-filter-status');
  const clearBtn = document.getElementById('tag-filter-clear');
  const pennants = [...document.querySelectorAll('[data-tag-toggle]')];
  function applyFilter() {
    let shown = 0;
    for (const li of entries) {
      const t = JSON.parse(li.dataset.tags || '[]');
      const ok = selected.size === 0 || [...selected].every((s) => t.includes(s));
      li.hidden = !ok;
      if (ok) shown++;
    }
    pennants.forEach((p) => p.classList.toggle('on', selected.has(p.dataset.tagToggle)));
    if (status) status.innerHTML = selected.size ? `筛选：${[...selected].map(escapeHtml).join(' + ')}，共 <b>${shown}</b> 篇` : `全部 <b>${entries.length}</b> 篇`;
    if (clearBtn) clearBtn.hidden = selected.size === 0;
    banners.forEach((b) => { b.lift = selected.has(b.name) ? 1 : 0; });
    stage.wake();
  }
  pennants.forEach((p) => p.addEventListener('click', (e) => {
    e.preventDefault();
    const n = p.dataset.tagToggle;
    if (selected.has(n)) selected.delete(n); else selected.add(n);
    applyFilter();
  }));
  clearBtn?.addEventListener('click', () => { selected.clear(); applyFilter(); });
  applyFilter();

  // ---- a visitor's banner from the heraldry tool ---------------------------------
  let customBanner = null;
  document.addEventListener('heraldry-forge', (e) => {
    const name = e.detail?.name;
    if (!name) return;
    if (customBanner) { root.remove(customBanner.holder); banners.splice(banners.indexOf(customBanner), 1); }
    // hang it on its own little pole at the front
    customBanner = hang(name, 0, 0.5, true);
    customBanner.holder.position.set(span / 2 - 0.6, ropeY - 0.2, ropeZ + 1.6);
    stage.busyUntil = stage.t + 3;
    stage.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ---- light ------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xfff1d2, 0x6b5a3a, 1.4);
  const sun = new THREE.DirectionalLight(0xffd6a0, 2.4);
  sun.position.set(-8, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 50 });
  sun.shadow.bias = -0.0006;
  scene.add(hemi, sun);

  const look = new THREE.Vector3(0, 2.2, -1.5);
  const base = new THREE.Vector3(0, 3, 10);
  let sway = parallax(stage, base, look, { x: 0.8, y: 0.3 });
  const resize = () => {
    const wide = stage.width > 900;
    const share = wide ? 0.66 : 1;
    look.x = wide ? -span * 0.22 : 0;
    base.x = look.x;
    const d = fitDistance(stage, (span + 2.5) / share, 5.2 + (rows - 1) * 0.9);
    base.y = look.y + d * 0.16;
    base.z = look.z + d;
    sway = parallax(stage, base, look, { x: 0.8, y: 0.3 });
  };
  resize();
  new ResizeObserver(resize).observe(stage.container);

  return (dt, t) => {
    sway(dt);
    const n = stage.night;
    hemi.intensity = 1.4 - n * 0.95;
    hemi.color.setHex(0xfff1d2).lerp(new THREE.Color(0x5a6a9a), n);
    sun.intensity = 2.4 - n * 1.7;
    sun.color.setHex(0xffd6a0).lerp(new THREE.Color(0xb4c4ff), n);
    sun.position.set(-8 + n * 18, 14, 9 - n * 16);
    grass.material.color.setHex(0x8f9a4a).lerp(new THREE.Color(0x2e3a2a), n);
    lanterns.forEach((l) => { l.update(dt, t, 0.3 + n * 0.9); l.fire.light.intensity *= 0.3 + n; });
    const wind = 1 + Math.sin(t * 0.4) * 0.4;
    for (const b of banners) {
      b.hot += (b.hotT - b.hot) * Math.min(1, dt * 6);
      b.drop = Math.max(0, b.drop - dt * 1.2);
      b.cloth.update(t, wind + b.hot * 1.5, b.phase);
      const lift = b.lift ? 0.25 : 0;
      b.holder.children[0].position.y = lift + b.drop * 1.5;
      b.holder.rotation.x = Math.sin(t * 1.3 + b.phase) * 0.06 * wind - b.hot * 0.12;
      b.holder.scale.setScalar(1 + b.hot * 0.06 + (b.lift ? 0.05 : 0));
    }
    tip.place();
  };
}
