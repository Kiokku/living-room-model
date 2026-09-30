import test from 'node:test';
import assert from 'node:assert/strict';
import { canPlaceSofa, canPlaceFurniture, furnitureBounds } from '../src/sofaPlacement.js';

const room = { width: 3.5, length: 5.4, cabinet: { left: 0.06, right: 1.68, depth: 0.43 } };
const valid = (x, z, sofas = [], moving = null) => canPlaceSofa(x, z, sofas, room, moving);

test('沙发可放在客厅空地，不能越过墙体或后窗帘', () => {
  assert.equal(valid(0, 0), true);
  assert.equal(valid(1.3, 0), false);
  assert.equal(valid(0, -1.4), false);
});

test('沙发避开入口门、侧门和固定柜的开启范围', () => {
  assert.equal(valid(-1, 1), false);
  assert.equal(valid(-1, -1), false);
  assert.equal(valid(1, 0.6), false);
});

test('拖动时避开其他沙发，但允许保留自身位置', () => {
  const placed = { position: { x: 0, z: 0 } };
  assert.equal(valid(0.5, 0, [placed]), false);
  assert.equal(valid(1, 0, [placed]), true);
  assert.equal(valid(0, 0, [placed], placed), true);
});

test('卧室家具避开墙、门和衣柜，地毯允许家具叠放', () => {
  const bedroom = { left: -5.29, right: -1.84, far: -1.58, near: 2.7,
    entry: { left: -3.13, right: -2.43 }, farDoor: { left: -2.93, right: -2.23 },
    wardrobe: { left: -5.19, right: -3.31, depth: 0.55 } };
  const bed = { position: { x: -3.565, z: 0.56 }, rotation: { y: 0 },
    userData: { furnitureType: 'bed', bounds: { left: -0.9, right: 0.9, far: -1, near: 1 } } };
  assert.equal(canPlaceFurniture(-3.565, 0.56, [], room, bedroom, bed), true);
  assert.equal(canPlaceFurniture(-4.9, 0.56, [], room, bedroom, bed), false);
  assert.equal(canPlaceFurniture(-3.565, 1.3, [], room, bedroom, bed), false);
  assert.equal(canPlaceFurniture(-3.565, -0.5, [], room, bedroom, bed), false);
  const rug = { position: { x: 0, z: 0 }, rotation: { y: 0 },
    userData: { furnitureType: 'rug', bounds: { left: -1.2, right: 1.2, far: -0.85, near: 0.85 } } };
  const table = { position: { x: 0, z: 0 }, rotation: { y: 0 },
    userData: { furnitureType: 'coffeetable', bounds: { left: -0.65, right: 0.65, far: -0.325, near: 0.325 } } };
  assert.equal(canPlaceFurniture(0, 0, [rug], room, bedroom, table), true);
  assert.equal(canPlaceFurniture(0, 0, [table], room, bedroom, rug), true);
  assert.equal(canPlaceFurniture(0, 0, [table], room, bedroom, { ...table }), false);
  table.rotation.y = Math.PI / 2;
  const bounds = furnitureBounds(table);
  assert.ok(Math.abs(bounds.right - 0.325) < 1e-6);
  assert.ok(Math.abs(bounds.near - 0.65) < 1e-6);
});

test('柜前空地可摆家具，地毯可覆盖开门范围但不能穿过固定柜', () => {
  const rug = { position: { x: 0, z: 1.35 }, rotation: { y: 0 },
    userData: { furnitureType: 'rug', bounds: { left: -1.2, right: 1.2, far: -0.85, near: 0.85 } } };
  const small = { position: { x: 0.8, z: 1.8 }, rotation: { y: 0 },
    userData: { furnitureType: 'nightstand', bounds: { left: -0.2, right: 0.2, far: -0.15, near: 0.15 } } };
  assert.equal(canPlaceFurniture(0, 1.35, [], room, null, rug), true);
  assert.equal(canPlaceFurniture(0.8, 1.8, [], room, null, small), true);
  assert.equal(canPlaceFurniture(0, 1.7, [], room, null, rug), false);
  assert.equal(canPlaceFurniture(0.8, 2.4, [], room, null, small), false);
});
