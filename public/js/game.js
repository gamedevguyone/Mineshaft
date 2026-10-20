import * as THREE from 'three';
import { World, CS, CH, SEA, B, solid, makeAtlas, buildMesh, ck } from './world.js';

const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches);
if (touch) document.body.classList.add('touch');
const HOT = [3, 2, 1, 8, 5, 6, 26, 10, 45], D = 4.2;
let sel = 0, name = localStorage.getItem('mc_name') || '', world = null, myId = 0, hp = 20, kills = 0, view = 1, started = false, me = null;

// ---------- quality (auto-adjusting) ----------
const weak = touch && ((navigator.deviceMemory || 4) <= 3 || (navigator.hardwareConcurrency || 4) <= 4);
const QS = [{ R: 3, pr: .55, ao: 0, fast: 1, cl: 0, b: 5 }, { R: 4, pr: .75, ao: 0, fast: 1, cl: 0, b: 6 }, { R: 5, pr: 1, ao: 1, fast: 0, cl: 1, b: 8 }, { R: 7, pr: Math.min(devicePixelRatio || 1, 1.5), ao: 1, fast: 0, cl: 1, b: 10 }];
const qMax = touch ? 2 : 3;
let qMode = localStorage.getItem('mc_q') || 'auto', qLevel = weak ? 0 : touch ? 1 : 3, R = QS[qLevel].R;
const meshOpt = { ao: QS[qLevel].ao, fast: QS[qLevel].fast };
let rescan = true;

// ---------- renderer ----------
const SKYD = new THREE.Color(0x87ceeb), SKYN = new THREE.Color(0x060a20);
const scene = new THREE.Scene(); scene.background = new THREE.Color(SKYD); scene.fog = new THREE.Fog(0x87ceeb, 40, 80);
let ren;
try { ren = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' }); }
catch (e) { document.body.innerHTML = '<p style="padding:20px;color:#fff">This browser cannot run WebGL, so the game cannot start.</p>'; throw e; }
document.body.prepend(ren.domElement);
ren.domElement.addEventListener('webglcontextlost', e => e.preventDefault());
const cam = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .1, 300);
const amb = new THREE.AmbientLight(0xffffff, 1.2), sunL = new THREE.DirectionalLight(0xffffff, .9); sunL.position.set(1, 2, .5); scene.add(amb, sunL);
function resize() { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); ren.setSize(innerWidth, innerHeight); }
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));

const atlas = makeAtlas();
const tex = new THREE.CanvasTexture(atlas); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
const matO = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: .5 });
const matW = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity: .65, depthWrite: false });
const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0 })); box.visible = false; scene.add(box);
const cc = document.createElement('canvas'); cc.width = cc.height = 64; { const x = cc.getContext('2d'); for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(Math.random() * 56, Math.random() * 56, 6 + Math.random() * 14, 4 + Math.random() * 8); } }
const ct = new THREE.CanvasTexture(cc); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(5, 5); ct.magFilter = THREE.NearestFilter;
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: .75, depthWrite: false, fog: false }));
clouds.rotation.x = -Math.PI / 2; clouds.position.y = CH + 26; scene.add(clouds);

function setQ(l) {
  l = Math.max(0, Math.min(3, l)); const Q = QS[l], redo = Q.ao !== meshOpt.ao || Q.fast !== meshOpt.fast;
  qLevel = l; R = Q.R; meshOpt.ao = Q.ao; meshOpt.fast = Q.fast; ren.setPixelRatio(Q.pr); resize(); clouds.visible = !!Q.cl;
  scene.fog.near = R * CS * .5; scene.fog.far = R * CS - 6; rescan = true;
  if (world && redo) for (const c of world.chunks.values()) c.dirty = true;
  qLabel();
}
const MODES = ['auto', 'low', 'med', 'high'], qLabel = () => { const b = $('qb'); if (b) b.textContent = 'Quality: ' + qMode + (qMode === 'auto' ? ' (' + 'LMHU'[qLevel] + ')' : ''); };
function setMode(m) { qMode = m; localStorage.setItem('mc_q', m); if (m !== 'auto') setQ({ low: 0, med: 2, high: 3 }[m]); qLabel(); }

// ---------- ui ----------
function icon(id) {
  const c = document.createElement('canvas'), t = B[id].f[id === 1 ? 0 : 1]; c.width = c.height = 40;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(atlas, (t % 8) * 16, (t >> 3) * 16, 16, 16, 0, 0, 40, 40); return c;
}
function bar() { $('bar').innerHTML = ''; HOT.forEach((id, i) => { const d = document.createElement('div'); if (i === sel) d.className = 'on'; d.appendChild(icon(id)); d.onclick = () => pick(i); $('bar').appendChild(d); }); }
const pick = i => { sel = (i + 9) % 9; bar(); };
Object.keys(B).forEach(id => { const d = document.createElement('div'); d.title = B[id].n; d.appendChild(icon(+id)); d.onclick = () => { HOT[sel] = +id; bar(); }; $('pal').appendChild(d); });
bar();
const togglePal = () => { const o = $('pal').style.display === 'flex'; $('pal').style.display = o ? 'none' : 'flex'; if (!o) document.exitPointerLock?.(); };
const others = new Map();
const hud = () => { $('hp').textContent = '\u2764 ' + hp + '   kills ' + kills + '   players ' + (others.size + 1); };
function showWho() {
  $('who').innerHTML = 'Name: ' + name.replace(/[<>&]/g, '') + ' <button id="clr">Clear name</button> <button id="qb"></button>';
  $('clr').onclick = () => { localStorage.removeItem('mc_name'); location.reload(); };
  $('qb').onclick = () => setMode(MODES[(MODES.indexOf(qMode) + 1) % 4]); qLabel();
}
const say = t => { $('msg').style.display = 'block'; $('msg').textContent = t; clearTimeout(say.t); say.t = setTimeout(() => $('msg').style.display = 'none', 4000); };
const net = (t, c) => { $('net').textContent = '\u25CF ' + t; $('net').style.color = c; };

// ---------- chunks ----------
function drop(c) { for (const m of c.meshes) { scene.remove(m); m.geometry.dispose(); } c.meshes = []; }
function remesh(c) {
  drop(c);
  buildMesh(world, c, meshOpt).forEach((o, k) => {
    if (!o.i.length) return;
    const g = new THREE.BufferGeometry(), nv = o.p.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('color', new THREE.Uint8BufferAttribute(o.c, 3, true)); g.setAttribute('uv', new THREE.Float32BufferAttribute(o.u, 2));
    g.setIndex(new THREE.BufferAttribute(nv > 65535 ? new Uint32Array(o.i) : new Uint16Array(o.i), 1));
    const m = new THREE.Mesh(g, k ? matW : matO); m.position.set(c.cx * CS, 0, c.cz * CS); if (k) m.renderOrder = 1; scene.add(m); c.meshes.push(m);
  });
  c.dirty = false;
}
let need = [], lpx = 1e9, lpz = 1e9;
function work(budget) {
  const t0 = performance.now(), pcx = Math.floor(P.x / CS), pcz = Math.floor(P.z / CS);
  if (pcx !== lpx || pcz !== lpz || rescan) {
    lpx = pcx; lpz = pcz; rescan = false; need = [];
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) if (dx * dx + dz * dz <= R * R && !world.chunks.has(ck(pcx + dx, pcz + dz))) need.push([dx * dx + dz * dz, pcx + dx, pcz + dz]);
    need.sort((a, b) => a[0] - b[0]);
    for (const [k, c] of world.chunks) if (Math.hypot(c.cx - pcx, c.cz - pcz) > R + 2) { drop(c); world.chunks.delete(k); }
  }
  const ds = []; for (const c of world.chunks.values()) if (c.dirty) ds.push(c);
  if (ds.length) { ds.sort((a, b) => Math.hypot(a.cx - pcx, a.cz - pcz) - Math.hypot(b.cx - pcx, b.cz - pcz)); for (const c of ds) { remesh(c); if (performance.now() - t0 > budget) return; } }
  while (need.length) {
    const [, cx, cz] = need.shift(); if (world.chunks.has(ck(cx, cz))) continue;
    world.gen(cx, cz); tx({ t: 'chunk', cx, cz });
    const om = oe.get(ck(cx, cz)); if (om) for (const [k, id] of om) { const [x, y, z] = k.split(',').map(Number); world.set(x, y, z, id); }
    if (performance.now() - t0 > budget) break;
  }
}

// ---------- humanoid characters ----------
function makeChar(nm) {
  let hs = 0; for (const ch of nm) hs = (hs * 31 + ch.charCodeAt(0)) % 360;
  const shirt = new THREE.Color().setHSL(hs / 360, .6, .5), pants = new THREE.Color().setHSL(((hs + 180) % 360) / 360, .5, .3);
  const mats = [], mat = (c, map) => { const m = new THREE.MeshLambertMaterial({ color: c, map }); mats.push(m); return m; };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const limb = (w, h, d, c, x, y) => { const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, -h / 2, 0); const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, 0); body.add(m); return m; };
  limb(.5, .75, .25, shirt, 0, 1.5);
  const legL = limb(.25, .75, .25, pants, -.125, .75), legR = limb(.25, .75, .25, pants, .125, .75), armL = limb(.25, .75, .25, shirt, -.375, 1.5), armR = limb(.25, .75, .25, shirt, .375, 1.5);
  const fc = document.createElement('canvas'); fc.width = fc.height = 16; const x = fc.getContext('2d');
  x.fillStyle = '#e0ac86'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#4a2f1a'; x.fillRect(0, 0, 16, 4); x.fillStyle = '#fff'; x.fillRect(3, 7, 3, 2); x.fillRect(10, 7, 3, 2);
  x.fillStyle = '#2a4aa0'; x.fillRect(4, 7, 2, 2); x.fillRect(10, 7, 2, 2); x.fillStyle = '#8a4a3a'; x.fillRect(6, 11, 4, 1);
  const ft = new THREE.CanvasTexture(fc); ft.magFilter = THREE.NearestFilter;
  const hg = new THREE.BoxGeometry(.5, .5, .5); hg.translate(0, .25, 0);
  const skin = 0xe0ac86, hair = 0x4a2f1a, head = new THREE.Mesh(hg, [mat(skin), mat(skin), mat(hair), mat(skin), mat(0xffffff, ft), mat(hair)]); head.position.y = 1.5; body.add(head);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const t = cv.getContext('2d');
  t.fillStyle = '#0007'; t.fillRect(0, 0, 256, 64); t.fillStyle = '#fff'; t.font = '30px monospace'; t.textAlign = 'center'; t.fillText(nm, 128, 42);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), fog: false })); sp.scale.set(2, .5, 1); sp.position.y = 2.45; g.add(sp);
  g.scale.setScalar(.9); scene.add(g);
  return { g, legL, legR, armL, armR, mats, swingT: 0, flash: 0, fl: 0 };
}
function pose(ch, speed, t, dt) {
  const s = Math.sin(t * 9) * Math.min(1, speed / 4) * .9;
  ch.legL.rotation.x = s; ch.legR.rotation.x = -s; ch.armL.rotation.x = -s; ch.armR.rotation.x = s;
  if (ch.swingT > 0) { ch.swingT -= dt; ch.armR.rotation.x = -1.9 * Math.sin(Math.PI * (1 - Math.max(0, ch.swingT) / .3)); }
  if (ch.flash > 0) ch.flash -= dt;
  const f = ch.flash > 0 ? 1 : 0; if (f !== ch.fl) { ch.fl = f; ch.mats.forEach(m => m.emissive.setHex(f ? 0x992222 : 0)); }
}
function addPlayer(p) {
  if (others.has(p.id)) return; const ch = makeChar(p.name); ch.g.position.set(p.x ?? 0, p.y ?? 90, p.z ?? 0);
  others.set(p.id, { ch, t: ch.g.position.clone(), ry: p.ry || 0, last: ch.g.position.clone(), sp: 0 }); hud();
}
function clearOthers() { for (const o of others.values()) scene.remove(o.ch.g); others.clear(); }

// ---------- network (auto-reconnect, offline fallback) ----------
let ws = null, online = false, retry = 0, lastRx = 0, worldReset = false;
const URL_WS = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
const tx = o => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); } catch {} };
function connect() {
  clearTimeout(connect.t);
  if (ws) return;
  let sock; net('Connecting...', '#fc6');
  try { sock = new WebSocket(URL_WS); } catch { return later(); }
  ws = sock;
  sock.onopen = () => { if (ws !== sock) return; lastRx = performance.now(); sock.send(JSON.stringify({ t: 'join', name })); };
  sock.onmessage = e => { if (ws !== sock) return; lastRx = performance.now(); let m; try { m = JSON.parse(e.data); } catch { return; } try { onMsg(m); } catch (err) { console.error(err); } };
  const bad = () => { if (ws !== sock) return; ws = null; online = false; net(started ? 'Offline (edits not shared)' : 'Server waking up...', '#f66'); later(); };
  sock.onclose = bad; sock.onerror = bad;
}
function later() { retry++; clearTimeout(connect.t); connect.t = setTimeout(connect, Math.min(8000, 1000 * 2 ** Math.min(retry, 3))); }
setInterval(() => { if (online) { tx({ t: 'ping' }); if (performance.now() - lastRx > 40000 && ws) try { ws.close(); } catch {} } }, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !ws) { retry = 0; connect(); } });
addEventListener('online', () => { if (!ws) { retry = 0; connect(); } });

const oe = new Map();
function resetWorld(seed) { oe.clear(); if (world) for (const c of world.chunks.values()) drop(c); world = new World(seed); rescan = true; need = []; worldReset = true; }
function spawn() {
  for (let r = 0; r < 800; r += 12) for (let a = 0; a < 6.3; a += .8) {
    const x = Math.floor(Math.cos(a + Math.random()) * r + (Math.random() * 20 - 10)), z = Math.floor(Math.sin(a) * r), { h } = world.column(x, z);
    if (h > SEA + 1) { P.x = x + .5; P.z = z + .5; P.y = h + 2; P.vy = P.kx = P.kz = 0; return; }
  }
  P.y = 90; P.vy = 0;
}
function startGame() { me = makeChar(name); spawn(); started = true; hud(); frame(); }
function startOffline() { if (started) return; resetWorld(Math.floor(Math.random() * 1e9)); startGame(); net('Offline (edits not shared)', '#f66'); }
function onMsg(m) {
  switch (m.t) {
    case 'init': {
      online = true; retry = 0; myId = m.id; hp = m.hp || 20; const same = world && world.seed === m.seed;
      if (!same) resetWorld(m.seed);
      clearOthers(); (m.players || []).forEach(addPlayer);
      if (!started) startGame(); else if (!same) spawn();
      else for (const c of world.chunks.values()) tx({ t: 'chunk', cx: c.cx, cz: c.cz });
      net('Online', '#6f6'); hud(); if (!same && worldReset) say('Joined the shared world'); worldReset = false; break;
    }
    case 'join': addPlayer(m); say(m.name + ' joined'); break;
    case 'leave': { const o = others.get(m.id); if (o) { scene.remove(o.ch.g); others.delete(m.id); hud(); } break; }
    case 'pos': { const o = others.get(m.id); if (o) { o.t.set(m.x, m.y, m.z); o.ry = m.ry; } break; }
    case 'swing': { const o = others.get(m.id); if (o) o.ch.swingT = .3; break; }
    case 'set': if (world) world.set(m.x, m.y, m.z, m.id); break;
    case 'chunk': if (world) for (const [x, y, z, id] of m.e) world.set(x, y, z, id); break;
    case 'hp': if (m.id === myId) { if (m.hp < hp) flashHurt(); hp = m.hp; hud(); } else { const o = others.get(m.id); if (o) o.ch.flash = .25; } break;
    case 'kb': P.kx = m.x * 9; P.kz = m.z * 9; P.vy = 6.5; break;
    case 'dead': say(m.byName + ' eliminated ' + m.name); break;
    case 'respawn': hp = 20; spawn(); hud(); break;
    case 'kill': kills++; hud(); break;
  }
}
const flashHurt = () => { $('hurt').style.opacity = .35; setTimeout(() => $('hurt').style.opacity = 0, 150); };
const start = () => { $('menu').style.display = 'none'; showWho(); net('Connecting...', '#fc6'); setQ(qLevel); connect(); setTimeout(startOffline, 5000); };
if (name) start(); else $('play').onclick = () => { const v = $('nm').value.trim(); if (v) { name = v; localStorage.setItem('mc_name', v); start(); } };
if (qMode !== 'auto') setMode(qMode);

// ---------- player ----------
const P = { x: 0, y: 90, z: 0, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, jx: 0, jy: 0, yaw: 0, pitch: 0, fly: false, ground: false, speed: 0 }, keys = {};
function hits(px, py, pz) {
  for (let x = Math.floor(px - .3), x1 = Math.floor(px + .3); x <= x1; x++) for (let y = Math.floor(py), y1 = Math.floor(py + 1.79); y <= y1; y++) for (let z = Math.floor(pz - .3), z1 = Math.floor(pz + .3); z <= z1; z++) if (solid(world.get(x, y, z))) return true;
  return false;
}
function hurtLocal(d) { if (online) return tx({ t: 'fall', d }); hp -= d; flashHurt(); if (hp <= 0) { hp = 20; spawn(); } hud(); }
function physics(dt) {
  if (!world.chunk(P.x, P.z)) return;
  const water = world.get(Math.floor(P.x), Math.floor(P.y + .6), Math.floor(P.z)) === 7, wasG = P.ground;
  const run = keys.ShiftLeft || (touch && Math.hypot(P.jx, P.jy) > .95), sp = (run && !P.fly ? 6.5 : 4.5) * (P.fly ? 2 : water ? .6 : 1);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  let mx = P.jx * rx - P.jy * fx, mz = P.jx * rz - P.jy * fz;
  if (keys.KeyW) { mx += fx; mz += fz; } if (keys.KeyS) { mx -= fx; mz -= fz; } if (keys.KeyD) { mx += rx; mz += rz; } if (keys.KeyA) { mx -= rx; mz -= rz; }
  const l = Math.max(1, Math.hypot(mx, mz)), mv = mx || mz; P.vx = mx / l * sp + P.kx; P.vz = mz / l * sp + P.kz;
  const dec = Math.pow(.01, dt); P.kx *= dec; P.kz *= dec;
  if (P.fly) P.vy = keys.Space ? sp : keys.ShiftLeft ? -sp : 0;
  else if (water) { P.vy = Math.max(P.vy - 9 * dt, -3); if (keys.Space) P.vy = 3.5; }
  else { P.vy = Math.max(P.vy - 28 * dt, -40); if (keys.Space && wasG) P.vy = 8.5; }
  P.ground = false; let impact = 0;
  for (let i = 0; i < 3; i++) {
    const s = dt / 3, nx = P.x + P.vx * s, nz = P.z + P.vz * s;
    if (!hits(nx, P.y, P.z)) P.x = nx; else if (touch && wasG && mv && !hits(nx, P.y + 1.05, P.z)) P.vy = 8.5;
    if (!hits(P.x, P.y, nz)) P.z = nz; else if (touch && wasG && mv && !hits(P.x, P.y + 1.05, nz)) P.vy = 8.5;
    const dy = P.vy * s;
    if (hits(P.x, P.y + dy, P.z)) { if (dy < 0) { P.ground = true; if (P.vy < -14 && !P.fly && !water) impact = -P.vy; } P.vy = 0; } else P.y += dy;
  }
  if (impact) { const d = Math.floor((impact - 13) / 2.2); if (d > 0) hurtLocal(Math.min(d, 10)); }
  P.speed = P.fly ? 0 : Math.hypot(mx / l * sp, mz / l * sp) * (P.ground || water ? 1 : .5);
  if (P.y < -30) spawn();
}

// ---------- targeting & actions ----------
const look = new THREE.Vector3(), cp = new THREE.Vector3();
function castBlocks(ox, oy, oz, dx, dy, dz, max) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz), px = x, py = y, pz = z, t = 0;
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1, tdx = dx ? Math.abs(1 / dx) : 1e9, tdy = dy ? Math.abs(1 / dy) : 1e9, tdz = dz ? Math.abs(1 / dz) : 1e9;
  let tmx = dx ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : 1e9, tmy = dy ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : 1e9, tmz = dz ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : 1e9;
  for (let i = 0; i < 80; i++) {
    if (i > 0) { const b = world.get(x, y, z); if (b > 0 && b !== 7) return { hit: [x, y, z], prev: [px, py, pz], t }; }
    px = x; py = y; pz = z;
    if (tmx < tmy && tmx < tmz) { t = tmx; tmx += tdx; x += sx; } else if (tmy < tmz) { t = tmy; tmy += tdy; y += sy; } else { t = tmz; tmz += tdz; z += sz; }
    if (t > max) break;
  }
  return null;
}
function ray() {
  const o = cam.position, reach = view ? D + 5 : 6, r = castBlocks(o.x, o.y, o.z, look.x, look.y, look.z, reach);
  let tb = r ? r.t : reach, best = 0;
  for (const [id, p] of others) {
    const c = p.ch.g.position, vx = c.x - o.x, vy = c.y + .9 - o.y, vz = c.z - o.z, t = vx * look.x + vy * look.y + vz * look.z;
    if (t > 0 && t < tb && vx * vx + vy * vy + vz * vz - t * t < .36 && Math.hypot(c.x - P.x, c.y - P.y, c.z - P.z) < 5) { tb = t; best = id; }
  }
  return best ? { pl: best } : r;
}
const edit = (x, y, z, id) => {
  if (!online) { const k = ck(x >> 4, z >> 4); let m = oe.get(k); if (!m) oe.set(k, m = new Map()); m.set(x + ',' + y + ',' + z, id); }
  world.set(x, y, z, id); tx({ t: 'set', x, y, z, id }); };
let lastAct = -9, tt = 0, hold = null;
function act(btn) {
  if (!started || $('pal').style.display === 'flex' || (!touch && !document.pointerLockElement)) return;
  const r = ray(); if (tt - lastAct < (btn === 0 && r?.pl ? .32 : .18)) return; lastAct = tt;
  if (btn === 0) {
    me.swingT = .3; tx({ t: 'swing' });
    if (r?.pl) tx({ t: 'hit', id: r.pl }); else if (r?.hit && world.get(...r.hit) !== 11) edit(...r.hit, 0);
  } else if (r?.prev && !r.pl) {
    const [x, y, z] = r.prev, id = HOT[sel], ov = P.x + .3 > x && P.x - .3 < x + 1 && P.y + 1.8 > y && P.y < y + 1 && P.z + .3 > z && P.z - .3 < z + 1;
    if ((!ov || id >= 40) && y < CH - 1 && world.get(x, y, z) < 40 + 1) edit(x, y, z, id);
  }
}

// ---------- input ----------
const cv = ren.domElement;
cv.addEventListener('click', () => !touch && !document.pointerLockElement && cv.requestPointerLock?.());
addEventListener('mousemove', e => { if (document.pointerLockElement) { P.yaw -= e.movementX * .0025; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - e.movementY * .0025)); } });
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyF') P.fly = !P.fly; if (e.code === 'KeyV') view ^= 1; if (e.code === 'KeyE') togglePal(); if (/^Digit[1-9]$/.test(e.code)) pick(+e.code.slice(5) - 1); });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; hold = null; });
addEventListener('wheel', e => pick(sel + Math.sign(e.deltaY)));
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => { hold = e.button === 2 ? 2 : 0; act(hold); });
addEventListener('mouseup', () => hold = null);
if (touch) {
  let jid = null, lid = null, jo, lp;
  const joy = $('joy'), knob = $('knob');
  addEventListener('touchstart', e => { for (const t of e.changedTouches) { if (t.target.closest('button,#pal,#bar,#who')) continue; if (t.clientX < innerWidth * .45 && jid === null) { jid = t.identifier; jo = [t.clientX, t.clientY]; joy.style.left = t.clientX + 'px'; joy.style.top = t.clientY + 'px'; joy.style.display = 'block'; } else if (lid === null) { lid = t.identifier; lp = [t.clientX, t.clientY]; } } }, { passive: true });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === jid) { P.jx = Math.max(-1, Math.min(1, (t.clientX - jo[0]) / 50)); P.jy = Math.max(-1, Math.min(1, (t.clientY - jo[1]) / 50)); knob.style.left = 30 + P.jx * 30 + 'px'; knob.style.top = 30 + P.jy * 30 + 'px'; }
      else if (t.identifier === lid) { P.yaw -= (t.clientX - lp[0]) * .006; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - (t.clientY - lp[1]) * .006)); lp = [t.clientX, t.clientY]; }
    }
  }, { passive: true });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === jid) { jid = null; P.jx = P.jy = 0; $('joy').style.display = 'none'; knob.style.left = knob.style.top = '30px'; } if (t.identifier === lid) lid = null; } };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  const hb = (id, f, up) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); f(); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); up && up(); }, { passive: false }); };
  hb('bj', () => keys.Space = true, () => keys.Space = false);
  hb('ba', () => { hold = 0; act(0); }, () => hold = null);
  hb('bp', () => { hold = 2; act(2); }, () => hold = null);
  hb('bv', () => view ^= 1); hb('be', togglePal);
}

// ---------- main loop ----------
let last = performance.now(), sendT = 0, sentKey = '', posT = 0, skyT = 0, fpsT = 0, fpsN = 0, good = 0, lastDown = -99, warm = 2, errs = 0, regenT = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), raw = (now - last) / 1000; last = now;
  if (raw > .5) return;
  const dt = Math.min(.05, raw); tt += dt;
  try {
    work(QS[qLevel].b); physics(dt);
    look.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
    const hx = P.x, hy = P.y + 1.6, hz = P.z;
    if (view) {
      const rx = Math.cos(P.yaw) * .7, rz = -Math.sin(P.yaw) * .7; let k = 1;
      for (let q = .04; q <= 1; q += .04) { cp.set(hx + rx * q - look.x * D * q, hy + .25 * q - look.y * D * q, hz + rz * q - look.z * D * q); if (solid(world.get(Math.floor(cp.x), Math.floor(cp.y), Math.floor(cp.z)))) { k = Math.max(0, q - .1); break; } }
      cam.position.set(hx + rx * k - look.x * D * k, hy + .25 * k - look.y * D * k, hz + rz * k - look.z * D * k);
    } else cam.position.set(hx, hy, hz);
    cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    const fov = 75 + (P.speed > 5.5 ? 7 : 0); if (Math.abs(cam.fov - fov) > .2) { cam.fov += (fov - cam.fov) * .15; cam.updateProjectionMatrix(); }
    me.g.visible = !!view; me.g.position.set(P.x, P.y, P.z); me.g.rotation.y = P.yaw + Math.PI; pose(me, P.speed, tt, dt);
    const r = ray(); box.visible = !!(r && r.hit); if (r?.hit) box.position.set(r.hit[0] + .5, r.hit[1] + .5, r.hit[2] + .5);
    if (hold !== null && tt - lastAct > .2) act(hold);
    for (const o of others.values()) { const p = o.ch.g.position; p.lerp(o.t, .25); o.ch.g.rotation.y = o.ry + Math.PI; o.sp += (Math.hypot(p.x - o.last.x, p.z - o.last.z) / Math.max(dt, .001) - o.sp) * .2; o.last.copy(p); pose(o.ch, o.sp, tt, dt); }
    if ((sendT += dt) > .1) { sendT = 0; const key = P.x.toFixed(2) + P.y.toFixed(2) + P.z.toFixed(2) + P.yaw.toFixed(2); if (key !== sentKey || tt - posT > 1) { sentKey = key; posT = tt; tx({ t: 'pos', x: P.x, y: P.y, z: P.z, ry: P.yaw }); } }
    if ((skyT += dt) > .5) {
      skyT = 0; const sh = Math.sin(((Date.now() / 1000) / 600 % 1) * 6.2832), Lt = Math.max(.2, Math.min(1, sh * 1.4 + .55)), k = (Lt - .2) / .8;
      scene.background.copy(SKYN).lerp(SKYD, k); scene.fog.color.copy(scene.background); matO.color.setRGB(Lt, Lt, Math.min(1, Lt * 1.12 + .04)); matW.color.copy(matO.color); amb.intensity = 1.2 * Lt; sunL.intensity = .9 * Lt;
    }
    clouds.position.set(P.x, CH + 26, P.z); ct.offset.x += dt * .0015;
    if (!online && hp < 20 && (regenT += dt) > 4) { regenT = 0; hp++; hud(); }
    fpsT += raw; fpsN++;
    if (fpsT > 2.5) {
      const fps = fpsN / fpsT; fpsT = fpsN = 0;
      if (qMode === 'auto') { if (warm > 0) warm--; else if (fps < 26 && qLevel > 0) { setQ(qLevel - 1); lastDown = tt; good = 0; warm = 1; } else if (fps >= 56) { if (++good >= 4 && qLevel < qMax && tt - lastDown > 40) { setQ(qLevel + 1); good = 0; warm = 1; } } else good = 0; }
    }
    ren.render(scene, cam); errs = 0;
  } catch (e) { if (++errs < 4) console.error(e); }
}
