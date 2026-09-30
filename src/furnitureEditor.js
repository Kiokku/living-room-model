import * as THREE from 'three';
import { createSofaModel, cloneSofaModel, setSofaColor, SOFA, SOFA_COLORS } from './sofaModel.js';
import { canPlaceFurniture } from './sofaPlacement.js';
import { FURNITURE_LIBRARY } from './furnitureLibrary.js';
import { buildFurniture } from './importedFurniture.js';

export function createFurnitureEditor({ canvas, planCanvas, floorPlan, camera, controls, root, walkRoots, sofas, room, bedroom, panel, card, toggle, save, remove, toolbar, announce }) {
  const template = createSofaModel();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  const help = panel.querySelector('p');
  const colorSelect = toolbar.querySelector('[data-furniture-color]');
  let view = 'axonometric';
  let editing = true;
  let color = 'cream';
  let selected = null;
  let placing = null;
  let moving = null;
  let planMoving = null;

  const active = () => editing && (view === 'axonometric' || view === 'top' || view === 'plan');
  const validAt = (x, z, item) => canPlaceFurniture(x, z, sofas, room, bedroom, item);
  const overCanvas = (event) => document.elementFromPoint(event.clientX, event.clientY) === (view === 'plan' ? planCanvas : canvas);
  const onPlan = (event) => floorPlan.toWorld(event.clientX, event.clientY);
  const onFloor = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(floor, point);
  };
  const makeSofa = (type = 'norhor', savedColor = color) => {
    const definition = FURNITURE_LIBRARY.find(item => item.type === type);
    const sofa = definition ? buildFurniture({ ...definition, color: savedColor || definition.color }) : cloneSofaModel(template, savedColor);
    sofa.rotation.y = definition ? 0 : -Math.PI / 2;
    sofa.name = definition?.label || template.name;
    const bounds = definition ? new THREE.Box3().setFromObject(sofa) : null;
    Object.assign(sofa.userData, {
      furnitureType: type, color: definition ? savedColor || definition.color : savedColor,
      w: definition?.w || SOFA.length * 1000, d: definition?.d || SOFA.depth * 1000,
      bounds: bounds ? { left: bounds.min.x, right: bounds.max.x, far: bounds.min.z, near: bounds.max.z }
        : { left: -SOFA.length / 2, right: SOFA.length / 2, far: -SOFA.depth / 2, near: SOFA.depth / 2 },
    });
    root.add(sofa);
    return sofa;
  };
  const addPlaced = (item) => {
    sofas.push(item);
    if (item.userData.furnitureType !== 'rug') walkRoots.push(item);
  };
  const showColor = () => {
    panel.dataset.sofaColor = color;
    const definition = FURNITURE_LIBRARY.find(item => item.type === selected?.userData.furnitureType);
    const options = definition ? [[definition.color, '原色'], ['#eee7da', '奶油色'], ['#ae8e7b', '浅驼色'], ['#a4a6a3', '灰色'], ['#f5f3ed', '白色']]
      : Object.entries(SOFA_COLORS).map(([value, entry]) => [value, entry.label]);
    const value = selected?.userData.color || color;
    if (!options.some(([key]) => key === value)) options.push([value, '当前颜色']);
    const swatch = (key) => key.startsWith('#') ? key : '#' + SOFA_COLORS[key].fabric.toString(16).padStart(6, '0');
    const current = options.find(([key]) => key === value);
    colorSelect.innerHTML = `<summary><i style="background:${swatch(value)}" aria-hidden="true"></i><span>${current[1]}</span><span aria-hidden="true">⌄</span></summary><div class="furniture-color-options" role="group" aria-label="选择家具颜色">${options.map(([key, label]) => `<button type="button" data-color-value="${key}" aria-pressed="${key === value}"><i style="background:${swatch(key)}" aria-hidden="true"></i>${label}</button>`).join('')}</div>`;
    colorSelect.open = false;
    colorSelect.value = value;
  };
  const select = (sofa) => {
    selected = sofa;
    if (sofa?.userData.furnitureType === 'norhor') color = sofa.userData.color;
    showColor();
    setView(view);
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
  const hitPlanSofa = (event) => {
    const { x, z } = onPlan(event);
    return [...sofas].reverse().sort((a, b) => Number(a.userData.furnitureType === 'rug') - Number(b.userData.furnitureType === 'rug')).find((sofa) => {
      const dx = x - sofa.position.x;
      const dz = z - sofa.position.z;
      const theta = sofa.rotation.y;
      const localX = Math.cos(theta) * dx - Math.sin(theta) * dz;
      const localZ = Math.sin(theta) * dx + Math.cos(theta) * dz;
      const bounds = sofa.userData.bounds;
      return localX >= bounds.left && localX <= bounds.right && localZ >= bounds.far && localZ <= bounds.near;
    }) || null;
  };

  function setView(next) {
    view = next;
    const enabled = active();
    panel.classList.toggle('inactive', !enabled);
    toggle.disabled = next !== 'axonometric' && next !== 'top' && next !== 'plan';
    card.disabled = !enabled;
    panel.querySelectorAll('[data-furniture-type]').forEach((button) => { button.disabled = !enabled; });
    remove.disabled = !enabled || !selected;
    toolbar.hidden = !enabled || !selected;
    floorPlan.setSelected(enabled ? selected : null);
    toolbar.querySelector('[data-selected-name]').textContent = selected?.name || '';
    help.textContent = next === 'plan' ? enabled ? '拖入房间空地，拖动平面图中的家具调整位置' : '点击开启编辑后拖入家具' : toggle.disabled ? '切换到轴测或俯视视角编辑'
      : enabled ? '拖入房间空地，拖动已放置的家具调整位置' : '点击开启编辑后拖入家具';
  }

  toggle.addEventListener('click', () => {
    editing = !editing;
    toggle.textContent = editing ? '编辑中' : '开启编辑';
    toggle.setAttribute('aria-pressed', editing);
    setView(view);
  });
  const changeColor = () => {
    if (!active() || !selected) return;
    const value = colorSelect.value;
    if (selected.userData.furnitureType === 'norhor') {
      color = value;
      setSofaColor(selected, value);
    } else {
      const definition = FURNITURE_LIBRARY.find(item => item.type === selected.userData.furnitureType);
      const replacement = buildFurniture({ ...definition, color: value });
      selected.traverse(node => node.geometry?.dispose());
      selected.clear();
      selected.add(...replacement.children.slice());
      selected.userData.color = value;
    }
    showColor();
    floorPlan.draw();
    announce('家具颜色已更新');
  };
  colorSelect.addEventListener('change', changeColor);
  colorSelect.addEventListener('click', (event) => {
    const option = event.target.closest('[data-color-value]');
    if (!option) return;
    colorSelect.value = option.dataset.colorValue;
    changeColor();
  });
  colorSelect.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      colorSelect.open = false;
      colorSelect.querySelector('summary').focus();
    }
  });

  [card, ...panel.querySelectorAll('[data-furniture-type]')].forEach((furnitureCard) => {
    furnitureCard.addEventListener('pointerdown', (event) => {
      if (!active() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      const type = furnitureCard.dataset.furnitureType || 'norhor';
      const definition = FURNITURE_LIBRARY.find(item => item.type === type);
      const sofa = makeSofa(type, definition?.color || color);
      sofa.visible = false;
      placing = { sofa, pointerId: event.pointerId, valid: false };
      furnitureCard.setPointerCapture(event.pointerId);
    });
    const updatePlacement = (event) => {
      if (!placing || event.pointerId !== placing.pointerId) return;
      if (view === 'plan') {
        const hit = overCanvas(event);
        const position = hit && onPlan(event);
        placing.valid = Boolean(position && validAt(position.x, position.z, placing.sofa));
        if (position) placing.sofa.position.set(position.x, 0, position.z);
        floorPlan.setPreview(position ? { item: placing.sofa, valid: placing.valid } : null);
        floorPlan.draw();
        return;
      }
      const hit = overCanvas(event) && onFloor(event);
      const valid = Boolean(hit && validAt(point.x, point.z, placing.sofa));
      placing.valid = valid;
      placing.sofa.visible = valid;
      if (valid) placing.sofa.position.set(point.x, 0, point.z);
    };
    furnitureCard.addEventListener('pointermove', updatePlacement);
    const endPlacement = (event) => {
      if (!placing || event.pointerId !== placing.pointerId) return;
      if (event.type === 'pointerup') updatePlacement(event);
      floorPlan.setPreview(null);
      floorPlan.draw();
      if (event.type === 'pointerup' && placing.valid) {
        placing.sofa.visible = true;
        addPlaced(placing.sofa);
        select(placing.sofa);
        announce(`${placing.sofa.name}已放置，可继续拖动调整位置`);
      } else {
        root.remove(placing.sofa);
        if (event.type === 'pointerup') announce('请拖入房间空地，避开墙、门、固定柜和其他家具');
      }
      placing = null;
    };
    furnitureCard.addEventListener('pointerup', endPlacement);
    furnitureCard.addEventListener('pointercancel', endPlacement);
    furnitureCard.addEventListener('keydown', (event) => {
      if (!active() || !['Enter', 'Space'].includes(event.code)) return;
      event.preventDefault();
      const type = furnitureCard.dataset.furnitureType || 'norhor';
      const definition = FURNITURE_LIBRARY.find(item => item.type === type);
      const sofa = makeSofa(type, definition?.color || color);
      const x = definition?.category === '卧室' && bedroom ? (bedroom.left + bedroom.right) / 2 : 0;
      const z = definition?.category === '卧室' && bedroom ? (bedroom.far + bedroom.near) / 2 : 0;
      if (!validAt(x, z, sofa)) {
        root.remove(sofa);
        return announce('中心位置已被占用，请拖入其他空地');
      }
      sofa.position.set(x, 0, z);
      addPlaced(sofa);
      select(sofa);
      announce(`${sofa.name}已放置，可拖动调整位置`);
    });

  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!active() || event.button !== 0) return;
    const sofa = hitSofa(event);
    if (!sofa) return select(null);
    if (!onFloor(event)) return;
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

  planCanvas.addEventListener('pointerdown', (event) => {
    if (!active() || event.button !== 0) return;
    const sofa = hitPlanSofa(event);
    if (!sofa) return select(null);
    event.preventDefault();
    const position = onPlan(event);
    planMoving = { sofa, pointerId: event.pointerId, offsetX: sofa.position.x - position.x, offsetZ: sofa.position.z - position.z };
    select(sofa);
    planCanvas.setPointerCapture(event.pointerId);
    planCanvas.style.cursor = 'grabbing';
  });
  planCanvas.addEventListener('pointermove', (event) => {
    if (planMoving && event.pointerId === planMoving.pointerId) {
      const position = onPlan(event);
      const x = position.x + planMoving.offsetX;
      const z = position.z + planMoving.offsetZ;
      if (validAt(x, z, planMoving.sofa)) {
        planMoving.sofa.position.set(x, 0, z);
        planCanvas.style.cursor = 'grabbing';
        floorPlan.draw();
      } else planCanvas.style.cursor = 'not-allowed';
    } else if (active()) planCanvas.style.cursor = hitPlanSofa(event) ? 'move' : 'default';
  });
  const endPlanMove = (event) => {
    if (!planMoving || event.pointerId !== planMoving.pointerId) return;
    planMoving = null;
    planCanvas.style.cursor = 'default';
  };
  planCanvas.addEventListener('pointerup', endPlanMove);
  planCanvas.addEventListener('pointercancel', endPlanMove);

  const rotate = (angle) => {
    if (!active() || !selected) return;
    const previous = selected.rotation.y;
    selected.rotation.y += angle;
    if (!validAt(selected.position.x, selected.position.z, selected)) {
      selected.rotation.y = previous;
      return announce('旋转后空间不足，请先移动家具');
    }
    floorPlan.draw();
  };
  toolbar.querySelector('[data-action="rotate-right"]').addEventListener('click', () => rotate(-Math.PI / 2));
  toolbar.querySelector('[data-action="done"]').addEventListener('click', () => select(null));
  toolbar.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
    if (!active() || !selected) return;
    const copy = makeSofa(selected.userData.furnitureType, selected.userData.color);
    copy.rotation.y = selected.rotation.y;
    for (let distance = 0.25; distance <= 5; distance += 0.25) {
      for (let step = 0; step < 16; step++) {
        const angle = step * Math.PI / 8;
        const x = selected.position.x + distance * Math.cos(angle);
        const z = selected.position.z + distance * Math.sin(angle);
        if (!validAt(x, z, copy)) continue;
        copy.position.set(x, 0, z);
        addPlaced(copy);
        select(copy);
        floorPlan.draw();
        return announce('已复制家具');
      }
    }
    root.remove(copy);
    announce('没有足够空间放置副本');
  });

  const storageKey = 'living-room-model:furniture:v1';
  save.addEventListener('click', () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sofas.map((sofa) => ({
        type: sofa.userData.furnitureType, x: sofa.position.x, z: sofa.position.z, color: sofa.userData.color, rotation: sofa.rotation.y,
      }))));
      announce('家具方案已保存，刷新后会自动恢复');
    } catch {
      announce('保存失败，请检查浏览器是否允许本地存储');
    }
  });

  remove.addEventListener('click', () => {
    if (!active() || !selected) return;
    root.remove(selected);
    sofas.splice(sofas.indexOf(selected), 1);
    const walkIndex = walkRoots.indexOf(selected);
    if (walkIndex !== -1) walkRoots.splice(walkIndex, 1);
    select(null);
    announce('已移除家具');
  });

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) saved.forEach((item) => {
      const type = item?.type || 'norhor';
      const definition = FURNITURE_LIBRARY.find(entry => entry.type === type);
      if (!item || !Number.isFinite(item.x) || !Number.isFinite(item.z)
        || (type === 'norhor' ? !Object.hasOwn(SOFA_COLORS, item.color) : !definition || !/^#[0-9a-f]{6}$/i.test(item.color))) return;
      const sofa = makeSofa(type, item.color);
      if (Number.isFinite(item.rotation)) sofa.rotation.y = item.rotation;
      if (!validAt(item.x, item.z, sofa)) return root.remove(sofa);
      sofa.position.set(item.x, 0, item.z);
      addPlaced(sofa);
    });
  } catch {
    announce('无法读取已保存的家具方案，请重新保存');
  }
  showColor();
  setView(view);
  return { setView };
}
