import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createRoomModel, ROOM } from './roomModel.js';
import { createBedroomModel, createBalconyModel, BEDROOM } from './bedroomModel.js';
import { createMiniMap } from './miniMap.js';
import { createFloorPlan } from './floorPlan.js';
import { createViewTransition } from './viewTransition.js';
import { createWalkMode } from './walkMode.js';
import { createObjectInteractions } from './objectInteractions.js';
import { createFurnitureEditor } from './furnitureEditor.js';
import { FURNITURE_LIBRARY, furnitureIcon } from './furnitureLibrary.js';
import './style.css';

document.querySelector('#app').innerHTML = `
  <main class="workspace">
    <header class="app-header">
      <button id="library-toggle" class="library-toggle" type="button" aria-controls="furniture-panel" aria-expanded="true"><span aria-hidden="true">☰</span> 家居库</button>
      <div class="project-title"><strong>客厅 · 主卧 · 封闭阳台</strong></div>
      <div class="mode-tabs" role="group" aria-label="切换二维和三维视图">
        <button class="mode-button active" data-mode="plan" type="button" aria-pressed="true">2D 平面</button>
        <button class="mode-button" data-mode="scene" type="button" aria-pressed="false">3D 场景</button>
      </div>
      <div class="view-toolbar" role="group" aria-label="切换观察视角">
        <button class="view-button active" data-view="axonometric" type="button">轴测视角</button>
        <button class="view-button" data-view="top" type="button">俯视视角</button>
        <button class="view-button" data-view="bedroom" type="button">主卧视角</button>
        <button class="view-button" data-view="walk" type="button">漫游模式</button>
      </div>
    </header>
    <div class="workspace-body">
      <aside id="furniture-panel" class="furniture-panel" aria-label="家居库">
        <div class="furniture-heading"><strong>家居库</strong><div class="furniture-heading-actions"><button id="save-furniture" type="button">保存</button><button id="edit-mode" type="button" aria-pressed="true">编辑中</button></div></div>
        <p>拖入房间空地，拖动已放置的家具调整位置</p>
        ${['卧室', '客厅'].map(category => `<div class="furniture-category">${category}</div>${category === '客厅' ? `<button id="sofa-card" class="furniture-card imported-card" type="button">
          <span class="sofa-icon" aria-hidden="true"><span></span><span></span></span>
          <span><strong>NORHOR HUG 沙发</strong><small>210 × 95 × 82 cm</small></span>
        </button>` : ''}${FURNITURE_LIBRARY.filter(item => item.category === category).map(item => `<button class="furniture-card imported-card" type="button" data-furniture-type="${item.type}"><span class="furniture-icon" aria-hidden="true">${furnitureIcon(item)}</span><span><strong>${item.label}</strong><small>${item.w / 10} × ${item.d / 10} cm</small></span></button>`).join('')}`).join('')}
      </aside>
      <section class="model-panel" aria-label="户型视图">
        <div id="floor-plan" class="floor-plan" hidden>
          <div class="plan-heading"><strong>二维户型图</strong></div>
          <div class="plan-stage"><canvas id="floor-plan-canvas" width="1200" height="940" role="img" aria-label="客厅、主卧和封闭阳台的二维户型示意图；家具与三维场景同步"></canvas></div>
        </div>
        <div id="viewport" class="viewport"></div>
        <div id="furniture-actions" class="furniture-actions" role="toolbar" aria-label="选中家具操作" hidden>
          <strong data-selected-name></strong>
          <details class="furniture-color-picker" data-furniture-color aria-label="家具颜色"></details>
          <button type="button" data-action="rotate-right" aria-label="顺时针旋转90度"><svg class="clockwise-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2.6 7.8M3 4v6h6"/></svg><span>旋转</span></button>
          <button type="button" data-action="duplicate">复制</button>
          <button id="remove-sofa" type="button">删除</button>
          <button type="button" data-action="done">完成</button>
        </div>
        <div id="walk-hint" class="walk-hint" hidden>WASD 行走 · 鼠标转向 · 点击物件开合</div>
      </section>
      <aside class="details-panel" aria-label="户型信息与导出">
      <section class="mini-map" aria-label="二维户型地图">
        <div class="mini-map-title">二维户型 <span id="map-mode">轴测视角</span></div>
        <canvas id="mini-map-canvas" width="520" height="420" role="img" aria-label="客厅、主卧及阳台平面图；标记显示漫游位置或固定视角焦点"></canvas>
        <div class="mini-map-tip">点击窗帘、门、柜门可开合</div>
        <label class="sun-control" for="sun-brightness"><span>东南晨光</span><input id="sun-brightness" type="range" min="0" max="100" value="100"><output id="sun-value" for="sun-brightness">100%</output></label>
      </section>
      <section class="room-facts" aria-label="户型尺寸"><h2>户型尺寸</h2><dl><div><dt>客厅</dt><dd>3.50 × 5.40 m</dd></div><div><dt>主卧</dt><dd>3.45 × 约 4.28 m <small>长度估算</small></dd></div><div><dt>封闭阳台</dt><dd>约 3.45 × 1.12 m <small>待复尺</small></dd></div></dl></section>
      <div class="export-actions"><button id="save-png" type="button">下载当前视角 PNG</button><button id="save-glb" type="button">导出三维模型 GLB</button></div>
      </aside>
    </div>
  </main>
  <div id="toast" role="status" aria-live="polite"></div>
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeceae4);
const model = createRoomModel();
const bedroom = createBedroomModel();
const balcony = createBalconyModel();
const sofas = [];
const combinedRoot = new THREE.Group();
combinedRoot.name = '客厅主卧封闭阳台户型';
combinedRoot.add(model.root, bedroom.root, balcony.root);
scene.add(combinedRoot);

const camera = new THREE.PerspectiveCamera(40, 1, 0.04, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#viewport').append(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xffffff, 0xd7c7ae, 1.55);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
sun.position.set(-7.2, 11.8, -7);
sun.target.position.set(-1.7, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -7;
sun.shadow.camera.right = 7;
sun.shadow.camera.top = 7;
sun.shadow.camera.bottom = -7;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 24;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const emissiveMaterials = new Map();
combinedRoot.traverse((node) => {
  if (node.isMesh && node.material.emissiveIntensity && !node.name.includes('顶灯') && !node.name.includes('吸顶灯')) {
    emissiveMaterials.set(node.material, node.material.emissiveIntensity);
  }
});
const sunSlider = document.querySelector('#sun-brightness');
function setSunBrightness(value) {
  const daylight = Number(value) / 100;
  sun.intensity = 2.2 * daylight;
  ambient.intensity = 0.07 + 1.48 * daylight;
  emissiveMaterials.forEach((initial, material) => { material.emissiveIntensity = initial * (0.08 + 0.92 * daylight); });
  scene.background.set(0x101a29).lerp(new THREE.Color(0xeceae4), daylight);
  document.querySelector('#sun-value').value = `${value}%`;
}
sunSlider.addEventListener('input', () => setSunBrightness(sunSlider.value));
setSunBrightness(sunSlider.value);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 0.5;
controls.maxDistance = 24;
controls.maxPolarAngle = Math.PI * 0.52;
const walkRoots = [model.root, bedroom.root, balcony.root];
const walk = createWalkMode(camera, renderer.domElement, walkRoots, {
  left: BEDROOM.left, right: ROOM.width / 2, far: -ROOM.length / 2, near: ROOM.length / 2,
});
const miniMap = createMiniMap(document.querySelector('#mini-map-canvas'), sofas);
const floorPlan = createFloorPlan(document.querySelector('#floor-plan-canvas'), sofas, model, bedroom);
const walkHint = document.querySelector('#walk-hint');
const interactions = createObjectInteractions(camera, renderer.domElement, combinedRoot, walk, showToast);
const editor = createFurnitureEditor({
  canvas: renderer.domElement, planCanvas: document.querySelector('#floor-plan-canvas'), floorPlan,
  camera, controls, root: combinedRoot, walkRoots, sofas, room: ROOM, bedroom: BEDROOM,
  panel: document.querySelector('.furniture-panel'), card: document.querySelector('#sofa-card'),
  toolbar: document.querySelector('#furniture-actions'), toggle: document.querySelector('#edit-mode'), save: document.querySelector('#save-furniture'), remove: document.querySelector('#remove-sofa'), announce: showToast,
});
const doorPart = (node, open) => ({ node, axis: 'rotationY', closed: 0, open });
interactions.add('客厅窗帘', false, model.curtains.map((node) => ({ node, axis: 'scaleX', closed: 1, open: 0.18 })));
interactions.add('主卧窗帘', true, bedroom.curtains.map((node) => ({ node, axis: 'scaleX', closed: 1, open: 0.32 })));
interactions.add('客厅入口门', false, [doorPart(model.doors.entryDoor, Math.PI * 0.46)]);
interactions.add('客厅侧门', false, [doorPart(model.doors.sideDoor, -1.3)]);
interactions.add('主卧入口门', false, [doorPart(bedroom.doors.entryDoor, 0.55)]);
interactions.add('主卧阳台门', false, [doorPart(bedroom.doors.balconyDoor, -1.3)]);
model.cabinetDoors.forEach((node, index) => interactions.add(`客厅柜门 ${index + 1}`, false, [doorPart(node, index ? -1.1 : 1.1)]));
bedroom.wardrobeDoors.forEach(({ node, openAngle }, index) => interactions.add(`主卧衣柜门 ${index + 1}`, false, [doorPart(node, openAngle)]));

let currentView = 'axonometric';
let currentMode = 'plan';
const viewTransition = createViewTransition({
  camera, controls, viewport: document.querySelector('#viewport'), plan: document.querySelector('#floor-plan'),
  panel: document.querySelector('.model-panel'), floorPlan,
  onFinish: () => {
    document.querySelector('.workspace').dataset.mode = currentMode;
    document.querySelector('.view-toolbar').hidden = currentMode === 'plan';
    editor.setView(currentMode === 'plan' ? 'plan' : currentView);
  },
});
function setView(view) {
  viewTransition.cancel();
  if (walk.active && view !== 'walk') walk.exit();
  currentView = view;
  const bedroomIndoor = view === 'bedroom';
  const walking = view === 'walk';
  const viewport = document.querySelector('#viewport');
  const mobile = viewport.clientWidth <= 700;
  const aspect = viewport.clientWidth / viewport.clientHeight;
  camera.fov = view === 'top' ? (mobile ? 12 : 10) : walking ? (mobile ? 78 : 72) : bedroomIndoor ? (mobile ? 70 : 58) : (aspect < 0.7 ? 56 : 40);
  camera.updateProjectionMatrix();
  controls.maxDistance = view === 'top' ? 90 : 28;
  model.fullWalls.visible = walking;
  model.cutWalls.visible = !walking;
  model.ceiling.visible = walking;
  bedroom.fullWalls.visible = bedroomIndoor || walking;
  bedroom.cutWalls.visible = !(bedroomIndoor || walking);
  bedroom.ceiling.visible = bedroomIndoor || walking;
  balcony.ceiling.visible = walking;
  balcony.dimensions.visible = !(bedroomIndoor || walking);
  model.dimensions.visible = !(bedroomIndoor || walking);
  bedroom.dimensions.visible = !(bedroomIndoor || walking);
  controls.enabled = !walking;
  editor.setView(view);
  walkHint.hidden = !walking;
  document.querySelector('#map-mode').textContent = { axonometric: '轴测视角', top: '俯视视角', bedroom: '主卧视角', walk: '漫游模式' }[view];
  camera.up.set(0, view === 'top' ? 0 : 1, view === 'top' ? -1 : 0);
  if (walking) {
    if (!walk.active) walk.enter();
  } else if (view === 'top') {
    const topDistance = Math.max(44, 9 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect));
    camera.position.set(-1.77, topDistance, 0.001);
    controls.target.set(-1.77, 0, 0.4);
  } else if (view === 'bedroom') {
    camera.position.set(-2.85, 1.58, 2.13);
    controls.target.set(-3.59, 1.18, -1.25);
  } else {
    const framing = THREE.MathUtils.clamp((aspect - 0.8) / 0.6, 0, 1);
    camera.position.set(-1.72, THREE.MathUtils.lerp(10.5, 6.8, framing), THREE.MathUtils.lerp(14.5, 9, framing));
    controls.target.set(-1.72, 0.58, 0.4);
  }
  if (!walking) {
    camera.lookAt(controls.target);
    controls.update();
  }
  document.querySelectorAll('.view-button').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
}

function setMode(mode) {
  if (mode === currentMode && (mode === 'scene' || viewTransition.active)) return;
  const reveal = currentMode === 'plan' && mode === 'scene'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reverse = currentMode === 'scene' && mode === 'plan'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  viewTransition.cancel();
  if (mode === 'plan' && ['walk', 'bedroom'].includes(currentView)) setView('axonometric');
  currentMode = mode;
  const plan = mode === 'plan';
  document.querySelector('.workspace').dataset.mode = reverse ? 'scene' : mode;
  document.querySelector('#floor-plan').hidden = !plan && !reveal;
  document.querySelector('#viewport').hidden = plan && !reverse;
  document.querySelector('.view-toolbar').hidden = plan && !reverse;
  document.querySelector('#save-png').textContent = plan ? '下载二维图 PNG' : '下载当前视角 PNG';
  editor.setView(plan ? 'plan' : currentView);
  if (plan) floorPlan.draw();
  document.querySelectorAll('.mode-button').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  if (!plan) {
    const viewport = document.querySelector('#viewport');
    const { width, height } = viewport.getBoundingClientRect();
    camera.aspect = width / height;
    renderer.setSize(width, height, false);
    setView('axonometric');
    if (reveal) {
      floorPlan.draw();
      viewTransition.start(performance.now());
      editor.setView('transition');
    }
  }
  if (reverse) {
    viewTransition.start(performance.now(), true);
    editor.setView('transition');
  }
}

const viewport = document.querySelector('#viewport');
let lastMobile = viewport.clientWidth <= 700;
let lastAspect = viewport.clientWidth / viewport.clientHeight;
new ResizeObserver(() => {
  const { width, height } = viewport.getBoundingClientRect();
  if (!width || !height) return;
  const mobile = width <= 700;
  const aspect = width / height;
  if (viewTransition.active && Math.abs(aspect - camera.aspect) > 0.001) viewTransition.cancel();
  const reframe = mobile !== lastMobile || Math.abs(aspect - lastAspect) > 0.1;
  lastMobile = mobile;
  lastAspect = aspect;
  if (reframe && !viewTransition.active) setView(currentView);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}).observe(viewport);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  interactions.update(delta);
  walk.update(delta);
  viewTransition.update(performance.now());
  if (!walk.active && !viewTransition.active) controls.update();
  const mapPosition = currentView === 'walk' ? walk.position : currentView === 'bedroom' ? camera.position : controls.target;
  const mapYaw = currentView === 'walk' ? walk.yaw : Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
  miniMap.draw(mapPosition, mapYaw, currentView);
  if (viewTransition.active) renderer.render(scene, camera);
  else if (currentMode === 'plan') floorPlan.draw();
  else renderer.render(scene, camera);
}
setView('axonometric');
setMode('plan');
animate();

document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
function setLibraryCollapsed(collapsed) {
  document.querySelector('.workspace').classList.toggle('library-collapsed', collapsed);
  const toggle = document.querySelector('#library-toggle');
  toggle.setAttribute('aria-expanded', !collapsed);
  toggle.innerHTML = `<span aria-hidden="true">${collapsed ? '☷' : '☰'}</span> ${collapsed ? '展开家居库' : '家居库'}`;
}
const narrowLayout = window.matchMedia('(max-width: 1000px)');
setLibraryCollapsed(narrowLayout.matches);
narrowLayout.addEventListener('change', (event) => setLibraryCollapsed(event.matches));
document.querySelector('#library-toggle').addEventListener('click', () => {
  setLibraryCollapsed(!document.querySelector('.workspace').classList.contains('library-collapsed'));
});

document.querySelectorAll('.view-button').forEach((button) => button.addEventListener('click', () => {
  setView(button.dataset.view);
}));
document.addEventListener('pointerlockchange', () => {
  walkHint.textContent = document.pointerLockElement === renderer.domElement
    ? 'WASD 行走 · 鼠标转向 · 点击物件开合 · Esc 释放鼠标'
    : 'WASD 行走 · 拖动鼠标转向 · 点击物件开合';
});

const toast = document.querySelector('#toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}

function download(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

document.querySelector('#save-png').addEventListener('click', () => {
  if (currentMode === 'plan') {
    download(document.querySelector('#floor-plan-canvas').toDataURL('image/png'), '客厅主卧阳台-二维户型图.png');
    showToast('二维户型图 PNG 已生成');
    return;
  }
  renderer.render(scene, camera);
  download(renderer.domElement.toDataURL('image/png'), `客厅主卧阳台户型-${currentView}.png`);
  showToast('当前视角 PNG 已生成');
});

document.querySelector('#save-glb').addEventListener('click', () => {
  const previous = [model.fullWalls.visible, model.cutWalls.visible, model.ceiling.visible, model.dimensions.visible, bedroom.fullWalls.visible, bedroom.cutWalls.visible, bedroom.ceiling.visible, bedroom.dimensions.visible, balcony.ceiling.visible, balcony.dimensions.visible];
  model.fullWalls.visible = true;
  model.cutWalls.visible = false;
  model.ceiling.visible = true;
  model.dimensions.visible = false;
  bedroom.fullWalls.visible = true;
  bedroom.cutWalls.visible = false;
  bedroom.ceiling.visible = true;
  bedroom.dimensions.visible = false;
  balcony.ceiling.visible = true;
  balcony.dimensions.visible = false;
  const restore = () => {
    [model.fullWalls.visible, model.cutWalls.visible, model.ceiling.visible, model.dimensions.visible, bedroom.fullWalls.visible, bedroom.cutWalls.visible, bedroom.ceiling.visible, bedroom.dimensions.visible, balcony.ceiling.visible, balcony.dimensions.visible] = previous;
  };
  new GLTFExporter().parse(combinedRoot, (result) => {
    restore();
    const url = URL.createObjectURL(new Blob([result], { type: 'model/gltf-binary' }));
    download(url, '客厅主卧阳台户型.glb');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('GLB 模型已生成');
  }, (error) => {
    restore();
    console.error(error);
    showToast('导出失败，请查看浏览器控制台');
  }, { binary: true, onlyVisible: true });
});

window.__ROOM_MODEL__ = { ROOM, BEDROOM, setView, scene, camera, renderer, model, bedroom, balcony, sofas, combinedRoot, walk };
