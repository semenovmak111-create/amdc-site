/* Объёмная звезда в жёлтой полосе — повтор анимации с референса на WebGL (three.js).
   Силуэт, толщина и ход поворота сняты с кадров референса: звезда без остановки
   поворачивается вокруг вертикали на пол-оборота за 4,5 с, чуть быстрее, когда стоит ребром.
   Если WebGL недоступен, остаётся CSS-звезда из main.js. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

// Радиус силуэта от луча (0°) до «талии» (45°), доля от длины луча, шаг 5°
const PROFILE = [1, .985, .883, .77, .685, .626, .583, .56, .545, .541];
const CYCLE = 4.5;       // секунд на пол-оборота
const SIZE = 294;        // большая звезда, css px
const SMALL = 103;       // маленькая — та же картинка в том же такте

function starShape() {
  const pts = [];
  for (let a = 45; a < 405; a += 5) {
    const k = a % 90, r = PROFILE[(k <= 45 ? k : 90 - k) / 5];
    const t = a * Math.PI / 180;
    pts.push(new THREE.Vector3(r * Math.cos(t), r * Math.sin(t), 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.Shape(curve.getPoints(360).map(p => new THREE.Vector2(p.x, p.y)));
}

function environment(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x26262c, side: THREE.BackSide })));
  const panel = (color, power, x, y, z, w, h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel('#ffffff', 4.0, -3, 4, 4, 4, 2);    // белый софтбокс сверху слева
  panel('#8f6bff', 4.5, 5, 1, 0, 4, 7);     // фиолетовый справа
  panel('#ff7ad0', 3.0, -5, -2, 1, 4, 5);   // розовый снизу слева
  panel('#c7b8ff', 2.0, -4, 2, -3, 3, 4);   // сиреневый слева сзади
  panel('#62e0ff', 1.5, 0, -4, -4, 5, 2);   // бирюзовый снизу сзади
  panel('#ffffff', 2.0, 0, 5, -3, 6, 1.5);  // светлая полоса сверху сзади
  panel('#a4a4ae', 1.3, 7, 0, -4, 5, 9);    // серый справа сзади — серебристая грань в развороте
  panel('#a4a4ae', 1.3, -7, 0, -4, 5, 9);   // и слева сзади
  panel('#000000', 0, 0, 0, 8, 6, 6);       // прямо за зрителем темно: анфас грань чёрная
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return tex;
}

function init(wrap) {
  const big = document.createElement('canvas');
  const small = document.createElement('canvas');
  big.className = 'star-gl s1'; small.className = 'star-gl s2';

  const renderer = new THREE.WebGLRenderer({ canvas: big, alpha: true, antialias: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(SIZE, SIZE, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  small.width = Math.round(SMALL * dpr); small.height = Math.round(SMALL * dpr);
  const ctx = small.getContext('2d');

  const scene = new THREE.Scene();
  scene.environment = environment(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  const geo = new THREE.ExtrudeGeometry(starShape(), {
    depth: 0.12, steps: 1, curveSegments: 1,
    bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.075, bevelOffset: -0.075, bevelSegments: 10
  });
  geo.center();
  const face = new THREE.MeshPhysicalMaterial({ color: 0x3a3a3e, roughness: 0.22, metalness: 1 });
  const side = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, metalness: 1, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 800] });
  const star = new THREE.Mesh(geo, [face, side]);
  scene.add(star);

  const fixed = new URLSearchParams(location.search).get('star');   // для проверки: ?star=0..1 — фаза
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw = (u) => {
    star.rotation.y = Math.PI * u - 0.19 * Math.sin(2 * Math.PI * u);   // у фронта медленнее, ребром — быстрее
    renderer.render(scene, camera);
    ctx.clearRect(0, 0, small.width, small.height);
    ctx.drawImage(big, 0, 0, small.width, small.height);
  };

  wrap.appendChild(big); wrap.appendChild(small);
  wrap.classList.add('is-gl');

  if (fixed !== null) { draw(+fixed); return; }
  if (reduce) { draw(0.08); return; }

  let running = false, raf = 0;
  const loop = (ms) => {
    draw((ms / 1000 % CYCLE) / CYCLE);
    raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }, { rootMargin: '200px 0px' }).observe(wrap);
}

const wrap = document.querySelector('.big-star');
if (wrap) {
  try { init(wrap); } catch (e) { /* остаётся CSS-звезда */ }
}
