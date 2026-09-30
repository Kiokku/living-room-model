import * as THREE from 'three';

// 米。width/length 来自实测，rearWindow.widthRatio 来自用户估算；其余参数按视频估算。
export const ROOM = {
  width: 3.5,
  length: 5.4,
  height: 2.68,
  entry: { left: -1.36, right: -0.66, height: 2.1 },
  sideDoor: { far: -2.28, near: -1.58, height: 2.1 },
  rearWindow: { widthRatio: 0.65, sill: 0.8, top: 2.18 },
  cabinet: { left: 0.06, right: 1.68, depth: 0.43, height: 2.28 },
};

const photoLoader = new THREE.TextureLoader();
const floorPhoto = photoLoader.load(`${import.meta.env.BASE_URL}textures/floor-from-video.jpg`);
floorPhoto.colorSpace = THREE.SRGBColorSpace;
floorPhoto.anisotropy = 8;
const curtainPhoto = photoLoader.load(`${import.meta.env.BASE_URL}textures/curtain-from-video.jpg`);
curtainPhoto.colorSpace = THREE.SRGBColorSpace;
curtainPhoto.anisotropy = 8;

const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.32 });
const trim = new THREE.MeshStandardMaterial({ color: 0xe1ded6, roughness: 0.95 });
const wood = new THREE.MeshStandardMaterial({ color: 0x76543d, roughness: 0.82 });
const cabinetWhite = new THREE.MeshStandardMaterial({ color: 0xfafaf8, roughness: 0.64 });
const cabinetBack = new THREE.MeshStandardMaterial({ color: 0xe8e8e3, roughness: 0.84 });
const doorWhite = new THREE.MeshStandardMaterial({ color: 0xe7e8e3, roughness: 0.82 });
const ceilingWhite = new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.22 });
const black = new THREE.MeshStandardMaterial({ color: 0x242522, roughness: 0.55 });
const windowGlass = new THREE.MeshPhysicalMaterial({ color: 0xf2f8f8, roughness: 0.16, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });

function box(parent, size, position, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function makeCurtain(parent) {
  const panels = [];
  for (const side of [-1, 1]) {
    const vertices = [];
    const uvs = [];
    const indices = [];
    const count = 70;
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const x = side < 0 ? 1.64 * u : 1.64 * (u - 1);
      const fold = 0.03 * Math.sin(u * Math.PI * 16);
      const hem = 0.035 + 0.018 * (1 + Math.cos(u * Math.PI * 16));
      vertices.push(x, hem, -2.51 + fold, x, 2.49, -2.51 + fold);
      uvs.push(u, 0, u, 1);
      if (i < count) {
        const p = i * 2;
        indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const panel = new THREE.Group();
    panel.position.x = side * 1.64;
    const curtain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: curtainPhoto, side: THREE.DoubleSide, roughness: 0.98 }));
    curtain.name = '客厅窗帘（遮挡墙面窗）';
    curtain.castShadow = true;
    panel.add(curtain);
    parent.add(panel);
    panels.push(panel);
  }
  box(parent, [3.32, 0.025, 0.05], [0, 2.49, -2.51], trim, '窗帘轨道');
  return panels;
}

function makeRearWindow(parent) {
  const { widthRatio, sill, top } = ROOM.rearWindow;
  const halfWidth = ROOM.width * widthRatio / 2;
  const windowHeight = top - sill;
  const pane = box(parent, [halfWidth * 2 - 0.06, windowHeight - 0.06, 0.025], [0, (sill + top) / 2, -2.74], windowGlass, '客厅墙面窗玻璃（宽约占墙面65%）');
  pane.castShadow = false;
  for (const x of [-halfWidth, 0, halfWidth]) box(parent, [0.045, windowHeight + 0.05, 0.075], [x, (sill + top) / 2, -2.72], trim, '客厅后窗竖框');
  for (const y of [sill, top]) box(parent, [halfWidth * 2 + 0.05, 0.045, 0.075], [0, y, -2.72], trim, '客厅后窗横框');
}

function makeCabinet(parent) {
  const { left, right, depth, height } = ROOM.cabinet;
  const width = right - left;
  const midX = (left + right) / 2;
  const front = 2.7 - depth;
  const back = 2.7;
  const z = (front + back) / 2;
  const panel = 0.025;
  const shelf = (x0, x1, y) => box(parent, [x1 - x0, panel, depth], [(x0 + x1) / 2, y, z], cabinetWhite);
  box(parent, [width, height, 0.018], [midX, height / 2, back - 0.015], cabinetBack, '固定柜背板');
  for (const x of [left, right, 1.17]) {
    box(parent, [panel, height, depth], [x, height / 2, z], cabinetWhite, '固定柜侧板');
  }
  shelf(left, right, 0.04);
  shelf(left, right, 0.68);
  shelf(left, right, height);
  shelf(left, right, 1.66);
  for (const y of [1.03, 1.34, 1.96]) shelf(1.17, right, y);
  box(parent, [panel, 0.61, depth], [0.47, 1.97, z], cabinetWhite);
  const doors = [];
  const leafWidth = (width - 0.055) / 2;
  for (const side of [-1, 1]) {
    const door = new THREE.Group();
    door.position.set(side < 0 ? left + 0.025 : right - 0.025, 0, front - 0.014);
    const localX = side < 0 ? leafWidth / 2 : -leafWidth / 2;
    box(door, [leafWidth - 0.006, 0.58, 0.018], [localX, 0.36, 0], cabinetWhite, '固定柜下柜门');
    box(door, [0.09, 0.012, 0.014], [side < 0 ? leafWidth - 0.13 : -leafWidth + 0.13, 0.55, -0.02], black, '固定柜门把手');
    parent.add(door);
    doors.push(door);
  }
  return doors;
}

function makeDoors(parent) {
  const e = ROOM.entry;
  for (const x of [e.left - 0.025, e.right + 0.025]) {
    box(parent, [0.04, e.height + 0.055, 0.105], [x, (e.height + 0.055) / 2, 2.68], trim, '入口门框');
  }
  box(parent, [e.right - e.left + 0.09, 0.045, 0.105], [(e.left + e.right) / 2, e.height + 0.04, 2.68], trim);
  const entryDoor = new THREE.Group();
  entryDoor.position.set(e.left, 0, 2.65);
  const leafWidth = e.right - e.left - 0.02;
  box(entryDoor, [leafWidth, 2.07, 0.035], [leafWidth / 2, 1.035, 0], doorWhite, '入口门扇');
  box(entryDoor, [0.13, 0.025, 0.035], [leafWidth - 0.14, 1.02, -0.04], black, '入口门把手');
  parent.add(entryDoor);

  const s = ROOM.sideDoor;
  const zMid = (s.far + s.near) / 2;
  for (const z of [s.far - 0.025, s.near + 0.025]) {
    box(parent, [0.105, s.height + 0.055, 0.04], [-1.73, (s.height + 0.055) / 2, z], trim, '侧门门框');
  }
  box(parent, [0.105, 0.045, s.near - s.far + 0.09], [-1.73, s.height + 0.04, zMid], trim);
  const sideDoor = new THREE.Group();
  sideDoor.position.set(-1.73, 0, s.near);
  box(sideDoor, [0.035, 2.05, s.near - s.far - 0.045], [0.022, 1.025, -0.35], doorWhite, '靠窗侧门（关闭示意）');
  box(sideDoor, [0.035, 0.025, 0.13], [0.063, 1.0, -0.19], black, '侧门把手');
  parent.add(sideDoor);
  return { entryDoor, sideDoor };
}

function makeWalls(parent, height, cutaway) {
  const group = new THREE.Group();
  const e = ROOM.entry;
  const s = ROOM.sideDoor;
  const nearHeight = cutaway ? 0.8 : height;
  const wallX = (a, b, z, wallHeight = nearHeight) => box(group, [b - a, wallHeight, 0.09], [(a + b) / 2, wallHeight / 2, z], white, '墙体');
  const wallZ = (a, b, x, wallHeight = nearHeight) => box(group, [0.09, wallHeight, b - a], [x, wallHeight / 2, (a + b) / 2], white, '墙体');
  const halfWindow = ROOM.width * ROOM.rearWindow.widthRatio / 2;
  wallX(-1.75, -halfWindow, -2.74, height);
  wallX(halfWindow, 1.75, -2.74, height);
  wallX(-halfWindow, halfWindow, -2.74, ROOM.rearWindow.sill);
  wallX(-halfWindow, halfWindow, -2.74, height - ROOM.rearWindow.top).position.y = (ROOM.rearWindow.top + height) / 2;
  wallX(-1.75, e.left, 2.74);
  wallX(e.right, 1.75, 2.74);
  wallZ(-2.7, s.far, -1.79, height);
  wallZ(s.near, 2.7, -1.79, height);
  wallZ(-2.7, 2.7, 1.79, height);
  wallZ(s.far, s.near, -1.79, height - s.height).position.y = s.height + (height - s.height) / 2;
  if (!cutaway) {
    wallX(e.left, e.right, 2.74, height - e.height).position.y = e.height + (height - e.height) / 2;
  }
  parent.add(group);
  return group;
}

function makeDimensions(parent) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0xb36d4b });
  const line = (...points) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.025, z)));
    group.add(new THREE.Line(geometry, material));
  };
  line([-1.75, 3.13], [1.75, 3.13]);
  line([-1.75, 3.03], [-1.75, 3.23]);
  line([1.75, 3.03], [1.75, 3.23]);
  line([2.16, -2.7], [2.16, 2.7]);
  line([2.06, -2.7], [2.26, -2.7]);
  line([2.06, 2.7], [2.26, 2.7]);
  for (const [label, x, z] of [['350 cm', 0, 3.43], ['540 cm', 2.57, 0]]) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#74452f';
    ctx.font = '600 62px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(label, 256, 82);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.position.set(x, 0.12, z);
    sprite.scale.set(1.2, 0.3, 1);
    group.add(sprite);
  }
  parent.add(group);
  return group;
}

export function createRoomModel() {
  const root = new THREE.Group();
  root.name = '客厅示意模型（实测 3.50 × 5.40 m）';
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.length),
    new THREE.MeshStandardMaterial({ map: floorPhoto, roughness: 0.76, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = '地面 3.50 × 5.40 m';
  root.add(floor);
  box(root, [3.62, 0.12, 5.52], [0, -0.07, 0], new THREE.MeshStandardMaterial({ color: 0xd9d5cd }), '地台');

  const fullWalls = makeWalls(root, ROOM.height, false);
  const cutWalls = makeWalls(root, ROOM.height, true);
  fullWalls.visible = false;
  for (const [size, pos] of [
    [[3.5, 0.07, 0.02], [0, 0.035, -2.69]],
    [[0.02, 0.07, 5.4], [1.745, 0.035, 0]],
    [[0.02, 0.07, 2.7 - ROOM.sideDoor.near], [-1.745, 0.035, (ROOM.sideDoor.near + 2.7) / 2]],
    [[ROOM.entry.left + 1.75, 0.07, 0.02], [(ROOM.entry.left - 1.75) / 2, 0.035, 2.69]],
    [[1.75 - ROOM.entry.right, 0.07, 0.02], [(ROOM.entry.right + 1.75) / 2, 0.035, 2.69]],
  ]) box(root, size, pos, wood, '深木色踢脚线');

  const doors = makeDoors(root);
  const cabinetDoors = makeCabinet(root);
  makeRearWindow(root);
  const curtains = makeCurtain(root);

  const ceiling = new THREE.Group();
  box(ceiling, [3.5, 0.055, 5.4], [0, ROOM.height + 0.015, 0], ceilingWhite, '顶面（层高估算）');
  for (const [size, pos] of [
    [[3.5, 0.11, 0.18], [0, 2.51, -2.59]],
    [[3.5, 0.11, 0.18], [0, 2.51, 2.59]],
    [[0.18, 0.11, 5.1], [-1.66, 2.51, 0]],
    [[0.18, 0.11, 5.1], [1.66, 2.51, 0]],
  ]) box(ceiling, size, pos, ceilingWhite, '回字形吊顶（示意）');
  box(ceiling, [0.88, 0.02, 0.88], [0, 2.64, 0], new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35 }), '方形顶灯');
  ceiling.visible = false;
  root.add(ceiling);

  const dimensions = makeDimensions(root);
  return { root, fullWalls, cutWalls, ceiling, dimensions, curtains, doors, cabinetDoors };
}
