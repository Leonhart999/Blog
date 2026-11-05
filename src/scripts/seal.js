// 3D wax seal for the contact section, modelled procedurally:
// a blob of sealing wax with an irregular rim, a raised lip where the matrix
// was pressed in, and the HE device embossed from a canvas height map.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function heightMap(glyph, legend) {
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, N, N);
  g.filter = 'blur(2.2px)';
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  // double ring
  g.lineWidth = 9;
  g.beginPath(); g.arc(N / 2, N / 2, N * 0.43, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.arc(N / 2, N / 2, N * 0.33, 0, Math.PI * 2); g.stroke();
  // legend around the ring
  const text = legend + ' ';
  g.font = '600 34px "Cinzel","Times New Roman",serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const step = (Math.PI * 2) / text.length;
  for (let i = 0; i < text.length; i++) {
    g.save();
    g.translate(N / 2, N / 2);
    g.rotate(i * step - Math.PI / 2 + step / 2 + Math.PI / 2);
    g.translate(0, -N * 0.382);
    g.fillText(text[i], 0, 0);
    g.restore();
  }
  // central device
  g.font = '700 190px "Songti SC","STSong","Noto Serif SC","SimSun",serif';
  g.fillText(glyph, N / 2, N / 2 + 8);
  return g.getImageData(0, 0, N, N);
}

function makeSeal(glyph, legend) {
  const img = heightMap(glyph, legend);
  const N = img.width;
  const sample = (x, y) => {
    // x, y in -1..1 over the stamp face
    const px = Math.min(N - 1, Math.max(0, Math.round((x * 0.5 + 0.5) * (N - 1))));
    const py = Math.min(N - 1, Math.max(0, Math.round((0.5 - y * 0.5) * (N - 1))));
    return img.data[(py * N + px) * 4] / 255;
  };

  const rings = 120, segs = 200;
  const rimNoise = [];
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    rimNoise.push(0.07 * Math.sin(a * 3 + 0.4) + 0.045 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 13 + 2.1));
  }
  const pos = [], uv = [];
  const STAMP = 0.74;                    // radius of the pressed face
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;                  // 0 centre .. 1 outer edge
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const R = 1 + rimNoise[s] * Math.pow(u, 3);
      const r = u * R;
      let h;
      if (u < STAMP) {
        h = 0.15 + sample((Math.cos(a) * r) / STAMP, (Math.sin(a) * r) / STAMP) * 0.045;
      } else if (u < 0.86) {
        const k = (u - STAMP) / (0.86 - STAMP);
        h = 0.15 + Math.sin(k * Math.PI * 0.5) * 0.085;           // lip squeezed up by the matrix
      } else {
        const k = (u - 0.86) / 0.14;
        h = 0.235 * Math.cos(k * Math.PI * 0.5) + 0.004;          // rounded wax edge
      }
      pos.push(Math.cos(a) * r, h, -Math.sin(a) * r);
      uv.push(u, s / segs);
    }
  }
  const idx = [];
  for (let i = 0; i < rings; i++) {
    for (let s = 0; s < segs; s++) {
      const a = i * segs + s, b = i * segs + ((s + 1) % segs);
      const c = a + segs, d = b + segs;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x7a1712, roughness: 0.5, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.4 });
  const mesh = new THREE.Mesh(geo, mat);
  // Ribbon under the seal
  const ribbon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 2.5),
    new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: 0.7, side: THREE.DoubleSide }),
  );
  ribbon.rotation.x = -Math.PI / 2;
  ribbon.rotation.z = 0.5;
  ribbon.position.y = -0.005;
  const group = new THREE.Group();
  group.add(ribbon, mesh);
  return group;
}

export async function mountSeal(stage, opts = {}) {
  // The legend is drawn with Cinzel; wait for it so the canvas does not fall back.
  try { await document.fonts.load('600 34px "Cinzel"'); } catch (err) { /* draw with fallback */ }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    return null;
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  stage.classList.add('is-3d');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  const key = new THREE.DirectionalLight(0xfff0d8, 1.7);
  key.position.set(-2, 4, 3);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.15));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 4.6, 0.01);
  camera.lookAt(0, 0, 0);

  const seal = makeSeal(opts.glyph || '何', (opts.legend || 'HE JUNJIE · MMXXVI ·').toUpperCase());
  seal.rotation.x = 0.0;
  scene.add(seal);

  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tilt.tx = ((e.clientY - r.top) / r.height - 0.5) * 0.7;
    tilt.ty = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    wake();
  });
  stage.addEventListener('pointerleave', () => { tilt.tx = 0; tilt.ty = 0; wake(); });

  const resize = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    wake();
  };
  new ResizeObserver(resize).observe(stage);

  let visible = false, running = false, t = 0, idle = 0;
  const clock = new THREE.Clock();
  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduceMotion) t += dt;
    tilt.x += (tilt.tx - tilt.x) * 0.08;
    tilt.y += (tilt.ty - tilt.y) * 0.08;
    seal.rotation.x = tilt.x + Math.sin(t * 0.6) * 0.06;
    seal.rotation.z = -tilt.y + Math.cos(t * 0.5) * 0.06;
    seal.rotation.y = -0.18 + Math.sin(t * 0.25) * 0.05;
    renderer.render(scene, camera);
    const settled = Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) < 1e-3;
    if (reduceMotion && settled) { if (++idle > 2) { running = false; return; } } else idle = 0;
    requestAnimationFrame(frame);
  }
  function wake() {
    if (running || !visible) return;
    running = true;
    clock.getDelta();
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(stage);
  document.addEventListener('visibilitychange', wake);
  resize();
  renderer.render(scene, camera);   // first frame even before it scrolls into view
  return {};
}
