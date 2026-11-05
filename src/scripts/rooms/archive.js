// The Keep library (archive page): every post is a book on the shelves,
// one shelf per year, newest at the top. Hover pulls a book out, click opens it.
import { THREE, place, rng, easeInOut } from '../stage.js';
import { makeBook, canvasTexture, CJK_SERIF } from '../props.js';
import { mountRoom, buildHall, addTorch, addCandle, makeDust, indoorLights, tooltip, parallax, escapeHtml, fitDistance } from './common.js';
import { flip } from '../sfx.js';

const HALL_COLOR = { tech: '#2c3e5c', projects: '#7a2a1e', essays: '#2f4a3a' };

export function mount(container) {
  return mountRoom(container, build);
}

function build(stage, lib, data) {
  const { scene } = stage;
  const rand = rng(77);
  const room = new THREE.Group();
  scene.add(room);

  buildHall(lib, room, { floor: 'floor_tile_large', walls: ['wall', 'wall_arched', 'wall', 'wall_arched'], width: 16, depth: 8, z0: -2.2 });
  place(lib, 'pillar', room, -4.1, 0, -1.9);
  place(lib, 'pillar', room, 4.1, 0, -1.9);
  place(lib, 'banner_shield_red', room, -5.6, 0, -2.45);
  place(lib, 'banner_patternC_blue', room, 5.6, 0, -2.45);
  place(lib, 'chest_gold', room, 3.4, 0, 0.2, -25, 0.6);
  place(lib, 'trunk_large_A', room, -3.5, 0, 0.1, 15, 0.8);
  place(lib, 'coin_stack_small', room, 2.3, 0, 1.3, 30, 0.6);

  const torches = [addTorch(lib, room, -4.6, 1.6, -2.1), addTorch(lib, room, 4.6, 1.6, -2.1)];
  const candles = [addCandle(lib, room, 'candle_lit', 1.6, 3.62, -1.75, { scale: 0.4 }), addCandle(lib, room, 'candle_melted', -1.9, 3.62, -1.75, { scale: 0.38 })];

  // ---- bookcase ------------------------------------------------------------
  const W = 5.2, H = 3.5, D = 0.62, rows = 4, shelfT = 0.07;
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c1d12, roughness: 0.95 });
  const caseG = new THREE.Group();
  caseG.position.set(0, 0.12, -1.95);
  room.add(caseG);
  const box = (w, h, d, x, y, z, m = wood) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; caseG.add(b); return b; };
  box(W, H, 0.05, 0, H / 2, -D / 2 + 0.02, dark);                 // back
  box(0.12, H, D, -W / 2, H / 2, 0); box(0.12, H, D, W / 2, H / 2, 0); // sides
  box(W + 0.3, 0.16, D + 0.12, 0, H + 0.08, 0.02);                 // crown
  box(W + 0.1, 0.18, D + 0.04, 0, 0.09, 0.02);                     // plinth
  const rowH = (H - 0.2) / rows;
  const shelfY = [];
  for (let i = 0; i < rows; i++) {
    const y = 0.18 + i * rowH;
    box(W - 0.1, shelfT, D - 0.04, 0, y, 0.01);
    shelfY.push(y + shelfT / 2);
  }
  shelfY.reverse();                                                 // index 0 = top shelf

  // ---- books -----------------------------------------------------------------
  const posts = data.posts || [];
  const byYear = new Map();
  for (const p of posts) byYear.set(p.year, [...(byYear.get(p.year) || []), p]);
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const usable = W - 0.36;
  const interactive = [];
  const tip = tooltip(stage);

  const plaque = (text, y) => {
    const tex = canvasTexture(256, 64, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#e3c27a'); grad.addColorStop(1, '#9c7432');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#5c4218'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#3a2410'; g.font = `700 34px "Cinzel",${CJK_SERIF}`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.4 }));
    m.position.set(0, y - 0.06, D / 2 + 0.006);
    caseG.add(m);
  };

  const fillRow = (rowIndex, list, label) => {
    const y = shelfY[rowIndex];
    let x = -usable / 2;
    if (label) plaque(label, y);
    for (const p of list) {
      if (x > usable / 2 - 0.2) break;
      const w = 0.17 + rand() * 0.05;
      const h = rowH * (0.74 + rand() * 0.14);
      const book = makeBook({ w, h, d: 0.46, color: HALL_COLOR[p.cat], title: p.title, sub: String(p.year), gilt: true, rand });
      book.position.set(x + w / 2, y, 0.06);
      caseG.add(book);
      const rest = book.position.clone();
      const st = { book, p, rest, pull: 0, target: 0, open: 0 };
      interactive.push(st);
      stage.interact(book, {
        hover(on) {
          st.target = on ? 1 : 0;
          if (on) {
            const top = book.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, h + 0.15, 0.3));
            tip.show(`<b>${escapeHtml(p.title)}</b><span>${escapeHtml(p.hall)} · ${escapeHtml(p.date)}</span>`, top);
          } else tip.hide();
        },
        click() {
          st.open = 0.0001;
          flip();
          stage.busyUntil = stage.t + 1;
          setTimeout(() => { location.href = p.url; }, 650);
        },
      });
      x += w + 0.012;
    }
    // filler books, a few leaning, then odds and ends
    while (x < usable / 2 - 0.12) {
      if (rand() < 0.08 && x < usable / 2 - 0.5) {
        const name = ['candle_melted', 'bottle_A_brown', 'coin_stack_small', 'bottle_B_green'][Math.floor(rand() * 4)];
        place(lib, name, caseG, x + 0.2, y, 0.05, rand() * 360, 0.32);
        x += 0.42;
        continue;
      }
      const w = 0.12 + rand() * 0.1;
      const h = rowH * (0.55 + rand() * 0.3);
      const b = makeBook({ w, h, d: 0.38 + rand() * 0.08, rand });
      b.position.set(x + w / 2, y, rand() * 0.06);
      if (rand() < 0.1 && x > -usable / 2 + 0.3) { b.rotation.z = 0.18; b.position.x += 0.05; x += 0.08; }
      caseG.add(b);
      x += w + 0.008;
    }
  };

  // assign rows: one per year, extra years share the last shelf
  for (let r = 0; r < rows; r++) {
    const year = years[r];
    if (year !== undefined) {
      const list = r === rows - 1 ? years.slice(r).flatMap((yy) => byYear.get(yy)) : byYear.get(year);
      fillRow(r, list, r === rows - 1 && years.length > rows ? `${year} 及以前` : String(year));
    } else fillRow(r, [], r === 0 && !years.length ? '空架' : '');
  }

  // ---- light, dust, camera ----------------------------------------------------
  const lights = indoorLights(stage, { day: 1.05, night: 0.22, key: 1.3, keyNight: 0.15, keyPos: [3, 8, 7] });
  const shelfLamp = new THREE.SpotLight(0xffd29a, 18, 12, 0.6, 0.6, 1.4);
  shelfLamp.position.set(0, 5.5, 3.5);
  shelfLamp.target.position.set(0, 1.8, -2);
  scene.add(shelfLamp, shelfLamp.target);
  const dust = makeDust(room, { box: [8, 4, 4], center: [0, 2.2, 0] });

  const look = new THREE.Vector3(0, 1.95, -1.6);
  const base = new THREE.Vector3(0, 2.2, 7.2);
  let sway = parallax(stage, base, look);
  const resize = () => {
    // On wide screens the title card sits bottom-left, so frame the bookcase to the right of it.
    const wide = stage.width > 900;
    const share = wide ? 0.66 : 1;
    look.x = wide ? -(W + 3) * (1 - share) * 0.9 : 0;
    base.x = look.x;
    base.z = look.z + fitDistance(stage, wide ? (W + 3) / share : W + 0.4, H + 1.6);
    sway = parallax(stage, base, look);
  };
  resize();
  new ResizeObserver(resize).observe(stage.container);

  return (dt, t) => {
    sway(dt);
    lights();
    const night = stage.night;
    torches.forEach((tc) => tc.update(dt, t, 0.8 + night * 0.4));
    candles.forEach((c) => c.update(t, 1));
    shelfLamp.intensity = 14 + 10 * (1 - night);
    dust(t);
    for (const st of interactive) {
      st.pull += (st.target - st.pull) * Math.min(1, dt * 9);
      if (st.open > 0) st.open = Math.min(1, st.open + dt * 1.8);
      const o = easeInOut(st.open);
      st.book.position.set(st.rest.x, st.rest.y + st.pull * 0.05 + o * 0.25, st.rest.z + st.pull * 0.24 + o * 0.9);
      st.book.rotation.y = o * -Math.PI / 2.2;
      st.book.rotation.x = -st.pull * 0.06;
    }
    tip.place();
  };
}
