import * as THREE from 'three';
import { ROOM } from './roomModel.js';

// 主卧宽度由用户提供；入口端与客厅齐平，窗边墙对齐客厅侧门靠入口侧的边线。
const bedroomFar = ROOM.sideDoor.near;
export const BEDROOM = {
  width: 3.45,
  length: ROOM.length / 2 - bedroomFar,
  height: 2.68,
  left: -5.29,
  right: -1.84,
  far: bedroomFar,
  near: 2.7,
  entry: { left: -3.13, right: -2.43, height: 2.08 },
  farDoor: { left: -2.93, right: -2.23, height: 2.08 },
  window: { left: -4.73, right: -3.29, sill: 0.88, top: 2.06 },
  wardrobe: { left: -5.19, right: -3.31, depth: 0.55, partitions: [-4.68, -3.84] },
};

const floorPhoto = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/floor-from-video.jpg`);
floorPhoto.colorSpace = THREE.SRGBColorSpace;
floorPhoto.anisotropy = 8;
const curtainPhoto = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/curtain-from-video.jpg`);
curtainPhoto.colorSpace = THREE.SRGBColorSpace;

const wallWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.32 });
const trim = new THREE.MeshStandardMaterial({ color: 0xe8e7e2, roughness: 0.9 });
const doorWhite = new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.84 });
const wood = new THREE.MeshStandardMaterial({ color: 0xa7875c, roughness: 0.86 });
const woodDark = new THREE.MeshStandardMaterial({ color: 0x755640, roughness: 0.86 });
const wardrobeWhite = new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.73 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0xf2f8f8, metalness: 0.05, roughness: 0.14, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
const black = new THREE.MeshStandardMaterial({ color: 0x252522, roughness: 0.55 });

function box(parent, size, position, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function walls(parent, cutaway) {
  const group = new THREE.Group();
  const { left, right, far, near, height, entry, farDoor, window } = BEDROOM;
  const short = cutaway ? 0.8 : height;
  const xWall = (a, b, z, h = height, y = h / 2) => box(group, [b - a, h, 0.09], [(a + b) / 2, y, z], wallWhite, '主卧白墙');
  const zWall = (a, b, x, h = height) => box(group, [0.09, h, b - a], [x, h / 2, (a + b) / 2], wallWhite, '主卧白墙');

  zWall(far, near, left - 0.045);
  zWall(far, near, right - 0.045);
  xWall(left, entry.left, near + 0.045, short);
  xWall(entry.right, right, near + 0.045, short);
  if (!cutaway) xWall(entry.left, entry.right, near + 0.045, height - entry.height, entry.height + (height - entry.height) / 2);

  xWall(left, window.left, far - 0.045);
  xWall(window.right, farDoor.left, far - 0.045);
  xWall(farDoor.right, right, far - 0.045);
  xWall(window.left, window.right, far - 0.045, window.sill, window.sill / 2);
  xWall(window.left, window.right, far - 0.045, height - window.top, window.top + (height - window.top) / 2);
  xWall(farDoor.left, farDoor.right, far - 0.045, height - farDoor.height, farDoor.height + (height - farDoor.height) / 2);
  parent.add(group);
  return group;
}

function windowAndDoors(parent) {
  const { entry, farDoor, window, far, near } = BEDROOM;
  const windowMiddle = (window.left + window.right) / 2;
  const pane = box(parent, [window.right - window.left, window.top - window.sill, 0.028], [windowMiddle, (window.top + window.sill) / 2, far], glass, '主卧双扇窗玻璃');
  pane.castShadow = false;
  for (const x of [window.left, windowMiddle, window.right]) box(parent, [0.045, window.top - window.sill + 0.06, 0.07], [x, (window.top + window.sill) / 2, far + 0.025], trim, '窗框');
  for (const y of [window.sill, window.top]) box(parent, [window.right - window.left + 0.06, 0.045, 0.07], [windowMiddle, y, far + 0.025], trim, '窗框');
  box(parent, [window.right - window.left + 0.22, 0.04, 0.18], [windowMiddle, window.sill - 0.025, far + 0.1], wood, '木色窗台');

  const balconyDoor = new THREE.Group();
  balconyDoor.position.set(farDoor.left, 0, far + 0.02);
  box(balconyDoor, [farDoor.right - farDoor.left - 0.035, farDoor.height - 0.035, 0.04], [(farDoor.right - farDoor.left) / 2, farDoor.height / 2, 0], doorWhite, '主卧通阳台白门（位置估算）');
  box(balconyDoor, [0.12, 0.024, 0.045], [0.2, 1.0, 0.035], black, '窗边门把手');
  parent.add(balconyDoor);
  for (const x of [entry.left, entry.right]) box(parent, [0.04, entry.height + 0.05, 0.1], [x, (entry.height + 0.05) / 2, near], trim, '主卧入门门框');
  const leaf = new THREE.Group();
  leaf.position.set(entry.left, 0, near - 0.06);
  box(leaf, [entry.right - entry.left - 0.02, entry.height - 0.025, 0.035], [(entry.right - entry.left) / 2, entry.height / 2, 0], doorWhite, '主卧入门门扇');
  box(leaf, [0.13, 0.022, 0.04], [entry.right - entry.left - 0.14, 1.01, -0.035], black, '主卧门把手');
  parent.add(leaf);
  return { entryDoor: leaf, balconyDoor };
}

function wardrobe(parent) {
  const { left, right, depth, partitions } = BEDROOM.wardrobe;
  const near = BEDROOM.near - 0.035;
  const front = near - depth;
  const mid = (near + front) / 2;
  const height = 2.37;
  box(parent, [right - left, height, 0.02], [(left + right) / 2, height / 2, near], wardrobeWhite, '主卧固定衣柜背板');
  box(parent, [right - left, height, 0.008], [(left + right) / 2, height / 2, near - 0.018], wood, '衣柜木色内衬');
  for (const x of [left, ...partitions, right]) box(parent, [0.025, height, depth], [x, height / 2, mid], wardrobeWhite, '衣柜隔板');
  for (const y of [0.04, 1.99, height]) box(parent, [right - left, 0.025, depth], [(left + right) / 2, y, mid], wardrobeWhite, '衣柜层板');
  for (const y of [0.52, 0.85, 1.18, 1.5]) box(parent, [0.49, 0.018, depth - 0.03], [-4.94, y, mid], wood, '衣柜开放格');
  for (const y of [0.17, 0.38]) box(parent, [0.73, 0.19, 0.025], [-4.26, y, front - 0.015], wardrobeWhite, '衣柜抽屉');
  for (const x of [-4.45, -3.63]) box(parent, [0.045, 0.045, depth - 0.04], [x, 1.72, mid], woodDark, '衣柜挂衣杆');
  for (const x of [-5.04, -4.41, -3.61]) box(parent, [0.55, 0.31, depth + 0.015], [x, 2.53, mid], wardrobeWhite, '衣柜顶柜');
  const doors = [];
  for (const [x, width, angle] of [[-4.92, 0.48, -0.55], [-4.47, 0.43, 0.5], [-3.62, 0.52, -0.65]]) {
    const door = new THREE.Group();
    door.position.set(x - width / 2, 0, front);
    box(door, [width, 1.92, 0.02], [width / 2, 1.02, 0], wardrobeWhite, '衣柜门');
    parent.add(door);
    doors.push({ node: door, openAngle: angle });
  }
  return doors;
}

function details(parent) {
  const { left, right, far, near, length, window } = BEDROOM;
  box(parent, [0.025, 0.73, length - 0.07], [left + 0.065, 0.365, (far + near) / 2], wood, '主卧木色半墙');
  box(parent, [0.045, 0.026, length - 0.07], [left + 0.08, 0.74, (far + near) / 2], woodDark, '半墙收口');
  box(parent, [0.024, 0.09, length], [right - 0.012, 0.045, (far + near) / 2], woodDark, '主卧踢脚线');
  const curtains = [];
  const curtainLeft = window.left - 0.1;
  const curtainRight = window.right + 0.1;
  const halfWidth = (curtainRight - curtainLeft) / 2;
  for (const side of [-1, 1]) {
    const panel = new THREE.Group();
    panel.position.set(side < 0 ? curtainLeft : curtainRight, 0, far + 0.23);
    panel.scale.x = 0.32;
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth, 2.25), new THREE.MeshStandardMaterial({ map: curtainPhoto, side: THREE.DoubleSide, roughness: 1 }));
    cloth.position.set(side < 0 ? halfWidth / 2 : -halfWidth / 2, 1.17, 0);
    cloth.name = '主卧窗侧收拢窗帘';
    cloth.castShadow = true;
    panel.add(cloth);
    parent.add(panel);
    curtains.push(panel);
  }
  return curtains;
}

function makeDimensions(parent) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0xb36d4b });
  const line = (a, b) => group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], 0.025, a[1]), new THREE.Vector3(b[0], 0.025, b[1])]), material));
  const { far, near, length } = BEDROOM;
  line([-5.29, 3.13], [-1.84, 3.13]);
  line([-5.76, far], [-5.76, near]);
  for (const [label, x, z] of [['345 cm', -3.56, 3.43], [`约 ${Math.round(length * 100)} cm`, -6.17, (far + near) / 2]]) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#74452f'; ctx.font = '600 56px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(label, 256, 82);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
    sprite.position.set(x, 0.12, z); sprite.scale.set(1.35, 0.33, 1);
    group.add(sprite);
  }
  parent.add(group);
  return group;
}

export function createBedroomModel() {
  const root = new THREE.Group();
  root.name = `主卧示意模型（宽 3.45 m；长约 ${BEDROOM.length.toFixed(2)} m）`;
  const { width, length, left, right, far, near, height } = BEDROOM;
  const centerX = (left + right) / 2;
  const centerZ = (far + near) / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshStandardMaterial({ map: floorPhoto, roughness: 0.76, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(centerX, 0, centerZ); floor.name = '主卧木地板';
  root.add(floor);
  box(root, [width + 0.12, 0.12, length + 0.12], [centerX, -0.07, centerZ], new THREE.MeshStandardMaterial({ color: 0xd9d5cd }), '主卧地台');
  const fullWalls = walls(root, false);
  const cutWalls = walls(root, true);
  fullWalls.visible = false;
  const doors = windowAndDoors(root);
  const wardrobeDoors = wardrobe(root);
  const curtains = details(root);

  const ceiling = new THREE.Group();
  box(ceiling, [width, 0.055, length], [centerX, height + 0.015, centerZ], wallWhite, '主卧顶面（层高估算）');
  for (const [size, position] of [
    [[width, 0.1, 0.16], [centerX, 2.52, far + 0.09]],
    [[width, 0.1, 0.16], [centerX, 2.52, near - 0.09]],
    [[0.16, 0.1, length], [left + 0.09, 2.52, centerZ]],
    [[0.16, 0.1, length], [right - 0.09, 2.52, centerZ]],
  ]) box(ceiling, size, position, wallWhite, '主卧回字形吊顶（示意）');
  box(ceiling, [0.7, 0.025, 0.7], [centerX, 2.64, centerZ], new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 }), '主卧吸顶灯');
  ceiling.visible = false;
  root.add(ceiling);
  const dimensions = makeDimensions(root);
  return { root, fullWalls, cutWalls, ceiling, dimensions, doors, wardrobeDoors, curtains };
}

// 阳台只确定在主卧窗外且为封闭空间；深度和窗扇分格均为示意。
export function createBalconyModel() {
  const root = new THREE.Group();
  root.name = '主卧外封闭阳台（范围估算）';
  const { left, right, width, height } = BEDROOM;
  const far = -ROOM.length / 2;
  const near = BEDROOM.far;
  const depth = near - far;
  const centerX = (left + right) / 2;
  const centerZ = (far + near) / 2;
  const frame = new THREE.MeshStandardMaterial({ color: 0xd8d8d3, metalness: 0.2, roughness: 0.45 });
  const parapet = new THREE.MeshStandardMaterial({ color: 0xf8f8f6, roughness: 0.9 });
  const balconyGlass = new THREE.MeshPhysicalMaterial({ color: 0xf2f8f8, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileCanvas.height = 128;
  const ctx = tileCanvas.getContext('2d');
  ctx.fillStyle = '#bdbbb5'; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#989892'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, 125, 125);
  const tile = new THREE.CanvasTexture(tileCanvas);
  tile.colorSpace = THREE.SRGBColorSpace;
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.repeat.set(width / 0.52, depth / 0.52);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.9, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0.012, centerZ);
  floor.name = '阳台地砖（示意贴图）';
  root.add(floor);
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 192;
  const labelCtx = labelCanvas.getContext('2d');
  labelCtx.fillStyle = 'rgba(248,247,242,0.9)'; labelCtx.fillRect(44, 14, 424, 158);
  labelCtx.fillStyle = '#3d4b4a'; labelCtx.textAlign = 'center';
  labelCtx.font = '600 50px system-ui'; labelCtx.fillText('封闭阳台', 256, 78);
  labelCtx.font = '36px system-ui'; labelCtx.fillText(`深度约 ${Math.round(depth * 100)} cm`, 256, 139);
  const dimensions = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas), transparent: true, depthTest: false }));
  dimensions.position.set(centerX, 0.14, centerZ);
  dimensions.scale.set(1.55, 0.58, 1);
  dimensions.renderOrder = 10;
  root.add(dimensions);
  box(root, [width + 0.12, 0.12, depth + 0.08], [centerX, -0.07, centerZ], parapet, '阳台地台');
  // 外立面与侧面为封窗；与客厅相邻的一边沿用客厅侧门和墙体。
  box(root, [width + 0.09, 0.82, 0.09], [centerX, 0.41, far - 0.045], parapet, '阳台外侧矮墙');
  box(root, [0.09, 0.82, depth], [left - 0.045, 0.41, centerZ], parapet, '阳台左侧矮墙');
  box(root, [width, height - 0.82, 0.025], [centerX, (height + 0.82) / 2, far - 0.045], balconyGlass, '阳台外侧封窗玻璃').castShadow = false;
  box(root, [0.025, height - 0.82, depth], [left - 0.045, (height + 0.82) / 2, centerZ], balconyGlass, '阳台左侧封窗玻璃').castShadow = false;
  for (const x of [left, left + width / 3, left + width * 2 / 3, right]) {
    box(root, [0.04, height - 0.82, 0.05], [x, (height + 0.82) / 2, far - 0.035], frame, '阳台外窗竖框');
  }
  for (const y of [0.82, 1.79, height]) {
    box(root, [width, 0.045, 0.05], [centerX, y, far - 0.035], frame, '阳台外窗横框');
    box(root, [0.05, 0.045, depth], [left - 0.035, y, centerZ], frame, '阳台侧窗横框');
  }
  for (const z of [far, centerZ, near]) box(root, [0.05, height - 0.82, 0.04], [left - 0.035, (height + 0.82) / 2, z], frame, '阳台侧窗竖框');
  const ceiling = new THREE.Group();
  box(ceiling, [width, 0.055, depth], [centerX, height + 0.015, centerZ], parapet, '阳台顶面');
  ceiling.visible = false;
  root.add(ceiling);
  return { root, ceiling, dimensions, depth };
}
