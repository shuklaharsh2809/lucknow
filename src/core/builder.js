import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KEEP_UV, NO_SHADOW, TILE } from './materials.js';


const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _m2 = new THREE.Matrix4();

function worldUV(g, tile) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  const uv = new Float32Array((p.length / 3) * 2);
  for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
    const ax = Math.abs(n[i]), ay = Math.abs(n[i + 1]), az = Math.abs(n[i + 2]);
    let u, v;
    if (ay >= ax && ay >= az) { u = p[i]; v = p[i + 2]; }
    else if (ax >= az) { u = p[i + 2]; v = p[i + 1]; }
    else { u = p[i]; v = p[i + 1]; }
    uv[j] = u / tile; uv[j + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function normalize(g) {
  let out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') out.deleteAttribute(name);
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.uv) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  out.clearGroups();
  return out;
}

// Collects geometry per material in a local coordinate frame (push/pop like a turtle),
// registers colliders in world space, then merges everything into one mesh per material.
export class Builder {
  constructor(materials, physics) {
    this.M = materials;
    this.physics = physics;
    this.parts = {};
    this.matrix = new THREE.Matrix4();
    this.stack = [];
  }

  push(x = 0, y = 0, z = 0, ry = 0) {
    this.stack.push(this.matrix.clone());
    _m.makeRotationY(ry).setPosition(x, y, z);
    this.matrix.multiply(_m);
    return this;
  }

  pop() {
    this.matrix = this.stack.pop();
    return this;
  }

  add(key, geo, local) {
    if (!this.M[key]) throw new Error('Unknown material ' + key);
    if (local) geo.applyMatrix4(local);
    geo.applyMatrix4(this.matrix);
    (this.parts[key] ||= []).push(geo);
    return geo;
  }

  // Collider from local-space bounds. Frames only ever turn about Y, so the box stays an
  // oriented box in world space: centre, half extents and yaw are enough.
  collide(minX, minY, minZ, maxX, maxY, maxZ, local) {
    if (!this.physics) return;
    _m2.copy(this.matrix);
    if (local) _m2.multiply(local);
    _v.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2).applyMatrix4(_m2);
    const e = _m2.elements;
    const yaw = Math.atan2(e[8], e[0]);
    const hy = (maxY - minY) / 2;
    this.physics.addOBB(_v.x, _v.z, (maxX - minX) / 2, (maxZ - minZ) / 2, yaw, _v.y - hy, _v.y + hy);
  }

  // Current frame's world position and yaw (for registering pits and other world data).
  frame() {
    const e = this.matrix.elements;
    return { x: e[12], y: e[13], z: e[14], yaw: Math.atan2(e[8], e[0]) };
  }

  // Box sitting on y (bottom), centred on x/z.
  box(key, w, h, d, x = 0, y = 0, z = 0, { ry = 0, collide = false } = {}) {
    const local = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y + h / 2, z);
    this.add(key, new THREE.BoxGeometry(w, h, d), local);
    if (collide) this.collide(-w / 2, -h / 2, -d / 2, w / 2, h / 2, d / 2, local);
    return this;
  }

  cyl(key, rTop, rBot, h, x = 0, y = 0, z = 0, { seg = 16, collide = false, open = false, ry = 0 } = {}) {
    const local = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y + h / 2, z);
    this.add(key, new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), local);
    if (collide) {
      const r = Math.max(rTop, rBot) * 0.85;
      this.collide(-r, -h / 2, -r, r, h / 2, r, local);
    }
    return this;
  }

  geo(key, geometry, x = 0, y = 0, z = 0, { ry = 0, rx = 0, rz = 0, s = 1 } = {}) {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')),
      typeof s === 'number' ? new THREE.Vector3(s, s, s) : s,
    );
    this.add(key, geometry, local);
    return this;
  }

  build(name = 'group') {
    const group = new THREE.Group();
    group.name = name;
    for (const [key, list] of Object.entries(this.parts)) {
      const geos = list.map(normalize);
      if (!KEEP_UV.has(key)) {
        const tile = TILE[key] ?? (key.startsWith('facade') ? 3 : 6);
        for (const g of geos) worldUV(g, tile);
      }
      const merged = mergeGeometries(geos, false);
      if (!merged) { console.warn('merge failed', name, key); continue; }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.M[key]);
      mesh.name = `${name}:${key}`;
      mesh.castShadow = !NO_SHADOW.has(key);
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      for (const g of geos) g.dispose();
    }
    this.parts = {};
    return group;
  }
}
