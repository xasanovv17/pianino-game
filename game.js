(() => {
'use strict';

/* ============================================================
   NEON TILES — Magic Tiles uslubidagi piano o'yini
   ============================================================ */

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d');

const LANES = 4;
const HUES = [190, 272, 328, 46];       // har qator uchun rang
const START_Y = 0.78;                    // birinchi plitka joyi (ekran balandligiga nisbatan)

/* ---------------- Musiqalar ---------------- */
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  return 12 * (parseInt(m[3], 10) + 1) + NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
function parse(str) {
  return str.trim().split(/\s+/).map((t) => {
    const [n, d] = t.split(':');
    return [midi(n), parseFloat(d)];
  });
}

const SONGS = [
  {
    id: 'ode', name: 'Quvonch madhiyasi', sub: 'Beethoven · oson', bpm: 112, hue: 255,
    notes: parse(`E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2
      E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2
      D4:1 D4:1 E4:1 C4:1 D4:1 E4:.5 F4:.5 E4:1 C4:1 D4:1 E4:.5 F4:.5 E4:1 D4:1 C4:1 D4:1 G3:2
      E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2`),
  },
  {
    id: 'twinkle', name: 'Yulduzcha', sub: 'Twinkle Twinkle · oson', bpm: 104, hue: 205,
    notes: parse(`C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2
      G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2
      C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2`),
  },
  {
    id: 'jingle', name: 'Jingle Bells', sub: 'Yangi yil · o\'rta', bpm: 134, hue: 150,
    notes: parse(`E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4
      F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2
      E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4
      F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 G4:1 G4:1 F4:1 D4:1 C4:4`),
  },
  {
    id: 'elise', name: 'Fur Elise', sub: 'Beethoven · qiyin', bpm: 126, hue: 325,
    notes: parse(`E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5
      E4:.5 G#4:.5 B4:.5 C5:1.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5
      C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 C5:.5 B4:.5 A4:2
      B4:.5 C5:.5 D5:.5 E5:1.5 G4:.5 F5:.5 E5:.5 D5:1.5 F4:.5 E5:.5 D5:.5 C5:1.5
      E4:.5 D5:.5 C5:.5 B4:1.5 E4:.5 E5:.5 E4:.5 E5:.5 E5:.5 E6:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 D#5:.5
      E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:2`),
  },
  {
    id: 'endless', name: 'Cheksiz rejim', sub: 'Tasodifiy melodiya · tezlashadi', emoji: '♾️', bpm: 118, hue: 275, endless: true,
    notes: [],
  },
];

const DIFFS = [
  { id: 'easy', name: 'Sekin', mul: 0.85 },
  { id: 'mid',  name: 'O\'rta', mul: 1.1 },
  { id: 'hard', name: 'Tez',   mul: 1.45 },
];

const PENT = [55, 57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81]; // pentatonik to'plam

/* ---------------- Saqlash (localStorage) ---------------- */
const STORE_KEY = 'neonTiles.v1';
function loadDB() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { profiles: {}, current: null }; }
  catch (e) { return { profiles: {}, current: null }; }
}
function saveDB() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } }
let db = loadDB();
if (!db.profiles) db.profiles = {};

function curProfile() { return (db.current && db.profiles[db.current]) || null; }
function profKey(name, surname) { return (name + ' ' + surname).toLowerCase().replace(/\s+/g, ' ').trim(); }
function recKey() { return SEL.song + ':' + SEL.diff; }

/* ---------------- Tanlovlar ---------------- */
const SEL = { song: 'ode', diff: 'mid' };
let guestChosen = false;     // "Yo'q" bosilgan (sessiya davomida qayta so'ramaydi)
let afterProfile = 'play';   // profil yaratilgach: 'play' yoki 'menu'

/* ---------------- Audio ---------------- */
let actx = null, master = null;
function initAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.75;
    const comp = actx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(actx.destination);
  }
  if (actx.state === 'suspended') actx.resume();
}
function playNote(m, len) {
  if (!actx) return;
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const t = actx.currentTime;
  const dur = Math.min(2.2, 0.9 + (len || 1) * 0.45);
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.55, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.2, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(master);
  [['triangle', 1, 1], ['sine', 2, 0.35], ['sine', 3, 0.14], ['sine', 4, 0.06]].forEach(([type, mult, vol]) => {
    const o = actx.createOscillator();
    const og = actx.createGain();
    o.type = type; o.frequency.value = f * mult; og.gain.value = vol;
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + dur + 0.05);
  });
}
function playMiss() {
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + 0.5);
}
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

/* ---------------- Canvas o'lchami ---------------- */
let W = 0, H = 0, dpr = 1, U = 0;
function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height; U = H / 4;      // 1 zarb = ekran balandligining 1/4
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

/* ---------------- O'yin holati ---------------- */
const S = {
  state: 'menu',          // menu | play | pause | over
  song: SONGS[0], base: 1, bps: 2,
  tiles: [], nxt: 0, lastEnd: 0, songIdx: 0, ended: false, drawFrom: 0,
  offsetB: 3.1, speedB: 0, mul: 1, maxMul: 1,
  started: false, hits: 0, t0: 0, tLast: 0, stamps: [], tps: 0, maxTps: 0,
  lastLane: -1, last2Lane: -1, pentIdx: 6,
  failKind: '', failLane: -1, win: false, hudT: 0,
};
let laneFlash = [0, 0, 0, 0];
let parts = [], rings = [], deco = [], decoT = 0;
let shake = 0, bgHue = 255, bgTarget = 255, redFlash = 0;

function songById(id) { return SONGS.find((s) => s.id === id); }

function pickLane() {
  let l = Math.floor(Math.random() * LANES);
  if (S.lastLane >= 0 && Math.random() < 0.7) {
    while (l === S.lastLane) l = Math.floor(Math.random() * LANES);
  }
  if (l === S.lastLane && l === S.last2Lane) l = (l + 1 + Math.floor(Math.random() * 3)) % LANES;
  S.last2Lane = S.lastLane; S.lastLane = l;
  return l;
}

function makeTile() {
  let m, len;
  if (S.song.endless) {
    const steps = [-2, -1, -1, 1, 1, 2];
    S.pentIdx = Math.max(0, Math.min(PENT.length - 1, S.pentIdx + steps[Math.floor(Math.random() * steps.length)]));
    m = PENT[S.pentIdx];
    const lens = [0.5, 0.5, 1, 1, 1, 1, 1.5, 2];
    len = lens[Math.floor(Math.random() * lens.length)];
  } else {
    if (S.songIdx >= S.song.notes.length) return false;
    const n = S.song.notes[S.songIdx++];
    m = n[0]; len = n[1];
  }
  S.tiles.push({ lane: pickLane(), midi: m, len, P: S.lastEnd, hit: false, hitAt: 0, bad: false, idx: S.tiles.length });
  S.lastEnd += len;
  return true;
}
function fillTiles() {
  while (!S.ended && S.lastEnd <= S.offsetB + 1.2) {
    if (!makeTile()) S.ended = true;
  }
}

function startGame() {
  const song = songById(SEL.song);
  const diff = DIFFS.find((d) => d.id === SEL.diff);
  Object.assign(S, {
    state: 'play', song, base: diff.mul, bps: song.bpm / 60,
    tiles: [], nxt: 0, lastEnd: 0, songIdx: 0, ended: false, drawFrom: 0,
    offsetB: START_Y * 4, speedB: 0, mul: diff.mul, maxMul: diff.mul,
    started: false, hits: 0, t0: 0, tLast: 0, stamps: [], tps: 0, maxTps: 0,
    lastLane: -1, last2Lane: -1, pentIdx: 6, failKind: '', failLane: -1, win: false, hudT: 0,
  });
  parts = []; rings = []; shake = 0; redFlash = 0; laneFlash = [0, 0, 0, 0];
  bgTarget = song.hue; bgHue = song.hue;
  fillTiles();
  showOnly(null);
  $('#hud').classList.remove('hidden');
  updateHud(true);
}

/* ---------------- Urish (tap) ---------------- */
function tap(lane) {
  if (S.state !== 'play') return;
  const now = performance.now() / 1000;
  laneFlash[lane] = 1;
  const t = S.tiles[S.nxt];
  if (!t) return;
  const yB = (S.offsetB - t.P) * U;
  if (yB <= 0) return;                         // plitka hali ekranga kirmagan
  if (t.lane !== lane) { fail('wrong', lane, null); return; }

  t.hit = true; t.hitAt = now;
  S.nxt++; S.hits++;
  if (!S.started) { S.started = true; S.t0 = now; }
  S.tLast = now;
  S.stamps.push(now);
  playNote(t.midi, t.len);
  buzz(8);
  const cx = (lane + 0.5) * (W / LANES);
  const cy = Math.max(30, Math.min(H * 0.86, yB - t.len * U * 0.5));
  burst(cx, cy, HUES[lane]);
  bgTarget = (S.song.hue + S.hits * 3) % 360;

  if (S.ended && S.nxt >= S.tiles.length) {
    S.state = 'over'; S.win = true;
    setTimeout(() => showOver(true), 650);
  }
}

function fail(kind, lane, tile) {
  if (S.state !== 'play') return;
  S.state = 'over'; S.failKind = kind; S.failLane = lane; S.win = false;
  if (tile) tile.bad = true;
  playMiss(); buzz(140);
  shake = 0.45; redFlash = 1;
  setTimeout(() => showOver(false), 800);
}

/* ---------------- Effektlar ---------------- */
function burst(x, y, hue) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, s = 70 + Math.random() * 240;
    const life = 0.45 + Math.random() * 0.4;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 70, life, max: life, hue });
  }
  rings.push({ x, y, r: 8, life: 0.42, max: 0.42, hue });
}
function updateFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 380 * dt;
    if (p.life <= 0) parts.splice(i, 1);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.life -= dt; r.r += 260 * dt;
    if (r.life <= 0) rings.splice(i, 1);
  }
  for (let i = 0; i < LANES; i++) laneFlash[i] = Math.max(0, laneFlash[i] - dt * 4);
  shake = Math.max(0, shake - dt);
  redFlash = Math.max(0, redFlash - dt * 1.6);
  bgHue += (((bgTarget - bgHue + 540) % 360) - 180) * Math.min(1, dt * 1.5);
}

/* ---------------- Yangilash ---------------- */
function update(dt) {
  updateFx(dt);
  if (S.state === 'menu') {
    decoT -= dt;
    if (decoT <= 0) {
      decoT = 0.35 + Math.random() * 0.35;
      const lane = Math.floor(Math.random() * LANES);
      deco.push({ lane, y: -H * 0.3, len: 0.6 + Math.random() * 1.4 });
    }
    for (let i = deco.length - 1; i >= 0; i--) {
      deco[i].y += H * 0.22 * dt;
      if (deco[i].y - deco[i].len * U > H) deco.splice(i, 1);
    }
    return;
  }
  if (S.state !== 'play') return;

  const now = performance.now() / 1000;
  if (S.started) {
    const ramp = S.song.endless ? Math.min(1, S.hits / 250) : Math.min(0.35, S.hits / 160);
    S.mul = S.base * (1 + ramp);
    S.maxMul = Math.max(S.maxMul, S.mul);
    S.speedB = S.bps * S.mul;
    S.offsetB += S.speedB * dt;
  }
  fillTiles();

  const t = S.tiles[S.nxt];
  if (t && (S.offsetB - t.P) * U >= H) fail('miss', t.lane, t);

  while (S.stamps.length && now - S.stamps[0] > 1) S.stamps.shift();
  S.tps = S.stamps.length;
  if (S.tps > S.maxTps) S.maxTps = S.tps;

  S.hudT -= dt;
  if (S.hudT <= 0) { S.hudT = 0.1; updateHud(); }
}

function avgTps() {
  if (!S.started) return 0;
  const end = S.state === 'play' ? performance.now() / 1000 : S.tLast;
  const el = end - S.t0;
  if (el < 1) return S.hits > 0 && S.state !== 'play' ? S.hits : 0;
  return S.hits / el;
}

function updateHud(force) {
  $('#score').textContent = S.hits;
  $('#tpsNow').textContent = S.tps;
  $('#tpsMax').textContent = S.maxTps;
  $('#tpsAvg').textContent = avgTps().toFixed(1);
  $('#speedMul').textContent = '×' + S.mul.toFixed(2);
  if (S.song.endless) {
    $('#progressText').textContent = 'Cheksiz';
    $('#progressBar').style.width = Math.min(100, (S.hits % 50) * 2) + '%';
  } else {
    const total = S.song.notes.length;
    $('#progressText').textContent = S.hits + ' / ' + total;
    $('#progressBar').style.width = (S.hits / total * 100) + '%';
  }
}

/* ---------------- Chizish ---------------- */
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(time) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * 14 * shake, (Math.random() - 0.5) * 14 * shake);

  const laneW = W / LANES;
  const hue = ((bgHue % 360) + 360) % 360;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${hue},60%,7%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360},70%,17%)`);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // pastdan yoruqlik
  const rg = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * 0.75);
  rg.addColorStop(0, `hsla(${hue},90%,55%,.22)`);
  rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  // qator bosilganda yoritish
  for (let i = 0; i < LANES; i++) {
    if (laneFlash[i] > 0.01) {
      const lg = ctx.createLinearGradient(0, H * 0.4, 0, H);
      lg.addColorStop(0, 'transparent');
      lg.addColorStop(1, `hsla(${HUES[i]},100%,60%,${laneFlash[i] * 0.35})`);
      ctx.fillStyle = lg;
      ctx.fillRect(i * laneW, H * 0.4, laneW, H * 0.6);
    }
  }

  // qator chiziqlari
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < LANES; i++) {
    ctx.beginPath(); ctx.moveTo(i * laneW, 0); ctx.lineTo(i * laneW, H); ctx.stroke();
  }

  if (S.state === 'menu') drawDeco(laneW);
  else drawTiles(laneW, time);

  // tugma yozuvlari 1 2 3 4
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 18px system-ui,sans-serif';
  for (let i = 0; i < LANES; i++) {
    ctx.fillStyle = `hsla(${HUES[i]},100%,75%,${0.28 + laneFlash[i] * 0.7})`;
    ctx.fillText(String(i + 1), (i + 0.5) * laneW, H - 16);
  }

  // zarralar
  ctx.globalCompositeOperation = 'lighter';
  parts.forEach((p) => {
    ctx.fillStyle = `hsla(${p.hue},100%,65%,${Math.max(0, p.life / p.max)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.283); ctx.fill();
  });
  rings.forEach((r) => {
    ctx.strokeStyle = `hsla(${r.hue},100%,70%,${Math.max(0, r.life / r.max)})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
  });
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();

  if (redFlash > 0.01) {
    ctx.fillStyle = `rgba(255,30,70,${redFlash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawDeco(laneW) {
  deco.forEach((d) => {
    const x = d.lane * laneW + 4, w = laneW - 8, h = d.len * U - 6;
    const grd = ctx.createLinearGradient(0, d.y - h, 0, d.y);
    grd.addColorStop(0, `hsla(${HUES[d.lane]},100%,65%,.22)`);
    grd.addColorStop(1, `hsla(${HUES[d.lane]},100%,50%,.1)`);
    ctx.fillStyle = grd;
    rr(x, d.y - h, w, h, 10); ctx.fill();
  });
}

function drawTiles(laneW, time) {
  const pad = 3;
  for (let i = S.drawFrom; i < S.tiles.length; i++) {
    const t = S.tiles[i];
    const yB = (S.offsetB - t.P) * U;       // pastki (oldingi) chet
    const hh = t.len * U;
    const yT = yB - hh;
    if (yT > H + 30) { if (i === S.drawFrom) S.drawFrom++; continue; }
    if (yB < -10) break;

    const x = t.lane * laneW + pad;
    const w = laneW - pad * 2;
    const y = yT + 2;
    const h = Math.max(8, hh - 4);
    const hu = HUES[t.lane];

    if (t.hit) {
      const age = time - t.hitAt;
      const a = Math.max(0.12, 0.55 - age * 0.9);
      ctx.fillStyle = `hsla(${hu},90%,60%,${a})`;
      rr(x, y, w, h, 12); ctx.fill();
      continue;
    }

    if (t.bad) {
      ctx.fillStyle = '#ff2f57';
      ctx.shadowColor = '#ff2f57'; ctx.shadowBlur = 24;
      rr(x, y, w, h, 12); ctx.fill();
      ctx.shadowBlur = 0;
      continue;
    }

    const grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, `hsl(${hu},100%,72%)`);
    grd.addColorStop(1, `hsl(${hu},100%,50%)`);
    ctx.shadowColor = `hsla(${hu},100%,60%,.9)`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = grd;
    rr(x, y, w, h, 12); ctx.fill();
    ctx.shadowBlur = 0;

    // yorqin chiziq (oldingi chet)
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    rr(x + 6, y + h - 8, w - 12, 3, 2); ctx.fill();

    // keyingi bosiladigan plitka — oq hoshiya
    if (i === S.nxt && S.state === 'play') {
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 2.5;
      rr(x, y, w, h, 12); ctx.stroke();
    }

    if (t.idx === 0 && !S.started) {
      ctx.fillStyle = '#fff';
      ctx.font = '800 17px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BOSHLASH', x + w / 2, y + h / 2);
    }
  }

  // noto'g'ri qator — qizil
  if (S.state === 'over' && S.failKind === 'wrong' && S.failLane >= 0) {
    ctx.fillStyle = `rgba(255,47,87,${0.25 + redFlash * 0.3})`;
    ctx.fillRect(S.failLane * laneW, 0, laneW, H);
  }
}

/* ---------------- Asosiy sikl ---------------- */
let lastTs = performance.now();
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
  lastTs = ts;
  update(dt);
  draw(performance.now() / 1000);
}

/* ---------------- Ekranlar ---------------- */
const SCREENS = ['menu', 'ask', 'form', 'pause', 'over'];
function showOnly(id) {
  SCREENS.forEach((s) => $('#' + s).classList.toggle('hidden', s !== id));
}
function toMenu() {
  S.state = 'menu';
  $('#hud').classList.add('hidden');
  bgTarget = 255;
  renderMenu();
  showOnly('menu');
}

/* ---------------- Menyu ---------------- */
function renderMenu() {
  const p = curProfile();
  $('#userName').textContent = p ? p.name + ' ' + p.surname : 'Mehmon';
  $('#btnProfile').textContent = p ? 'Chiqish' : 'Profil ochish';

  const list = $('#songList');
  list.innerHTML = '';
  SONGS.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'song' + (s.id === SEL.song ? ' active' : '');
    const em = document.createElement('span'); em.className = 'em'; em.textContent = s.emoji;
    const box = document.createElement('span');
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = s.name;
    const sb = document.createElement('div'); sb.className = 'sb'; sb.textContent = s.sub;
    box.appendChild(nm); box.appendChild(sb);
    b.appendChild(em); b.appendChild(box);
    const rec = p && p.best && p.best[s.id + ':' + SEL.diff];
    if (rec) {
      const bs = document.createElement('span'); bs.className = 'bs'; bs.textContent = '🏆 ' + rec.score;
      b.appendChild(bs);
    }
    b.addEventListener('click', () => { SEL.song = s.id; renderMenu(); });
    list.appendChild(b);
  });

  const dl = $('#diffList');
  dl.innerHTML = '';
  DIFFS.forEach((d) => {
    const b = document.createElement('button');
    b.textContent = d.name;
    if (d.id === SEL.diff) b.className = 'active';
    b.addEventListener('click', () => { SEL.diff = d.id; renderMenu(); });
    dl.appendChild(b);
  });

  renderBoard();
}

function renderBoard() {
  const box = $('#board');
  box.innerHTML = '';
  const rows = Object.values(db.profiles)
    .map((p) => ({ p, r: p.best && p.best[recKey()] }))
    .filter((x) => x.r)
    .sort((a, b) => b.r.score - a.r.score || b.r.maxTps - a.r.maxTps)
    .slice(0, 8);
  if (!rows.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'Bu rejimda hali rekord yo\'q. Birinchi bo\'ling!';
    box.appendChild(e);
    return;
  }
  const me = curProfile();
  rows.forEach((x, i) => {
    const row = document.createElement('div'); row.className = 'row';
    const n = document.createElement('span'); n.className = 'n'; n.textContent = i + 1;
    const nm = document.createElement('span');
    nm.textContent = x.p.name + ' ' + x.p.surname + (me && me === x.p ? ' (siz)' : '');
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = x.r.score;
    const tp = document.createElement('span'); tp.className = 'tp'; tp.textContent = x.r.maxTps + ' urish/s';
    row.appendChild(n); row.appendChild(nm); row.appendChild(sc); row.appendChild(tp);
    box.appendChild(row);
  });
}

/* ---------------- Natija ---------------- */
function showOver(win) {
  const p = curProfile();
  const avg = avgTps();
  const time = S.started ? Math.max(0, S.tLast - S.t0) : 0;
  let isRecord = false;

  if (p) {
    p.best = p.best || {};
    p.games = (p.games || 0) + 1;
    const k = recKey();
    const old = p.best[k] || { score: 0, maxTps: 0, avgTps: 0, maxMul: 0 };
    isRecord = S.hits > old.score;
    p.best[k] = {
      score: Math.max(old.score, S.hits),
      maxTps: Math.max(old.maxTps, S.maxTps),
      avgTps: Math.max(old.avgTps, +avg.toFixed(2)),
      maxMul: Math.max(old.maxMul, +S.maxMul.toFixed(2)),
    };
    saveDB();
  }

  $('#overTitle').textContent = win ? '🎉 Tabriklaymiz!' : 'O\'yin tugadi';
  $('#overScore').textContent = S.hits;
  $('#overBadge').classList.toggle('hidden', !(isRecord && S.hits > 0));

  const best = p && p.best[recKey()];
  const cells = [
    ['Eng tez (urish/s)', S.maxTps, true],
    ['O\'rtacha (urish/s)', avg.toFixed(1), true],
    ['Maks. tezlik', '×' + S.maxMul.toFixed(2), false],
    ['Vaqt', time.toFixed(1) + ' s', false],
  ];
  if (best) {
    cells.push(['Rekord', best.score, false]);
    cells.push(['Rekord tezlik', best.maxTps + ' /s', false]);
  }
  const grid = $('#overStats');
  grid.innerHTML = '';
  cells.forEach(([label, val, hl]) => {
    const c = document.createElement('div'); c.className = 'stat' + (hl ? ' hl' : '');
    const b = document.createElement('b'); b.textContent = val;
    const s = document.createElement('span'); s.textContent = label;
    c.appendChild(b); c.appendChild(s);
    grid.appendChild(c);
  });

  $('#guestNote').classList.toggle('hidden', !!p);
  $('#btnOverProfile').classList.toggle('hidden', !!p);
  $('#hud').classList.add('hidden');
  showOnly('over');
}

/* ---------------- Profil ---------------- */
function openForm(next) {
  afterProfile = next;
  $('#formErr').textContent = '';
  showOnly('form');
  setTimeout(() => $('#inName').focus(), 50);
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

$('#profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#inName').value.trim().replace(/\s+/g, ' ');
  const surname = $('#inSurname').value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || surname.length < 2) {
    $('#formErr').textContent = 'Ism va familyani to\'liq kiriting (kamida 2 harf).';
    return;
  }
  const key = profKey(name, surname);
  if (!db.profiles[key]) db.profiles[key] = { name: cap(name), surname: cap(surname), best: {}, games: 0, created: Date.now() };
  db.current = key;
  saveDB();
  $('#inName').value = ''; $('#inSurname').value = '';
  if (afterProfile === 'play') { initAudio(); startGame(); }
  else toMenu();
});
$('#formBack').addEventListener('click', () => {
  if (afterProfile === 'play') showOnly('ask'); else toMenu();
});

$('#btnProfile').addEventListener('click', () => {
  if (curProfile()) { db.current = null; saveDB(); guestChosen = false; renderMenu(); }
  else openForm('menu');
});

/* ---------------- Tugmalar ---------------- */
$('#btnPlay').addEventListener('click', () => {
  initAudio();
  if (!curProfile() && !guestChosen) showOnly('ask');
  else startGame();
});
$('#askYes').addEventListener('click', () => openForm('play'));
$('#askNo').addEventListener('click', () => { guestChosen = true; initAudio(); startGame(); });

function pauseGame() {
  if (S.state !== 'play') return;
  S.state = 'pause';
  showOnly('pause');
}
function resumeGame() {
  if (S.state !== 'pause') return;
  S.state = 'play';
  S.stamps = [];
  showOnly(null);
}
$('#btnPause').addEventListener('click', pauseGame);
$('#btnResume').addEventListener('click', resumeGame);
$('#btnRestart').addEventListener('click', () => { initAudio(); startGame(); });
$('#btnPauseMenu').addEventListener('click', toMenu);
$('#btnRetry').addEventListener('click', () => { initAudio(); startGame(); });
$('#btnToMenu').addEventListener('click', toMenu);
$('#btnOverProfile').addEventListener('click', () => openForm('menu'));

/* ---------------- Boshqaruv: sensor + klaviatura ---------------- */
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (S.state !== 'play') return;
  const r = canvas.getBoundingClientRect();
  const lane = Math.max(0, Math.min(LANES - 1, Math.floor((e.clientX - r.left) / r.width * LANES)));
  tap(lane);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT') return;
  if (e.key === 'Escape') {
    if (S.state === 'play') pauseGame(); else if (S.state === 'pause') resumeGame();
    return;
  }
  let lane = -1;
  if (e.code >= 'Digit1' && e.code <= 'Digit4' && e.code.length === 6) lane = parseInt(e.code.slice(5), 10) - 1;
  else if (e.code >= 'Numpad1' && e.code <= 'Numpad4' && e.code.length === 7) lane = parseInt(e.code.slice(6), 10) - 1;
  else if (e.key >= '1' && e.key <= '4') lane = parseInt(e.key, 10) - 1;
  if (lane >= 0) { e.preventDefault(); tap(lane); }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
['gesturestart', 'dblclick'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault()));

/* ---------------- Ishga tushirish ---------------- */
resize();
renderMenu();
showOnly('menu');
requestAnimationFrame(frame);
})();
