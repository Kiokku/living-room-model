import { ROOM } from './roomModel.js';
import { BEDROOM } from './bedroomModel.js';
import { SOFA } from './sofaModel.js';

export function createMiniMap(canvas, sofas) {
  const ctx = canvas.getContext('2d');
  const scale = 60;
  const point = (x, z) => [36 + (x + 5.5) * scale, 32 + (z + 2.9) * scale];
  const line = (x1, z1, x2, z2, color = '#65746d', width = 5) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(...point(x1, z1));
    ctx.lineTo(...point(x2, z2));
    ctx.stroke();
  };
  const fill = (left, far, right, near, color) => {
    const [x, y] = point(left, far);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, (right - left) * scale, (near - far) * scale);
  };
  const label = (text, x, z) => {
    ctx.fillStyle = '#637069';
    ctx.font = '600 30px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(text, ...point(x, z));
  };

  function draw(position, yaw, view) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#b8793f';
    ctx.font = '600 19px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('南', canvas.width / 2, 23);
    fill(-ROOM.width / 2, -ROOM.length / 2, ROOM.width / 2, ROOM.length / 2, '#f3e8d8');
    fill(BEDROOM.left, BEDROOM.far, BEDROOM.right, BEDROOM.near, '#f1eee6');
    fill(BEDROOM.left, -ROOM.length / 2, BEDROOM.right, BEDROOM.far, '#dce9e8');

    const halfWindow = ROOM.width * ROOM.rearWindow.widthRatio / 2;
    line(-1.75, -2.7, -halfWindow, -2.7);
    line(halfWindow, -2.7, 1.75, -2.7);
    line(-halfWindow, -2.7, halfWindow, -2.7, '#83a9ad', 7);
    line(1.75, -2.7, 1.75, 2.7);
    line(ROOM.entry.right, 2.7, 1.75, 2.7);
    line(-1.75, 2.7, ROOM.entry.left, 2.7);
    line(-1.79, -2.7, -1.79, ROOM.sideDoor.far);
    line(-1.79, ROOM.sideDoor.near, -1.79, 2.7);

    line(BEDROOM.left, -2.7, BEDROOM.left, 2.7);
    line(BEDROOM.left, 2.7, BEDROOM.entry.left, 2.7);
    line(BEDROOM.entry.right, 2.7, BEDROOM.right, 2.7);
    line(BEDROOM.left, BEDROOM.far, BEDROOM.window.left, BEDROOM.far);
    line(BEDROOM.window.left, BEDROOM.far, BEDROOM.window.right, BEDROOM.far, '#83a9ad', 7);
    line(BEDROOM.window.right, BEDROOM.far, BEDROOM.farDoor.left, BEDROOM.far);
    line(BEDROOM.farDoor.right, BEDROOM.far, BEDROOM.right, BEDROOM.far);
    line(BEDROOM.left, -2.7, BEDROOM.right, -2.7, '#83a9ad', 7);

    sofas.forEach(({ position, userData }) => {
      const left = position.x - SOFA.depth / 2;
      const far = position.z - SOFA.length / 2;
      fill(left, far, left + SOFA.depth, far + SOFA.length, userData.color === 'camel' ? '#ae8e7b' : '#ddd2bf');
      line(left, far, left, far + SOFA.length, '#a89b84', 2);
    });
    label('客厅', 0, 0);
    label('主卧', -3.56, 0.45);
    label('阳台', -3.56, -2.05);

    const [x, y] = point(position.x, position.z);
    ctx.save();
    ctx.translate(x, y);
    if (view !== 'top') {
      ctx.rotate(-yaw);
      ctx.fillStyle = 'rgba(55, 93, 79, 0.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-33, -55);
      ctx.arc(0, 0, 64, -Math.PI * 0.67, -Math.PI * 0.33);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.fillStyle = '#304e43';
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(-9, 9);
      ctx.lineTo(9, 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#304e43'; ctx.lineWidth = 5; ctx.stroke();
    ctx.restore();
  }

  return { draw };
}
