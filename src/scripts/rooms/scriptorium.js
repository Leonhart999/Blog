// The Scriptorium (tech posts): a writing desk with an open codex. Each spread
// of the codex is one post; flip pages with the buttons, arrow keys or a drag.
// The candle can be snuffed and relit.
import { THREE, place, easeInOut } from '../stage.js';
import { canvasTexture, wrapText, CJK_SERIF, makeQuill, makeInkpot, makeScroll, makeBook, glowSprite } from '../props.js';
import { mountRoom, buildHall, addCandle, makeDust, indoorLights, tooltip, parallax, fitDistance } from './common.js';
import { flip as flipSound, whoosh } from '../sfx.js';

export function mount(container) {
  return mountRoom(container, build);
}

const PW = 1.05, PH = 1.42;           // page size (world units)
const TEX_W = 512, TEX_H = 692;

function parchment(g, w, h, side) {
  const grad = g.createLinearGradient(side === 'left' ? w : 0, 0, side === 'left' ? 0 : w, 0);
  grad.addColorStop(0, '#d9c497'); grad.addColorStop(0.12, '#efe2c2'); grad.addColorStop(1, '#f3e8cc');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,80,30,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.strokeStyle = 'rgba(142,42,34,.55)'; g.lineWidth = 2;
  g.strokeRect(34, 34, w - 68, h - 68);
  g.strokeStyle = 'rgba(160,116,42,.6)'; g.lineWidth = 1;
  g.strokeRect(42, 42, w - 84, h - 84);
}

function illuminated(g, ch, x, y, s) {
  g.fillStyle = '#2b4566'; g.fillRect(x, y, s, s);
  g.strokeStyle = '#d2aa58'; g.lineWidth = 4; g.strokeRect(x + 3, y + 3, s - 6, s - 6);
  g.fillStyle = '#e6c47c'; g.font = `700 ${s * 0.66}px ${CJK_SERIF}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, x + s / 2, y + s / 2 + 4);
  // vine flourish
  g.strokeStyle = 'rgba(47,93,58,.8)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x + s / 2, y + s); g.bezierCurveTo(x + s / 2, y + s + 40, x - 10, y + s + 30, x - 4, y + s + 90); g.stroke();
}

function lines(g, text, x, y, maxW, lh, max = 99) {
  const ls = wrapText(g, text, maxW).slice(0, max);
  ls.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return y + ls.length * lh;
}

function pageTexture(spec) {
  return canvasTexture(TEX_W, TEX_H, (g, w, h) => {
    parchment(g, w, h, spec.side);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const x0 = 70, maxW = w - 140;
    if (spec.kind === 'title') {
      g.fillStyle = '#a0742a'; g.font = `600 20px "Cinzel",serif`; g.textAlign = 'center';
      g.fillText('LIBER SCRIPTORII', w / 2, 120);
      g.fillStyle = '#2b1e14'; g.font = `900 64px ${CJK_SERIF}`;
      g.fillText('缮写室抄本', w / 2, 250);
      g.fillStyle = '#8e2a22'; g.font = `600 28px ${CJK_SERIF}`;
      g.fillText('技术笔记', w / 2, 310);
      g.fillStyle = '#a0742a'; g.font = '40px serif';
      g.fillText('❦', w / 2, 400);
      g.fillStyle = '#6d5945'; g.font = `400 22px ${CJK_SERIF}`;
      g.fillText(`共 ${spec.count} 篇`, w / 2, 470);
      g.font = `400 18px ${CJK_SERIF}`;
      g.fillText('向右翻页阅读', w / 2, 600);
    } else if (spec.kind === 'toc') {
      g.fillStyle = '#8e2a22'; g.font = `700 34px ${CJK_SERIF}`; g.textAlign = 'center';
      g.fillText('目　录', w / 2, 120);
      g.textAlign = 'left';
      let y = 180;
      if (!spec.items.length) { g.fillStyle = '#6d5945'; g.font = `400 22px ${CJK_SERIF}`; g.fillText('这本抄本还是空白的。', x0, y); }
      spec.items.slice(0, 9).forEach((it, i) => {
        g.fillStyle = '#a0742a'; g.font = `700 20px "Cinzel",serif`;
        g.fillText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][i], x0, y);
        g.fillStyle = '#2b1e14'; g.font = `600 22px ${CJK_SERIF}`;
        y = lines(g, it.title, x0 + 52, y, maxW - 52, 30, 2) + 22;
      });
    } else if (spec.kind === 'post-left') {
      const p = spec.post;
      g.fillStyle = '#a0742a'; g.font = `600 18px "Cinzel",serif`; g.textAlign = 'center';
      g.fillText(`FOLIO ${spec.numeral}`, w / 2, 100);
      g.textAlign = 'left';
      illuminated(g, [...p.title][0], x0, 140, 110);
      g.fillStyle = '#2b1e14'; g.font = `900 34px ${CJK_SERIF}`;
      const rest = [...p.title].slice(1).join('');
      let y = lines(g, rest, x0 + 124, 190, maxW - 124, 44, 2);
      y = Math.max(y, 290) + 20;
      g.fillStyle = '#6d5945'; g.font = `400 21px ${CJK_SERIF}`;
      g.fillText(p.date, x0, y); y += 40;
      g.fillStyle = '#8e2a22'; g.font = `600 19px ${CJK_SERIF}`;
      g.fillText(p.tags.map((t) => '◆ ' + t).join('　'), x0, y);
      g.fillStyle = 'rgba(160,116,42,.7)'; g.font = '34px serif'; g.textAlign = 'center';
      g.fillText('❧', w / 2, h - 90);
    } else if (spec.kind === 'post-right') {
      const p = spec.post;
      g.fillStyle = '#47362a'; g.font = `400 24px ${CJK_SERIF}`;
      let y = lines(g, p.description, x0, 140, maxW, 40, 8);
      g.fillStyle = '#6d5945'; g.font = `400 20px ${CJK_SERIF}`;
      y += 30; g.fillText(`约 ${p.minutes} 分钟读完`, x0, y);
      g.fillStyle = '#8e2a22'; g.fillRect(x0, h - 170, maxW, 64);
      g.fillStyle = '#f7eed9'; g.font = `700 26px ${CJK_SERIF}`; g.textAlign = 'center';
      g.fillText('点此翻开全文 →', w / 2, h - 128);
    } else {
      g.fillStyle = 'rgba(160,116,42,.6)'; g.font = '40px serif'; g.textAlign = 'center';
      g.fillText('❦', w / 2, h / 2);
      g.fillStyle = '#6d5945'; g.font = `400 20px ${CJK_SERIF}`;
      g.fillText('全书完', w / 2, h / 2 + 60);
    }
  });
}

/** Bendable page geometry: x from 0 (spine) to PW. */
function pageGeometry() {
  const g = new THREE.PlaneGeometry(PW, PH, 24, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(PW / 2, 0, 0);
  g.userData.base = Float32Array.from(g.attributes.position.array);
  return g;
}
function bendPage(geo, theta) {
  const base = geo.userData.base, p = geo.attributes.position;
  const bend = Math.sin(theta) * 0.55;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], z = base[i * 3 + 2];
    // walk along the page, rotating a little more the further from the spine
    const k = x / PW;
    const a = theta + bend * k * (theta < Math.PI / 2 ? -1 : 1) * 0.6;
    const r = x;
    p.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r * 0.98 + 0.004 + k * 0.004, z);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}

function build(stage, lib, data) {
  const { scene } = stage;
  const room = new THREE.Group();
  scene.add(room);
  buildHall(lib, room, { floor: 'floor_wood_large', walls: ['wall_shelves', 'wall_window_open', 'wall_window_open', 'wall_shelves'], width: 16, depth: 8, z0: -2.6 });

  // ---- desk ------------------------------------------------------------------
  const desk = place(lib, 'table_long', room, 0, 0, 0, 90);
  place(lib, 'chair', room, -2.9, 0, -0.9, 60);
  place(lib, 'shelf_small_candles', room, -2.2, 1.4, -2.55);
  place(lib, 'box_small', room, 3.2, 0, 0.4, 20);
  const deskTop = new THREE.Box3().setFromObject(desk).max.y;

  // ---- codex -----------------------------------------------------------------
  const codex = new THREE.Group();
  codex.position.set(0, deskTop + 0.06, 0.15);
  codex.rotation.x = 0.22;            // tilted toward the reader
  room.add(codex);
  const board = new THREE.MeshStandardMaterial({ color: 0x5a2018, roughness: 0.7 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(PW * 2 + 0.12, 0.05, PH + 0.1), board);
  cover.position.y = -0.04;
  cover.castShadow = cover.receiveShadow = true;
  const block = new THREE.Mesh(new THREE.BoxGeometry(PW * 2 - 0.02, 0.06, PH - 0.02), new THREE.MeshStandardMaterial({ color: 0xe6d6ad, roughness: 0.95 }));
  block.position.y = -0.01;
  codex.add(cover, block);

  const posts = data.posts || [];
  // spreads: [left spec, right spec]
  const spreads = [[{ kind: 'title', count: posts.length }, { kind: 'toc', items: posts }]];
  posts.forEach((p, i) => spreads.push([{ kind: 'post-left', post: p, numeral: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || String(i + 1) }, { kind: 'post-right', post: p }]));
  spreads.push([{ kind: 'end' }, { kind: 'end' }]);
  const texCache = new Map();
  const tex = (si, side) => {
    const k = si + side;
    if (!texCache.has(k)) {
      const spec = { ...spreads[si][side === 'L' ? 0 : 1], side: side === 'L' ? 'left' : 'right' };
      texCache.set(k, pageTexture(spec));
    }
    return texCache.get(k);
  };

  const flat = (side) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ roughness: 0.92 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(side * PW / 2, 0.025, 0);
    m.receiveShadow = true;
    codex.add(m);
    return m;
  };
  const leftPage = flat(-1), rightPage = flat(1);
  const turnGeo = pageGeometry();
  const turnFront = new THREE.Mesh(turnGeo, new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.FrontSide }));
  const turnBack = new THREE.Mesh(turnGeo, new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.BackSide }));
  turnFront.position.y = turnBack.position.y = 0.03;
  turnFront.castShadow = true;
  codex.add(turnFront, turnBack);
  turnFront.visible = turnBack.visible = false;

  let current = 0;
  let anim = null;          // { from, to, t }
  const setStatic = () => {
    leftPage.material.map = tex(current, 'L'); leftPage.material.needsUpdate = true;
    rightPage.material.map = tex(current, 'R'); rightPage.material.needsUpdate = true;
  };
  setStatic();

  const mirrored = (t) => { const c = t.clone(); c.wrapS = THREE.RepeatWrapping; c.repeat.x = -1; c.offset.x = 1; c.needsUpdate = true; return c; };
  const turn = (dir) => {
    if (anim) return;
    const to = current + dir;
    if (to < 0 || to >= spreads.length) return;
    anim = { from: current, to, dir, t: 0 };
    flipSound();
    if (dir > 0) {
      // the right page of `from` turns over and becomes the left page of `to`
      turnFront.material.map = tex(current, 'R');
      turnBack.material.map = mirrored(tex(to, 'L'));
      rightPage.material.map = tex(to, 'R');
    } else {
      turnFront.material.map = tex(to, 'R');
      turnBack.material.map = mirrored(tex(current, 'L'));
      leftPage.material.map = tex(to, 'L');
    }
    turnFront.material.needsUpdate = turnBack.material.needsUpdate = true;
    leftPage.material.needsUpdate = rightPage.material.needsUpdate = true;
    turnFront.visible = turnBack.visible = true;
    stage.busyUntil = stage.t + 1.2;
    stage.wake();
    updateButtons();
  };

  // controls
  const prevBtn = document.getElementById('codex-prev');
  const nextBtn = document.getElementById('codex-next');
  const readout = document.getElementById('codex-page');
  const updateButtons = () => {
    const target = anim ? anim.to : current;
    if (prevBtn) prevBtn.disabled = target <= 0;
    if (nextBtn) nextBtn.disabled = target >= spreads.length - 1;
    if (readout) readout.innerHTML = target === 0 ? '扉页' : target === spreads.length - 1 ? '封底' : `第 <b>${target}</b> / ${posts.length} 篇`;
  };
  prevBtn?.addEventListener('click', () => turn(-1));
  nextBtn?.addEventListener('click', () => turn(1));
  stage.container.tabIndex = 0;
  stage.container.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { turn(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { turn(-1); e.preventDefault(); }
  });
  updateButtons();

  const tip = tooltip(stage);
  stage.interact(rightPage, {
    hover(on) {
      const p = spreads[current][1].post;
      if (on && p) tip.show(`<b>翻开《${p.title}》</b>`, codex.localToWorld(new THREE.Vector3(PW / 2, 0.2, -PH / 2)));
      else if (on) tip.show('<b>翻到下一页</b>', codex.localToWorld(new THREE.Vector3(PW / 2, 0.2, -PH / 2)));
      else tip.hide();
    },
    click() {
      const p = spreads[current][1].post;
      if (p) location.href = p.url; else turn(1);
    },
  });
  stage.interact(leftPage, {
    hover(on) { if (on && current > 0) tip.show('<b>翻回上一页</b>', codex.localToWorld(new THREE.Vector3(-PW / 2, 0.2, -PH / 2))); else tip.hide(); },
    click() { turn(-1); },
  });
  // horizontal drag anywhere on the desk area flips pages
  let dragX = 0;
  stage.interact(cover, {
    cursor: 'grab',
    drag(e) {
      if (e.phase === 'start') dragX = 0;
      if (e.phase === 'move') dragX += e.dx;
      if (e.phase === 'end') { if (dragX < -60) turn(1); else if (dragX > 60) turn(-1); }
    },
  });

  // ---- desk clutter ----------------------------------------------------------
  const ink = makeInkpot();
  ink.position.set(1.55, deskTop, 0.55);
  const quill = makeQuill();
  quill.position.set(1.55, deskTop + 0.12, 0.55);
  quill.rotation.set(0.35, 0, -0.3);
  room.add(ink, quill);
  const scroll = makeScroll({ length: 0.7 });
  scroll.position.set(-1.6, deskTop + 0.05, 0.75);
  scroll.rotation.y = 0.4;
  room.add(scroll);
  for (let i = 0; i < 3; i++) {
    const b = makeBook({ w: 0.12, h: 0.8 - i * 0.06, d: 0.56 - i * 0.04 });
    b.rotation.z = Math.PI / 2;
    b.rotation.y = 0.15 * (i - 1);
    b.position.set(-1.7 + 0.4, deskTop + 0.06 + i * 0.12, -0.35);
    room.add(b);
  }

  // ---- candle ---------------------------------------------------------------
  const candle = addCandle(lib, room, 'candle_lit', 1.5, deskTop, -0.35, { light: true, scale: 0.9 });
  candle.light.intensity = 3; candle.light.distance = 7; candle.light.castShadow = true;
  candle.light.shadow.mapSize.set(512, 512);
  let lit = 1, litTarget = 1;
  // smoke wisps after snuffing
  const smoke = [];
  for (let i = 0; i < 8; i++) {
    const s = glowSprite(0xb8b0a4, 0.2, 0);
    s.material.blending = THREE.NormalBlending;
    room.add(s);
    smoke.push({ s, life: 1 });
  }
  stage.interact(candle.candle, {
    hover(on) { if (on) tip.show(litTarget ? '<b>吹灭蜡烛</b>' : '<b>点亮蜡烛</b>', candle.glow.position.clone().add(new THREE.Vector3(0, 0.35, 0))); else tip.hide(); },
    click() {
      litTarget = litTarget ? 0 : 1;
      whoosh();
      if (!litTarget) smoke.forEach((sm, i) => { sm.life = -i * 0.12; });
      tip.hide();
      stage.busyUntil = stage.t + 2;
    },
  });

  // ---- light shafts from the windows (day) --------------------------------
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shafts = [-2, 2].map((x) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.6, 6, 4, 1, true), shaftMat);
    m.position.set(x, 2.4, -0.6);
    m.rotation.set(-0.55, Math.PI / 4, 0.18 * Math.sign(x));
    room.add(m);
    return m;
  });

  const lights = indoorLights(stage, { day: 1.0, night: 0.12, key: 1.4, keyNight: 0.08, keyPos: [2, 7, -6] });
  const dust = makeDust(room, { box: [7, 3.5, 4], center: [0, 2.2, -0.5] });

  const look = new THREE.Vector3(0, deskTop + 0.1, -0.1);
  const base = new THREE.Vector3(0, deskTop + 2.6, 4);
  let sway = parallax(stage, base, look, { x: 0.35, y: 0.15 });
  const resize = () => {
    const wide = stage.width > 900;
    const share = wide ? 0.62 : 1;
    look.x = wide ? -1.7 : 0;
    base.x = look.x;
    const d = fitDistance(stage, 5.2 / share, 3.4);
    base.y = look.y + d * 0.55;
    base.z = look.z + d * 0.84;
    sway = parallax(stage, base, look, { x: 0.35, y: 0.15 });
  };
  resize();
  new ResizeObserver(resize).observe(stage.container);

  let lastPx = 0, lean = 0;
  return (dt, t) => {
    sway(dt);
    lights();
    const night = stage.night;
    // flame leans against pointer motion
    const px = stage.pointerInside ? stage.pointer.x : 0;
    lean += ((lastPx - px) * 8 - lean) * Math.min(1, dt * 4);
    lastPx = px;
    lit += (litTarget - lit) * Math.min(1, dt * (litTarget ? 2.5 : 6));
    candle.update(t, lit, Math.max(-1, Math.min(1, lean)));
    candle.light.intensity = (2 + night * 3) * lit * (0.92 + Math.sin(t * 12) * 0.06);
    shaftMat.opacity = 0.035 * (1 - night);
    shafts.forEach((s) => { s.visible = false; });
    smoke.forEach((sm, i) => {
      sm.life += dt * 0.6;
      const k = sm.life;
      const on = k > 0 && k < 1;
      sm.s.visible = on;
      if (on) {
        sm.s.position.set(candle.glow.position.x + Math.sin(k * 6 + i) * 0.08 * k, candle.glow.position.y + k * 1.1, candle.glow.position.z);
        sm.s.scale.setScalar(0.15 + k * 0.5);
        sm.s.material.opacity = 0.35 * (1 - k);
      }
    });
    dust(t);
    if (anim) {
      anim.t = Math.min(1, anim.t + dt * 1.6);
      const e = easeInOut(anim.t);
      bendPage(turnGeo, anim.dir > 0 ? e * Math.PI : (1 - e) * Math.PI);
      if (anim.t >= 1) {
        current = anim.to;
        anim = null;
        turnFront.visible = turnBack.visible = false;
        setStatic();
        updateButtons();
      }
    }
    tip.place();
  };
}
