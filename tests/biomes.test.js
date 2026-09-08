import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BIOMES,
  BIOME_IDS,
  biomeForFloor,
  biomeLocation,
} from "../src/biomes.js";
import { buildBiome } from "../src/biome-world.js";
import { createRun } from "../src/roguelike.js";

test("15 层依序穿越四个区域，领主位于古树圣所", () => {
  assert.deepEqual(
    Array.from({ length: 15 }, (_, f) => biomeForFloor(f)),
    [
      ...Array(4).fill("desert"),
      ...Array(4).fill("waste"),
      ...Array(3).fill("grass"),
      ...Array(4).fill("forest"),
    ],
  );
  assert.equal(
    new Set(BIOME_IDS.flatMap((id) => BIOMES[id].variants)).size,
    12,
  );
  assert.equal(biomeLocation(14).name, "古树圣所");
});

test("场景可以从旧存档派生并稳定复现，不消耗抽牌随机数", () => {
  const run = createRun(8751),
    before = structuredClone(run);
  for (let f = 0; f < 15; f++) {
    const a = biomeLocation(f, 0, run.seed),
      b = biomeLocation(f, 0, run.seed);
    assert.deepEqual(a, b);
    assert.notEqual(a.seed, biomeLocation(f, 1, run.seed).seed);
    assert.equal(a.theme, biomeLocation(f, 1, run.seed).theme);
  }
  assert.deepEqual(run, before);
});

test("全部场景几何有效，战斗通道平整，切换时释放每项资源", () => {
  for (const id of BIOME_IDS)
    for (let variant = 0; variant < 3; variant++) {
      const map = buildBiome(id, variant, 9876);
      let meshes = 0;
      const resources = new Set();
      map.root.traverse((object) => {
        if (!object.isMesh) return;
        meshes++;
        const geo = object.geometry;
        assert.ok(
          [...geo.attributes.position.array].every(Number.isFinite),
          `${id}/${variant}`,
        );
        resources.add(geo);
        for (const mat of Array.isArray(object.material)
          ? object.material
          : [object.material])
          resources.add(mat);
        if (geo.type === "PlaneGeometry" && geo.parameters.width === 24) {
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++)
            if (Math.abs(p.getX(i)) < 5.7 && Math.abs(p.getZ(i)) < 2.4) {
              assert.ok(
                Math.abs(p.getY(i) + 0.12) < 0.00001,
                `${id} combat lane`,
              );
            }
        }
      });
      assert.ok(meshes > 40 && meshes < 600);
      map.tick(1, true);
      let disposed = 0;
      for (const resource of resources)
        resource.addEventListener("dispose", () => disposed++);
      map.dispose();
      assert.equal(disposed, resources.size);
    }
});
