import * as THREE from 'three';

const radius = 0.18;
const eyeHeight = 1.6;
const speed = 1.7;

export function createWalkMode(camera, canvas, roots, bounds) {
  const position = new THREE.Vector3(0, eyeHeight, 1.2);
  const keys = new Set();
  const colliders = [];
  let active = false;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let yaw = 0;
  let pitch = 0;

  const touches = (collider, x, z) => {
    const { box, corners } = collider;
    if (x + radius <= box.min.x || x - radius >= box.max.x || z + radius <= box.min.z || z - radius >= box.max.z) return false;
    let positive = false;
    let negative = false;
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      if ((x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2 < radius * radius) return true;
      const cross = dx * (z - a.z) - dz * (x - a.x);
      positive ||= cross > 0.000001;
      negative ||= cross < -0.000001;
    }
    return !positive && !negative ? false : !(positive && negative);
  };

  const blocked = (x, z) => {
    if (x < bounds.left + radius || x > bounds.right - radius || z < bounds.far + radius || z > bounds.near - radius) return true;
    return colliders.some((collider) => touches(collider, x, z));
  };

  const onKeyDown = (event) => {
    if (!active || !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
  };
  const onKeyUp = (event) => keys.delete(event.code);
  const turn = (dx, dy) => {
    yaw -= dx * 0.0022;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.0022, -1.35, 1.35);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  };
  const onMouseMove = (event) => {
    if (active && document.pointerLockElement === canvas) turn(event.movementX, event.movementY);
  };
  const lock = () => {
    if (active && document.pointerLockElement !== canvas && canvas.requestPointerLock) Promise.resolve(canvas.requestPointerLock()).catch(() => {});
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('pointerdown', (event) => {
    if (!active) return;
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!active || !dragging || document.pointerLockElement === canvas) return;
    turn(event.clientX - lastPointerX, event.clientY - lastPointerY);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  function refreshColliders() {
    colliders.length = 0;
    roots.forEach((root) => {
      root.updateMatrixWorld(true);
      root.traverseVisible((object) => {
        if (!object.isMesh) return;
        const box = new THREE.Box3().setFromObject(object);
        if (box.min.y >= 1.8 || box.max.y <= 0.25) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const local = object.geometry.boundingBox;
        const corners = [[local.min.x, local.min.z], [local.max.x, local.min.z], [local.max.x, local.max.z], [local.min.x, local.max.z]]
          .map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(object.matrixWorld));
        colliders.push({ box, corners });
      });
    });
    return !blocked(position.x, position.z);
  }

  function enter() {
    active = true;
    keys.clear();
    refreshColliders();
    if (blocked(position.x, position.z)) {
      for (const z of [1.8, 1.3, 0.7, 0, -0.7, -1.3]) {
        const x = [-1.2, -0.6, 0, 0.6, 1.2].find((candidate) => !blocked(candidate, z));
        if (x !== undefined) { position.set(x, eyeHeight, z); break; }
      }
    }
    camera.up.set(0, 1, 0);
    camera.position.copy(position);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  function exit() {
    active = false;
    keys.clear();
    dragging = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function update(delta) {
    if (!active || !keys.size) return;
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    if (!forward && !strafe) return;
    const step = speed * Math.min(delta, 0.05) / Math.hypot(forward, strafe);
    const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * step;
    const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * step;
    if (!blocked(position.x + dx, position.z)) position.x += dx;
    if (!blocked(position.x, position.z + dz)) position.z += dz;
    camera.position.copy(position);
  }

  return { enter, exit, update, lock, refreshColliders, get active() { return active; }, get position() { return position; }, get yaw() { return yaw; } };
}
