
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createMaterials } from './core/materials.js';
import { Physics } from './core/physics.js';
import { Input } from './core/input.js';
import { Player } from './core/player.js';
import { createEnvironment, TIMES } from './world/environment.js';
import { PLACES, RUMI, BARA, CHOTA, TANK, CLOCK, BAZAAR } from './world/layout.js';
import { buildMapCity, buildLights, paintMap, BOUNDS, MAP } from './world/osmCity.js';
import { buildRumiDarwaza } from './landmarks/rumiDarwaza.js';
import { buildBaraImambara } from './landmarks/baraImambara.js';
import { buildHusainabad } from './landmarks/husainabad.js';
import { buildChotaImambara } from './landmarks/chotaImambara.js';
import { buildAkbariGate, dressBazaar } from './landmarks/chowk.js';
import { buildJamaMasjid } from './landmarks/jamaMasjid.js';
import { buildLife } from './world/life.js';
import { Soundscape } from './audio/soundscape.js';
import { HUD } from './ui/hud.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 4500);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.5, 1.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const physics = new Physics();
const input = new Input(renderer.domElement);
const player = new Player(camera, physics, input);
const env = createEnvironment(renderer, scene);
const sound = new Soundscape();

// ---------- quality ----------
const QUALITY = {
  high: { dpr: 2, shadow: 4096, shadows: true, bloom: true },
  medium: { dpr: 1.5, shadow: 2048, shadows: true, bloom: false },
  low: { dpr: 1, shadow: 1024, shadows: false, bloom: false },
};
let quality = 'high';
function setQuality(q) {
  quality = q;
  const Q = QUALITY[q];
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
  const size = Q.shadow;
  if (env.sun.shadow.mapSize.x !== size) {
    env.sun.shadow.mapSize.set(size, size);
    env.sun.shadow.map?.dispose();
    env.sun.shadow.map = null;
  }
  if (renderer.shadowMap.enabled !== Q.shadows) {
    renderer.shadowMap.enabled = Q.shadows;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
  }
  scene.traverse((o) => { if (o.userData.far) o.visible = q !== 'low'; });
  resize();
  document.querySelectorAll('#quality button').forEach((b) => b.classList.toggle('on', b.dataset.q === q));
  try { localStorage.setItem('lko-quality', q); } catch {}
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
{
  let saved = null;
  try { saved = localStorage.getItem('lko-quality'); } catch {}
  const q = params.get('q') || saved || (input.isTouch ? 'medium' : 'high');
  setQuality(QUALITY[q] ? q : 'high');
}
document.querySelectorAll('#quality button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); setQuality(b.dataset.q); }));

// ---------- world ----------
const footprints = [];
const updatables = [];
const zones = { bazaar: { ...BAZAAR }, water: [{ x: 1e6, z: 1e6, r: 0 }], clock: { x: CLOCK.x, z: CLOCK.z }, groundY: 0 };
const ctx = {
  M: null, physics, scene, footprints, updatables, camera, player, zones,
  reserved: [], groundHoles: [], rumi: RUMI, bazaar: BAZAAR, skipWaterNear: [[TANK.x, TANK.z, 90]],
};

const steps = [
  ['Mixing lime plaster', async () => { ctx.M = await createMaterials(); setTime(timeName); }],
  ['Raising Rumi Darwaza', () => buildRumiDarwaza(ctx, RUMI)],
  ['Vaulting the Bara Imambara', () => buildBaraImambara(ctx, BARA)],
  ['Winding the Clock Tower', () => buildHusainabad(ctx)],
  ['Gilding the Chota Imambara', () => buildChotaImambara(ctx, CHOTA)],
  ['Opening the Akbari Darwaza', () => { buildAkbariGate(ctx); buildJamaMasjid(ctx); }],
  ['Laying the real streets of Lucknow', () => buildMapCity(ctx)],
  ['Opening the shops of Chowk', () => dressBazaar(ctx)],
  ['Lighting the lamps', () => { scene.add(buildLights(ctx)); setQuality(quality); }],
  ['Waking the streets', () => buildLife(ctx)],
];

const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function build() {
  await document.fonts.load('700 38px "Noto Sans Devanagari"').catch(() => {});
  for (let i = 0; i < steps.length; i++) {
    const [label, fn] = steps[i];
    $('enter').textContent = label + '…';
    await frame();
    await fn();
    $('progress-bar').style.width = `${((i + 1) / steps.length) * 100}%`;
  }
  hud.drawBase();
  // compile shaders up front so the first steps are smooth
  teleport(params.has('place') ? +params.get('place') - 1 : 1, false);
  env.follow(player.pos);
  renderer.compile(scene, camera);
  await frame();
  $('enter').disabled = false;
  $('enter').textContent = input.isTouch ? 'Tap to enter' : 'Enter Lucknow';
}

// ---------- places ----------
const hud = new HUD({
  onTeleport: (i) => teleport(i, true),
  paint: (g, tx, tz, k) => paintMap(g, tx, tz, k, ctx),
  bounds: BOUNDS,
  streetName: (p) => streetName(p),
});

// Name of the real street you are on (OpenStreetMap), refreshed a few times a second.
const named = MAP.roads.filter((r) => r.n);
let lastName = 'Old Lucknow', nameT = 0;
function streetName(p) {
  let best = 14, name = 'Old Lucknow';
  for (const r of named) {
    const q = r.p;
    for (let k = 0; k + 3 < q.length; k += 2) {
      const ax = q[k], az = q[k + 1], dx = q[k + 2] - ax, dz = q[k + 3] - az;
      const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(ax + dx * t - p.x, az + dz * t - p.z);
      if (d < best) { best = d; name = r.n; }
    }
  }
  return name;
}
function nearestWater(p) {
  const occ = ctx.occ;
  if (!occ) return;
  for (let rr = 10; rr <= 90; rr += 10) for (let a = 0; a < 12; a++) {
    const x = p.x + Math.cos(a * 0.524) * rr, z = p.z + Math.sin(a * 0.524) * rr;
    if (occ.get(x, z) === 2) { zones.water[0] = { x, z, r: 0 }; return; }
  }
  zones.water[0] = { x: 1e6, z: 1e6, r: 0 };
}
function teleport(i, announce = true) {
  const p = PLACES[i];
  if (!p) return;
  let [x, z] = (timeName === 'evening' && p.spawnEvening) || p.spawn;
  // never land on a roof: find the nearest open ground if the spawn point is covered
  const clear = (qx, qz) => physics.groundHeight(qx, qz, 0.35, 80, 200) < 1.3 && !physics.blocked(qx, qz);
  if (!clear(x, z)) {
    search: for (let rr = 2; rr < 40; rr += 2) for (let a = 0; a < 16; a++) {
      const qx = x + Math.cos(a * 0.3927) * rr, qz = z + Math.sin(a * 0.3927) * rr;
      if (clear(qx, qz)) { x = qx; z = qz; break search; }
    }
  }
  const yaw = Math.atan2(-(p.look[0] - x), -(p.look[1] - z));
  player.teleport(x, 3, z, yaw, -0.02);
  player.flying = false;
  if (announce) hud.showCard(i);
}

// ---------- start / pause ----------
let started = false;
$('enter').addEventListener('click', () => {
  started = true;
  input.enabled = true;
  $('intro').classList.add('gone');
  hud.show();
  sound.start();
  if (input.isTouch) {
    $('touch-buttons').classList.remove('hidden');
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    input.lock();
  }
});
input.on('lock', (locked) => {
  $('hint').classList.toggle('hidden', locked || !started || input.isTouch);
});
$('hint').addEventListener('click', () => input.lock());
input.on('key', (e) => {
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= PLACES.length) teleport(n - 1);
  if (e.code === 'KeyM') hud.toggleMap();
  if (e.code === 'KeyT') $('time').click();
  if (e.code === 'KeyN') toggleSound();
});
function toggleSound() {
  const on = sound.toggle();
  $('sound').classList.toggle('muted', !on);
}
$('sound').addEventListener('click', (e) => { e.stopPropagation(); toggleSound(); });
$('t-jump').addEventListener('touchstart', (e) => { e.preventDefault(); input.jump = true; });
$('t-fly').addEventListener('touchstart', (e) => { e.preventDefault(); input.flyToggle = true; });

// ---------- loop ----------
const timer = new THREE.Timer();
timer.connect(document);
let t = 0;
// ---------- time of day ----------
const TIME_ORDER = ['morning', 'afternoon', 'evening', 'night'];
let timeName = params.get('time') || (() => { try { return localStorage.getItem('lko-time'); } catch { return null; } })() || 'morning';
if (!TIMES[timeName]) timeName = 'morning';
let DAY_START = TIMES[timeName].clock; // minutes
function setTime(name) {
  timeName = name;
  env.set(name, ctx.M);
  DAY_START = TIMES[name].clock - t / 8;
  bloom.strength = name === 'night' ? 0.6 : name === 'evening' ? 0.28 : 0.12;
  bloom.threshold = name === 'night' ? 0.85 : name === 'evening' ? 1.8 : 4;
  $('time').textContent = TIMES[name].label;
  try { localStorage.setItem('lko-time', name); } catch {}
}
$('time').addEventListener('click', (e) => { e.stopPropagation(); setTime(TIME_ORDER[(TIME_ORDER.indexOf(timeName) + 1) % 4]); });
function clockText() {
  const m = Math.floor(DAY_START + t / 8) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
ctx.gameMinutes = () => DAY_START + t / 8;

function loop() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  t += dt;
  if (started) player.update(dt);
  else if (!params.has('shot')) {
    // slow orbit behind the intro
    player.yaw += dt * 0.03;
    camera.position.set(player.pos.x, player.pos.y + 1.62, player.pos.z);
    camera.rotation.set(-0.02, player.yaw, 0);
  }
  env.follow(player.pos);
  env.update(t);
  for (const u of updatables) u.update?.(t, dt);
  if (started) {
    hud.update(dt, player.pos, player.yaw, clockText());
    nameT -= dt;
    if (nameT <= 0) {
      nameT = 0.7;
      nearestWater(player.pos);
      if (hud.current < 0) { const n = streetName(player.pos); if (n !== lastName) { lastName = n; $('place-name').textContent = n; } }
    }
    sound.update(dt, player, ctx);
    $('fly-badge').classList.toggle('hidden', !player.flying || input.isTouch);
    $('hint').classList.toggle('hidden', input.locked || input.isTouch);
    $('t-fly').classList.toggle('on', player.flying);
  }
  if (QUALITY[quality].bloom) composer.render();
  else renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

player.onStep = (speed) => sound.step(speed);

build().then(() => {
  if (params.has('shot')) {
    // ?shot=x,y,z,yaw,pitch for screenshots
    const shot = params.get('shot');
    let [x, y, z, yaw, pitch] = shot.split(',').map(Number);
    if (shot.startsWith('p')) {
      // ?shot=p3 frames place 3 from its spawn point
      teleport(+shot.slice(1) - 1, false);
      ({ x, y, z } = player.pos); yaw = player.yaw; pitch = 0.06;
    }
    player.pos.set(x, y, z);
    player.yaw = yaw; player.pitch = pitch;
    camera.position.set(x, y + 1.62, z);
    camera.rotation.set(pitch, yaw, 0);
    $('intro').classList.add('gone');
    window.__ready = true;
  }
  if (params.has('auto')) $('enter').click();
  requestAnimationFrame(loop);
});
window.__lko = { scene, renderer, player, physics, camera, hud, ctx };
