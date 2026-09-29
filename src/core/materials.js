import * as THREE from 'three';
import * as T from './textures.js';

// Photo-scanned CC0 textures (Poly Haven) live in /public/tex as <name>_diff.jpg + <name>_nor.jpg.
const PHOTO = ['plaster', 'plasterB', 'stucco', 'brick', 'redstone', 'redpave', 'brickpave', 'asphalt', 'dirt', 'grass', 'marble', 'housewall', 'sandstone'];

async function loadPhotos() {
  const loader = new THREE.TextureLoader();
  const base = `${import.meta.env.BASE_URL}tex/`;
  const load = (url, srgb) => new Promise((res) => {
    loader.load(url, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      res(t);
    }, undefined, () => res(null));
  });
  const out = {};
  await Promise.all(PHOTO.map(async (n) => {
    const [d, nm] = await Promise.all([load(`${base}${n}_diff.jpg`, true), load(`${base}${n}_nor.jpg`, false)]);
    out[n] = { map: d, normalMap: nm };
  }));
  return out;
}

// Every material in the city lives here, keyed by name. The Builder merges geometry per key,
// so the number of keys is roughly the number of draw calls per landmark.
export async function createMaterials() {
  const P = await loadPhotos();
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...o });
  const photo = (n, o = {}, ns = 0.8) => std({ map: P[n].map, normalMap: P[n].normalMap, normalScale: new THREE.Vector2(ns, ns), ...o });
  const flatPlaster = T.plasterTexture('#ffffff', 8, { blotch: 0.05, streaks: false });

  const water = std({
    color: '#56716c', roughness: 0.05, metalness: 0.25,
    normalMap: T.waterNormalTexture(), normalScale: new THREE.Vector2(0.3, 0.3),
    transparent: true, opacity: 0.94,
  });

  const M = {
    // Lime plaster of the Nawabi monuments (cream-buff), and its weathered version
    plaster: photo('plasterB', { color: '#f4dcae' }, 0.6),
    plasterDS: photo('plasterB', { color: '#e8cf9e', side: THREE.DoubleSide }, 0.6),
    plasterLight: photo('plasterB', { color: '#fff0d6' }, 0.5),
    plasterPink: photo('plasterB', { color: '#f2c9a8' }, 0.6),
    weathered: photo('plaster', { color: '#d9c7a6' }, 1),
    trim: photo('stucco', { color: '#fff6e4' }, 0.4),
    recess: std({ color: '#6b5238', map: flatPlaster, roughness: 1 }),
    shadowRecess: std({ color: '#241a12', roughness: 1 }),
    interior: photo('plasterB', { color: '#d9bf92', side: THREE.DoubleSide }, 0.5),
    marble: photo('stucco', { color: '#fbf8f1', roughness: 0.6 }, 0.35),
    marbleDS: photo('stucco', { color: '#fbf8f1', roughness: 0.6, side: THREE.DoubleSide }, 0.35),
    brick: photo('brick', { color: '#ffd0b4' }, 1),
    redBrick: photo('brick', { color: '#ffc6a0', emissive: '#3a1406', emissiveIntensity: 0.25 }, 1),
    gold: std({ color: '#f0bf5a', metalness: 1, roughness: 0.32, envMapIntensity: 2.2, emissive: '#5a3a08', emissiveIntensity: 0.35 }),
    copperGold: std({ color: '#c79a5c', metalness: 0.9, roughness: 0.38, envMapIntensity: 1.8, emissive: '#3a2206', emissiveIntensity: 0.3 }),
    bronze: std({ color: '#8a6a3a', metalness: 0.8, roughness: 0.45 }),
    stone: photo('marble', { color: '#e9dcc4' }, 0.7),
    stoneRed: photo('marble', { color: '#f2ae90' }, 0.7),
    redstone: photo('marble', { color: '#e89c7c' }, 0.7),
    brickpave: photo('brickpave', { color: '#d9b49a' }, 0.9),
    ground: photo('dirt', { color: '#e6d6bc' }, 0.8),
    road: photo('asphalt', { color: '#c8c2ba', roughness: 0.95 }, 0.7),
    grass: photo('grass', { color: '#b8e08a' }, 0.8),
    hedge: std({ color: '#557a32', roughness: 1 }),
    curb: photo('sandstone', { color: '#cbbfa8' }, 0.6),
    wood: std({ color: '#6b4428', roughness: 0.8 }),
    woodDark: std({ color: '#3b2515', roughness: 0.8 }),
    iron: std({ color: '#2a2a2c', metalness: 0.6, roughness: 0.5 }),
    greenIron: std({ color: '#1f5a3c', metalness: 0.5, roughness: 0.45 }),
    water,
    band: std({ map: T.bandTexture() }),
    bandGold: std({ map: T.bandTexture('#1b1714', '#e3b659'), metalness: 0.2, roughness: 0.6 }),
    calligraphy: std({ map: T.calligraphyTexture(), roughness: 0.7 }),
    jali: std({ color: '#e8b49a', map: T.jaliTexture(), alphaTest: 0.5, side: THREE.DoubleSide }),
    jaliWhite: std({ color: '#fbf6ec', map: T.jaliTexture(), alphaTest: 0.5, side: THREE.DoubleSide }),
    lamp: new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb257', emissiveIntensity: 2.4 }),
    warmGlow: new THREE.MeshStandardMaterial({ color: '#3a2412', emissive: '#ff9a3c', emissiveIntensity: 0.9, roughness: 1 }),
    ember: new THREE.MeshStandardMaterial({ color: '#301008', emissive: '#ff5a1a', emissiveIntensity: 3 }),
    sign: new THREE.MeshStandardMaterial({ map: T.signAtlas(), roughness: 0.7 }),
    clockFace: new THREE.MeshStandardMaterial({ map: T.clockFaceTexture(), roughness: 0.6, emissive: '#fff1d0', emissiveIntensity: 0.12 }),
    cloth: std({ side: THREE.DoubleSide, roughness: 1 }),
    chikan: std({ color: '#f7f3ea', side: THREE.DoubleSide, roughness: 1 }),
  };
  M.clockFace.emissiveMap = M.clockFace.map;

  // Old-city houses: a two-bay facade atlas painted over the photo plaster.
  const facadeTex = T.facadeAtlas(P.housewall.map?.image);
  M.facade = std({ map: facadeTex });
  M.houseSolid = photo('housewall', { color: '#ffffff' }, 0.6);
  FACADE_COLORS.forEach((c, i) => { M['facade' + i] = std({ color: c, map: facadeTex }); });
  for (const [k, c] of Object.entries(CLOTH)) M[k] = std({ color: c, side: THREE.DoubleSide, roughness: 1 });

  for (const [k, m] of Object.entries(M)) m.name = k;
  return M;
}

export const FACADE_COLORS = ['#f0d2a8', '#eebcab', '#c6d8da', '#d4dfc0', '#f4e8cf', '#e2ae8a', '#ecd98e', '#d6c2de', '#f7f2e8', '#e9d8c0'];
export const CLOTH = {
  clothRed: '#b3262e', clothSaffron: '#e8901c', clothGreen: '#2f7a4a', clothBlue: '#2a4f8f',
  clothPink: '#d4508a', clothYellow: '#e6c229', clothPurple: '#6a2c7a',
};
export const CLOTH_KEYS = Object.keys(CLOTH);

// Materials whose geometry carries its own UVs (atlases, decals). Everything else gets
// world-space box-projected UVs so textures stay the same scale across all shapes.
export const KEEP_UV = new Set(['sign', 'clockFace', 'band', 'bandGold', 'chikan', 'cloth', 'calligraphy', 'jali', 'jaliWhite']);
export const NO_SHADOW = new Set(['water', 'lamp', 'warmGlow', 'ember', 'grass', 'road', 'stone', 'stoneRed', 'ground', 'sign', 'brickpave']);

// Metres per texture repeat for world-space UVs.
export const TILE = {
  plaster: 3.5, plasterDS: 3.5, plasterLight: 3.5, plasterPink: 3.5, weathered: 3, trim: 3, interior: 4,
  marble: 3, marbleDS: 3, brick: 2.4, redBrick: 2.4, stone: 3.2, stoneRed: 3, redstone: 2.6, brickpave: 2.4,
  ground: 8, road: 7, grass: 5, curb: 2, houseSolid: 3, recess: 4,
};
