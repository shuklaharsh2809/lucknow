import * as THREE from 'three';

// Small seeded RNG so the city is the same on every visit.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function toTexture(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Weathered lime plaster: soft blotches, hairline cracks and speckle, tiles seamlessly
// because every stamp is drawn wrapped around the edges.
export function plasterTexture(base = '#ffffff', seed = 3, { blotch = 0.08, streaks = true } = {}) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const wrapped = (fn) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.save(); g.translate(dx, dy); fn(); g.restore();
    }
  };
  for (let i = 0; i < 90; i++) {
    const x = r() * size, y = r() * size, rad = 20 + r() * 90;
    const dark = r() > 0.5;
    const a = blotch * r();
    wrapped(() => {
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, dark ? `rgba(60,40,20,${a})` : `rgba(255,250,235,${a})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    });
  }
  if (streaks) {
    for (let i = 0; i < 40; i++) {
      const x = r() * size, y = r() * size, len = 30 + r() * 140;
      const a = 0.03 + r() * 0.05;
      wrapped(() => {
        const grd = g.createLinearGradient(x, y, x, y + len);
        grd.addColorStop(0, `rgba(40,30,20,${a})`);
        grd.addColorStop(1, 'rgba(40,30,20,0)');
        g.fillStyle = grd;
        g.fillRect(x, y, 2 + r() * 6, len);
      });
    }
  }
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 18;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return toTexture(c);
}

// Lakhori / red brick coursing for the clock tower.
export function brickTexture(seed = 9) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#8a4a36';
  g.fillRect(0, 0, size, size);
  const bh = 16, bw = 48;
  for (let row = 0; row < size / bh; row++) {
    const off = (row % 2) * bw / 2;
    for (let col = -1; col < size / bw + 1; col++) {
      const x = col * bw + off, y = row * bh;
      const k = 0.8 + r() * 0.35;
      g.fillStyle = `rgb(${160 * k | 0},${82 * k | 0},${60 * k | 0})`;
      g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    }
  }
  return toTexture(c);
}

export function groundTexture(seed = 5) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#b59a74';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const x = r() * size, y = r() * size, s = 1 + r() * 3;
    const k = r();
    g.fillStyle = k > 0.5 ? `rgba(90,70,45,${0.15 * r()})` : `rgba(230,210,170,${0.15 * r()})`;
    g.fillRect(x, y, s, s);
  }
  for (let i = 0; i < 60; i++) {
    const x = r() * size, y = r() * size, rad = 20 + r() * 60;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(120,95,60,${0.12 * r()})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return toTexture(c);
}

export function pavingTexture(seed = 7, base = [196, 174, 140]) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#8a7a62';
  g.fillRect(0, 0, size, size);
  const s = 64;
  for (let y = 0; y < size; y += s) for (let x = 0; x < size; x += s) {
    const k = 0.88 + r() * 0.2;
    g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`;
    g.fillRect(x + 2, y + 2, s - 4, s - 4);
  }
  return toTexture(c);
}

export function asphaltTexture(seed = 11) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#5b5550';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const v = 60 + r() * 70;
    g.fillStyle = `rgba(${v},${v * 0.95},${v * 0.9},0.35)`;
    g.fillRect(r() * size, r() * size, 1.5, 1.5);
  }
  for (let i = 0; i < 30; i++) {
    const x = r() * size, y = r() * size, rad = 30 + r() * 80;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(170,140,100,${0.18 * r()})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return toTexture(c);
}

export function grassTexture(seed = 13) {
  const size = 256;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#6f8a3e';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    const k = r();
    g.fillStyle = k > 0.5 ? `rgba(40,70,20,${0.3 * r()})` : `rgba(170,190,90,${0.25 * r()})`;
    g.fillRect(r() * size, r() * size, 1, 2 + r() * 3);
  }
  return toTexture(c);
}

// Facade for the ordinary old-city houses: one 3m x 3m bay per tile. White so that
// per-instance colour tints it into the faded pastels of the old city.
export function facadeTexture(seed = 17) {
  const size = 256;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#f2ece2';
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 22;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  // floor ledge
  g.fillStyle = 'rgba(80,60,40,0.35)';
  g.fillRect(0, 0, size, 10);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(0, 10, size, 4);
  // window with pointed arch head
  const wx = 88, wy = 70, ww = 80, wh = 130;
  g.fillStyle = '#e8dcc6';
  g.beginPath();
  g.moveTo(wx - 8, wy + wh + 8);
  g.lineTo(wx - 8, wy + 30);
  g.quadraticCurveTo(wx + ww / 2, wy - 36, wx + ww + 8, wy + 30);
  g.lineTo(wx + ww + 8, wy + wh + 8);
  g.fill();
  g.fillStyle = '#2b2119';
  g.beginPath();
  g.moveTo(wx, wy + wh);
  g.lineTo(wx, wy + 34);
  g.quadraticCurveTo(wx + ww / 2, wy - 24, wx + ww, wy + 34);
  g.lineTo(wx + ww, wy + wh);
  g.fill();
  // wooden shutters, sometimes half open
  g.fillStyle = '#5a7a6a';
  g.fillRect(wx + 4, wy + 40, ww / 2 - 6, wh - 44);
  g.fillStyle = '#4a6a5c';
  g.fillRect(wx + ww / 2 + 2, wy + 40, ww / 2 - 6, wh - 44);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 2;
  for (let y = wy + 50; y < wy + wh - 4; y += 10) {
    g.beginPath(); g.moveTo(wx + 6, y); g.lineTo(wx + ww - 6, y); g.stroke();
  }
  // sill
  g.fillStyle = 'rgba(70,50,30,0.5)';
  g.fillRect(wx - 12, wy + wh + 6, ww + 24, 8);
  // grime drip below the sill
  const grd = g.createLinearGradient(0, wy + wh + 14, 0, size);
  grd.addColorStop(0, 'rgba(60,45,30,0.25)');
  grd.addColorStop(1, 'rgba(60,45,30,0)');
  g.fillStyle = grd;
  g.fillRect(wx - 6, wy + wh + 14, ww + 12, size - wy - wh - 14);
  const t = toTexture(c);
  return t;
}

export function roofTexture(seed = 19) {
  const size = 128;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#9c8b76';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = `rgba(50,40,30,${0.2 * r()})`;
    g.fillRect(r() * size, r() * size, 2, 2);
  }
  return toTexture(c);
}

// Tiling normal map for water, built from summed sines so it wraps perfectly.
export function waterNormalTexture() {
  const size = 256;
  const [c, g] = canvas(size);
  const img = g.createImageData(size, size);
  const waves = [];
  const r = rng(23);
  for (let i = 0; i < 10; i++) {
    waves.push({ kx: Math.round((r() - 0.5) * 12), ky: Math.round((r() - 0.5) * 12), a: 0.2 + r() * 0.6, p: r() * 6.28 });
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let dx = 0, dy = 0;
    for (const w of waves) {
      const ph = (w.kx * x + w.ky * y) / size * Math.PI * 2 + w.p;
      const cs = Math.cos(ph) * w.a;
      dx += cs * w.kx; dy += cs * w.ky;
    }
    const n = new THREE.Vector3(-dx * 0.04, -dy * 0.04, 1).normalize();
    const i = (y * size + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255;
    img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
    img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false });
}

// A decorative band (used above arcades) with a repeating Awadhi floral lattice.
export function bandTexture(bg = '#2a2320', fg = '#e7d3a8') {
  const w = 256, h = 64;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = fg;
  g.fillStyle = fg;
  g.lineWidth = 3;
  g.fillRect(0, 4, w, 3);
  g.fillRect(0, h - 7, w, 3);
  for (let i = 0; i < 4; i++) {
    const cx = i * 64 + 32, cy = h / 2;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + Math.cos(a + 0.4) * 16, cy + Math.sin(a + 0.4) * 16, cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
    }
    g.stroke();
    g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx + 32, 10); g.lineTo(cx + 32, h - 10); g.stroke();
  }
  const t = toTexture(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function glowSpriteTexture() {
  const [c, g] = canvas(64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,240,200,1)');
  grd.addColorStop(0.2, 'rgba(255,190,110,0.7)');
  grd.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return toTexture(c, { repeat: false });
}

export function smokeSpriteTexture() {
  const [c, g] = canvas(64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return toTexture(c, { repeat: false });
}

// Shop signboards: one atlas, 4 x 4 cells.
export const SIGNS = [
  ['Lucknowi Chikan', 'चिकनकारी', '#7a1f2b', '#f6e7c8'],
  ['Kebab Corner', 'गलौटी कबाब', '#1e3d2f', '#f3d27a'],
  ['Chai', 'कुल्हड़ चाय', '#b5541c', '#fff2d6'],
  ['Prakash Kulfi', 'कुल्फ़ी फ़ालूदा', '#f0e0c0', '#6a2c1a'],
  ['Attar House', 'इत्र', '#2c2a55', '#e8cf8a'],
  ['Banarasi Paan', 'पान', '#2f5b2a', '#f7f0d0'],
  ['Mithai Bhandar', 'मिठाई', '#c8322b', '#fff0c2'],
  ['Zardozi Works', 'ज़रदोज़ी', '#4b1c4f', '#f2d27c'],
  ['Awadhi Biryani', 'बिरयानी', '#8a5a14', '#fff5dc'],
  ['Chudi Wala', 'चूड़ियाँ', '#a02070', '#fff0f5'],
  ['Nahari Kulcha', 'निहारी कुलचा', '#3a2418', '#f3c66e'],
  ['Tokri Chaat', 'चाट', '#d8a21e', '#3b1a08'],
  ['Kitab Ghar', 'किताबें', '#1f3f66', '#eee'],
  ['Makhan Malai', 'मक्खन मलाई', '#f8f1e0', '#7a4a1a'],
  ['Silk & Saree', 'साड़ी', '#6b0f1a', '#f5d98a'],
  ['Khasta Kachori', 'खस्ता', '#e07a1f', '#2a1308'],
];

export function signAtlas() {
  const cell = 256, n = 4;
  const c = document.createElement('canvas');
  c.width = cell * n; c.height = cell / 2 * n;
  const g = c.getContext('2d');
  SIGNS.forEach(([en, hi, bg, fg], i) => {
    const x = (i % n) * cell, y = Math.floor(i / n) * cell / 2;
    g.fillStyle = bg;
    g.fillRect(x, y, cell, cell / 2);
    g.strokeStyle = fg;
    g.lineWidth = 4;
    g.strokeRect(x + 8, y + 8, cell - 16, cell / 2 - 16);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 38px "Noto Sans Devanagari", "Kohinoor Devanagari", sans-serif';
    g.fillText(hi, x + cell / 2, y + 44);
    g.font = 'italic 600 26px Georgia, serif';
    g.fillText(en, x + cell / 2, y + 90);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function clockFaceTexture() {
  const [c, g] = canvas(256);
  g.fillStyle = '#f4ecd8';
  g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a1a10';
  g.lineWidth = 8;
  g.stroke();
  g.fillStyle = '#2a1a10';
  g.font = 'bold 28px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  roman.forEach((s, i) => {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2;
    g.fillText(s, 128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96);
  });
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2;
    const r0 = i % 5 ? 114 : 108;
    g.lineWidth = i % 5 ? 2 : 4;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
    g.lineTo(128 + Math.cos(a) * 120, 128 + Math.sin(a) * 120);
    g.stroke();
  }
  return toTexture(c, { repeat: false });
}
