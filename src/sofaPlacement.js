import { SOFA } from './sofaModel.js';

const gap = 0.04;
const reserved = [
  { left: -1.75, right: 1.75, far: -2.55, near: -2.45 }, // 后窗帘
  { left: -1.75, right: -0.98, far: -2.38, near: -1.48 }, // 侧门开启区
  { left: -1.52, right: -0.50, far: 1.85, near: 2.7 }, // 入口门开启区
  { left: -0.02, right: 1.75, far: 1.48, near: 2.7 }, // 固定柜及柜门开启区
];

const footprint = (x, z) => ({
  left: x - SOFA.depth / 2,
  right: x + SOFA.depth / 2,
  far: z - SOFA.length / 2,
  near: z + SOFA.length / 2,
});

const overlaps = (a, b) => a.left < b.right + gap && a.right > b.left - gap
  && a.far < b.near + gap && a.near > b.far - gap;

export function canPlaceSofa(x, z, sofas, room, moving = null) {
  const next = footprint(x, z);
  if (next.left < -room.width / 2 + gap || next.right > room.width / 2 - gap
    || next.far < -room.length / 2 + gap || next.near > room.length / 2 - gap) return false;
  if (reserved.some((area) => overlaps(next, area))) return false;
  return !sofas.some((sofa) => sofa !== moving && overlaps(next, footprint(sofa.position.x, sofa.position.z)));
}
