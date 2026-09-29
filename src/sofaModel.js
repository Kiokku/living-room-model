import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// 米；坐宽指两侧抱枕之间约 1.60 m 的可坐空间。
export const SOFA = { length: 2.1, depth: 0.95, height: 0.82, seatWidth: 1.6 };
export const SOFA_COLORS = {
  cream: { label: '奶油色', fabric: 0xffffff, seam: 0xc7bfae },
  camel: { label: '浅驼色', fabric: 0xbd9e91, seam: 0x947665 },
};

function fabricTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      const grain = ((x * 37 + y * 73 + x * y * 11) % 11) - 5;
      const weave = (x % 3 === 0 ? -2 : 0) + (y % 3 === 0 ? 2 : 0);
      pixels.data[i] = 234 + grain + weave;
      pixels.data[i + 1] = 229 + grain + weave;
      pixels.data[i + 2] = 217 + grain + weave;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 8;
  return texture;
}

function cushionGeometry(width, height, depth, radius, phase, face) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 8, radius);
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    if (face === 'top' && normals.getY(i) > 0.65) {
      const taper = Math.max(0, 1 - (x / (width / 2)) ** 4 - (z / (depth / 2)) ** 4);
      positions.setY(i, y + taper * (0.008 + 0.004 * Math.sin(x * 23 + phase) * Math.cos(z * 19)));
    }
    if (face === 'front' && normals.getZ(i) > 0.65) {
      const taper = Math.max(0, 1 - (x / (width / 2)) ** 4 - (y / (height / 2)) ** 4);
      positions.setZ(i, z + taper * (0.009 * Math.sin(x * 19 + phase) + 0.006 * Math.sin(y * 33 + x * 8)));
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function createSofaModel() {
  const root = new THREE.Group();
  root.name = 'NORHOR HUG 沙发 210 × 95 × 82 cm';
  const cloth = new THREE.MeshStandardMaterial({ name: '沙发布艺', map: fabricTexture(), roughness: 0.93 });
  const seam = new THREE.MeshStandardMaterial({ name: '沙发滚边', color: SOFA_COLORS.cream.seam, roughness: 1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x252724, metalness: 0.7, roughness: 0.48 });

  const part = (name, geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const rounded = (name, size, radius, position, material = cloth) =>
    part(name, new RoundedBoxGeometry(...size, 6, radius), material, ...position);

  // 正面为局部 +Z；靠背在 -Z，之后由场景决定摆放方向。
  rounded('布艺座框', [2.1, 0.15, 0.95], 0.065, [0, 0.275, 0]);
  rounded('靠背外框', [2.1, 0.53, 0.14], 0.06, [0, 0.555, -0.405]);
  for (const side of [-1, 1]) {
    rounded(`${side < 0 ? '左' : '右'}圆角扶手`, [0.11, 0.40, 0.92], 0.05, [side * 0.995, 0.46, 0]);
    part(`${side < 0 ? '左' : '右'}坐垫`, cushionGeometry(0.91, 0.16, 0.70, 0.07, side, 'top'), cloth,
      side * 0.46, 0.42, 0.105);
    part(`${side < 0 ? '左' : '右'}靠包`, cushionGeometry(0.92, 0.37, 0.23, 0.09, side * 2, 'front'), cloth,
      side * 0.46, 0.615, -0.28);
    const pillow = part(`${side < 0 ? '左' : '右'}侧抱枕`, cushionGeometry(0.14, 0.36, 0.38, 0.06, side * 3, 'front'), cloth,
      side * 0.87, 0.61, 0.07);
    pillow.rotation.z = side * 0.08;
    for (const z of [-0.34, 0.34]) {
      part('细黑色金属脚', new THREE.CylinderGeometry(0.011, 0.014, 0.19, 8), metal,
        side * 0.89, 0.095, z);
    }
  }
  part('中央支脚', new THREE.CylinderGeometry(0.01, 0.013, 0.19, 8), metal, 0, 0.095, 0.34);
  for (const x of [-0.46, 0.46]) {
    part('坐垫前沿滚边', new THREE.CylinderGeometry(0.004, 0.004, 0.89, 6), seam,
      x, 0.372, 0.454).rotation.z = Math.PI / 2;
  }
  return root;
}

export function setSofaColor(sofa, color) {
  const choice = SOFA_COLORS[color];
  sofa.traverse((node) => {
    if (!node.isMesh) return;
    if (node.material.name === '沙发布艺') node.material.color.setHex(choice.fabric);
    if (node.material.name === '沙发滚边') node.material.color.setHex(choice.seam);
  });
  sofa.userData.color = color;
}

export function cloneSofaModel(template, color) {
  const sofa = template.clone(true);
  const copies = new Map();
  sofa.traverse((node) => {
    if (!node.isMesh || !['沙发布艺', '沙发滚边'].includes(node.material.name)) return;
    if (!copies.has(node.material)) copies.set(node.material, node.material.clone());
    node.material = copies.get(node.material);
  });
  setSofaColor(sofa, color);
  return sofa;
}
