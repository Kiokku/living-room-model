import * as THREE from 'three';
import { createSofaModel, cloneSofaModel, setSofaColor, SOFA_COLORS } from './sofaModel.js';
import { canPlaceSofa } from './sofaPlacement.js';

export function createFurnitureEditor({ canvas, camera, controls, root, walkRoots, sofas, room, panel, card, toggle, remove, announce }) {
  const template = createSofaModel();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  const help = panel.querySelector('p');
  const colorButtons = [...panel.querySelectorAll('[data-sofa-color]')];
  let view = 'axonometric';
  let editing = true;
  let color = 'cream';
  let selected = null;
  let placing = null;
  let moving = null;

  const active = () => editing && (view === 'axonometric' || view === 'top');
  const validAt = (x, z, movingSofa = null) => canPlaceSofa(x, z, sofas, room, movingSofa);
  const overCanvas = (event) => document.elementFromPoint(event.clientX, event.clientY) === canvas;
  const onFloor = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(floor, point);
  };
  const makeSofa = () => {
    const sofa = cloneSofaModel(template, color);
    sofa.rotation.y = -Math.PI / 2;
    root.add(sofa);
    return sofa;
  };
  const showColor = () => {
    panel.dataset.sofaColor = color;
    colorButtons.forEach((button) => button.setAttribute('aria-pressed', button.dataset.sofaColor === color));
  };
  const select = (sofa) => {
    selected = sofa;
    if (sofa) color = sofa.userData.color;
    showColor();
    remove.disabled = !active() || !selected;
  };
  const hitSofa = (event) => {
    if (!sofas.length) return null;
    onFloor(event);
    root.updateMatrixWorld(true);
    const hit = raycaster.intersectObjects(sofas, true)[0];
    let node = hit?.object;
    while (node && !sofas.includes(node)) node = node.parent;
    return node || null;
  };

  function setView(next) {
    view = next;
    const enabled = active();
    panel.classList.toggle('inactive', !enabled);
    toggle.disabled = next === 'walk' || next === 'bedroom';
    card.disabled = !enabled;
    colorButtons.forEach((button) => { button.disabled = !enabled; });
    remove.disabled = !enabled || !selected;
    help.textContent = toggle.disabled ? '切换到轴测或俯视视角编辑'
      : enabled ? '拖入客厅空地，拖动已放置的沙发调整位置' : '点击开启编辑后拖入沙发';
  }

  toggle.addEventListener('click', () => {
    editing = !editing;
    toggle.textContent = editing ? '编辑中' : '开启编辑';
    toggle.setAttribute('aria-pressed', editing);
    setView(view);
  });
  colorButtons.forEach((button) => button.addEventListener('click', () => {
    color = button.dataset.sofaColor;
    showColor();
    if (selected) setSofaColor(selected, color);
    announce(selected ? `选中沙发已改为${SOFA_COLORS[color].label}` : `新沙发将使用${SOFA_COLORS[color].label}`);
  }));

  card.addEventListener('pointerdown', (event) => {
    if (!active() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    const sofa = makeSofa();
    sofa.visible = false;
    placing = { sofa, pointerId: event.pointerId, valid: false };
    card.setPointerCapture(event.pointerId);
  });
  const updatePlacement = (event) => {
    if (!placing || event.pointerId !== placing.pointerId) return;
    const hit = overCanvas(event) && onFloor(event);
    const valid = Boolean(hit && validAt(point.x, point.z));
    placing.valid = valid;
    placing.sofa.visible = valid;
    if (valid) placing.sofa.position.set(point.x, 0, point.z);
  };
  card.addEventListener('pointermove', updatePlacement);
  const endPlacement = (event) => {
    if (!placing || event.pointerId !== placing.pointerId) return;
    if (event.type === 'pointerup') updatePlacement(event);
    if (event.type === 'pointerup' && placing.valid) {
      sofas.push(placing.sofa);
      walkRoots.push(placing.sofa);
      select(placing.sofa);
      announce('沙发已放置，可继续拖动调整位置');
    } else {
      root.remove(placing.sofa);
      if (event.type === 'pointerup') announce('请拖入客厅空地，避开墙、门和固定柜');
    }
    placing = null;
  };
  card.addEventListener('pointerup', endPlacement);
  card.addEventListener('pointercancel', endPlacement);
  card.addEventListener('keydown', (event) => {
    if (!active() || !['Enter', 'Space'].includes(event.code)) return;
    event.preventDefault();
    if (!validAt(0, 0)) return announce('中心位置已被占用，请拖入其他空地');
    const sofa = makeSofa();
    sofas.push(sofa);
    walkRoots.push(sofa);
    select(sofa);
    announce('沙发已放在客厅中心，可拖动调整位置');
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!active() || event.button !== 0) return;
    const sofa = hitSofa(event);
    if (!sofa || !onFloor(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    moving = { sofa, pointerId: event.pointerId, offsetX: sofa.position.x - point.x, offsetZ: sofa.position.z - point.z };
    select(sofa);
    controls.enabled = false;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }, true);
  canvas.addEventListener('pointermove', (event) => {
    if (moving && event.pointerId === moving.pointerId) {
      event.stopImmediatePropagation();
      if (!onFloor(event)) return;
      const x = point.x + moving.offsetX;
      const z = point.z + moving.offsetZ;
      if (validAt(x, z, moving.sofa)) {
        moving.sofa.position.set(x, 0, z);
        canvas.style.cursor = 'grabbing';
      } else canvas.style.cursor = 'not-allowed';
    } else if (active() && hitSofa(event)) {
      event.stopImmediatePropagation();
      canvas.style.cursor = 'move';
    }
  }, true);
  const endMove = (event) => {
    if (!moving || event.pointerId !== moving.pointerId) return;
    event.stopImmediatePropagation();
    moving = null;
    controls.enabled = true;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', endMove, true);
  canvas.addEventListener('pointercancel', endMove, true);

  remove.addEventListener('click', () => {
    if (!selected) return;
    root.remove(selected);
    sofas.splice(sofas.indexOf(selected), 1);
    walkRoots.splice(walkRoots.indexOf(selected), 1);
    select(null);
    announce('已移除沙发');
  });

  showColor();
  setView(view);
  return { setView };
}
