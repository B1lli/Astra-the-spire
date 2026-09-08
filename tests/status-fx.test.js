import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { StatusFX } from '../src/status-fx.js';

test('状态外观随消耗收回，菜单隐藏；减弱动态不显示粒子', () => {
  for (const id of ['kael', 'lyra', 'syl']) {
    const body = new T.Group();
    const fx = new StatusFX({body}, id);
    fx.set({block: 12, nextAttack: 5, afterimage: 3, elementCharge: 6});
    fx.tick(.016, 1, true, true);
    assert.ok(fx.shield.visible && fx.weapon.visible && fx.wings.visible);
    fx.set({afterimage: 3}); fx.tick(.016, 2, true, true);
    assert.equal(fx.shield.visible, false); assert.equal(fx.weapon.visible, false);
    assert.equal(fx.wings.visible, true);
    fx.tick(.016, 2, false, true); assert.equal(fx.particles.visible, false);
    fx.tick(.016, 2, true, false); assert.equal(fx.root.visible, false);
    fx.set({}); fx.tick(.016, 3, true, true); assert.equal(fx.root.visible, false);
    fx.trigger({type:'attack'}); fx.tick(.1, 4, true, true); assert.equal(fx.weapon.visible, true);
    fx.tick(2, 6, true, true); assert.equal(fx.weapon.visible, false);
    body.traverse(o => { if (o.isMesh) assert.equal(o.geometry.type, 'OctahedronGeometry'); });
  }
});
