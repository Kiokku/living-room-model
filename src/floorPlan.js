import { ROOM } from './roomModel.js';
import { BEDROOM } from './bedroomModel.js';
import { SOFA } from './sofaModel.js';
import { furnitureIcon } from './furnitureLibrary.js';
import { furnitureBounds } from './sofaPlacement.js';

const SCALE = 126;
const X0 = 160;
const Z0 = 148;
const x = (worldX) => X0 + (worldX - BEDROOM.left) * SCALE;
const y = (worldZ) => Z0 + (worldZ + ROOM.length / 2) * SCALE;

export function createFloorPlan(canvas, sofas, model, bedroom) {
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  base.width = canvas.width;
  base.height = canvas.height;
  const paper = base.getContext('2d');
  let preview = null;
  let selected = null;
  const toWorld = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * canvas.width / rect.width;
    const canvasY = (clientY - rect.top) * canvas.height / rect.height;
    return { x: BEDROOM.left + (canvasX - X0) / SCALE, z: -ROOM.length / 2 + (canvasY - Z0) / SCALE };
  };
  const setPreview = (next) => { preview = next; };

  const box = (c, left, far, right, near, fill, stroke) => {
    c.fillStyle = fill;
    c.fillRect(x(left), y(far), (right - left) * SCALE, (near - far) * SCALE);
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1.4;
      c.strokeRect(x(left), y(far), (right - left) * SCALE, (near - far) * SCALE);
    }
  };
  const line = (c, x1, z1, x2, z2, color = '#5c625d', width = 2) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x(x1), y(z1));
    c.lineTo(x(x2), y(z2));
    c.stroke();
  };
  const label = (c, text, worldX, worldZ, font = '600 22px system-ui', color = '#464a43') => {
    c.fillStyle = color;
    c.font = font;
    c.textAlign = 'left';
    c.fillText(text, x(worldX), y(worldZ));
  };
  const wallH = (a, b, z) => box(paper, a, z - 0.045, b, z + 0.045, '#918f86', '#666a63');
  const wallV = (a, b, z) => box(paper, z - 0.045, a, z + 0.045, b, '#918f86', '#666a63');

  function wood(left, far, right, near) {
    box(paper, left, far, right, near, '#ead9bc');
    paper.save();
    paper.beginPath();
    paper.rect(x(left), y(far), (right - left) * SCALE, (near - far) * SCALE);
    paper.clip();
    paper.strokeStyle = '#d8c2a1';
    paper.lineWidth = 1;
    for (let row = 0, z = far; z <= near; row++, z += 0.27) {
      paper.beginPath(); paper.moveTo(x(left), y(z)); paper.lineTo(x(right), y(z)); paper.stroke();
      for (let seam = left + (row % 3) * 0.4; seam < right; seam += 1.2) {
        paper.beginPath(); paper.moveTo(x(seam), y(z)); paper.lineTo(x(seam), y(z + 0.27)); paper.stroke();
      }
    }
    paper.restore();
  }

  function windowH(a, b, z) {
    box(paper, a, z - 0.055, b, z + 0.055, '#f6faf9', '#6c8790');
    for (const offset of [-0.03, 0, 0.03]) line(paper, a, z + offset, b, z + offset, '#72a5bd', 2);
    for (const mullion of [a, (a + b) / 2, b]) line(paper, mullion, z - 0.075, mullion, z + 0.075, '#5c899d', 2);
  }

  function windowV(z1, z2, wallX) {
    box(paper, wallX - 0.055, z1, wallX + 0.055, z2, '#f6faf9', '#6c8790');
    for (const offset of [-0.03, 0, 0.03]) line(paper, wallX + offset, z1, wallX + offset, z2, '#72a5bd', 2);
    for (const mullion of [z1, (z1 + z2) / 2, z2]) line(paper, wallX - 0.075, mullion, wallX + 0.075, mullion, '#5c899d', 2);
  }

  function tick(c, pointX, pointY) {
    c.beginPath(); c.moveTo(pointX - 6, pointY + 6); c.lineTo(pointX + 6, pointY - 6); c.stroke();
  }

  function dimensionH(left, right, text) {
    const a = x(left); const b = x(right); const guide = 884;
    paper.strokeStyle = '#8b8070'; paper.lineWidth = 1.5;
    paper.beginPath();
    paper.moveTo(a, guide); paper.lineTo(b, guide);
    paper.moveTo(a, y(ROOM.length / 2) + 8); paper.lineTo(a, guide + 8);
    paper.moveTo(b, y(ROOM.length / 2) + 8); paper.lineTo(b, guide + 8);
    paper.stroke(); tick(paper, a, guide); tick(paper, b, guide);
    paper.fillStyle = '#70685e'; paper.font = '600 19px system-ui'; paper.textAlign = 'center';
    paper.fillText(text, (a + b) / 2, guide + 31);
  }

  function dimensionV(far, near, guide, text, wallEdge) {
    const a = y(far); const b = y(near);
    paper.strokeStyle = '#8b8070'; paper.lineWidth = 1.5;
    paper.beginPath();
    paper.moveTo(guide, a); paper.lineTo(guide, b);
    paper.moveTo(wallEdge, a); paper.lineTo(guide + (guide < wallEdge ? -8 : 8), a);
    paper.moveTo(wallEdge, b); paper.lineTo(guide + (guide < wallEdge ? -8 : 8), b);
    paper.stroke(); tick(paper, guide, a); tick(paper, guide, b);
    paper.save();
    paper.translate(guide - 12, (a + b) / 2);
    paper.rotate(-Math.PI / 2);
    paper.fillStyle = '#70685e'; paper.font = '600 18px system-ui'; paper.textAlign = 'center';
    paper.fillText(text, 0, 0);
    paper.restore();
  }

  function drawBase() {
    paper.fillStyle = '#faf8f4'; paper.fillRect(0, 0, base.width, base.height);
    paper.strokeStyle = '#e9e6df'; paper.lineWidth = 1;
    for (let pos = 0; pos <= base.width; pos += 36) {
      paper.beginPath(); paper.moveTo(pos + 0.5, 0); paper.lineTo(pos + 0.5, base.height); paper.stroke();
    }
    for (let pos = 0; pos <= base.height; pos += 36) {
      paper.beginPath(); paper.moveTo(0, pos + 0.5); paper.lineTo(base.width, pos + 0.5); paper.stroke();
    }

    wood(-ROOM.width / 2, -ROOM.length / 2, ROOM.width / 2, ROOM.length / 2);
    wood(BEDROOM.left, BEDROOM.far, BEDROOM.right, BEDROOM.near);
    box(paper, BEDROOM.left, -ROOM.length / 2, BEDROOM.right, BEDROOM.far, '#dbe4e2');
    paper.strokeStyle = '#c1d0ce'; paper.lineWidth = 1;
    for (let z = -ROOM.length / 2; z < BEDROOM.far; z += 0.48) line(paper, BEDROOM.left, z, BEDROOM.right, z, '#c1d0ce', 1);
    for (let tileX = BEDROOM.left; tileX < BEDROOM.right; tileX += 0.48) line(paper, tileX, -ROOM.length / 2, tileX, BEDROOM.far, '#c1d0ce', 1);

    const halfWindow = ROOM.width * ROOM.rearWindow.widthRatio / 2;
    wallH(-ROOM.width / 2, -halfWindow, -2.74);
    wallH(halfWindow, ROOM.width / 2, -2.74);
    wallH(-ROOM.width / 2, ROOM.entry.left, 2.74);
    wallH(ROOM.entry.right, ROOM.width / 2, 2.74);
    wallV(-2.7, 2.7, 1.79);
    wallV(-2.7, ROOM.sideDoor.far, -1.79);
    wallV(ROOM.sideDoor.near, 2.7, -1.79);

    wallV(BEDROOM.far, BEDROOM.near, BEDROOM.left - 0.045);
    wallV(BEDROOM.far, BEDROOM.near, BEDROOM.right - 0.045);
    wallH(BEDROOM.left, BEDROOM.entry.left, BEDROOM.near + 0.045);
    wallH(BEDROOM.entry.right, BEDROOM.right, BEDROOM.near + 0.045);
    wallH(BEDROOM.left, BEDROOM.window.left, BEDROOM.far - 0.045);
    wallH(BEDROOM.window.right, BEDROOM.farDoor.left, BEDROOM.far - 0.045);
    wallH(BEDROOM.farDoor.right, BEDROOM.right, BEDROOM.far - 0.045);
    windowH(-halfWindow, halfWindow, -2.74);
    windowH(BEDROOM.window.left, BEDROOM.window.right, BEDROOM.far - 0.045);
    windowH(BEDROOM.left, BEDROOM.right, -2.74);
    windowV(-2.7, BEDROOM.far, BEDROOM.left - 0.045);

    box(paper, ROOM.cabinet.left, ROOM.length / 2 - ROOM.cabinet.depth, ROOM.cabinet.right, ROOM.length / 2, '#e8e3da', '#686a62');
    line(paper, 1.17, 2.27, 1.17, 2.7, '#8a8176', 1.5);
    label(paper, '固定柜', 0.37, 2.52, '600 17px system-ui');
    const closet = BEDROOM.wardrobe;
    const closetFront = BEDROOM.near - 0.035 - closet.depth;
    box(paper, closet.left, closetFront, closet.right, BEDROOM.near - 0.035, '#e7e0d3', '#686a62');
    for (const partition of closet.partitions) line(paper, partition, closetFront, partition, BEDROOM.near - 0.035, '#a29482', 1.4);
    label(paper, '固定衣柜', closet.left + 0.41, 2.49, '600 17px system-ui');


    label(paper, '客厅', -1.39, -1.99, '700 28px system-ui');
    label(paper, '3.50 × 5.40 m', -1.39, -1.68, '500 16px system-ui', '#7b7368');
    label(paper, '主卧', -4.95, -0.54, '700 28px system-ui');
    label(paper, '宽 3.45 m', -4.95, -0.24, '500 16px system-ui', '#7b7368');
    label(paper, '封闭阳台', -4.72, -2.05, '700 23px system-ui');
    dimensionH(BEDROOM.left, BEDROOM.right, '3450');
    dimensionH(-ROOM.width / 2, ROOM.width / 2, '3500');
    dimensionV(-ROOM.length / 2, BEDROOM.far, 95, '≈1120', x(BEDROOM.left));
    dimensionV(BEDROOM.far, BEDROOM.near, 95, '≈4280', x(BEDROOM.left));
    dimensionV(-ROOM.length / 2, ROOM.length / 2, 1112, '5400', x(ROOM.width / 2));
  }

  function drawDoor(node, length, openAngle, alongZ = false) {
    const hingeX = node.position.x;
    const hingeZ = node.position.z;
    const end = (angle) => alongZ
      ? [hingeX - length * Math.sin(angle), hingeZ - length * Math.cos(angle)]
      : [hingeX + length * Math.cos(angle), hingeZ - length * Math.sin(angle)];
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = '#9d8b77'; ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (let step = 0; step <= 20; step++) {
      const [px, pz] = end(openAngle * step / 20);
      if (step === 0) ctx.moveTo(x(px), y(pz)); else ctx.lineTo(x(px), y(pz));
    }
    ctx.stroke(); ctx.setLineDash([]);
    const [tipX, tipZ] = end(node.rotation.y);
    line(ctx, hingeX, hingeZ, tipX, tipZ, '#8a684f', 4);
    ctx.fillStyle = '#8a684f';
    ctx.beginPath(); ctx.arc(x(hingeX), y(hingeZ), 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawStorageDoors() {
    const leaf = (node, length) => {
      const sign = length < 0 ? -1 : 1;
      const endX = node.position.x + length * Math.cos(node.rotation.y);
      const endZ = node.position.z - length * Math.sin(node.rotation.y);
      line(ctx, node.position.x, node.position.z, endX, endZ, '#8d775d', 2.5);
      if (Math.abs(node.rotation.y) > 0.1) {
        ctx.fillStyle = '#8d775d'; ctx.fillRect(x(endX) - 2 * sign, y(endZ) - 2, 4, 4);
      }
    };
    const cabinetLeaf = (ROOM.cabinet.right - ROOM.cabinet.left - 0.055) / 2;
    model.cabinetDoors.forEach((node, index) => leaf(node, index ? -cabinetLeaf : cabinetLeaf));
    bedroom.wardrobeDoors.forEach(({ node }) => leaf(node, node.children[0].geometry.parameters.width));
  }

  const symbols = new Map();
  function drawImported(item) {
    const data = item.userData;
    const key = data.furnitureType + data.color;
    if (!symbols.has(key)) {
      const image = new Image();
      image.onload = () => { lastState = ''; };
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(furnitureIcon({ type: data.furnitureType, w: data.w, d: data.d, color: data.color }));
      symbols.set(key, image);
    }
    const image = symbols.get(key);
    if (!image.complete || !image.naturalWidth) return;
    const width = data.w / 1000;
    const depth = data.d / 1000;
    const extra = data.furnitureType === 'dresser' ? 0.45 : 0;
    ctx.save();
    ctx.translate(x(item.position.x), y(item.position.z));
    ctx.rotate(-item.rotation.y);
    ctx.drawImage(image, -width * SCALE / 2, -depth * SCALE / 2, width * SCALE, (depth + extra) * SCALE);
    ctx.restore();
  }

  function drawSofa(sofa) {
    if (sofa.userData.furnitureType && sofa.userData.furnitureType !== 'norhor') return drawImported(sofa);
    const color = sofa.userData.color === 'camel';
    const theta = sofa.rotation.y;
    ctx.save();
    ctx.transform(Math.cos(theta) * SCALE, -Math.sin(theta) * SCALE,
      Math.sin(theta) * SCALE, Math.cos(theta) * SCALE,
      x(sofa.position.x), y(sofa.position.z));
    ctx.fillStyle = color ? '#b99885' : '#e9dfce';
    ctx.strokeStyle = color ? '#7a5d51' : '#82796e';
    ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.roundRect(-SOFA.length / 2, -SOFA.depth / 2, SOFA.length, SOFA.depth, 0.08); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color ? '#a98173' : '#d5c7b4';
    ctx.fillRect(-SOFA.length / 2 + 0.07, -SOFA.depth / 2 + 0.05, SOFA.length - 0.14, 0.16);
    ctx.fillStyle = color ? '#c3a294' : '#f6f0e6';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(side < 0 ? -0.93 : 0.02, -0.21, 0.91, 0.63, 0.06); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(side < 0 ? -1.04 : 0.96, -0.38, 0.08, 0.77, 0.04); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  const doors = [model.doors.entryDoor, model.doors.sideDoor, bedroom.doors.entryDoor, bedroom.doors.balconyDoor];
  let lastState = '';
  function draw() {
    const state = [
      ...sofas.flatMap((sofa) => [sofa.position.x.toFixed(3), sofa.position.z.toFixed(3), sofa.rotation.y.toFixed(3), sofa.userData.color, sofa.userData.furnitureType]),
      ...(preview ? [preview.item.position.x.toFixed(3), preview.item.position.z.toFixed(3), preview.item.userData.furnitureType, preview.item.userData.color, preview.valid] : []),
      ...doors.map((node) => node.rotation.y.toFixed(3)),
      ...model.cabinetDoors.map((node) => node.rotation.y.toFixed(3)),
      ...bedroom.wardrobeDoors.map(({ node }) => node.rotation.y.toFixed(3)),
    ].join('|');
    if (state === lastState) return;
    lastState = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    drawDoor(model.doors.entryDoor, ROOM.entry.right - ROOM.entry.left, Math.PI * 0.46);
    drawDoor(model.doors.sideDoor, ROOM.sideDoor.near - ROOM.sideDoor.far, -1.3, true);
    drawDoor(bedroom.doors.entryDoor, BEDROOM.entry.right - BEDROOM.entry.left, 0.55);
    drawDoor(bedroom.doors.balconyDoor, BEDROOM.farDoor.right - BEDROOM.farDoor.left, -1.3);
    drawStorageDoors();
    [...sofas].sort((a, b) => Number(b.userData.furnitureType === 'rug') - Number(a.userData.furnitureType === 'rug')).forEach(drawSofa);
    if (selected && sofas.includes(selected)) {
      ctx.save();
      ctx.translate(x(selected.position.x), y(selected.position.z));
      ctx.rotate(-selected.rotation.y);
      const bounds = selected.userData.bounds;
      ctx.strokeStyle = '#ae653e';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(bounds.left * SCALE - 4, bounds.far * SCALE - 4,
        (bounds.right - bounds.left) * SCALE + 8, (bounds.near - bounds.far) * SCALE + 8);
      ctx.restore();
    }
    if (preview) {
      ctx.save();
      ctx.globalAlpha = preview.valid ? 0.65 : 0.35;
      drawSofa(preview.item);
      if (!preview.valid) {
        ctx.strokeStyle = '#bb5344';
        ctx.lineWidth = 3;
        const bounds = furnitureBounds(preview.item);
        ctx.strokeRect(x(bounds.left), y(bounds.far), (bounds.right - bounds.left) * SCALE, (bounds.near - bounds.far) * SCALE);
      }
      ctx.restore();
    }
  }

  drawBase();
  return { draw, toWorld, setPreview, setSelected(next) { selected = next; lastState = ''; draw(); } };
}
