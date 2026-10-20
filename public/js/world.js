export const CS = 16, CH = 80, SEA = 26;
export const TRANSP = new Set([6, 7, 21, 26, 40, 41, 42, 43, 44, 45]);
const AT = [], T = (c, k = 'n', a = 0) => AT.push([c, k, a]) - 1;
const dirt = T(0x80583a), stone = T(0x7f7f84), plank = T(0xb8924f, 'plank');
export const B = {};
const b = (id, n, top, side = top, bot = side) => (B[id] = { n, f: [top, side, bot] });
b(1, 'Grass', T(0x5da83f), T(0x80583a, 'gside', 0x5da83f), dirt); b(2, 'Dirt', dirt); b(3, 'Stone', stone);
b(4, 'Sand', T(0xdbcb8c)); b(5, 'Oak Log', T(0x9c7f4e, 'ring'), T(0x5e4526, 'log')); b(6, 'Oak Leaves', T(0x2f7a22, 'leaf'));
b(7, 'Water', T(0x2f5fd0)); b(8, 'Planks', plank); b(9, 'Bricks', T(0x9a4a3c, 'brick')); b(10, 'Lamp', T(0xffe08a, 'lamp'));
b(11, 'Bedrock', T(0x2a2a2a)); b(12, 'Snow', T(0xf4f8ff), T(0x80583a, 'gside', 0xf4f8ff), dirt); b(13, 'Gravel', T(0x8a8580));
b(14, 'Cobblestone', T(0x77777b, 'ore', 0x4a4a4e)); b(15, 'Coal Ore', T(0x7f7f84, 'ore', 0x1a1a1a)); b(16, 'Iron Ore', T(0x7f7f84, 'ore', 0xd8a37a));
b(17, 'Gold Ore', T(0x7f7f84, 'ore', 0xf7d83a)); b(18, 'Diamond Ore', T(0x7f7f84, 'ore', 0x4fe8e0));
b(19, 'Birch Log', T(0xd9c89a, 'ring'), T(0xe8e4d8, 'birch')); b(20, 'Spruce Log', T(0x6b4d2c, 'ring'), T(0x3c2a16, 'log'));
b(21, 'Spruce Leaves', T(0x1e5a33, 'leaf')); b(22, 'Cactus', T(0x3c8a2e, 'ring'), T(0x3c8a2e, 'cactus')); b(23, 'Sandstone', T(0xd6c58a, 'plank'));
b(24, 'Clay', T(0xa0a6b8)); b(25, 'Mud', T(0x4b3a2a)); b(26, 'Glass', T(0xcfeaf5, 'glass')); b(27, 'Ice', T(0x9fd0f5));
b(28, 'Mossy Cobble', T(0x77777b, 'ore', 0x3f7a35)); b(29, 'Bookshelf', plank, T(0xb8924f, 'shelf'));
b(30, 'White Wool', T(0xeeeeee)); b(31, 'Red Wool', T(0xc0392b)); b(32, 'Blue Wool', T(0x2e5fc9)); b(33, 'Green Wool', T(0x3a9a3a));
b(34, 'Obsidian', T(0x1a1028)); b(35, 'Crate', T(0xa5793a, 'crate')); b(36, 'Gold Block', T(0xf3d13b)); b(37, 'Iron Block', T(0xd8d8d8)); b(38, 'Diamond Block', T(0x4fe8e0));
b(40, 'Tall Grass', T(0x5da83f, 'blade')); b(41, 'Red Flower', T(0x3a8a2a, 'flower', 0xd62828)); b(42, 'Yellow Flower', T(0x3a8a2a, 'flower', 0xf2d21b));
b(43, 'Mushroom', T(0xe8dcc0, 'shroom', 0xc0392b)); b(44, 'Dead Bush', T(0x7a5a30, 'bush')); b(45, 'Torch', T(0x6b4d2c, 'torch'));
const opq = id => id > 0 && !TRANSP.has(id);
export const solid = id => id > 0 && id !== 7 && id < 40;
const idx = (x, y, z) => (y * CS + z) * CS + x;

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeNoise(seed) {
  const r = mulberry(seed), p = new Uint8Array(512), a = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  const f = t => t * t * t * (t * (t * 6 - 15) + 10), l = (a, b, t) => a + (b - a) * t;
  const g = (h, x, y) => { h &= 3; return (h & 1 ? -x : x) + (h & 2 ? -y : y); };
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = f(x), v = f(y), A = p[X] + Y, B = p[X + 1] + Y;
    return 0.5 * l(l(g(p[A], x, y), g(p[B], x - 1, y), u), l(g(p[A + 1], x, y - 1), g(p[B + 1], x - 1, y - 1), u), v);
  };
}
export function hash(x, z, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ s; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }

export function makeAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), im = x.createImageData(16, 16), d = im.data;
  AT.forEach(([col, k, acc], i) => {
    const R = col >> 16 & 255, G = col >> 8 & 255, Bc = col & 255, ar = acc >> 16 & 255, ag = acc >> 8 & 255, ab = acc & 255;
    for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) {
      const h = hash(px + i * 31, py, 77), h2 = hash(px * 3, py * 5, i);
      let r = R, g = G, b = Bc, m = .88 + h * .24, al = 255;
      const set = (a, bb, cc) => { r = a; g = bb; b = cc; };
      if (k === 'gside' && py < 4 + (h < .4 ? 1 : 0)) set(ar, ag, ab);
      else if (k === 'ore' && h2 < .11) set(ar, ag, ab);
      else if (k === 'brick') { const off = (py >> 2) & 1 ? 4 : 0; if (py % 4 === 3 || (px + off) % 8 === 7) set(190, 190, 185); }
      else if (k === 'plank' && py % 4 === 3) m *= .7;
      else if (k === 'log' && (px % 4 === 0 || (px % 4 === 3 && h < .5))) m *= .72;
      else if (k === 'ring') { const dd = Math.max(Math.abs(px - 7.5), Math.abs(py - 7.5)) | 0; m *= dd === 7 ? .7 : dd % 3 === 2 ? .82 : 1; }
      else if (k === 'leaf' && h < .25) m *= .6;
      else if (k === 'glass') { const e = !px || !py || px === 15 || py === 15; if (!e && !(px === py || (px === py + 1 && py < 6))) al = 0; }
      else if (k === 'shelf') { if (py < 3 || py > 12) m *= 1; else { const bk = [0xaa3333, 0x3366aa, 0x33aa55, 0xccaa33][(px >> 1) % 4]; if (px % 2 || h > .2) set(bk >> 16 & 255, bk >> 8 & 255, bk & 255); } }
      else if (k === 'lamp') m = px % 8 === 0 || py % 8 === 0 ? .6 : 1.1;
      else if (k === 'crate') { if (px < 2 || py < 2 || px > 13 || py > 13) m *= .65; else if (px === py || px === 15 - py) m *= .8; }
      else if (k === 'birch' && h < .15 && py % 3 === 0) set(40, 40, 40);
      else if (k === 'cactus') { if (px % 5 === 2) m *= .7; if (h < .04) set(230, 230, 200); }
      else if (k === 'blade') { al = px % 3 && py >= 16 - (6 + (px * 5) % 8) ? 255 : 0; }
      else if (k === 'flower') { al = 0; const dd = Math.hypot(px - 7.5, py - 4.5); if (dd < 3) { set(ar, ag, ab); al = 255; } else if ((px === 7 || px === 8) && py >= 7) al = 255; }
      else if (k === 'shroom') { al = 0; if (py >= 5 && py <= 9 && px >= 4 && px <= 11 && !(py === 5 && (px < 6 || px > 9))) { set(ar, ag, ab); al = 255; } else if ((px === 7 || px === 8) && py >= 10 && py <= 14) al = 255; }
      else if (k === 'bush') al = (px + py) % 5 === 0 && py > 4 || (px === 8 && py > 6) ? 255 : 0;
      else if (k === 'torch') { al = (px === 7 || px === 8) && py >= 5 ? 255 : 0; if (py < 8) set(255, 210, 80); }
      const o = (py * 16 + px) * 4;
      d[o] = Math.min(255, r * m); d[o + 1] = Math.min(255, g * m); d[o + 2] = Math.min(255, b * m); d[o + 3] = al;
    }
    x.putImageData(im, (i % 8) * 16, (i >> 3) * 16);
  });
  return c;
}

export const ck = (cx, cz) => (cx & 0xffff) * 65536 + (cz & 0xffff);
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export class World {
  constructor(seed) { this.seed = seed; this.noise = makeNoise(seed); this.chunks = new Map(); }
  column(wx, wz) {
    const n = this.noise;
    const Tm = n(wx / 420 + 11, wz / 420 + 11) * 2.6, M = n(wx / 380 - 77, wz / 380 - 77) * 2.6, mt = n(wx / 170 + 300, wz / 170 + 300) * 2.6;
    const cont = n(wx / 150, wz / 150) * 1.3 + n(wx / 60, wz / 60) * .5 + n(wx / 22, wz / 22) * .18 + n(wx / 9, wz / 9) * .05;
    let h = SEA + 3 + cont * 16, bio = 'plains';
    if (h > SEA + 1) { if (Tm > .5 && M < .3) bio = 'desert'; else if (Tm < -.5) bio = 'snow'; else if (M > .7 && Tm > -.4 && Tm < .6) bio = 'swamp'; else if (M > .25) bio = 'forest'; }
    if (bio === 'swamp') h = SEA + Math.round(n(wx / 14, wz / 14) * 5);
    else if (mt > .35) { h += (mt - .35) * 34; if (h > SEA + 20) bio = 'mountain'; }
    h = Math.max(3, Math.min(CH - 12, Math.floor(h)));
    if (h < SEA - 1) bio = 'ocean'; else if (h <= SEA + 1 && bio !== 'swamp' && bio !== 'snow') bio = 'beach';
    return { h, bio };
  }
  gen(cx, cz) {
    const d = new Uint8Array(CS * CS * CH), n = this.noise, S = this.seed; let mh = SEA;
    const put = (x, y, z, id, over) => { if (x < 0 || z < 0 || x > 15 || z > 15 || y < 0 || y >= CH) return; const i = idx(x, y, z); if (over || !d[i]) d[i] = id; };
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const wx = cx * CS + lx, wz = cz * CS + lz, { h, bio } = this.column(wx, wz);
      if (h > mh) mh = h;
      const top = { desert: 4, beach: 4, ocean: 4, snow: 12, mountain: h > SEA + 34 ? 12 : 3, swamp: h <= SEA ? 25 : 1 }[bio] || 1;
      const sub = { desert: 23, beach: 4, ocean: 4, mountain: 3, swamp: 25 }[bio] || 2;
      for (let y = 0; y <= h; y++) {
        let id = y === 0 ? 11 : y < h - 3 ? 3 : y < h ? sub : top;
        if (y > 4 && y < h - 2 && Math.abs(n(wx / 18 + y * .37, wz / 18 - y * .21)) < .06 && Math.abs(n(wx / 18 - y * .29 + 50, wz / 18 + y * .33 + 50)) < .06) id = 0;
        else if (id === 3) { const r = hash(wx + y * 131, wz + y * 7, S); id = r < .012 ? 15 : r < .019 && y < 40 ? 16 : r < .022 && y < 22 ? 17 : r < .0235 && y < 14 ? 18 : r > .985 && y < 50 ? 13 : 3; }
        else if ((bio === 'ocean' || bio === 'beach') && y === h && hash(wx, wz, S + 3) < .12) id = bio === 'ocean' ? 24 : 4;
        d[idx(lx, y, lz)] = id;
      }
      for (let y = h + 1; y <= SEA; y++) d[idx(lx, y, lz)] = bio === 'snow' && y === SEA ? 27 : 7;
      if (h <= SEA) continue;
      const r = hash(wx, wz, S + 1), r2 = hash(wz, wx, S + 2), inner = lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12, y0 = h + 1;
      const tree = (log, leaf, th) => { if (h + th + 2 > mh) mh = h + th + 2; for (let y = y0; y < y0 + th; y++) put(lx, y, lz, log); for (let dy = th - 2; dy <= th + 1; dy++) { const rad = dy >= th ? 1 : 2; for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (!(Math.abs(dx) === rad && Math.abs(dz) === rad && (dy > th || hash(wx + dx, wz + dz, S) < .5))) put(lx + dx, y0 + dy, lz + dz, leaf); } };
      if (bio === 'plains') { if (r < .003 && inner) tree(5, 6, 4 + (r2 * 3 | 0)); else if (r > .9) put(lx, y0, lz, 40); else if (r > .86) put(lx, y0, lz, r2 < .5 ? 41 : 42); }
      else if (bio === 'forest') { if (r < .045 && inner) r2 < .3 ? tree(19, 6, 5 + (r2 * 10 | 0) % 3) : tree(5, 6, 4 + (r2 * 4 | 0)); else if (r > .93) put(lx, y0, lz, 40); else if (r > .985) put(lx, y0, lz, 43); }
      else if (bio === 'swamp') { if (r < .025 && inner) tree(5, 6, 4 + (r2 * 2 | 0)); else if (r > .97) put(lx, y0, lz, 43); else if (r > .88) put(lx, y0, lz, 40); }
      else if (bio === 'snow') { if (r < .03 && inner) { const th = 5 + (r2 * 3 | 0); if (h + th + 3 > mh) mh = h + th + 3; for (let y = y0; y < y0 + th; y++) put(lx, y, lz, 20); for (let dy = 2; dy <= th + 1; dy++) { const rad = Math.max(0, Math.floor((th + 1 - dy) / 2)); for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (!(rad && Math.abs(dx) === rad && Math.abs(dz) === rad)) put(lx + dx, y0 + dy, lz + dz, 21); } } }
      else if (bio === 'desert') { if (r < .006) { for (let y = y0; y < y0 + 2 + (r2 * 3 | 0); y++) put(lx, y, lz, 22); if (mh < h + 5) mh = h + 5; } else if (r > .985) put(lx, y0, lz, 44); }
    }
    if (mh < SEA + 3) mh = SEA + 3;
    const c = { cx, cz, d, dirty: true, meshes: [], maxY: Math.min(CH - 1, mh + 2), miss: 0 };
    this.chunks.set(ck(cx, cz), c);
    for (let k = 0; k < 4; k++) { const q = this.chunks.get(ck(cx + DIRS[k][0], cz + DIRS[k][1])); if (q && (q.miss >> (k ^ 1)) & 1) q.dirty = true; }
    return c;
  }
  chunk(x, z) { return this.chunks.get(ck(Math.floor(x) >> 4, Math.floor(z) >> 4)); }
  get(x, y, z) { if (y < 0 || y >= CH) return 0; const c = this.chunks.get(ck(x >> 4, z >> 4)); return c ? c.d[idx(x & 15, y, z & 15)] : 0; }
  set(x, y, z, id) {
    const c = this.chunks.get(ck(x >> 4, z >> 4)); if (!c || y < 0 || y >= CH) return;
    c.d[idx(x & 15, y, z & 15)] = id; c.dirty = true; if (y > c.maxY) c.maxY = Math.min(CH - 1, y + 1);
    const lx = x & 15, lz = z & 15, mark = (a, b) => { const q = this.chunks.get(ck(a, b)); if (q) q.dirty = true; };
    if (lx === 0) mark(c.cx - 1, c.cz); if (lx === 15) mark(c.cx + 1, c.cz);
    if (lz === 0) mark(c.cx, c.cz - 1); if (lz === 15) mark(c.cx, c.cz + 1);
  }
}

const FACES = [
  { d: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: .85 },
  { d: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: .85 },
  { d: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1 },
  { d: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: .55 },
  { d: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: .7 },
  { d: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: .7 },
];
const AOO = FACES.map(f => f.v.map(v => {
  const nax = f.d[0] ? 0 : f.d[1] ? 1 : 2, t1 = (nax + 1) % 3, t2 = (nax + 2) % 3;
  const mk = (a, b) => { const r = [f.d[0], f.d[1], f.d[2]]; if (a) r[t1] += v[t1] ? 1 : -1; if (b) r[t2] += v[t2] ? 1 : -1; return r; };
  return [mk(1, 0), mk(0, 1), mk(1, 1)];
}));
const CROSS = [[[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]], [[1, 0, 0], [0, 0, 1], [0, 1, 1], [1, 1, 0]]];
const AOB = [140, 184, 220, 255], opqF = id => id > 0 && id !== 7 && id !== 26 && id < 40, E = .0015;
const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
function quad(o, x, y, z, verts, tile, sh, flip, low) {
  const n = o.p.length / 3, u0 = (tile % 8) / 8 + E, v0 = 1 - ((tile >> 3) + 1) / 8 + E, du = 1 / 8 - 2 * E;
  for (let k = 0; k < 4; k++) {
    const v = verts[k]; o.p.push(x + v[0], y + v[1] * (low && v[1] ? .88 : 1), z + v[2]);
    const s = Math.min(255, sh[k] | 0); o.c.push(s, s, s); o.u.push(u0 + UV[k][0] * du, v0 + UV[k][1] * du);
  }
  if (flip) o.i.push(n, n + 1, n + 3, n + 1, n + 2, n + 3); else o.i.push(n, n + 1, n + 2, n, n + 2, n + 3);
}
export function buildMesh(w, c, opt = {}) {
  const out = [0, 1].map(() => ({ p: [], c: [], u: [], i: [] })), nbs = new Array(9);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const q = dx || dz ? w.chunks.get(ck(c.cx + dx, c.cz + dz)) : c; nbs[(dz + 1) * 3 + dx + 1] = q ? q.d : null; }
  let miss = 0; DIRS.forEach(([dx, dz], k) => { if (!nbs[(dz + 1) * 3 + dx + 1]) miss |= 1 << k; }); c.miss = miss;
  const g = (x, y, z) => { if (y < 0) return 3; if (y >= CH) return 0; const a = nbs[((z >> 4) + 1) * 3 + (x >> 4) + 1]; return a ? a[(y * CS + (z & 15)) * CS + (x & 15)] : 3; };
  const OP = opt.fast ? opqF : opq, ao = opt.ao, my = c.maxY, top = new Int16Array(CS * CS), A = [0, 0, 0, 0], S4 = [0, 0, 0, 0];
  for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) { let y = my; while (y > 0 && !OP(c.d[idx(x, y, z)])) y--; top[z * CS + x] = y; }
  for (let y = 0; y <= my; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    const id = c.d[idx(x, y, z)]; if (!id) continue;
    const def = B[id], tp = top[z * CS + x], L = y >= tp ? 1 : Math.max(.28, 1 - (tp - y) * .13);
    if (id >= 40) { const sh = L * 242; S4[0] = S4[1] = S4[2] = S4[3] = sh; for (const q of CROSS) { quad(out[0], x, y, z, q, def.f[0], S4, 0); const o = out[0], n = o.p.length / 3; o.i.push(n - 4, n - 2, n - 3, n - 4, n - 1, n - 2); } continue; }
    const o = out[id === 7 ? 1 : 0];
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi], nb = g(x + f.d[0], y + f.d[1], z + f.d[2]);
      if (OP(nb) || (nb === id && TRANSP.has(id))) continue;
      if (id === 7 && nb !== 0 && f.d[1] !== 1) continue;
      const base = f.s * L * 255 * (.95 + hash(c.cx * 16 + x + y * 7, c.cz * 16 + z, 5) * .08);
      if (ao && id !== 7) {
        for (let vi = 0; vi < 4; vi++) { const q = AOO[fi][vi], a1 = OP(g(x + q[0][0], y + q[0][1], z + q[0][2])), a2 = OP(g(x + q[1][0], y + q[1][1], z + q[1][2])), a3 = OP(g(x + q[2][0], y + q[2][1], z + q[2][2])); A[vi] = a1 && a2 ? 0 : 3 - (a1 + a2 + a3); S4[vi] = base * AOB[A[vi]] / 255; }
        quad(o, x, y, z, f.v, def.f[fi === 2 ? 0 : fi === 3 ? 2 : 1], S4, A[0] + A[2] < A[1] + A[3], 0);
      } else { S4[0] = S4[1] = S4[2] = S4[3] = base; quad(o, x, y, z, f.v, def.f[fi === 2 ? 0 : fi === 3 ? 2 : 1], S4, 0, id === 7 && nb === 0); }
    }
  }
  return out;
}
