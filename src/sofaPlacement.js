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

export function furnitureBounds(item, x = item.position.x, z = item.position.z) {
  const bounds = item.userData?.bounds || { left: -SOFA.length / 2, right: SOFA.length / 2, far: -SOFA.depth / 2, near: SOFA.depth / 2 };
  const angle = item.rotation.y;
  const points = [bounds.left, bounds.right].flatMap((px) => [bounds.far, bounds.near].map((pz) => ({
    x: x + Math.cos(angle) * px + Math.sin(angle) * pz,
    z: z - Math.sin(angle) * px + Math.cos(angle) * pz,
  })));
  return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
    far: Math.min(...points.map(p => p.z)), near: Math.max(...points.map(p => p.z)) };
}

export function canPlaceFurniture(x, z, items, room, bedroom, item) {
  const next = furnitureBounds(item, x, z);
  const within = (area) => next.left >= area.left + gap && next.right <= area.right - gap
    && next.far >= area.far + gap && next.near <= area.near - gap;
  const living = within({ left: -room.width / 2, right: room.width / 2, far: -room.length / 2, near: room.length / 2 });
  const inBedroom = bedroom && within(bedroom);
  if (!living && !inBedroom) return false;
  const rug = item.userData.furnitureType === 'rug';
  const blocked = living ? [
    reserved[0],
    ...(!rug ? reserved.slice(1, 3) : []),
    { left: room.cabinet.left, right: room.cabinet.right,
      far: room.length / 2 - room.cabinet.depth - 0.024, near: room.length / 2 },
  ] : [
    { left: bedroom.left, right: bedroom.right, far: bedroom.far, near: bedroom.far + 0.15 },
    ...(!rug ? [
      { left: bedroom.farDoor.left, right: bedroom.farDoor.right, far: bedroom.far, near: bedroom.far + 0.75 },
      { left: bedroom.entry.left, right: bedroom.entry.right, far: bedroom.near - 0.8, near: bedroom.near },
    ] : []),
    { left: bedroom.wardrobe.left, right: bedroom.wardrobe.right,
      far: bedroom.near - bedroom.wardrobe.depth - (rug ? 0.035 : 0.5), near: bedroom.near },
  ];
  if (blocked.some(area => overlaps(next, area))) return false;
  if (rug) return true;
  return !items.some(other => other !== item && other.userData.furnitureType !== 'rug' && overlaps(next, furnitureBounds(other)));
}
