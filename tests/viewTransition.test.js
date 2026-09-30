import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createViewTransition } from '../src/viewTransition.js';

function setup() {
  const element = () => ({ hidden: false, style: {
    setProperty(key, value) { this[key] = value; },
    removeProperty(key) { delete this[key]; },
  }, setAttribute() {} });
  globalThis.document = { createElement: element };
  const viewport = element();
  viewport.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, bottom: 600 });
  const plan = element();
  const classes = new Set();
  const panel = { classList: { add: key => classes.add(key), remove: key => classes.delete(key) }, append(node) { this.line = node; } };
  const camera = new THREE.PerspectiveCamera(40, 800 / 600, .04, 100);
  const controls = { enabled: true, target: new THREE.Vector3(-1.72, .58, .4) };
  camera.position.set(-1.72, 6.8, 9);
  camera.lookAt(controls.target);
  const destination = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
  let finished = 0;
  const transition = createViewTransition({ camera, controls, viewport, plan, panel,
    floorPlan: { toWorld: (x, y) => ({ x: -6 + x / 100, z: -3 + y / 100 }) },
    onFinish: () => finished++,
  });
  return { transition, camera, controls, viewport, plan, panel, classes, destination, finished: () => finished };
}

test('亮线从左往右揭示与二维图对齐的三维俯视图，扫完后才开始转动镜头', () => {
  const s = setup();
  s.transition.start(100);
  assert.equal(s.controls.enabled, false);
  s.camera.updateMatrixWorld();
  const floorPoint = new THREE.Vector3(-4, 0, -1).project(s.camera);
  assert.ok(Math.abs(floorPoint.x + .5) < 1e-8);
  assert.ok(Math.abs(floorPoint.y - 1 / 3) < 1e-8);
  const top = s.camera.position.clone();
  s.transition.update(650);
  assert.equal(s.panel.line.style.left, '50%');
  assert.equal(s.panel.line.hidden, false);
  assert.equal(s.plan.hidden, false);
  assert.match(s.viewport.style['mask-image'], /47%.*53%/);
  assert.ok(s.camera.position.equals(top));
  s.transition.update(1200);
  assert.equal(s.plan.hidden, true);
  assert.equal(s.panel.line.hidden, true);
  assert.equal(s.viewport.style['mask-image'], undefined);
  s.transition.update(1700);
  assert.ok(s.camera.position.y < top.y && s.camera.position.y > s.destination.position.y);
  assert.equal(s.transition.active, true);
  s.transition.update(2200);
  assert.ok(s.camera.position.equals(s.destination.position));
  assert.ok(s.camera.quaternion.equals(s.destination.quaternion));
  assert.equal(s.camera.fov, s.destination.fov);
  assert.equal(s.controls.enabled, true);
  assert.equal(s.transition.active, false);
  assert.equal(s.finished(), 1);
  assert.equal(s.classes.size, 0);
});

test('中途取消清除遮罩与亮线，后续旧帧不会改写视角', () => {
  const s = setup();
  s.transition.start(0);
  s.transition.update(400);
  s.transition.cancel();
  assert.equal(s.finished(), 1);
  assert.equal(s.plan.hidden, true);
  assert.equal(s.panel.line.hidden, true);
  assert.equal(s.viewport.style['-webkit-mask-image'], undefined);
  s.camera.position.set(1, 2, 3);
  s.transition.update(5000);
  assert.deepEqual(s.camera.position.toArray(), [1, 2, 3]);
  s.transition.cancel();
  assert.equal(s.finished(), 1);
});

test('俯视转轴测始终看向户型中心，镜头沿圆弧连续倾斜', () => {
  const s = setup();
  s.transition.start(0);
  const fromTarget = new THREE.Vector3(-2, 0, 0);
  let previousAngle = -1;
  for (const elapsed of [1200, 1350, 1600, 1850, 2000]) {
    s.transition.update(elapsed);
    const t = (elapsed - 1100) / 1000;
    const eased = t * t * (3 - 2 * t);
    const target = fromTarget.clone().lerp(s.controls.target, eased);
    s.camera.updateMatrixWorld();
    const center = target.clone().project(s.camera);
    assert.ok(Math.abs(center.x) < 1e-8 && Math.abs(center.y) < 1e-8, '户型中心应始终位于镜头中心');
    const angle = new THREE.Spherical().setFromVector3(s.camera.position.clone().sub(target)).phi;
    assert.ok(angle > previousAngle && angle < Math.PI / 2, '倾角连续增加，镜头保持在户型上方');
    previousAngle = angle;
  }
});

test('重复进入转场不会留下上一轮遮罩或锁定交互', () => {
  const s = setup();
  s.transition.start(0);
  s.transition.update(800);
  s.transition.start(1000);
  assert.equal(s.panel.line.style.left, '-4%');
  s.transition.update(3100);
  assert.ok(s.camera.position.equals(s.destination.position));
  assert.equal(s.controls.enabled, true);
  assert.equal(s.finished(), 2);
});

test('三维回二维按相同轨迹倒放：先回俯视，再从右向左扫描', () => {
  const forward = setup();
  const reverse = setup();
  forward.transition.start(0);
  reverse.transition.start(0, true);
  for (const elapsed of [100, 500, 900, 1200, 1550, 2000]) {
    reverse.transition.update(elapsed);
    forward.transition.update(2100 - elapsed);
    assert.ok(reverse.camera.position.distanceTo(forward.camera.position) < 1e-8);
    assert.ok(Math.abs(reverse.camera.quaternion.dot(forward.camera.quaternion)) > 1 - 1e-8);
    assert.ok(Math.abs(reverse.camera.fov - forward.camera.fov) < 1e-8);
    assert.equal(reverse.plan.hidden, elapsed <= 1000);
    assert.equal(reverse.panel.line.hidden, elapsed <= 1000);
    if (elapsed > 1000) assert.equal(reverse.panel.line.style.left, forward.panel.line.style.left);
  }
  reverse.transition.update(2100);
  assert.equal(reverse.plan.hidden, false);
  assert.equal(reverse.viewport.hidden, true);
  assert.equal(reverse.panel.line.hidden, true);
  assert.equal(reverse.viewport.style['mask-image'], undefined);
  assert.equal(reverse.controls.enabled, true);
  assert.equal(reverse.finished(), 1);
});
