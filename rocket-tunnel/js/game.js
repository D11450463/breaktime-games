'use strict';

// ═══════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = 480;
canvas.height = 720;

const VW = 480, VH = 720;
let scale = 1;

function resize() {
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  scale = s;
  canvas.style.width  = (VW * s) + 'px';
  canvas.style.height = (VH * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const TL = 65;
const TR = VW - 65;
const TW = TR - TL;

const C = {
  bg:       '#030310',
  tunnelBg: '#020218',
  blue:     '#00ccff',
  purple:   '#aa00ff',
  green:    '#00ff88',
  orange:   '#ff8800',
  red:      '#ff1144',
  yellow:   '#ffee00',
  pink:     '#ff00bb',
  white:    '#ffffff',
  crystal:  '#44ffff',
  ring:     '#ffee00',
};

const ST = { MENU: 0, PLAY: 1, PAUSE: 2, OVER: 3 };

// ═══════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════

const keysDown     = new Set();
const keysJustDown = new Set();

document.addEventListener('keydown', e => {
  const block = ['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if (block.includes(e.code)) e.preventDefault();
  if (!keysDown.has(e.code)) keysJustDown.add(e.code);
  keysDown.add(e.code);
});
document.addEventListener('keyup', e => keysDown.delete(e.code));

function just(code) { return keysJustDown.has(code); }
function held(code) { return keysDown.has(code); }

let touchX = null;
canvas.addEventListener('touchstart', e => {
  touchX = e.touches[0].clientX / scale;
  e.preventDefault();
  keysJustDown.add('Enter');
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  touchX = e.touches[0].clientX / scale;
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', () => { touchX = null; }, { passive: false });

canvas.addEventListener('click', () => keysJustDown.add('Enter'));

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════

function rnd(a, b) { return Math.random() * (b - a) + a; }
function rndI(a, b) { return Math.floor(rnd(a, b + 1)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function glow(color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur  = blur;
}
function noGlow() { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }

function neonRect(x, y, w, h, color, blur = 10) {
  ctx.save(); glow(color, blur);
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function neonLine(x1, y1, x2, y2, color, lw = 2, blur = 12) {
  ctx.save(); glow(color, blur);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

function neonCircle(x, y, r, color, lw = 2, blur = 12) {
  ctx.save(); glow(color, blur);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════

let state       = ST.MENU;
let score       = 0;
let best        = parseInt(localStorage.getItem('rt_best') || '0');
let crystalCnt  = 0;
let distM       = 0;
let frame       = 0;
let gameSpeed   = 3;
let baseSpeed   = 3;
let speedMult   = 1;
let doubleScore = false;
let gameTimeSec = 0;
let lastTier    = 0;
let scoreTick   = 0;

// ═══════════════════════════════════════════════
// STARS
// ═══════════════════════════════════════════════

const STARS = Array.from({ length: 120 }, () => ({
  x: rnd(0, VW), y: rnd(0, VH),
  s: rnd(0.4, 1.8), v: rnd(0.3, 1.5), a: rnd(0.2, 0.9)
}));

function updateStars(dt) {
  for (const s of STARS) {
    s.y += s.v * dt * 0.6;
    if (s.y > VH) { s.y = -2; s.x = rnd(0, VW); }
  }
}

function drawStars() {
  for (const s of STARS) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════
// TUNNEL
// ═══════════════════════════════════════════════

let gridScroll = 0;
const GRID = 45;

function drawTunnel() {
  ctx.fillStyle = C.tunnelBg;
  ctx.fillRect(TL, 0, TW, VH);

  gridScroll = (gridScroll + gameSpeed * 0.4) % GRID;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 0.5;
  for (let y = -GRID + gridScroll; y < VH; y += GRID) {
    ctx.beginPath(); ctx.moveTo(TL, y); ctx.lineTo(TR, y); ctx.stroke();
  }
  const laneW = TW / 4;
  for (let i = 0; i <= 4; i++) {
    const x = TL + i * laneW;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke();
  }
  ctx.restore();

  const vp = { x: VW / 2, y: -80 };
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const x = TL + (TW / 6) * i;
    ctx.beginPath(); ctx.moveTo(vp.x, vp.y); ctx.lineTo(x, VH + 50); ctx.stroke();
  }
  ctx.restore();

  const lg = ctx.createLinearGradient(0, 0, TL, 0);
  lg.addColorStop(0, '#000'); lg.addColorStop(1, C.tunnelBg);
  ctx.fillStyle = lg; ctx.fillRect(0, 0, TL, VH);
  const rg = ctx.createLinearGradient(TR, 0, VW, 0);
  rg.addColorStop(0, C.tunnelBg); rg.addColorStop(1, '#000');
  ctx.fillStyle = rg; ctx.fillRect(TR, 0, VW - TR, VH);

  const wallPulse = 0.6 + Math.sin(frame * 0.04) * 0.15;
  ctx.save();
  ctx.globalAlpha = wallPulse;
  glow(C.blue, 18);
  ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(TL, 0); ctx.lineTo(TL, VH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(TR, 0); ctx.lineTo(TR, VH); ctx.stroke();
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(TL, 0); ctx.lineTo(TL, VH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(TR, 0); ctx.lineTo(TR, VH); ctx.stroke();
  ctx.restore();
  noGlow();
}

// ═══════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════

const particles = [];

class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life; this.maxLife = life;
    this.size = size;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(0.92, dt);
    this.life -= dt;
  }
  draw() {
    const a = Math.max(0, this.life / this.maxLife);
    const r = this.size * a;
    ctx.save(); ctx.globalAlpha = a * 0.9;
    glow(this.color, 6);
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

function burst(x, y, color, n = 10, spd = 3, sz = 3) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const s = rnd(0.5, spd);
    particles.push(new Particle(x + rnd(-4,4), y + rnd(-4,4),
      Math.cos(a)*s, Math.sin(a)*s, color, rnd(18,35), rnd(1,sz)));
  }
}

function exhaust(x, y, dt) {
  if (rnd(0,1) < 0.4 * dt * 6) return;
  const colors = ['#ff6600','#ff9900','#ffcc33','#fff6aa'];
  particles.push(new Particle(
    x + rnd(-4,4), y + rnd(0,8),
    rnd(-0.8,0.8) * gameSpeed * 0.15,
    rnd(1.5, 3) * 0.8,
    colors[rndI(0,3)], rnd(8,18), rnd(2,4)
  ));
}

// ═══════════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════════

const P = {
  x: VW / 2, y: VH - 150,
  w: 26, h: 42,
  vx: 0,
  shielded: false, shieldLife: 0,
  invincible: false, invincibleFrames: 0,
  boostFuel: 100, boosting: false,
  trail: [],
};

function resetPlayer() {
  P.x = VW / 2; P.y = VH - 150; P.vx = 0;
  P.shielded = false; P.shieldLife = 0;
  P.invincible = false; P.invincibleFrames = 0;
  P.boostFuel = 100; P.boosting = false;
  P.trail = [];
}

function updatePlayer(dt) {
  const moveSpd = 4.5 * (P.boosting ? 1.4 : 1);
  let tx = 0;

  if (held('ArrowLeft')  || held('KeyA')) tx -= moveSpd;
  if (held('ArrowRight') || held('KeyD')) tx += moveSpd;

  if (touchX !== null) {
    const dx = touchX - P.x;
    tx = clamp(dx * 0.18, -moveSpd, moveSpd);
  }

  if ((held('Space') || held('ShiftLeft')) && P.boostFuel > 0) {
    P.boosting = true;
    P.boostFuel = Math.max(0, P.boostFuel - 1.8 * dt);
  } else {
    P.boosting = false;
    P.boostFuel = Math.min(100, P.boostFuel + 0.35 * dt);
  }

  P.vx = lerp(P.vx, tx, clamp(0.14 * dt * 6, 0, 1));
  P.x  = clamp(P.x + P.vx, TL + P.w / 2, TR - P.w / 2);

  if (P.shielded) { P.shieldLife -= dt; if (P.shieldLife <= 0) P.shielded = false; }
  if (P.invincible) { P.invincibleFrames -= dt; if (P.invincibleFrames <= 0) P.invincible = false; }

  P.trail.unshift({ x: P.x, y: P.y });
  if (P.trail.length > 14) P.trail.pop();

  exhaust(P.x, P.y + P.h / 2, dt);
  if (P.boosting) {
    exhaust(P.x - 6, P.y + P.h / 2, dt);
    exhaust(P.x + 6, P.y + P.h / 2, dt);
  }
}

function drawPlayer() {
  P.trail.forEach((t, i) => {
    const a = (1 - i / P.trail.length) * 0.25;
    ctx.save(); ctx.globalAlpha = a;
    drawRocketShape(t.x, t.y, 0.65, P.boosting ? C.orange : C.blue);
    ctx.restore();
  });

  if (P.invincible && frame % 6 < 3) return;

  if (P.shielded) {
    const t = frame * 0.06;
    ctx.save();
    glow(C.green, 22);
    ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.2;
    ctx.strokeStyle = C.green; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y, P.w + 14, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.08 + Math.sin(t * 2) * 0.03;
    ctx.fillStyle = C.green;
    ctx.beginPath(); ctx.arc(P.x, P.y, P.w + 14, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); noGlow();
  }

  drawRocketShape(P.x, P.y, 1, P.boosting ? C.orange : C.blue);
}

function drawRocketShape(x, y, sc, color) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc);
  const w = P.w, h = P.h;

  const bg = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
  bg.addColorStop(0, '#bbddff');
  bg.addColorStop(0.5, '#4488bb');
  bg.addColorStop(1, '#1a3355');
  glow(color, 14);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, -h/2);
  ctx.lineTo( w/2,  h/5);
  ctx.lineTo( w/3,  h/2);
  ctx.lineTo(-w/3,  h/2);
  ctx.lineTo(-w/2,  h/5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2255aa';
  ctx.beginPath(); ctx.moveTo(-w/3, h/5); ctx.lineTo(-w*0.85, h/2); ctx.lineTo(-w/3, h/2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo( w/3, h/5); ctx.lineTo( w*0.85, h/2); ctx.lineTo( w/3, h/2); ctx.closePath(); ctx.fill();

  glow('#00ffff', 10);
  ctx.fillStyle = '#00ccff';
  ctx.beginPath(); ctx.ellipse(0, -h/10, w/5, h/7, 0, 0, Math.PI*2); ctx.fill();

  const ec = P.boosting ? C.orange : '#ff5500';
  glow(ec, P.boosting ? 20 : 10);
  ctx.fillStyle = ec;
  ctx.beginPath(); ctx.ellipse(0, h/2, w/4, h/11, 0, 0, Math.PI*2); ctx.fill();

  ctx.restore(); noGlow();
}

function playerHitbox() {
  return { x: P.x - P.w/2 + 5, y: P.y - P.h/2 + 5, w: P.w - 10, h: P.h - 10 };
}

// ═══════════════════════════════════════════════
// OBSTACLE BASE
// ═══════════════════════════════════════════════

class Obstacle {
  constructor() { this.y = -60; this.dead = false; }
  update(dt) { this.y += gameSpeed * dt; if (this.y > VH + 80) this.dead = true; }
  draw() {}
  bounds() { return []; }
}

class EnergyWall extends Obstacle {
  constructor() {
    super();
    this.h      = 18;
    this.gap    = rnd(135, 190);
    this.gapX   = rnd(TL + 16, TR - this.gap - 16);
    this.color  = C.red;
    this.phase  = rnd(0, Math.PI * 2);
  }
  update(dt) { super.update(dt); this.phase += 0.12 * dt; }
  draw() {
    const gx = this.gapX, ge = gx + this.gap, y = this.y, h = this.h;
    const pulse = 10 + Math.sin(this.phase) * 4;

    glow(this.color, pulse);
    ctx.fillStyle = this.color;
    ctx.fillRect(TL, y - h/2, gx - TL, h);
    ctx.fillRect(ge, y - h/2, TR - ge, h);

    ctx.save(); ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ff8888';
    ctx.fillRect(gx - 3, y - h/2, 3, h);
    ctx.fillRect(ge,     y - h/2, 3, h);
    ctx.restore(); noGlow();
  }
  bounds() {
    const h = this.h, gx = this.gapX, ge = gx + this.gap;
    return [
      { x: TL,  y: this.y - h/2, w: gx - TL,  h },
      { x: ge,  y: this.y - h/2, w: TR - ge,   h },
    ];
  }
}

class MovingBlock extends Obstacle {
  constructor() {
    super();
    this.bw     = rnd(65, 105);
    this.bh     = rnd(28, 44);
    this.bx     = rnd(TL + this.bw/2, TR - this.bw/2);
    this.spd    = rnd(1.8, 3.2) * (Math.random() < 0.5 ? 1 : -1);
    this.color  = C.purple;
    this.phase  = rnd(0, Math.PI * 2);
  }
  update(dt) {
    super.update(dt);
    this.bx += this.spd * dt * 3;
    this.phase += 0.09 * dt;
    if (this.bx - this.bw/2 < TL) { this.bx = TL + this.bw/2; this.spd *= -1; }
    if (this.bx + this.bw/2 > TR) { this.bx = TR - this.bw/2; this.spd *= -1; }
  }
  draw() {
    const x = this.bx - this.bw/2, y = this.y - this.bh/2;
    glow(this.color, 12 + Math.sin(this.phase) * 3);
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, this.bw, this.bh);
    ctx.save(); ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 3, this.bw - 6, 4); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff'; ctx.font = '12px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.spd > 0 ? '▶' : '◀', this.bx, this.y); ctx.restore();
    noGlow();
  }
  bounds() {
    return [{ x: this.bx - this.bw/2, y: this.y - this.bh/2, w: this.bw, h: this.bh }];
  }
}

class RotatingBarrier extends Obstacle {
  constructor() {
    super();
    this.cx    = VW / 2;
    this.angle = rnd(0, Math.PI * 2);
    this.rotV  = rnd(0.018, 0.030) * (Math.random() < 0.5 ? 1 : -1);
    this.lenX  = TW * 0.42;
    this.lw    = 13;
    this.color = C.pink;
  }
  update(dt) { super.update(dt); this.angle += this.rotV * dt * 6; }
  draw() {
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    const x1 = this.cx + c * this.lenX, y1 = this.y + s * 18;
    const x2 = this.cx - c * this.lenX, y2 = this.y - s * 18;

    glow(this.color, 16);
    ctx.strokeStyle = this.color; ctx.lineWidth = this.lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

    glow('#fff', 10); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(this.cx, this.y, 5, 0, Math.PI * 2); ctx.fill();
    noGlow();
  }
  bounds() {
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    const res = [];
    for (let t = -1; t <= 1; t += 0.25) {
      res.push({
        x: this.cx + c * this.lenX * t - 7,
        y: this.y  + s * 18 * t - 7,
        w: 14, h: 14
      });
    }
    return res;
  }
}

class LaserGate extends Obstacle {
  constructor() {
    super();
    this.gw     = 75;
    this.period = rnd(36, 66);
    const slots = rndI(1, 2);
    this.gates  = [];
    for (let i = 0; i < slots; i++) {
      const cx = TL + (TW / (slots + 1)) * (i + 1);
      this.gates.push({ cx, open: Math.random() < 0.5, t: rnd(0, this.period) });
    }
    this.bh    = 15;
    this.color = C.green;
  }
  update(dt) {
    super.update(dt);
    for (const g of this.gates) {
      g.t += dt * 5;
      if (g.t >= this.period) { g.t = 0; g.open = !g.open; }
    }
  }
  draw() {
    for (const g of this.gates) {
      if (g.open) {
        glow(this.color, 8); ctx.fillStyle = this.color;
        ctx.fillRect(g.cx - this.gw/2 - 8, this.y - 4, 8, 8);
        ctx.fillRect(g.cx + this.gw/2,     this.y - 4, 8, 8);
      } else {
        glow(this.color, 18); ctx.strokeStyle = this.color;
        ctx.lineWidth = this.bh; ctx.lineCap = 'square';
        ctx.beginPath(); ctx.moveTo(g.cx - this.gw/2, this.y);
        ctx.lineTo(g.cx + this.gw/2, this.y); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
      }
    }
    noGlow();
  }
  bounds() {
    const res = [];
    for (const g of this.gates) {
      if (!g.open)
        res.push({ x: g.cx - this.gw/2, y: this.y - this.bh/2, w: this.gw, h: this.bh });
    }
    return res;
  }
}

// ═══════════════════════════════════════════════
// COLLECTIBLES
// ═══════════════════════════════════════════════

class Crystal {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.rot = rnd(0, Math.PI * 2);
    this.rotV = rnd(0.02, 0.05);
    this.sz  = 7;
    this.phase = rnd(0, Math.PI * 2);
    this.dead = false;
  }
  update(dt) {
    this.y += gameSpeed * dt;
    this.rot += this.rotV * dt * 6;
    this.phase += 0.09 * dt * 6;
    if (this.y > VH + 20) this.dead = true;
    if (activePU === 'magnet') {
      const dx = P.x - this.x, dy = P.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < 160) { this.x += (dx/d)*7*dt; this.y += (dy/d)*7*dt; }
    }
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    const s = this.sz + Math.sin(this.phase) * 1.5;
    glow(C.crystal, 10 + Math.sin(this.phase)*4);
    ctx.fillStyle = C.crystal;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s*0.55, 0); ctx.lineTo(0, s); ctx.lineTo(-s*0.55, 0);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -s*0.5); ctx.lineTo(s*0.18, -s*0.15); ctx.lineTo(0, 0); ctx.lineTo(-s*0.18, -s*0.15);
    ctx.closePath(); ctx.fill();
    ctx.restore(); noGlow();
  }
  hitbox() { return { x: this.x - this.sz, y: this.y - this.sz, w: this.sz*2, h: this.sz*2 }; }
}

class BonusRing {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.r = 16; this.dead = false;
    this.spin = rnd(0, Math.PI*2);
    this.phase = rnd(0, Math.PI*2);
  }
  update(dt) {
    this.y += gameSpeed * dt;
    this.spin  += 0.04 * dt * 6;
    this.phase += 0.08 * dt * 6;
    if (this.y > VH + 40) this.dead = true;
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    glow(C.ring, 14 + Math.sin(this.phase)*5);
    ctx.strokeStyle = C.ring; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*this.r*0.65, Math.sin(a)*this.r*0.65); ctx.stroke();
    }
    ctx.restore(); noGlow();
  }
  hitbox() { return { x: this.x - this.r, y: this.y - this.r, w: this.r*2, h: this.r*2 }; }
}

// ═══════════════════════════════════════════════
// POWER-UPS
// ═══════════════════════════════════════════════

const PU_TYPES   = ['shield','slowmo','magnet','hyper'];
const PU_COLORS  = { shield:'#00ff88', slowmo:'#8888ff', magnet:'#ff88ff', hyper:'#ff8800' };
const PU_LABELS  = { shield:'SHIELD', slowmo:'SLOW MO', magnet:'MAGNET', hyper:'HYPER!' };
const PU_ICONS   = { shield:'✦', slowmo:'◉', magnet:'⊕', hyper:'★' };
const PU_DURATIONS = { slowmo: 300, magnet: 360, hyper: 240 };

class PowerUpItem {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.sz = 12; this.spin = rnd(0, Math.PI*2);
    this.phase = rnd(0, Math.PI*2); this.dead = false;
  }
  update(dt) {
    this.y += gameSpeed * dt;
    this.spin  += 0.045 * dt * 6;
    this.phase += 0.07  * dt * 6;
    if (this.y > VH + 30) this.dead = true;
  }
  draw() {
    const color = PU_COLORS[this.type];
    const s = this.sz + Math.sin(this.phase) * 2.5;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    glow(color, 20 + Math.sin(this.phase)*5);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i/8)*Math.PI*2 - Math.PI/8;
      i === 0 ? ctx.moveTo(Math.cos(a)*s, Math.sin(a)*s)
              : ctx.lineTo(Math.cos(a)*s, Math.sin(a)*s);
    }
    ctx.closePath(); ctx.fill();
    ctx.rotate(-this.spin);
    ctx.fillStyle = '#000'; ctx.font = `bold ${s*0.85}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(PU_ICONS[this.type], 0, 1);
    ctx.restore(); noGlow();
  }
  hitbox() { return { x: this.x - this.sz, y: this.y - this.sz, w: this.sz*2, h: this.sz*2 }; }
}

// ═══════════════════════════════════════════════
// POWER-UP STATE
// ═══════════════════════════════════════════════

let activePU    = null;
let puTimer     = 0;

function deactivatePU() {
  if (activePU === 'slowmo') speedMult = 1;
  if (activePU === 'hyper')  { speedMult = 1; doubleScore = false; }
  activePU = null; puTimer = 0;
}

function activatePU(type) {
  if (activePU) deactivatePU();
  if (type === 'shield') {
    P.shielded = true; P.shieldLife = 300;
    flashBanner('SHIELD ACTIVE', PU_COLORS.shield);
    return;
  }
  activePU = type;
  puTimer  = PU_DURATIONS[type];
  if (type === 'slowmo') speedMult = 0.42;
  if (type === 'hyper')  { speedMult = 2.0; doubleScore = true; }
  flashBanner(PU_LABELS[type], PU_COLORS[type]);
}

// ═══════════════════════════════════════════════
// GAME ENTITIES LISTS
// ═══════════════════════════════════════════════

let obstacles   = [];
let collectibles = [];
let powerItems  = [];

// ═══════════════════════════════════════════════
// SPECIAL EVENTS
// ═══════════════════════════════════════════════

let activeEvent     = null;
let eventTimer      = 0;
let nextEventSec    = rnd(25, 45);
let blackoutAlpha   = 0;

const EVENT_DUR = { crystalStorm: 540, blackout: 420, hyperTunnel: 300 };

function triggerEvent() {
  const evts = ['crystalStorm', 'blackout', 'hyperTunnel'];
  activeEvent = evts[rndI(0, evts.length - 1)];
  eventTimer  = 0;
  const labels = { crystalStorm:'CRYSTAL STORM!', blackout:'BLACKOUT!', hyperTunnel:'HYPER TUNNEL!' };
  const cols   = { crystalStorm: C.crystal, blackout:'#aaaaaa', hyperTunnel: C.orange };
  flashBanner(labels[activeEvent], cols[activeEvent]);
}

function updateEvent(dt) {
  if (!activeEvent) return;
  eventTimer += dt;
  const dur = EVENT_DUR[activeEvent];

  if (activeEvent === 'blackout') {
    if      (eventTimer < 50)        blackoutAlpha = eventTimer / 50;
    else if (eventTimer > dur - 50)  blackoutAlpha = (dur - eventTimer) / 50;
    else                             blackoutAlpha = 1;
    blackoutAlpha = clamp(blackoutAlpha, 0, 1);
  }

  if (activeEvent === 'hyperTunnel') {
    const ht = activePU === 'slowmo' ? 0.5 : 2.4;
    speedMult = activePU === 'hyper' ? 2.0 : ht;
  }

  if (eventTimer >= dur) {
    if (activeEvent === 'blackout')    blackoutAlpha = 0;
    if (activeEvent === 'hyperTunnel' && activePU !== 'hyper') speedMult = activePU === 'slowmo' ? 0.42 : 1;
    activeEvent = null;
    eventTimer  = 0;
  }
}

// ═══════════════════════════════════════════════
// FLOATING TEXTS
// ═══════════════════════════════════════════════

const floats = [];
function floatText(txt, x, y, color) {
  floats.push({ txt, x, y, color, life: 55, max: 55 });
}
function updateFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].y -= 1.2 * dt; floats[i].life -= dt;
    if (floats[i].life <= 0) floats.splice(i, 1);
  }
}
function drawFloats() {
  for (const f of floats) {
    const a = f.life / f.max;
    ctx.save(); ctx.globalAlpha = a;
    glow(f.color, 8); ctx.fillStyle = f.color;
    ctx.font = 'bold 15px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(f.txt, f.x, f.y); ctx.restore();
  }
}

// ═══════════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════════

let banner = null, bannerLife = 0;
function flashBanner(txt, color) { banner = { txt, color }; bannerLife = 110; }

function drawBanner() {
  if (!banner || bannerLife <= 0) return;
  bannerLife--;
  const a = Math.min(1, bannerLife / 20) * Math.min(1, (110 - bannerLife + 1) / 20);
  ctx.save(); ctx.globalAlpha = Math.max(0, a);
  glow(banner.color, 18); ctx.fillStyle = banner.color;
  ctx.font = 'bold 26px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText(banner.txt, VW/2, VH/2 - 30);
  ctx.restore(); noGlow();
  if (bannerLife <= 0) banner = null;
}

// ═══════════════════════════════════════════════
// COLLISION
// ═══════════════════════════════════════════════

function rects(r1, r2) {
  return r1.x < r2.x+r2.w && r1.x+r1.w > r2.x && r1.y < r2.y+r2.h && r1.y+r1.h > r2.y;
}

function checkCollisions() {
  if (P.invincible) return;
  const ph = playerHitbox();

  for (const obs of obstacles) {
    for (const b of obs.bounds()) {
      if (rects(ph, b)) { onHit(); return; }
    }
  }

  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    if (rects(ph, c.hitbox())) {
      if (c instanceof Crystal) {
        crystalCnt++;
        const pts = doubleScore ? 20 : 10;
        score += pts;
        floatText(`+${pts}`, c.x, c.y, C.crystal);
        burst(c.x, c.y, C.crystal, 7, 3.5, 3.5);
      } else {
        const pts = doubleScore ? 50 : 25;
        score += pts;
        floatText(`+${pts}`, c.x, c.y, C.ring);
        burst(c.x, c.y, C.ring, 12, 4.5, 4);
      }
      collectibles.splice(i, 1);
    }
  }

  for (let i = powerItems.length - 1; i >= 0; i--) {
    const p = powerItems[i];
    if (rects(ph, p.hitbox())) {
      activatePU(p.type);
      burst(p.x, p.y, PU_COLORS[p.type], 14, 5, 4);
      powerItems.splice(i, 1);
    }
  }
}

function onHit() {
  if (P.shielded) {
    P.shielded = false; P.invincible = true; P.invincibleFrames = 80;
    burst(P.x, P.y, C.green, 18, 6, 5);
    flashBanner('SHIELD BROKEN', C.green);
    return;
  }
  burst(P.x, P.y, '#ff3300', 28, 8, 6);
  burst(P.x, P.y, '#ffcc00', 18, 5, 4);
  if (score > best) { best = score; localStorage.setItem('rt_best', best); }
  state = ST.OVER;
}

// ═══════════════════════════════════════════════
// SPAWNING
// ═══════════════════════════════════════════════

let spawnT    = 0, obsRate    = 88;
let crystalT  = 0, crystalRate = 32;
let ringT     = 0, ringRate    = 260;
let puSpawnT  = 0, puRate      = 680;
let unlockedTypes = 1;

function updateSpawning(dt) {
  spawnT   += dt; crystalT += dt; ringT += dt; puSpawnT += dt;

  if (spawnT >= obsRate) {
    spawnT = 0;
    const t = rndI(1, unlockedTypes);
    if      (t === 1) obstacles.push(new EnergyWall());
    else if (t === 2) obstacles.push(new MovingBlock());
    else if (t === 3) obstacles.push(new RotatingBarrier());
    else              obstacles.push(new LaserGate());
  }

  if (crystalT >= crystalRate) {
    crystalT = 0;
    collectibles.push(new Crystal(rnd(TL + 18, TR - 18), -18));
    if (activeEvent === 'crystalStorm') {
      for (let i = 0; i < 3; i++)
        collectibles.push(new Crystal(rnd(TL + 18, TR - 18), -18 - i * 28));
    }
  }

  if (ringT >= ringRate) {
    ringT = 0;
    collectibles.push(new BonusRing(rnd(TL + 40, TR - 40), -25));
  }

  if (puSpawnT >= puRate) {
    puSpawnT = 0;
    const type = PU_TYPES[rndI(0, PU_TYPES.length - 1)];
    powerItems.push(new PowerUpItem(rnd(TL + 30, TR - 30), -25, type));
  }
}

// ═══════════════════════════════════════════════
// PROGRESSION
// ═══════════════════════════════════════════════

function updateProgression(dt) {
  gameTimeSec += dt / 60;
  distM += gameSpeed * dt * 0.12;

  scoreTick += dt;
  if (scoreTick >= 60) { scoreTick = 0; score += doubleScore ? 2 : 1; }

  const tier = Math.floor(gameTimeSec / 15);
  if (tier > lastTier) {
    lastTier = tier;
    baseSpeed = Math.min(9, 3 + tier * 0.5);
    obsRate   = Math.max(38, 88 - tier * 9);
    if (gameTimeSec >= 15  && unlockedTypes < 2) { unlockedTypes = 2; flashBanner('MOVING BLOCKS!', C.purple); }
    if (gameTimeSec >= 30  && unlockedTypes < 3) { unlockedTypes = 3; flashBanner('ROTATING BARRIERS!', C.pink); }
    if (gameTimeSec >= 45  && unlockedTypes < 4) { unlockedTypes = 4; flashBanner('LASER GATES!', C.green); }
    if (tier > 0 && unlockedTypes === 4) flashBanner('SPEED UP!', C.orange);
  }

  if (!activeEvent && gameTimeSec >= nextEventSec) {
    triggerEvent();
    nextEventSec = gameTimeSec + rnd(22, 42);
  }
  updateEvent(dt);

  if (activePU) {
    puTimer -= dt;
    if (puTimer <= 0) deactivatePU();
  }

  gameSpeed = baseSpeed * speedMult;
}

// ═══════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,18,0.72)';
  ctx.fillRect(0, 0, VW, 52);

  ctx.save();
  glow(C.blue, 8); ctx.fillStyle = '#aaccff';
  ctx.font = '10px "Courier New"'; ctx.textAlign = 'left'; ctx.fillText('SCORE', 10, 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Courier New"'; ctx.fillText(score, 10, 38);

  glow(C.yellow, 6); ctx.fillStyle = C.yellow;
  ctx.font = '10px "Courier New"'; ctx.textAlign = 'center'; ctx.fillText('BEST', VW/2, 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Courier New"'; ctx.fillText(best, VW/2, 36);

  glow(C.crystal, 6); ctx.fillStyle = C.crystal;
  ctx.font = '10px "Courier New"'; ctx.textAlign = 'right'; ctx.fillText('CRYSTALS', VW-10, 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Courier New"'; ctx.fillText(crystalCnt, VW-10, 36);
  ctx.restore(); noGlow();

  const bx = VW/2 - 50, by = VH - 28, bw = 100, bh = 6;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx-1, by-1, bw+2, bh+2);
  const bc = P.boostFuel > 50 ? C.green : P.boostFuel > 25 ? C.orange : C.red;
  glow(bc, 7); ctx.fillStyle = bc; ctx.fillRect(bx, by, (P.boostFuel/100)*bw, bh);
  ctx.save(); ctx.globalAlpha = 0.55; noGlow();
  ctx.fillStyle = '#ccc'; ctx.font = '8px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('BOOST', VW/2, by - 5); ctx.restore();

  ctx.save(); ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#8888cc'; ctx.font = '9px "Courier New"'; ctx.textAlign = 'left';
  ctx.fillText(Math.floor(distM) + ' m', TL + 4, VH - 10); ctx.restore();

  if (activePU) {
    const col = PU_COLORS[activePU];
    const lbl = PU_LABELS[activePU];
    const dur = PU_DURATIONS[activePU];
    const pct = puTimer / dur;
    const px = VW/2 - 65, py = VH - 52;
    glow(col, 12); ctx.fillStyle = col;
    ctx.font = 'bold 11px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('◆ ' + lbl + ' ◆', VW/2, py);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(px, py+4, 130, 5);
    glow(col, 6); ctx.fillStyle = col; ctx.fillRect(px, py+4, pct*130, 5);
    noGlow();
  }

  ctx.save(); ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#6688bb'; ctx.font = '9px "Courier New"'; ctx.textAlign = 'right';
  const s = Math.floor(gameTimeSec), m = Math.floor(s/60), ss = s%60;
  ctx.fillText(`${m}:${ss.toString().padStart(2,'0')}`, TR - 4, VH - 10);
  ctx.restore();
}

// ═══════════════════════════════════════════════
// BLACKOUT EFFECT
// ═══════════════════════════════════════════════

function drawBlackout() {
  if (blackoutAlpha <= 0) return;
  ctx.save();
  const grad = ctx.createRadialGradient(P.x, P.y, 15, P.x, P.y, 110);
  grad.addColorStop(0,   `rgba(0,0,0,0)`);
  grad.addColorStop(0.5, `rgba(0,0,8,${0.4*blackoutAlpha})`);
  grad.addColorStop(1,   `rgba(0,0,0,${blackoutAlpha*0.97})`);
  ctx.fillStyle = grad; ctx.fillRect(TL, 0, TW, VH);
  ctx.globalAlpha = blackoutAlpha;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, TL, VH); ctx.fillRect(TR, 0, VW-TR, VH);
  ctx.restore();
}

// ═══════════════════════════════════════════════
// MENU SCREEN
// ═══════════════════════════════════════════════

let menuT = 0;

function drawMenu() {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, VW, VH);
  drawStars();
  menuT += 0.018;

  for (let i = 0; i < 10; i++) {
    const t = ((i/10) + menuT * 0.22) % 1;
    const w = 60 + t * 360;
    const h = 20 + t * 60;
    ctx.save(); ctx.globalAlpha = (1-t) * 0.18;
    glow(C.blue, 6);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 1;
    ctx.strokeRect(VW/2 - w/2, VH*0.55 - h/2 + (t-0.5)*300, w, h);
    ctx.restore();
  }

  ctx.save();
  const g1 = ctx.createLinearGradient(0, VH/2-120, 0, VH/2-40);
  g1.addColorStop(0, '#00ffff'); g1.addColorStop(1, '#0044ff');
  glow(C.blue, 20 + Math.sin(menuT*2)*6);
  ctx.fillStyle = g1; ctx.font = 'bold 54px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('ROCKET', VW/2, VH/2-70);
  const g2 = ctx.createLinearGradient(0, VH/2-30, 0, VH/2+30);
  g2.addColorStop(0, '#cc00ff'); g2.addColorStop(1, '#6600ff');
  glow(C.purple, 20);
  ctx.fillStyle = g2; ctx.fillText('TUNNEL', VW/2, VH/2-5);
  ctx.restore(); noGlow();

  ctx.save();
  const ry = VH/2 + 90 + Math.sin(menuT*2.5)*8;
  ctx.translate(VW/2, ry);
  drawRocketShape(0, 0, 1.1, C.blue);
  ctx.restore();

  if (best > 0) {
    glow(C.yellow, 8); ctx.fillStyle = C.yellow;
    ctx.font = '13px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('BEST: ' + best, VW/2, VH/2 + 48);
    noGlow();
  }

  const ba = 0.45 + (Math.sin(menuT*4)+1)*0.275;
  ctx.save(); ctx.globalAlpha = ba;
  glow('#fff', 5); ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('PRESS ENTER / TAP TO PLAY', VW/2, VH - 110);
  ctx.restore(); noGlow();

  ctx.save(); ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#8899bb'; ctx.font = '11px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('← → MOVE    SPACE BOOST', VW/2, VH - 82);
  ctx.fillText('P = PAUSE', VW/2, VH - 62);
  ctx.restore();
}

// ═══════════════════════════════════════════════
// GAME OVER SCREEN
// ═══════════════════════════════════════════════

let goT = 0;

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,10,0.86)'; ctx.fillRect(0, 0, VW, VH);
  goT += 0.025;

  glow(C.red, 22); ctx.fillStyle = C.red;
  ctx.font = 'bold 42px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', VW/2, VH/2 - 130);
  noGlow();

  const cx = VW/2, cy = VH/2 - 60, cw = 290, ch = 170;
  ctx.fillStyle = 'rgba(0,15,40,0.88)';
  roundRect(cx - cw/2, cy, cw, ch, 12); ctx.fill();
  glow(C.blue, 8); ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
  roundRect(cx - cw/2, cy, cw, ch, 12); ctx.stroke(); noGlow();

  const rows = [
    ['SCORE',    score,                  '#ffffff'],
    ['BEST',     best,                   C.yellow],
    ['CRYSTALS', crystalCnt,             C.crystal],
    ['DISTANCE', Math.floor(distM)+'m',  C.green],
  ];
  rows.forEach(([lbl, val, col], i) => {
    const ry = cy + 30 + i * 36;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = '11px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(lbl, cx - cw/2 + 18, ry);
    ctx.fillStyle = col; ctx.font = 'bold 16px "Courier New"'; ctx.textAlign = 'right';
    ctx.fillText(val, cx + cw/2 - 18, ry);
  });

  if (score > 0 && score === best) {
    ctx.save(); glow(C.yellow, 16);
    ctx.fillStyle = C.yellow; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('★  NEW BEST!  ★', cx, cy + ch + 25);
    ctx.restore(); noGlow();
  }

  const ba = 0.5 + (Math.sin(goT*3)+1)*0.25;
  ctx.save(); ctx.globalAlpha = ba;
  glow('#fff', 5); ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('ENTER / TAP  →  PLAY AGAIN', cx, VH - 80);
  ctx.fillText('ESC  →  MENU', cx, VH - 55);
  ctx.restore(); noGlow();
}

// ═══════════════════════════════════════════════
// PAUSE SCREEN
// ═══════════════════════════════════════════════

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,12,0.72)'; ctx.fillRect(0, 0, VW, VH);
  glow(C.purple, 22); ctx.fillStyle = C.purple;
  ctx.font = 'bold 44px "Courier New"'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VW/2, VH/2);
  noGlow();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '13px "Courier New"';
  ctx.fillText('P  →  RESUME', VW/2, VH/2 + 50);
  ctx.fillText('ESC  →  MENU', VW/2, VH/2 + 74);
}

// ═══════════════════════════════════════════════
// START / RESET
// ═══════════════════════════════════════════════

function startGame() {
  score = 0; crystalCnt = 0; distM = 0;
  frame = 0; gameTimeSec = 0; lastTier = 0; scoreTick = 0;
  gameSpeed = 3; baseSpeed = 3; speedMult = 1; doubleScore = false;

  resetPlayer();
  obstacles.length = 0; collectibles.length = 0; powerItems.length = 0; particles.length = 0; floats.length = 0;
  activePU = null; puTimer = 0;
  activeEvent = null; eventTimer = 0; blackoutAlpha = 0;
  nextEventSec = rnd(25, 45); banner = null; bannerLife = 0;
  spawnT = 0; crystalT = 0; ringT = 0; puSpawnT = 0;
  obsRate = 88; crystalRate = 32; ringRate = 260; puRate = 680;
  unlockedTypes = 1; gridScroll = 0; goT = 0;

  state = ST.PLAY;
}

// ═══════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════

let lastTS = 0;

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts - lastTS) / (1000 / 60), 3.5);
  lastTS = ts;
  frame++;

  if (state === ST.MENU) {
    if (just('Enter') || just('Space')) startGame();
  } else if (state === ST.PLAY) {
    if (just('KeyP') || just('Escape')) state = ST.PAUSE;
    else {
      updatePlayer(dt);
      updateSpawning(dt);
      updateProgression(dt);
      checkCollisions();
      updateFloats(dt);
      updateStars(dt);

      for (let i = obstacles.length  - 1; i >= 0; i--) { obstacles[i].update(dt);   if (obstacles[i].dead)   obstacles.splice(i,1); }
      for (let i = collectibles.length-1; i >= 0; i--) { collectibles[i].update(dt);if (collectibles[i].dead)collectibles.splice(i,1); }
      for (let i = powerItems.length  - 1; i >= 0; i--) { powerItems[i].update(dt); if (powerItems[i].dead)  powerItems.splice(i,1); }
      for (let i = particles.length   - 1; i >= 0; i--) { particles[i].update(dt);  if (particles[i].dead()) particles.splice(i,1); }
    }
  } else if (state === ST.PAUSE) {
    if (just('KeyP')) state = ST.PLAY;
    if (just('Escape')) state = ST.MENU;
  } else if (state === ST.OVER) {
    if (just('Enter') || just('Space')) startGame();
    if (just('Escape')) state = ST.MENU;
  }

  ctx.clearRect(0, 0, VW, VH);

  if (state === ST.MENU) {
    drawMenu();
  } else {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, VW, VH);
    drawStars();
    drawTunnel();

    for (const o of obstacles)    o.draw();
    for (const c of collectibles) c.draw();
    for (const p of powerItems)   p.draw();
    for (const p of particles)    p.draw();
    drawPlayer();
    drawFloats();
    drawBlackout();
    drawBanner();
    drawHUD();

    if (state === ST.PAUSE) drawPause();
    if (state === ST.OVER)  drawGameOver();
  }

  keysJustDown.clear();
}

requestAnimationFrame(t => { lastTS = t; requestAnimationFrame(loop); });
