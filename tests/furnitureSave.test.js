import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFurnitureEditor } from '../src/furnitureEditor.js';
import { FURNITURE_LIBRARY } from '../src/furnitureLibrary.js';
const room = { width: 3.5, length: 5.4, cabinet: { left: 0.06, right: 1.68, depth: 0.43 } };
globalThis.document = {
  createElement: () => ({
    getContext: () => ({
      createImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
      putImageData() {},
    }),
  }),
};

const element = () => ({
  events: new Map(), dataset: {}, classList: { toggle() {} },
  addEventListener(name, callback) { this.events.set(name, callback); },
  setAttribute() {}, setPointerCapture() {}, style: {},
});

const bedroom = {
  left: -5.29, right: -1.84, far: -1.58, near: 2.7,
  entry: { left: -3.13, right: -2.43 }, farDoor: { left: -2.93, right: -2.23 },
  wardrobe: { left: -5.19, right: -3.31, depth: 0.55 },
};

function editor() {
  const panel = element();
  panel.querySelector = () => ({});
  const cards = FURNITURE_LIBRARY.map(item => Object.assign(element(), { dataset: { furnitureType: item.type } }));
  panel.querySelectorAll = () => cards;
  const toolbar = element();
  const actions = new Map();
  toolbar.querySelector = (selector) => {
    if (!actions.has(selector)) actions.set(selector, element());
    return actions.get(selector);
  };
  const state = {
    canvas: element(), planCanvas: element(), floorPlan: { draw() {}, setSelected() {}, setPreview() {}, toWorld: (x, z) => ({ x, z }) },
    camera: new THREE.PerspectiveCamera(), controls: {}, root: new THREE.Group(),
    walkRoots: [], sofas: [], room, bedroom, panel, card: element(), toggle: element(),
    save: element(), remove: element(), toolbar, announce(message) { state.message = message; },
  };
  state.api = createFurnitureEditor(state);
  state.cards = cards;
  state.colorSelect = toolbar.querySelector('[data-furniture-color]');
  return state;
}

test('保存位置和颜色后恢复，移除并保存后恢复空方案', () => {
  let stored = null;
  globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const first = editor();
  first.card.events.get('keydown')({ code: 'Enter', preventDefault() {} });
  first.sofas[0].position.set(0.35, 0, -0.3);
  assert.match(first.colorSelect.innerHTML, /background:#ffffff/);
  assert.match(first.colorSelect.innerHTML, /background:#bd9e91/);
  first.colorSelect.open = true;
  first.colorSelect.events.get('click')({ target: { closest: () => ({ dataset: { colorValue: 'camel' } }) } });
  assert.equal(first.colorSelect.open, false);
  assert.match(first.colorSelect.innerHTML, /data-color-value="camel" aria-pressed="true"/);
  first.save.events.get('click')();
  assert.match(first.message, /已保存/);
  const restored = editor();
  assert.equal(restored.sofas.length, 1);
  assert.equal(restored.sofas[0].position.x, 0.35);
  assert.equal(restored.sofas[0].position.z, -0.3);
  assert.equal(restored.sofas[0].userData.color, 'camel');
  assert.equal(restored.sofas[0].visible, true);
  assert.equal(restored.walkRoots[0], restored.sofas[0]);
  first.remove.events.get('click')();
  first.save.events.get('click')();
  assert.equal(editor().sofas.length, 0);
});

test('存储损坏或写入失败时编辑器仍可使用，并显示失败提示', () => {
  globalThis.localStorage = { getItem: () => '{', setItem() { throw new Error('quota'); } };
  const state = editor();
  assert.equal(state.sofas.length, 0);
  assert.match(state.message, /无法读取/);
  state.save.events.get('click')();
  assert.match(state.message, /保存失败/);
});

test('八种家具都能放置，混合方案恢复类型、位置及地毯层', () => {
  let stored = null;
  globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  for (const entry of FURNITURE_LIBRARY) {
    const state = editor();
    state.cards.find(card => card.dataset.furnitureType === entry.type).events.get('keydown')({ code: 'Enter', preventDefault() {} });
    assert.equal(state.sofas.length, 1, entry.type);
    assert.equal(state.sofas[0].userData.furnitureType, entry.type);
    assert.equal(state.sofas[0].children.length > 0, true);
  }
  const state = editor();
  for (const type of ['bed', 'rug', 'coffeetable']) {
    state.cards.find(card => card.dataset.furnitureType === type).events.get('keydown')({ code: 'Enter', preventDefault() {} });
  }
  assert.equal(state.sofas.length, 3);
  assert.equal(state.walkRoots.length, 2);
  state.save.events.get('click')();
  const restored = editor();
  assert.deepEqual(restored.sofas.map(item => item.userData.furnitureType), ['bed', 'rug', 'coffeetable']);
  assert.equal(restored.sofas[0].position.x, (bedroom.left + bedroom.right) / 2);
  assert.equal(restored.walkRoots.length, 2);
});

test('二维拖入并移动床头柜，移除地毯不会删除其他家具的漫游碰撞对象', () => {
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  const state = editor();
  state.api.setView('plan');
  document.elementFromPoint = () => state.planCanvas;
  const card = state.cards.find(card => card.dataset.furnitureType === 'nightstand');
  const event = (x, z, type) => ({ pointerId: 1, button: 0, clientX: x, clientY: z, type, preventDefault() {} });
  card.events.get('pointerdown')(event(-4.5, 0, 'pointerdown'));
  card.events.get('pointerup')(event(-4.5, 0, 'pointerup'));
  assert.equal(state.sofas.length, 1);
  state.planCanvas.events.get('pointerdown')(event(-4.5, 0, 'pointerdown'));
  state.planCanvas.events.get('pointermove')(event(-4.1, 0.5, 'pointermove'));
  state.planCanvas.events.get('pointerup')(event(-4.1, 0.5, 'pointerup'));
  assert.equal(state.sofas[0].position.x, -4.1);
  assert.equal(state.sofas[0].position.z, 0.5);
  state.cards.find(card => card.dataset.furnitureType === 'rug').events.get('keydown')({ code: 'Enter', preventDefault() {} });
  state.remove.events.get('click')();
  assert.equal(state.walkRoots.length, 1);
  assert.equal(state.walkRoots[0], state.sofas[0]);
});

test('地毯后放入时，二维点击仍优先选中上面的茶几', () => {
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  const state = editor();
  state.api.setView('plan');
  for (const type of ['coffeetable', 'rug']) {
    state.cards.find(card => card.dataset.furnitureType === type).events.get('keydown')({ code: 'Enter', preventDefault() {} });
  }
  state.planCanvas.events.get('pointerdown')({ pointerId: 2, button: 0, clientX: 0, clientY: 0, preventDefault() {} });
  state.planCanvas.events.get('pointerup')({ pointerId: 2 });
  state.remove.events.get('click')();
  assert.deepEqual(state.sofas.map(item => item.userData.furnitureType), ['rug']);
  assert.equal(state.walkRoots.length, 0);
});

test('操作栏旋转、复制保留朝向颜色，保存后恢复，完成和空白点击取消选中', () => {
  let stored = null;
  globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const state = editor();
  state.api.setView('plan');
  assert.equal(state.toolbar.hidden, true);
  state.cards.find(card => card.dataset.furnitureType === 'nightstand').events.get('keydown')({ code: 'Enter', preventDefault() {} });
  const original = state.sofas[0];
  const action = (name) => state.toolbar.querySelector(`[data-action="${name}"]`).events.get('click')();
  assert.equal(state.toolbar.hidden, false);
  assert.equal(state.toolbar.querySelector('[data-selected-name]').textContent, original.name);
  action('rotate-right');
  assert.equal(original.rotation.y, -Math.PI / 2);
  action('duplicate');
  assert.equal(state.sofas.length, 2);
  const copy = state.sofas[1];
  assert.equal(copy.rotation.y, original.rotation.y);
  assert.equal(copy.userData.color, original.userData.color);
  assert.equal(copy.userData.furnitureType, original.userData.furnitureType);
  assert.notDeepEqual(copy.position, original.position);
  assert.equal(state.walkRoots[1], copy);
  state.save.events.get('click')();
  const restored = editor();
  assert.equal(restored.sofas.length, 2);
  assert.deepEqual(restored.sofas.map(item => item.rotation.y), [-Math.PI / 2, -Math.PI / 2]);
  action('done');
  assert.equal(state.toolbar.hidden, true);
  state.planCanvas.events.get('pointerdown')({ pointerId: 3, button: 0, clientX: original.position.x, clientY: original.position.z, preventDefault() {} });
  state.planCanvas.events.get('pointerup')({ pointerId: 3 });
  assert.equal(state.toolbar.hidden, false);
  state.planCanvas.events.get('pointerdown')({ button: 0, clientX: 20, clientY: 20 });
  assert.equal(state.toolbar.hidden, true);
});

test('靠墙旋转失败保留角度，没有空位时复制不留下副本', () => {
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  const state = editor();
  state.cards.find(card => card.dataset.furnitureType === 'coffeetable').events.get('keydown')({ code: 'Enter', preventDefault() {} });
  const item = state.sofas[0];
  item.position.set(0.5, 0, -2.1);
  state.toolbar.querySelector('[data-action="rotate-right"]').events.get('click')();
  assert.equal(item.rotation.y, 0);
  assert.match(state.message, /空间不足/);
  state.room.width = 0.1;
  state.bedroom.right = state.bedroom.left + 0.1;
  state.toolbar.querySelector('[data-action="duplicate"]').events.get('click')();
  assert.equal(state.sofas.length, 1);
  assert.equal(state.root.children.length, 1);
  assert.match(state.message, /没有足够空间/);
  state.room.width = 3.5;
  state.bedroom.right = -1.84;
});

test('操作栏下拉换色保留家具位置、朝向和碰撞对象，复制与保存恢复颜色', () => {
  let stored = null;
  globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const state = editor();
  state.cards.find(card => card.dataset.furnitureType === 'sofa').events.get('keydown')({ code: 'Enter', preventDefault() {} });
  const item = state.sofas[0];
  const position = item.position.clone();
  const rotation = item.rotation.y;
  const bounds = { ...item.userData.bounds };
  const oldChild = item.children[0];
  state.colorSelect.value = '#a4a6a3';
  state.colorSelect.events.get('change')();
  assert.equal(state.sofas[0], item);
  assert.equal(state.walkRoots[0], item);
  assert.deepEqual(item.position, position);
  assert.equal(item.rotation.y, rotation);
  assert.deepEqual(item.userData.bounds, bounds);
  assert.notEqual(item.children[0], oldChild);
  assert.equal(item.userData.color, '#a4a6a3');
  assert.equal(state.colorSelect.value, '#a4a6a3');
  state.toolbar.querySelector('[data-action="duplicate"]').events.get('click')();
  state.save.events.get('click')();
  const restored = editor();
  assert.equal(restored.sofas.length, state.sofas.length);
  assert.ok(restored.sofas.every(item => item.userData.color === '#a4a6a3'));
});
