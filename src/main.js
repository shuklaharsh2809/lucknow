import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { createMaterials } from './core/materials.js';
import { Physics } from './core/physics.js';
import { Input } from './core/input.js';
import { Player } from './core/player.js';
import { createEnvironment } from './world/environment.js';
import { buildGround } from './world/ground.js';
import { SITES, PLACES } from './world/layout.js';
import { buildRumiDarwaza } from './landmarks/rumiDarwaza.js';
import { buildBaraImambara } from './landmarks/baraImambara.js';
import { buildClockTower } from './landmarks/clockTower.js';
import { buildChotaImambara } from './landmarks/chotaImambara.js';
import { buildChowk } from './landmarks/chowk.js';
import { buildCity } from './world/city.js';
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
const M = createMaterials();
const footprints = [];
const updatables = [];
const ctx = { M, physics, scene, footprints, updatables, camera, player };

const steps = [
  ['Laying Husainabad Road', () => updatables.push(buildGround(M, physics, scene))],
  ['Raising Rumi Darwaza', () => scene.add(buildRumiDarwaza(M, physics, SITES.rumiDarwaza))],
  ['Vaulting the Bara Imambara', () => buildBaraImambara(ctx, SITES.baraImambara)],
  ['Winding the Clock Tower', () => buildClockTower(ctx)],
  ['Gilding the Chota Imambara', () => buildChotaImambara(ctx, SITES.chotaImambara)],
  ['Opening the shops of Chowk', () => buildChowk(ctx, SITES.chowk)],
  ['Filling the old city', () => buildCity(ctx)],
  ['Waking the streets', () => buildLife(ctx)],
  ['Lighting the lamps', () => setQuality(quality)],
];

const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function build() {
  await document.fonts.load('700 38px "Noto Sans Devanagari"').catch(() => {});
  for (let i = 0; i < steps.length; i++) {
    const [label, fn] = steps[i];
    $('enter').textContent = label + '…';
    await frame();
    fn();
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
const hud = new HUD({ footprints, onTeleport: (i) => teleport(i, true) });
function teleport(i, announce = true) {
  const p = PLACES[i];
  if (!p) return;
  const [x, z] = p.spawn;
  const yaw = Math.atan2(-(p.look[0] - x), -(p.look[1] - z));
  player.teleport(x, 30, z, yaw, -0.02);
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
const DAY_START = 18 * 60 + 4; // minutes
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
    const [x, y, z, yaw, pitch] = params.get('shot').split(',').map(Number);
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
window.__lko = { scene, renderer, player, physics, camera };
