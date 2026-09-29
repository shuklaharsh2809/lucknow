import { PLACES, ROAD, SITES } from '../world/layout.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor({ footprints, onTeleport }) {
    this.footprints = footprints;
    this.onTeleport = onTeleport;
    this.current = null;
    this.cardTimer = 0;
    this.mapOn = true;

    const bar = $('places');
    PLACES.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span>${i + 1}</span><em class="label" style="font-style:normal">${p.name}</em>`;
      btn.addEventListener('click', (e) => { e.stopPropagation(); onTeleport(i); });
      bar.appendChild(btn);
    });
    this.buttons = [...bar.children];

    this.map = $('minimap');
    this.mctx = this.map.getContext('2d');
  }

  // Call once the world is built and every module has registered its footprints.
  drawBase() {
    this._drawBase();
  }

  show() {
    for (const id of ['topbar', 'places', 'minimap', 'crosshair']) $(id).classList.remove('hidden');
  }

  toggleMap() {
    this.mapOn = !this.mapOn;
    this.map.classList.toggle('off', !this.mapOn);
  }

  showCard(i, hold = 9) {
    const p = PLACES[i];
    $('card-year').textContent = p.year;
    $('card-title').textContent = p.name;
    $('card-native').textContent = p.local;
    $('card-text').textContent = p.text;
    $('card').classList.add('show');
    this.cardTimer = hold;
  }

  // Which place the player is in right now, used for the label and the auto card.
  update(dt, pos, yaw, clockText) {
    $('clock').textContent = clockText;
    let here = -1, best = Infinity;
    PLACES.forEach((p, i) => {
      const d = Math.hypot(pos.x - p.center[0], pos.z - p.center[1]);
      if (d < p.radius && d / p.radius < best) { best = d / p.radius; here = i; }
    });
    if (here !== this.current) {
      this.current = here;
      $('place-name').textContent = here >= 0 ? PLACES[here].name : this._streetName(pos);
      this.buttons.forEach((b, i) => b.classList.toggle('here', i === here));
      if (here >= 0) this.showCard(here);
    }
    if (this.cardTimer > 0) {
      this.cardTimer -= dt;
      if (this.cardTimer <= 0) $('card').classList.remove('show');
    }
    if (this.mapOn && this.base) this._drawMap(pos, yaw);
  }

  _streetName(pos) {
    if (Math.abs(pos.z) < 12) return 'Husainabad Road';
    if (pos.z < -230) return 'Gomti riverfront';
    return 'Old Lucknow';
  }

  _drawBase() {
    // Static map layer, redrawn into the round minimap around the player.
    const S = 1400, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    this.baseScale = S / 1240;
    const tx = (x) => (x + 620) * this.baseScale, tz = (z) => (z + 620) * this.baseScale;
    g.fillStyle = '#c9ab82';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#6f93a0';
    g.fillRect(0, tz(SITES.river.z0), S, (SITES.river.z1 - SITES.river.z0) * this.baseScale);
    for (const f of this.footprints) {
      g.fillStyle = f.color;
      g.fillRect(tx(f.x0), tz(f.z0), (f.x1 - f.x0) * this.baseScale, (f.z1 - f.z0) * this.baseScale);
    }
    g.fillStyle = '#5b534b';
    g.fillRect(tx(ROAD.x0), tz(-ROAD.width / 2), (ROAD.x1 - ROAD.x0) * this.baseScale, ROAD.width * this.baseScale);
    const t = SITES.tank;
    g.fillStyle = '#6f93a0';
    g.fillRect(tx(t.x - t.w / 2), tz(t.z - t.d / 2), t.w * this.baseScale, t.d * this.baseScale);
    this.base = c;
    this.tx = tx; this.tz = tz;
  }

  _drawMap(pos, yaw) {
    const g = this.mctx, W = this.map.width;
    const zoom = 2.2; // canvas px per metre on the minimap
    g.save();
    g.clearRect(0, 0, W, W);
    g.beginPath();
    g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
    g.clip();
    g.translate(W / 2, W / 2);
    const k = zoom / this.baseScale;
    g.scale(k, k);
    g.translate(-this.tx(pos.x), -this.tz(pos.z));
    g.drawImage(this.base, 0, 0);
    g.restore();

    // landmark pips
    g.save();
    g.translate(W / 2, W / 2);
    PLACES.forEach((p, i) => {
      let dx = (p.center[0] - pos.x) * zoom, dz = (p.center[1] - pos.z) * zoom;
      const l = Math.hypot(dx, dz), max = W / 2 - 18;
      if (l > max) { dx = dx / l * max; dz = dz / l * max; }
      g.fillStyle = i === this.current ? '#f6ead3' : '#1c120c';
      g.beginPath(); g.arc(dx, dz, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = i === this.current ? '#1c120c' : '#e0ac48';
      g.font = '600 15px Inter, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(i + 1), dx, dz + 1);
    });
    // player arrow
    g.rotate(-yaw);
    g.fillStyle = '#e0ac48';
    g.strokeStyle = '#1c120c';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, -16); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath();
    g.fill(); g.stroke();
    g.restore();

    // rim
    g.strokeStyle = 'rgba(28,18,12,0.6)';
    g.lineWidth = 6;
    g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 3, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#1c120c';
    g.font = '700 18px Inter, sans-serif';
    g.textAlign = 'center';
    g.fillText('N', W / 2, 24);
  }
}
