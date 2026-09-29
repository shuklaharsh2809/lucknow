import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// Golden hour over Awadh: the sun low in the west-south-west, warm haze, long shadows.
export const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 5), THREE.MathUtils.degToRad(-68));

export function createEnvironment(renderer, scene) {
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 9;
  u.rayleigh.value = 3;
  u.mieCoefficient.value = 0.0035;
  u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(SUN_DIR);
  u.cloudCoverage.value = 0.32;
  u.cloudDensity.value = 0.35;
  u.cloudElevation.value = 0.45;
  scene.add(sky);

  // Image-based light from the same sky (sun disc hidden to avoid a hot spot).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  Object.assign(envSky.material.uniforms, THREE.UniformsUtils.clone(sky.material.uniforms));
  envSky.material.uniforms.showSunDisc.value = 0;
  envScene.add(envSky);
  const env = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  scene.fog = new THREE.FogExp2('#d6a07a', 0.0029);

  const hemi = new THREE.HemisphereLight('#a9b7de', '#8a5a36', 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#ffb36b', 4.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110;
  sc.near = 1; sc.far = 700;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);

  // A thin warm fill from the opposite side keeps shadowed facades from going muddy.
  const fill = new THREE.DirectionalLight('#7f8fc0', 0.35);
  fill.position.set(-SUN_DIR.x, 0.6, -SUN_DIR.z).multiplyScalar(100);
  scene.add(fill);

  return {
    sky, sun, hemi,
    // The shadow frustum follows the player, snapped to texels to stop shimmering.
    follow(p) {
      const texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
      const fx = Math.round(p.x / texel) * texel, fz = Math.round(p.z / texel) * texel;
      sun.target.position.set(fx, 0, fz);
      sun.position.set(fx + SUN_DIR.x * 350, SUN_DIR.y * 350, fz + SUN_DIR.z * 350);
    },
    update(t) {
      u.time.value = t;
    },
  };
}
