import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, glowSpriteTexture } from '../core/textures.js';
import { FACADE_COLORS } from '../core/materials.js';
import { isReserved, ROAD } from './layout.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

// House geometry whose side UVs repeat one facade bay every 3 m and whose roof samples a
// plain patch of the same texture, so one material + instance colour covers everything.
function houseGeo(w, d, h, withParapet = true) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const uv = g.attributes.uv;
  const faceSize = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      if (f === 2 || f === 3) uv.setXY(i, 0.04 + uv.getX(i) * 0.03, 0.3 + uv.getY(i) * 0.03);
      else uv.setXY(i, uv.getX(i) * (faceSize[f][0] / 3), uv.getY(i) * (faceSize[f][1] / 3));
    }
  }
  if (!withParapet) return g;
  // roof parapet, sampling the same plain patch
  const t = 0.22, ph = 0.75;
  const rim = [[w, t, 0, d / 2 - t / 2], [w, t, 0, -d / 2 + t / 2], [t, d, w / 2 - t / 2, 0], [t, d, -w / 2 + t / 2, 0]].map(([bw, bd, x, z]) => {
    const p = new THREE.BoxGeometry(bw, ph, bd).translate(x, h + ph / 2, z);
    const u = p.attributes.uv;
    for (let i = 0; i < u.count; i++) u.setXY(i, 0.04 + u.getX(i) * 0.03, 0.3 + u.getY(i) * 0.03);
    return p;
  });
  return mergeGeometries([g, ...rim]);
}

function instanced(geo, mat, list, { shadow = true, colors = null } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.count = list.length;
  if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  mesh.frustumCulled = true;
  return mesh;
}

export function buildCity(ctx) {
  const { M, physics, scene } = ctx;
  const r = rng(1775);
  const trees = (ctx.trees ||= []);
  const lamps = (ctx.lamps ||= []);
  const bulbs = (ctx.bulbs ||= []);

  // ---------- houses ----------
  const variants = [];
  for (const [w, d] of [[6, 6], [9, 6], [6, 9], [9, 9]]) for (const f of [2, 3, 4]) {
    variants.push({ w, d, h: f * 3, geo: houseGeo(w, d, f * 3), mats: [], cols: [] });
  }
  const tanks = [], tankCols = [], mumties = [];
  const CELL = 11;
  const place = (x0, x1, z0, z1, density = 0.86) => {
    for (let gx = x0; gx < x1; gx += CELL) for (let gz = z0; gz < z1; gz += CELL) {
      if (r() > density) {
        if (r() < 0.4 && !isReserved(gx + 5, gz + 5, 2)) trees.push({ x: gx + 5.5, z: gz + 5.5, type: r() > 0.3 ? 'neem' : 'banyan', s: 0.8 + r() * 0.5 });
        continue;
      }
      const vi = Math.floor(r() * variants.length);
      const v = variants[vi];
      // taller houses nearer the old core
      const cx = gx + v.w / 2 + r() * (CELL - v.w - 1.5) + 0.75;
      const cz = gz + v.d / 2 + r() * (CELL - v.d - 1.5) + 0.75;
      if (isReserved(cx, cz, Math.max(v.w, v.d) / 2 + 1)) continue;
      v.mats.push(new THREE.Matrix4().makeTranslation(cx, 0, cz));
      const base = FACADE_COLORS[Math.floor(r() * FACADE_COLORS.length)];
      v.cols.push(new THREE.Color(base).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.12));
      physics.addBox(cx - v.w / 2, 0, cz - v.d / 2, cx + v.w / 2, v.h, cz + v.d / 2);
      ctx.footprints.push({ x0: cx - v.w / 2, x1: cx + v.w / 2, z0: cz - v.d / 2, z1: cz + v.d / 2, color: '#a88f70' });
      if (r() < 0.45) {
        tanks.push(new THREE.Matrix4().makeTranslation(cx + (r() - 0.5) * (v.w - 2), v.h, cz + (r() - 0.5) * (v.d - 2)));
        tankCols.push(_c.set(r() > 0.3 ? '#262626' : '#e6e0d4').clone());
      }
      if (r() < 0.35) {
        const mx = cx + (r() > 0.5 ? 1 : -1) * (v.w / 2 - 1.3), mz = cz + (r() > 0.5 ? 1 : -1) * (v.d / 2 - 1.3);
        mumties.push(new THREE.Matrix4().makeTranslation(mx, v.h, mz));
      }
    }
  };
  place(-340, 370, -228, 290);
  place(-600, 600, -440, -352, 0.7); // across the Gomti
  place(-600, -340, -228, 290, 0.6);
  place(370, 600, -228, 290, 0.6);
  // A far ring of low-detail houses out to the haze: no colliders, no shadows.
  const far = variants.filter((_, i) => i % 2 === 0).map((v) => ({ geo: houseGeo(v.w, v.d, v.h, false), mats: [], cols: [] }));
  for (let gx = -1300; gx < 1300; gx += 20) for (let gz = -1300; gz < 1300; gz += 20) {
    const inner = gx > -620 && gx < 620 && gz > -460 && gz < 310;
    if (inner || (gz > -352 && gz < -236) || r() > 0.5) continue;
    const v = far[Math.floor(r() * far.length)];
    v.mats.push(new THREE.Matrix4().makeTranslation(gx + r() * 5, 0, gz + r() * 5));
    v.cols.push(new THREE.Color(FACADE_COLORS[Math.floor(r() * FACADE_COLORS.length)]));
  }

  const group = new THREE.Group();
  group.name = 'city';
  for (const v of variants) {
    if (!v.mats.length) continue;
    group.add(instanced(v.geo, M.facade, v.mats, { colors: v.cols }));
  }
  for (const v of far) {
    if (!v.mats.length) continue;
    const mesh = instanced(v.geo, M.facade, v.mats, { colors: v.cols, shadow: false });
    mesh.receiveShadow = false;
    mesh.userData.far = true;
    group.add(mesh);
  }
  const tankGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.3, 12);
  tankGeo.translate(0, 0.65, 0);
  const tankMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
  group.add(instanced(tankGeo, tankMat, tanks, { colors: tankCols }));
  const mumGeo = houseGeo(2.4, 2.4, 2.4);
  group.add(instanced(mumGeo, M.facade, mumties, { colors: mumties.map(() => new THREE.Color('#e9dcc4')) }));

  // ---------- trees ----------
  for (let x = ROAD.x0 + 10; x < ROAD.x1; x += 17) {
    for (const s of [-1, 1]) {
      const z = s * 11.4;
      if ((x > -48 && x < -8) || (x > 12 && x < 32 && s > 0)) continue;
      if (r() < 0.25) continue;
      trees.push({ x: x + (r() - 0.5) * 4, z, type: r() > 0.3 ? 'neem' : 'ashoka', s: 0.85 + r() * 0.3 });
    }
  }
  // riverfront row
  for (let x = -560; x < 560; x += 14) if (r() > 0.35) trees.push({ x, z: -232 + r() * 3, type: r() > 0.5 ? 'neem' : 'banyan', s: 0.9 + r() * 0.4 });
  group.add(buildTrees(trees, r));
  for (const t of trees) {
    const tr = (t.type === 'banyan' ? 0.9 : t.type === 'neem' ? 0.3 : 0.18) * (t.s ?? 1);
    physics.addBox(t.x - tr, 0, t.z - tr, t.x + tr, 3, t.z + tr);
  }

  // ---------- lamps ----------
  for (let x = ROAD.x0 + 6; x < ROAD.x1; x += 24) {
    if (x > -40 && x < -14) continue;
    lamps.push({ x, z: -9.6, arm: 1 }, { x: x + 12, z: 9.6, arm: -1 });
  }
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.1, 4.6, 6);
  poleGeo.translate(0, 2.3, 0);
  const armGeo = new THREE.BoxGeometry(0.06, 0.06, 1);
  armGeo.translate(0, 4.5, 0.45);
  const lanternGeo = new THREE.CylinderGeometry(0.2, 0.14, 0.45, 6);
  lanternGeo.translate(0, 4.2, 0.9);
  const lampFrame = mergeGeometries([poleGeo, armGeo].map((g) => (g.index ? g.toNonIndexed() : g)));
  const poles = [], lanterns = [], glows = [];
  for (const l of lamps) {
    const ry = l.arm === -1 ? Math.PI : l.arm === 1 ? 0 : r() * Math.PI * 2;
    _m.compose(_p.set(l.x, 0, l.z), _q.setFromAxisAngle(UP, ry), _s.set(1, 1, 1));
    poles.push(_m.clone());
    lanterns.push(_m.clone());
    const off = new THREE.Vector3(0, 4.2, 0.9).applyQuaternion(_q);
    glows.push(l.x + off.x, off.y, l.z + off.z);
    physics.addBox(l.x - 0.12, 0, l.z - 0.12, l.x + 0.12, 4.6, l.z + 0.12);
  }
  group.add(instanced(lampFrame, M.iron, poles));
  group.add(instanced(lanternGeo, M.lamp, lanterns, { shadow: false }));

  // bulbs (bazaar strings, the Palace of Lights)
  const bulbGeo = new THREE.SphereGeometry(0.065, 6, 4);
  const bulbMats = bulbs.map(([x, y, z]) => new THREE.Matrix4().makeTranslation(x, y, z));
  group.add(instanced(bulbGeo, M.lamp, bulbMats, { shadow: false }));

  // soft glow halos (points, additive)
  const halo = (positions, size, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: glowSpriteTexture(), size, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.8, fog: true,
    });
    const p = new THREE.Points(g, mat);
    p.frustumCulled = false;
    return p;
  };
  group.add(halo(glows, 2.2, '#ffb466'));
  group.add(halo(bulbs.flat(), 0.55, '#ffc27a'));

  scene.add(group);
}

function buildTrees(list, r) {
  const group = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: '#4a3526', roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true });
  // gentle wind sway on the canopies
  leaf.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = leafUniform;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uTime * 1.3 + wp.x * 0.2 + wp.z * 0.13) * 0.06 + sin(uTime * 2.1 + wp.z * 0.3) * 0.03;
      transformed.x += sway * max(0.0, position.y - 2.0);
      transformed.z += sway * 0.6 * max(0.0, position.y - 2.0);
    `);
  };
  const blob = (parts) => mergeGeometries(parts.map(([x, y, z, s, sy = s], i) => {
    const g = new THREE.IcosahedronGeometry(1, i === 0 ? 1 : 0);
    g.scale(s, sy, s);
    g.translate(x, y, z);
    return (g.index ? g.toNonIndexed() : g);
  }));
  const types = {
    neem: {
      trunk: new THREE.CylinderGeometry(0.22, 0.34, 3.4, 6).translate(0, 1.7, 0),
      canopy: blob([[0, 4.6, 0, 2.6, 1.9], [1.5, 4.1, 0.6, 1.7], [-1.3, 4.3, -0.7, 1.8], [0.2, 5.6, -0.3, 1.6]]),
      colors: ['#5d7a2e', '#6c8a34', '#4f6d2a', '#7a8f3a'],
    },
    ashoka: {
      trunk: new THREE.CylinderGeometry(0.12, 0.2, 2, 6).translate(0, 1, 0),
      canopy: blob([[0, 5, 0, 1.25, 4.2], [0, 2.6, 0, 1.05, 1.4]]),
      colors: ['#2f5a24', '#36652a', '#2b4f20'],
    },
    banyan: {
      trunk: mergeGeometries([
        new THREE.CylinderGeometry(0.7, 1.1, 4, 8).translate(0, 2, 0),
        new THREE.CylinderGeometry(0.08, 0.08, 4.5, 4).translate(2.6, 2.25, 0.8),
        new THREE.CylinderGeometry(0.08, 0.08, 4.5, 4).translate(-2.2, 2.25, -1.4),
        new THREE.CylinderGeometry(0.1, 0.1, 4.5, 4).translate(0.8, 2.25, 2.7),
      ].map((g) => (g.index ? g.toNonIndexed() : g))),
      canopy: blob([[0, 6, 0, 4.4, 2.4], [3, 5.4, 1, 2.8, 1.8], [-3, 5.6, -1, 3, 1.9], [0.5, 7.2, -1.4, 2.6, 1.6], [-0.8, 5.2, 3, 2.6, 1.6]]),
      colors: ['#44662a', '#3c5c26', '#51722e'],
    },
  };
  for (const [name, T] of Object.entries(types)) {
    const items = list.filter((t) => t.type === name);
    if (!items.length) continue;
    const mats = [], cols = [];
    for (const t of items) {
      const s = t.s ?? 1;
      _m.compose(_p.set(t.x, 0, t.z), _q.setFromAxisAngle(UP, r() * Math.PI * 2), _s.set(s, s * (0.9 + r() * 0.2), s));
      mats.push(_m.clone());
      cols.push(new THREE.Color(T.colors[Math.floor(r() * T.colors.length)]).offsetHSL(0, 0, (r() - 0.5) * 0.06));
    }
    group.add(instanced(T.trunk, bark, mats));
    group.add(instanced(T.canopy, leaf, mats, { colors: cols }));
  }
  group.userData.update = (t) => { leafUniform.value = t; };
  return group;
}

export const leafUniform = { value: 0 };
