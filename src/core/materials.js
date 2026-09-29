import * as THREE from 'three';
import * as T from './textures.js';

// Every material in the city lives here, keyed by name. The Builder merges geometry per key,
// so the number of keys is roughly the number of draw calls per landmark.
export function createMaterials() {
  const plasterTex = T.plasterTexture('#ffffff', 3);
  const plasterTex2 = T.plasterTexture('#ffffff', 8, { blotch: 0.05, streaks: false });

  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

  const water = std({
    color: '#6b8a8a', roughness: 0.06, metalness: 0.3,
    normalMap: T.waterNormalTexture(), normalScale: new THREE.Vector2(0.35, 0.35),
    transparent: true, opacity: 0.92,
  });

  const M = {
    // Buff lime plaster of the Nawabi monuments
    plaster: std({ color: '#e0c49a', map: plasterTex }),
    plasterDS: std({ color: '#d8b98c', map: plasterTex, side: THREE.DoubleSide }),
    plasterLight: std({ color: '#efdfc2', map: plasterTex }),
    plasterPink: std({ color: '#e6b59a', map: plasterTex }),
    trim: std({ color: '#f4e7cc', map: plasterTex2 }),
    recess: std({ color: '#5e4430', map: plasterTex2, roughness: 1 }),
    shadowRecess: std({ color: '#2a1d14', roughness: 1 }),
    interior: std({ color: '#b89a74', map: plasterTex, side: THREE.DoubleSide }),
    marble: std({ color: '#f3efe6', map: plasterTex2, roughness: 0.55 }),
    marbleDS: std({ color: '#f3efe6', map: plasterTex2, roughness: 0.55, side: THREE.DoubleSide }),
    brick: std({ color: '#ffffff', map: T.brickTexture() }),
    gold: std({ color: '#f0bf5a', metalness: 1, roughness: 0.32, envMapIntensity: 2.2, emissive: '#5a3a08', emissiveIntensity: 0.35 }),
    bronze: std({ color: '#8a6a3a', metalness: 0.8, roughness: 0.45 }),
    stone: std({ color: '#ffffff', map: T.pavingTexture() }),
    stoneRed: std({ color: '#ffffff', map: T.pavingTexture(31, [176, 120, 96]) }),
    ground: std({ color: '#ffffff', map: T.groundTexture() }),
    road: std({ color: '#ffffff', map: T.asphaltTexture(), roughness: 0.95 }),
    grass: std({ color: '#ffffff', map: T.grassTexture() }),
    hedge: std({ color: '#4d6a2c', roughness: 1 }),
    curb: std({ color: '#a89c8a', map: plasterTex2 }),
    wood: std({ color: '#6b4428', roughness: 0.8 }),
    woodDark: std({ color: '#3b2515', roughness: 0.8 }),
    iron: std({ color: '#2a2a2c', metalness: 0.6, roughness: 0.5 }),
    water,
    band: std({ color: '#ffffff', map: T.bandTexture() }),
    bandGold: std({ color: '#ffffff', map: T.bandTexture('#1b1714', '#e3b659'), metalness: 0.2, roughness: 0.6 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb257', emissiveIntensity: 2.4 }),
    warmGlow: new THREE.MeshStandardMaterial({ color: '#3a2412', emissive: '#ff9a3c', emissiveIntensity: 0.9, roughness: 1 }),
    ember: new THREE.MeshStandardMaterial({ color: '#301008', emissive: '#ff5a1a', emissiveIntensity: 3 }),
    sign: new THREE.MeshStandardMaterial({ map: T.signAtlas(), roughness: 0.7 }),
    clockFace: new THREE.MeshStandardMaterial({ map: T.clockFaceTexture(), roughness: 0.6, emissive: '#fff1d0', emissiveIntensity: 0.12, emissiveMap: null }),
    cloth: std({ color: '#ffffff', side: THREE.DoubleSide, roughness: 1 }),
    chikan: std({ color: '#f7f3ea', side: THREE.DoubleSide, roughness: 1 }),
  };
  M.clockFace.emissiveMap = M.clockFace.map;

  // Facade and roof for old-city houses. `facade` is tinted per instance; facade0..N are
  // fixed tints for merged (non-instanced) buildings such as the bazaar.
  const facadeTex = T.facadeTexture();
  M.facade = std({ color: '#ffffff', map: facadeTex });
  M.roof = std({ color: '#ffffff', map: T.roofTexture() });
  FACADE_COLORS.forEach((c, i) => { M['facade' + i] = std({ color: c, map: facadeTex }); });
  for (const [k, c] of Object.entries(CLOTH)) M[k] = std({ color: c, side: THREE.DoubleSide, roughness: 1 });

  for (const [k, m] of Object.entries(M)) m.name = k;
  return M;
}

export const FACADE_COLORS = ['#ecc9a0', '#eab4a2', '#bcd3d6', '#cddbb8', '#f1e3c6', '#dca27c', '#e8d484', '#cdb6d8'];
export const CLOTH = {
  clothRed: '#b3262e', clothSaffron: '#e8901c', clothGreen: '#2f7a4a', clothBlue: '#2a4f8f',
  clothPink: '#d4508a', clothYellow: '#e6c229', clothPurple: '#6a2c7a',
};
export const CLOTH_KEYS = Object.keys(CLOTH);

// Materials whose geometry carries its own UVs (atlases, decals). Everything else gets
// world-space box-projected UVs so textures stay the same scale across all shapes.
export const KEEP_UV = new Set(['sign', 'clockFace', 'band', 'bandGold', 'chikan', 'cloth']);
export const NO_SHADOW = new Set(['water', 'lamp', 'warmGlow', 'ember', 'grass', 'road', 'stone', 'stoneRed', 'ground', 'sign']);
