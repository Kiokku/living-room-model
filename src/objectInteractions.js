import * as THREE from 'three';

export function createObjectInteractions(camera, canvas, root, walk, announce) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const items = [];
  const targets = new WeakMap();
  let pressed = null;

  const value = (part) => part.axis === 'scaleX' ? part.node.scale.x : part.node.rotation.y;
  const setValue = (part, next) => {
    if (part.axis === 'scaleX') part.node.scale.x = next;
    else part.node.rotation.y = next;
  };

  function add(name, isOpen, parts) {
    const item = { name, isOpen, parts, animation: null };
    parts.forEach(({ node }) => targets.set(node, item));
    items.push(item);
    return item;
  }

  function hitAt(event) {
    const rect = canvas.getBoundingClientRect();
    const locked = document.pointerLockElement === canvas;
    pointer.set(locked ? 0 : ((event.clientX - rect.left) / rect.width) * 2 - 1,
      locked ? 0 : -((event.clientY - rect.top) / rect.height) * 2 + 1);
    root.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObject(root, true)) {
      let node = hit.object;
      let item = null;
      let visible = true;
      while (node && node !== root) {
        if (!node.visible) { visible = false; break; }
        if (targets.has(node)) item = targets.get(node);
        node = node.parent;
      }
      if (visible) return item;
    }
    return null;
  }

  function toggle(item) {
    item.isOpen = !item.isOpen;
    item.animation = { elapsed: 0, from: item.parts.map(value) };
    announce(`${item.name}${item.isOpen ? '已打开' : '已关闭'}`);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button === 0) pressed = [event.clientX, event.clientY];
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!pressed) return;
    const moved = Math.hypot(event.clientX - pressed[0], event.clientY - pressed[1]);
    pressed = null;
    if (moved > 6) return;
    const item = hitAt(event);
    if (item) toggle(item);
    else if (walk.active) walk.lock();
  });
  canvas.addEventListener('pointercancel', () => { pressed = null; });
  canvas.addEventListener('pointermove', (event) => {
    if (document.pointerLockElement !== canvas && !pressed) canvas.style.cursor = hitAt(event) ? 'pointer' : 'grab';
  });

  function update(delta) {
    for (const item of items) {
      const animation = item.animation;
      if (!animation) continue;
      animation.elapsed += delta;
      const t = Math.min(animation.elapsed / 0.45, 1);
      const eased = 1 - (1 - t) ** 3;
      const before = item.parts.map(value);
      item.parts.forEach((part, index) => setValue(part, animation.from[index] + ((item.isOpen ? part.open : part.closed) - animation.from[index]) * eased));
      if (walk.active && !walk.refreshColliders()) {
        item.parts.forEach((part, index) => setValue(part, before[index]));
        walk.refreshColliders();
        item.animation = null;
        item.isOpen = !item.isOpen;
        announce('请先离开物件活动范围');
      } else if (t === 1) item.animation = null;
    }
  }

  return { add, update };
}
