import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSofaModel, cloneSofaModel, setSofaColor, SOFA_COLORS } from '../src/sofaModel.js';

globalThis.document = {
  createElement: () => ({
    getContext: () => ({
      createImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
      putImageData: () => {},
    }),
  }),
};

const fabric = (sofa) => sofa.children.find((part) => part.name === '布艺座框').material;

test('奶油色与浅驼色沙发可分别换色，几何尺寸不变', () => {
  const template = createSofaModel();
  const cream = cloneSofaModel(template, 'cream');
  const camel = cloneSofaModel(template, 'camel');
  assert.notStrictEqual(fabric(cream), fabric(camel));
  assert.equal(fabric(cream).color.getHex(), SOFA_COLORS.cream.fabric);
  assert.equal(fabric(camel).color.getHex(), SOFA_COLORS.camel.fabric);

  setSofaColor(cream, 'camel');
  setSofaColor(camel, 'cream');
  assert.equal(fabric(cream).color.getHex(), SOFA_COLORS.camel.fabric);
  assert.equal(fabric(camel).color.getHex(), SOFA_COLORS.cream.fabric);
  assert.equal(fabric(template).color.getHex(), SOFA_COLORS.cream.fabric);

  const sizes = [cream, camel].map((sofa) => new THREE.Box3().setFromObject(sofa).getSize(new THREE.Vector3()).toArray());
  assert.deepEqual(sizes[0], sizes[1]);
});
