import { SITES } from '../world/layout.js';

// Everything here is synthesised with Web Audio: no audio files to download.
export class Soundscape {
  constructor() {
    this.ctx = null;
    this.on = true;
    this.timers = { bird: 2, bell: 5, coo: 8 };
    this.lastQuarter = null;
  }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.9 : 0;
    this.master.connect(ctx.destination);

    this.noise = this._noiseBuffer(4);
    this.brown = this._noiseBuffer(4, true);

    // distant city hum
    this.hum = this._loop(this.brown, [['lowpass', 380, 0.7]], 0.22);
    // crowd murmur, swelling near the bazaar
    this.crowd = this._loop(this.noise, [['bandpass', 650, 0.9], ['lowpass', 1600, 0.5]], 0);
    this.crowdLfo = ctx.createOscillator();
    this.crowdLfo.frequency.value = 0.35;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.25;
    this.crowdLfo.connect(lfoGain).connect(this.crowd.filters[0].frequency);
    lfoGain.gain.value = 180;
    this.crowdLfo.start();
    // water near the Gomti and the tank
    this.water = this._loop(this.noise, [['highpass', 900, 0.5], ['lowpass', 3200, 0.5]], 0);
    // wind on rooftops / when flying
    this.wind = this._loop(this.noise, [['bandpass', 420, 0.4]], 0);

    this._tanpura();
  }

  toggle() {
    this.on = !this.on;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master.gain.setTargetAtTime(this.on ? 0.9 : 0, this.ctx.currentTime, 0.2);
    }
    return this.on;
  }

  _noiseBuffer(sec, brown = false) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  _loop(buffer, filters, gain) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    let node = src;
    const fs = filters.map(([type, f, q]) => {
      const n = ctx.createBiquadFilter();
      n.type = type; n.frequency.value = f; n.Q.value = q;
      node.connect(n); node = n;
      return n;
    });
    const g = ctx.createGain();
    g.gain.value = gain;
    node.connect(g).connect(this.master);
    src.start(0, Math.random() * buffer.duration);
    return { src, filters: fs, gain: g };
  }

  // A soft tanpura drone (Pa - Sa' - Sa' - Sa), the sound of an Awadhi evening.
  _tanpura() {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0.05;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    out.connect(lp).connect(this.master);
    const sa = 138.6; // C#3
    const notes = [sa * 1.5 / 2, sa, sa, sa / 2];
    let t0 = ctx.currentTime + 0.5;
    const pluck = (f, t) => {
      for (const [mul, amp] of [[1, 1], [2, 0.5], [3, 0.3], [4.01, 0.22], [5.02, 0.12]]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mul;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 3.8);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + 4);
      }
    };
    const schedule = () => {
      while (t0 < ctx.currentTime + 4) {
        notes.forEach((f, i) => pluck(f, t0 + i * 1.05));
        t0 += 4.4;
      }
    };
    schedule();
    this.tanpuraTimer = setInterval(schedule, 1500);
  }

  _chirp(pan, vol) {
    const ctx = this.ctx, t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 4);
    const base = 2600 + Math.random() * 1800;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const g = ctx.createGain();
    g.gain.value = vol;
    if (p) { p.pan.value = pan; g.connect(p).connect(this.master); } else g.connect(this.master);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      const e = ctx.createGain();
      const s = t + i * (0.09 + Math.random() * 0.05);
      o.frequency.setValueAtTime(base, s);
      o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), s + 0.06);
      e.gain.setValueAtTime(0, s);
      e.gain.linearRampToValueAtTime(0.12, s + 0.01);
      e.gain.exponentialRampToValueAtTime(0.001, s + 0.08);
      o.connect(e).connect(g);
      o.start(s); o.stop(s + 0.1);
    }
  }

  _coo(vol) {
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.42;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(420, s);
      o.frequency.linearRampToValueAtTime(330, s + 0.3);
      const vib = ctx.createOscillator();
      vib.frequency.value = 28;
      const vg = ctx.createGain();
      vg.gain.value = 18;
      vib.connect(vg).connect(o.frequency);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, s);
      e.gain.linearRampToValueAtTime(vol, s + 0.08);
      e.gain.exponentialRampToValueAtTime(0.001, s + 0.36);
      o.connect(e).connect(this.master);
      o.start(s); o.stop(s + 0.4); vib.start(s); vib.stop(s + 0.4);
    }
  }

  _bell(vol) {
    // cycle-rickshaw "tring-tring"
    const ctx = this.ctx, t = ctx.currentTime;
    for (let k = 0; k < 2; k++) {
      const s = t + k * 0.16;
      for (const [f, a] of [[2380, 1], [3570, 0.5], [5210, 0.25]]) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const e = ctx.createGain();
        e.gain.setValueAtTime(vol * a, s);
        e.gain.exponentialRampToValueAtTime(0.0005, s + 0.35);
        const am = ctx.createOscillator();
        am.frequency.value = 40;
        const ag = ctx.createGain();
        ag.gain.value = vol * a * 0.5;
        am.connect(ag).connect(e.gain);
        o.connect(e).connect(this.master);
        o.start(s); o.stop(s + 0.4); am.start(s); am.stop(s + 0.4);
      }
    }
  }

  _chime(count, vol) {
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const s = t + i * 2.2;
      for (const [f, a, d] of [[196, 1, 5], [392, 0.5, 3.5], [467, 0.35, 2.5], [588, 0.25, 2], [98, 0.4, 5]]) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const e = ctx.createGain();
        e.gain.setValueAtTime(0, s);
        e.gain.linearRampToValueAtTime(vol * a, s + 0.01);
        e.gain.exponentialRampToValueAtTime(0.0005, s + d);
        o.connect(e).connect(this.master);
        o.start(s); o.stop(s + d);
      }
    }
  }

  step(speed) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700 + Math.random() * 500;
    const e = ctx.createGain();
    const v = Math.min(0.35, 0.12 + speed * 0.025);
    e.gain.setValueAtTime(v, t);
    e.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(f).connect(e).connect(this.master);
    src.start(t, Math.random() * 3, 0.12);
  }

  update(dt, player, ctx) {
    if (!this.ctx || !this.on) return;
    const p = player.pos;
    const now = this.ctx.currentTime;
    const c = SITES.chowk;
    const dBazaar = Math.hypot(Math.max(0, Math.abs(p.x - c.x) - 6), Math.max(0, c.z0 - p.z, p.z - c.z1));
    const dRoad = Math.abs(p.z);
    const crowd = 0.5 * Math.exp(-dBazaar / 25) + 0.14 * Math.exp(-dRoad / 30);
    const high = Math.max(0, p.y - 4);
    this.crowd.gain.gain.setTargetAtTime(crowd * Math.exp(-high / 30), now, 0.4);
    const t = SITES.tank;
    const dWater = Math.min(Math.abs(p.z - (SITES.river.z0 + SITES.river.z1) / 2) - 30, Math.hypot(p.x - t.x, p.z - t.z) - 20);
    this.water.gain.gain.setTargetAtTime(0.09 * Math.exp(-Math.max(0, dWater) / 18), now, 0.5);
    this.wind.gain.gain.setTargetAtTime(Math.min(0.28, 0.02 + high * 0.004 + (player.flying ? player.speed * 0.004 : 0)), now, 0.5);
    this.hum.gain.gain.setTargetAtTime(0.2 * Math.exp(-high / 80), now, 0.5);

    this.timers.bird -= dt;
    if (this.timers.bird < 0) {
      this._chirp((Math.random() - 0.5) * 1.6, 0.18 + Math.random() * 0.2);
      this.timers.bird = 1.5 + Math.random() * 4;
    }
    this.timers.bell -= dt;
    if (this.timers.bell < 0) {
      if (dRoad < 40 || dBazaar < 30) this._bell(0.05 * Math.exp(-Math.min(dRoad, dBazaar) / 25));
      this.timers.bell = 3 + Math.random() * 7;
    }
    this.timers.coo -= dt;
    if (this.timers.coo < 0) {
      this._coo(0.06);
      this.timers.coo = 7 + Math.random() * 10;
    }
    // Husainabad clock tower chimes the quarters
    const mins = ctx.gameMinutes?.() ?? 0;
    const quarter = Math.floor(mins / 15);
    if (this.lastQuarter !== null && quarter !== this.lastQuarter) {
      const ct = SITES.clockTower;
      const d = Math.hypot(p.x - ct.x, p.z - ct.z);
      const onHour = quarter % 4 === 0;
      const hour = Math.floor(mins / 60) % 12 || 12;
      this._chime(onHour ? hour : 1, 0.22 * Math.exp(-d / 220));
    }
    this.lastQuarter = quarter;
  }
}
