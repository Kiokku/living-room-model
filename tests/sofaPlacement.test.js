import test from 'node:test';
import assert from 'node:assert/strict';
import { canPlaceSofa } from '../src/sofaPlacement.js';

const room = { width: 3.5, length: 5.4 };
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
