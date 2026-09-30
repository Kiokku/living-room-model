// Adapted from wy51ai/floorplan-3d, index.html, commit a03136c86842968a3de5da4c33549d3df3313c51.
// Source: https://github.com/wy51ai/floorplan-3d/blob/a03136c86842968a3de5da4c33549d3df3313c51/index.html
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const M = v => v / 1000;
const matCache = new Map();
function mat(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .7, ...options }));
  return matCache.get(key);
}
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const asMat = m => typeof m === 'string' ? mat(m) : m;
const sh = o => { o.castShadow = o.receiveShadow = true; return o; };
const mesh = (geo, m) => sh(new THREE.Mesh(geo, asMat(m)));
const rot = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
function box(w, h, d, m, x = 0, y = 0, z = 0){
  const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h/2, z); return o;
}
function rbox(w, h, d, m, x = 0, y = 0, z = 0, r = .04){
  const o = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w/2-.001, h/2-.001, d/2-.001)), m); o.position.set(x, y + h/2, z); return o;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 28){
  const o = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y + h/2, z); return o;
}
// 旋转体：pts = [[半径, 高度], …] 自下而上，y = 底面
function lathe(pts, m, x = 0, y = 0, z = 0, seg = 40){
  const o = mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(r, 1e-4), h)), seg), m); o.position.set(x, y, z); return o;
}
// 两点之间的圆杆，r0 在 a 端、r1 在 b 端（收分椅腿、斜撑）
function rod(a, b, r0, m, r1 = r0, seg = 12){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), o = mesh(new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), seg), m);
  o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); return o;
}
// 椭球（靠垫、叶片、豆袋），y = 中心
function blob(rx, ry, rz, m, x = 0, y = 0, z = 0, seg = 24){
  const o = mesh(new THREE.SphereGeometry(1, seg, Math.round(seg*.7)), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); return o;
}
// 水平圆环，y = 中心
function ring(R, r, m, x = 0, y = 0, z = 0){ const o = mesh(new THREE.TorusGeometry(R, r, 10, 48), m); o.rotation.x = Math.PI/2; o.position.set(x, y, z); return o; }
const darker = (hex, k = .8) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const lighter = (hex, k = .2) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
// 四条收分腿：inset 为距边距离，r 为腿底半径（顶部略粗）
const legs = (g, w, d, h, m, inset = .05, r = .02) => [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2-inset), 0, b*(d/2-inset)], [a*(w/2-inset), h, b*(d/2-inset)], r*.7, m, r)));
const hwMat = () => mat('#b9b3a8', {metalness:.85, roughness:.3});
const mirror = () => mat('#dfeaee', {metalness:.55, roughness:.06});
const ceramic = (o = {}) => mat('#fbfbf9', {roughness:.12, ...o});
const fabric = c => mat(c, {roughness:.96});
const woodM = c => mat(c, {roughness:.55});
const glowMat = (c = '#fff4dc', e = '#ffdca0', k = .5) => mat(c, {emissive:e, emissiveIntensity:k, roughness:.9, side:THREE.DoubleSide});

// 拉手：y 为拉手中心，z 为门板正面
function pull(g, len, vert, x, y, z){
  const m = hwMat(), o = new THREE.Group();
  o.add(vert ? box(.01, len, .01, m, 0, -len/2, .028) : box(len, .01, .01, m, 0, -.005, .028));
  [-1, 1].forEach(s => o.add(vert ? box(.008, .008, .028, m, 0, s*(len/2 - .015) - .004, .014) : box(.008, .008, .028, m, s*(len/2 - .015), -.004, .014)));
  o.position.set(x, y, z); g.add(o);
}
function knob(g, x, y, z){ const k = cyl(.011, .014, .02, hwMat(), x, y - .01, z + .01, 16); k.rotation.x = Math.PI/2; g.add(k, blob(.014, .014, .008, hwMat(), x, y, z + .022, 12)); }
// 柜门 / 抽屉面板：x0..x0+w、y0..y0+h 区域内 nx 列 × ny 行，正面朝 +z（z = 柜体正面）
// hd：'bar' 金属拉手 | 'knob' 圆钮 | 'edge' 顶部隐形拉槽 | 'none'；hy：门拉手中心高度（null = 面板中部）
function fronts(g, x0, y0, w, h, z, nx, ny, m, hd = 'bar', hy = null){
  const gap = .005, pw = w/nx, ph = h/ny, fz = z + .018;
  g.add(box(w, h, .002, '#2a2724', x0 + w/2, y0, z + .001));                     // 缝隙里透出的暗色
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++){
    const cx = x0 + pw*(i + .5), yb = y0 + ph*j, drawer = ph < .4 && pw >= ph;
    g.add(rbox(pw - gap, ph - gap, .018, m, cx, yb + gap/2, z + .009, .003));
    if (hd === 'none') continue;
    if (hd === 'edge'){ g.add(box(pw - .05, .01, .006, '#3c3a37', cx, yb + ph - gap - .018, fz)); continue; }
    if (drawer){ hd === 'knob' ? knob(g, cx, yb + ph/2, fz) : pull(g, Math.min(.3, pw*.45), false, cx, yb + ph/2, fz); continue; }
    const len = Math.min(.45, ph*.35), hx = nx === 1 ? cx + pw/2 - .045 : (i % 2 ? cx - pw/2 + .04 : cx + pw/2 - .04);
    const y = Math.min(yb + ph - .05 - len/2, Math.max(yb + .05 + len/2, hy ?? yb + ph/2));
    hd === 'knob' ? knob(g, hx, y, fz) : pull(g, len, true, hx, y, fz);
  }
}
const vasePts = (r, h) => [[0, 0], [r*.65, 0], [r, h*.32], [r*.92, h*.62], [r*.42, h*.86], [r*.5, h]];
function vase(g, x, y, z, r, h, c, R, flowers = true){
  g.add(lathe(vasePts(r, h), mat(c, {roughness:.35, side:THREE.DoubleSide}), x, y, z, 32));
  if (!flowers) return;
  const cols = ['#f3e6d8', '#e8b4a0', '#f6d27a', '#ffffff'];
  for (let k = 0; k < 5; k++){
    const a = k*1.26 + R()*.4, s = .03 + R()*.05, top = [x + Math.cos(a)*s, y + h + .12 + R()*.14, z + Math.sin(a)*s];
    g.add(rod([x, y + h*.6, z], top, .003, '#6f8f4a', .003, 6), blob(.022, .018, .022, cols[k % 4], ...top, 12));
  }
}
function tableLamp(g, x, y, z, s = 1){
  g.add(lathe([[0, 0], [.06*s, 0], [.075*s, .05*s], [.08*s, .12*s], [.055*s, .2*s], [.018*s, .25*s], [.012*s, .3*s]], ceramic({roughness:.3}), x, y, z, 32));
  g.add(lathe([[.13*s, 0], [.1*s, .18*s]], glowMat('#f6ecd9', '#ffdca0', .35), x, y + .26*s, z, 40), blob(.03*s, .03*s, .03*s, glowMat('#fff', '#ffe2b0', 1), x, y + .31*s, z, 12));
}

export function buildFurniture(f) {
  const g = new THREE.Group(), w = M(f.w), d = M(f.d), c = f.color, bz = -d/2, R = rng(Math.round(f.w*7 + f.d*13));
  switch (f.type) {
    case 'bed': {
      const fr = woodM('#8d7258'), fab = fabric(c), fh = .3, mt = .22, top = fh + mt, n = Math.max(3, Math.round(w/.28)), sw = (w - .04)/n;
      g.add(box(w - .12, .06, d - .14, '#4a3e33', 0, 0, .03), rbox(w, fh - .06, d - .08, fr, 0, .06, .04, .015));        // 内缩踢脚 + 床箱
      g.add(rbox(w, 1.08, .06, fr, 0, 0, bz + .03, .012));                                                                 // 床头板
      for (let i = 0; i < n; i++) g.add(rbox(sw - .006, .62, .06, fabric(darker(c, .8)), -w/2 + .02 + sw*(i + .5), .42, bz + .08, .025));   // 竖向软包
      const md = d - .13, dd = md*.66, dz = d/2 - .015 - dd/2;
      g.add(rbox(w - .06, mt, md, '#f6f3ee', 0, fh, bz + .11 + md/2, .07));                                              // 床垫
      g.add(rbox(w + .02, .27, dd, fab, 0, top - .2, dz, .04), rbox(w + .024, .06, .22, fabric('#fbfaf7'), 0, top + .025, dz - dd/2 + .11, .025));   // 被子 + 翻边
      g.add(rbox(w + .05, .285, .42, fabric(darker(c, .62)), 0, top - .205, d/2 - .35, .03));                               // 床尾巾
      const np = w >= 1.3 ? 2 : 1, pw = (w - .16 - (np-1)*.06)/np;
      for (let i = 0; i < np; i++){
        const x = -w/2 + .08 + pw/2 + i*(pw + .06);
        g.add(rot(rbox(pw, .15, .42, fabric('#ffffff'), x, top - .01, bz + .34, .07), -.28), rot(rbox(pw*.62, .3, .1, fabric(i ? '#efe7da' : darker(c, .7)), x, top, bz + .54, .045), -.3));
      }
      break;
    }
    case 'sofa': case 'armchair': {
      const fab = fabric(c), dk = fabric(darker(c, .88)), a = Math.min(.18, w*.14), n = f.type === 'armchair' ? 1 : (w > 2.2 ? 3 : 2), cw = (w - 2*a)/n, bd = Math.min(.2, d*.24), lh = .12, sd = d - bd - .02;
      legs(g, w, d, lh, woodM('#3a3027'), .07, .018);
      g.add(rbox(w, .16, d, dk, 0, lh, 0, .03), rbox(w, .73, bd, dk, 0, lh, bz + bd/2, .06));
      [-1, 1].forEach(s => g.add(rbox(a, .5, d, dk, s*(w/2 - a/2), lh, 0, .07)));
      for (let i = 0; i < n; i++){
        const x = -w/2 + a + cw/2 + i*cw;
        g.add(rbox(cw - .012, .15, sd, fab, x, lh + .16, bz + bd + sd/2, .055), rot(rbox(cw - .03, .44, .16, fab, x, lh + .3, bz + bd + .08, .07), -.16));
      }
      if (n > 1) [-1, 1].forEach(s => g.add(rot(rbox(.42, .42, .12, fabric(s < 0 ? '#ece5d8' : darker(c, .7)), s*(w/2 - a - .26), lh + .32, bz + bd + .22, .06), -.3, s*-.25)));
      else g.add(rot(rbox(.4, .26, .1, fabric('#ece5d8'), 0, lh + .33, bz + bd + .2, .05), -.25));
      break;
    }
    case 'nightstand': {
      const wm = woodM(c);
      legs(g, w, d, .1, woodM('#5a4a3b'), .04, .014);
      g.add(rbox(w, .4, d - .02, wm, 0, .1, -.01, .012));
      fronts(g, -w/2 + .02, .12, w - .04, .36, d/2 - .02, 1, 2, wm, 'bar');
      tableLamp(g, -w*.12, .5, -d*.12);
      g.add(box(.16, .025, .22, '#2f5d62', w*.24, .5, .04), box(.14, .02, .2, '#e6dccd', w*.24, .525, .04));
      break;
    }
    case 'dresser': {
      const wm = woodM(c), r = Math.min(.34, w*.3);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .04), 0, b*(d/2 - .04)], [a*(w/2 - .05), .58, b*(d/2 - .05)], .012, wm, .02)));
      g.add(box(w - .04, .14, d - .04, wm, 0, .58), rbox(w, .03, d, wm, 0, .72, 0, .008));
      fronts(g, -w/2 + .03, .585, w - .06, .13, d/2 - .02, 2, 1, wm, 'knob');
      const mr = new THREE.Mesh(new THREE.TorusGeometry(r, .018, 12, 64), woodM(darker(c, .7))); mr.position.set(0, .77 + r, bz + .04); sh(mr);
      const mg = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mirror()); mg.position.set(0, .77 + r, bz + .035);
      g.add(mr, mg, box(.08, .03, .06, woodM(darker(c, .7)), 0, .75, bz + .04));
      [['#e7c9b5', .03, .09], ['#b9d0d8', .025, .12], ['#f0e3cf', .02, .07]].forEach(([cc, rr, hh], i) => g.add(cyl(rr, rr, hh, mat(cc, {roughness:.15, transparent:true, opacity:.8}), w*.25 + i*.06, .75, .02)));
      g.add(rbox(.16, .06, .1, woodM('#6b543f'), -w*.28, .75, .03, .01));
      const sz = d/2 + .25;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*.13, 0, sz + b*.13], [a*.12, .4, sz + b*.12], .01, wm, .014)));
      g.add(rbox(.34, .08, .34, fabric('#e8ddd0'), 0, .4, sz, .035));
      break;
    }
    case 'coffeetable': {
      const tm = mat(c, {roughness:.35}), lw = woodM('#3a3027');
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .05), 0, b*(d/2 - .05)], [a*(w/2 - .07), .365, b*(d/2 - .07)], .012, lw, .02)));
      g.add(rbox(w, .035, d, tm, 0, .365, 0, .015), rbox(w - .12, .02, d - .12, woodM(darker(c, .85)), 0, .12, 0, .006));
      g.add(box(.3, .03, .22, '#2f5d62', w*.2, .14, 0), box(.26, .025, .19, '#d9b36c', w*.2, .17, .01));
      g.add(rbox(.38, .015, .24, woodM('#6b543f'), -w*.2, .4, 0, .006), box(.22, .025, .16, '#e6dccd', -w*.22, .415, 0));
      g.add(lathe([[0, 0], [.025, 0], [.035, .07], [.034, .08]], ceramic({side:THREE.DoubleSide}), -w*.12, .415, .06, 20));
      vase(g, w*.24, .4, -.05, .055, .18, '#e9e2d6', R);
      break;
    }
    case 'rug':
      [[w, d, .01, c, 0], [w - .16, d - .16, .002, darker(c, .82), .01], [w - .26, d - .26, .002, lighter(c, .12), .0115]].forEach(([a, b, h, cc, y]) => {
        const r = box(a, h, b, mat(cc, {roughness:1}), 0, y + .002); r.castShadow = false; g.add(r);
      });
      break;
    case 'plant': {
      const r = Math.min(w, d)/2, H = .9 + r*1.6, pot = mat('#d9d2c5', {roughness:.6}), lm = [mat('#5f8f4e', {roughness:.6, side:THREE.DoubleSide}), mat('#79a862', {roughness:.6, side:THREE.DoubleSide})];
      g.add(lathe([[0, 0], [r*.4, 0], [r*.44, .02], [r*.54, .36], [r*.57, .4], [r*.52, .4], [r*.5, .37], [0, .37]], pot, 0, 0, 0, 36), cyl(r*.49, r*.49, .005, '#4a3a2c', 0, .368, 0, 28));
      g.add(rod([0, .37, 0], [.02, H*.62, -.01], .016, '#6b5540', .009));
      const N = 20 + Math.round(r*36), sc = Math.sqrt(r/.25);
      for (let k = 0; k < N; k++){
        const t = k/N, a = k*2.399 + R()*.3, len = (.14 + R()*.08)*(1.1 - t*.4)*sc, s0 = .03 + R()*.08*sc, p = new THREE.Group();
        p.position.set(0, H*(.42 + .58*t), 0); p.rotation.set(0, -a, .1 + t*.5 + R()*.3, 'YXZ');
        const lf = blob(len/2, .005, len*.27, lm[k % 2], s0 + len/2, 0, 0, 16); lf.rotation.z = -.3;
        p.add(box(s0, .005, .005, '#6f8f4a', s0/2, 0, 0), lf); g.add(p);
      }
      break;
    }
    case 'floorlamp': {
      const r = Math.min(w, d)/2, lm = mat(c, {roughness:.35, metalness:.5});
      g.add(lathe([[0, 0], [r*.55, 0], [r*.58, .012], [r*.5, .03], [.02, .035]], lm, 0, 0, 0, 40), rod([0, .03, 0], [0, 1.36, 0], .011, lm));
      g.add(lathe([[r*.85, 0], [r*.55, .36]], glowMat('#f6ecd9', '#ffdca0', .45), 0, 1.22, 0, 48), blob(.035, .035, .035, glowMat('#fff', '#ffe2b0', 1.2), 0, 1.36, 0, 12));
      g.add(ring(r*.85, .004, lm, 0, 1.22, 0), ring(r*.55, .004, lm, 0, 1.58, 0));
      break;
    }
  }
  return g;
}
