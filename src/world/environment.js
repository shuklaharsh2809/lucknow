import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// Four times of day over Lucknow. Sun direction from elevation/azimuth (degrees; azimuth 0 is
// south in this frame, negative towards the west).
export const TIMES = {
  morning: { label: 'Morning', clock: 7 * 60 + 40, el: 16, az: 112, sun: '#ffd2a0', sunI: 3.6, hemiSky: '#b9c8e6', hemiGround: '#8a6a4a', hemiI: 0.75, fog: '#d8cdbd', fogD: 0.0016, turb: 6, ray: 1.8, exp: 0.62, env: 0.6, lamps: 0.4 },
  afternoon: { label: 'Afternoon', clock: 14 * 60 + 30, el: 38, az: -28, sun: '#fff0dc', sunI: 3.4, hemiSky: '#c4d4ee', hemiGround: '#9a7a58', hemiI: 0.8, fog: '#cfd3d4', fogD: 0.0013, turb: 5, ray: 1.4, exp: 0.55, env: 0.65, lamps: 0.25 },
  evening: { label: 'Evening', clock: 18 * 60 + 4, el: 6, az: -68, sun: '#ffb36b', sunI: 3.8, hemiSky: '#a9b7de', hemiGround: '#8a5a36', hemiI: 0.75, fog: '#d6a07a', fogD: 0.0019, turb: 9, ray: 3, exp: 0.62, env: 0.55, lamps: 1 },
  night: { label: 'Night', clock: 20 * 60 + 40, el: -3.5, az: -80, sun: '#a8bcff', sunI: 0.55, hemiSky: '#4a5f92', hemiGround: '#2a1e16', hemiI: 0.9, fog: '#26304a', fogD: 0.0018, turb: 3, ray: 2.5, exp: 1.25, env: 0.35, lamps: 2.2, moon: true },
};

export function createEnvironment(renderer, scene) {
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.mieCoefficient.value = 0.0022;
  u.mieDirectionalG.value = 0.78;
  u.cloudCoverage.value = 0.3;
  u.cloudDensity.value = 0.32;
  u.cloudElevation.value = 0.45;
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  envScene.add(envSky);
  let envRT = null;

  scene.fog = new THREE.FogExp2('#d6a07a', 0.0019);
  const hemi = new THREE.HemisphereLight('#a9b7de', '#8a5a36', 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffb36b', 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120;
  sc.near = 1; sc.far = 800;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#7f8fc0', 0.35);
  scene.add(fill);

  // night: a gradient dome with stars (the daylight sky model has no night)
  const nightMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#060a1c') }, horizon: { value: new THREE.Color('#34466e') } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vDir; void main(){ float h = clamp(vDir.y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.45)), 1.0); }',
  });
  const nightSky = new THREE.Mesh(new THREE.SphereGeometry(3500, 32, 16), nightMat);
  const starPos = [];
  for (let i = 0; i < 1800; i++) {
    const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y);
    starPos.push(Math.cos(a) * r * 3300, y * 3300, Math.sin(a) * r * 3300);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
  nightSky.add(stars);
  nightSky.visible = false;
  scene.add(nightSky);
  const envNight = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), nightMat);
  envNight.visible = false;
  envScene.add(envNight);

  // a moon for the night sky
  const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff6e0', fog: false }));
  moon.visible = false;
  scene.add(moon);

  const sunDir = new THREE.Vector3();
  const lightDir = new THREE.Vector3();
  let current = null;

  const env = {
    sky, sun, hemi, sunDir, time: null,
    set(name, M) {
      const T = TIMES[name] || TIMES.afternoon;
      current = T;
      env.time = name;
      sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - T.el), THREE.MathUtils.degToRad(T.az));
      u.sunPosition.value.copy(sunDir);
      u.turbidity.value = T.turb;
      u.rayleigh.value = T.ray;
      u.showSunDisc.value = T.el > 0 ? 1 : 0;
      renderer.toneMappingExposure = T.exp;
      sky.visible = !T.moon;
      nightSky.visible = envNight.visible = !!T.moon;
      envSky.visible = !T.moon;
      Object.assign(envSky.material.uniforms, THREE.UniformsUtils.clone(u));
      envSky.material.uniforms.showSunDisc.value = 0;
      envRT?.dispose();
      envRT = pmrem.fromScene(envScene, 0.02);
      scene.environment = envRT.texture;
      scene.environmentIntensity = T.env;
      scene.fog.color.set(T.fog);
      scene.fog.density = T.fogD;
      hemi.color.set(T.hemiSky);
      hemi.groundColor.set(T.hemiGround);
      hemi.intensity = T.hemiI;
      sun.color.set(T.sun);
      sun.intensity = T.sunI;
      // at night the "sun" is moonlight from high in the sky
      lightDir.copy(T.moon ? new THREE.Vector3(0.35, 0.8, 0.45).normalize() : sunDir);
      fill.position.set(-lightDir.x, 0.6, -lightDir.z).multiplyScalar(100);
      moon.visible = !!T.moon;
      if (M) {
        M.lamp.emissiveIntensity = 1.2 + T.lamps * 1.2;
        M.warmGlow.emissiveIntensity = 0.35 + T.lamps * 0.6;
        M.clockFace.emissiveIntensity = T.moon ? 0.9 : 0.12;
      }
    },
    lampLevel: () => current?.lamps ?? 1,
    // The shadow frustum follows the player, snapped to texels to stop shimmering.
    follow(p) {
      const texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
      const fx = Math.round(p.x / texel) * texel, fz = Math.round(p.z / texel) * texel;
      sun.target.position.set(fx, 0, fz);
      sun.position.set(fx + lightDir.x * 380, lightDir.y * 380, fz + lightDir.z * 380);
      moon.position.set(p.x + 900, 1300, p.z + 1100);
      sky.position.set(p.x, 0, p.z);
      nightSky.position.set(p.x, 0, p.z);
    },
    update(t) { u.time.value = t; },
  };
  return env;
}
