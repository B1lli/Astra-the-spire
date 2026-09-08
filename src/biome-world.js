import * as T from "three";
import { BIOMES, landscapeRandom } from "./biomes.js";

export function buildBiome(id, variant, seed) {
  const p = BIOMES[id],
    random = landscapeRandom(seed),
    root = new T.Group(),
    wind = [],
    motes = [];
  root.name = `${id}-${variant}`;
  const materials = new Map();
  const mat = (color) => {
    if (!materials.has(color))
      materials.set(
        color,
        new T.MeshStandardMaterial({
          color,
          roughness: 1,
          metalness: 0,
          flatShading: true,
        }),
      );
    return materials.get(color);
  };
  const mesh = (geometry, color, x = 0, y = 0, z = 0, parent = root) => {
    const m = new T.Mesh(geometry, mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const rock = (x, z, size = 1, color = p.earth, y = 0) => {
    const m = mesh(
      new T.DodecahedronGeometry(size, 0),
      color,
      x,
      y + size * 0.35,
      z,
    );
    m.scale.set(1, 0.55 + random() * 0.7, 0.7 + random() * 0.5);
    m.rotation.set(random() * 0.4, random() * 6, random() * 0.25);
    return m;
  };
  const hill = (x, y, z, sx, sy, sz, color) => {
    const m = mesh(new T.IcosahedronGeometry(1, 2), color, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const branch = (from, to, r, color = p.earth, parent = root) => {
    const a = new T.Vector3(...from),
      b = new T.Vector3(...to),
      v = b.clone().sub(a);
    const m = mesh(
      new T.CylinderGeometry(r * 0.55, r, v.length(), 5),
      color,
      0,
      0,
      0,
      parent,
    );
    m.position.copy(a.add(b).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
    return m;
  };
  const tree = (x, z, s = 1, kind = "leaf") => {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    root.add(g);
    branch([0, 0, 0], [0.12, 2.7, 0], 0.18, p.earth, g);
    if (kind === "dead") {
      branch([0.04, 1.2, 0], [-0.8, 2.1, 0.05], 0.1, p.dark, g);
      branch([0.1, 2, 0], [0.8, 2.9, -0.1], 0.08, p.dark, g);
      branch([-0.65, 1.9, 0.03], [-1.1, 2.4, 0.03], 0.05, p.earth, g);
    } else if (kind === "palm") {
      for (let j = 0; j < 7; j++) {
        const a = (j * Math.PI * 2) / 7;
        const leaf = mesh(
          new T.ConeGeometry(0.3, 1.9, 3),
          p.foliage,
          Math.cos(a) * 0.6,
          2.7,
          Math.sin(a) * 0.6,
          g,
        );
        leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
        leaf.scale.z = 0.35;
      }
    } else if (kind === "pine") {
      for (let j = 0; j < 3; j++)
        mesh(
          new T.ConeGeometry(1.4 - j * 0.25, 1.7, 6),
          j % 2 ? p.foliage : p.mid,
          0,
          1.5 + j * 0.65,
          0,
          g,
        );
    } else {
      for (let j = 0; j < 4; j++) {
        const c = mesh(
          new T.IcosahedronGeometry(0.95, 0),
          j % 2 ? p.foliage : p.light,
          Math.cos(j * 2) * 0.6,
          2.55 + (j % 2) * 0.6,
          Math.sin(j * 2) * 0.5,
          g,
        );
        c.scale.y = 0.7;
      }
    }
    if (kind !== "dead")
      wind.push({ object: g, phase: random() * 6, amount: 0.015 });
    return g;
  };
  const tuft = (x, z, size = 1) => {
    const g = new T.Group();
    g.position.set(x, 0, z);
    root.add(g);
    for (let j = 0; j < 3; j++) {
      const blade = mesh(
        new T.ConeGeometry(0.055 * size, 0.6 * size, 3),
        j % 2 ? p.light : p.foliage,
        (j - 1) * 0.1,
        0.24 * size,
        0,
        g,
      );
      blade.rotation.z = (j - 1) * 0.35;
    }
    wind.push({ object: g, phase: random() * 6, amount: 0.12 });
  };
  const water = (x, z, sx, sz) => {
    // Lower the bank under the water, so the surface never intersects the terrain.
    for (let i = 0; i < vertices.count; i++) {
      const dx = (vertices.getX(i) - x) / (sx + 0.6);
      const dz = (vertices.getZ(i) - z) / (sz + 0.6);
      if (dx * dx + dz * dz < 1) vertices.setY(i, -0.24);
    }
    floor.computeVertexNormals();
    const pool = mesh(new T.CircleGeometry(1, 22), p.accent, x, -0.1, z);
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(sx, sz, 1);
    for (let j = 0; j < 3; j++) {
      const ripple = new T.Mesh(
        new T.RingGeometry(0.7 + j * 0.32, 0.715 + j * 0.32, 40),
        new T.MeshBasicMaterial({
          color: p.light,
          transparent: true,
          opacity: 0.4,
          side: T.DoubleSide,
          depthWrite: false,
        }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(x, -0.085 + j * 0.001, z);
      ripple.scale.set(sx * 0.55, sz * 0.55, 1);
      root.add(ripple);
      motes.push({
        object: ripple,
        ripple: true,
        phase: j * 2,
        base: ripple.scale.clone(),
      });
    }
  };
  // Faceted terrain and a clear, level combat lane; landmarks stay behind actors.
  mesh(new T.CylinderGeometry(10.8, 9.7, 0.75, 13), p.earth, 0, -1.1, 0);
  const floor = new T.PlaneGeometry(24, 21, 24, 21);
  floor.rotateX(-Math.PI / 2);
  const vertices = floor.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      z = vertices.getZ(i),
      edge = Math.max(Math.abs(x) / 12, Math.abs(z) / 10.5);
    const lane = Math.abs(z) < 2.4 && Math.abs(x) < 5.7;
    vertices.setY(
      i,
      lane
        ? -0.12
        : -0.12 +
            Math.sin(x * 0.5 + variant) * Math.cos(z * 0.45) * 0.24 +
            (random() - 0.5) * 0.15 -
            edge * 0.3,
    );
  }
  floor.computeVertexNormals();
  mesh(floor, p.ground);
  for (let layer = 0; layer < 3; layer++)
    for (let j = 0; j < 8; j++) {
      const x = (j - 3.5) * 6 + random() * 2,
        z = -13 - layer * 8;
      hill(
        x,
        -2 - layer,
        z,
        5 + random() * 4,
        (id === "desert" ? 2.5 : 4) + random() * 3,
        5,
        [p.mid, p.earth, p.sky][layer],
      );
    }
  // Low horizon disc and cloud ribbons are built geometry, not a static image.
  if (id !== "forest") {
    const sun = new T.Mesh(
      new T.CircleGeometry(2.1, 40),
      new T.MeshBasicMaterial({ color: p.light, fog: false }),
    );
    sun.position.set(-10 + variant * 5, 7, -32);
    root.add(sun);
    if (id === "grass")
      for (let j = 0; j < 5; j++)
        hill(-17 + j * 8, 7 + random() * 2, -26, 3.7, 0.45, 1, p.light);
  }
  if (id === "desert") {
    for (let j = 0; j < 7; j++)
      hill(
        -12 + j * 4,
        -0.8,
        -6 - random() * 3,
        3.4,
        1.1 + random() * 0.7,
        2.5,
        j % 2 ? p.mid : p.light,
      );
    for (const x of [-7, 7]) {
      const obelisk = mesh(
        new T.CylinderGeometry(0.15, 0.55, 3.3 + variant * 0.5, 4),
        p.earth,
        x,
        1.45,
        -3.5,
      );
      obelisk.rotation.z = x < 0 ? 0.12 : -0.1;
      mesh(
        new T.OctahedronGeometry(0.24),
        p.accent,
        x,
        3.15 + variant * 0.25,
        -3.5,
      );
    }
    if (variant === 0)
      for (let j = 0; j < 5; j++) rock(-7 + j * 3.2, -5.5, 0.65, p.earth);
    if (variant === 1) {
      for (let j = 0; j < 4; j++)
        mesh(
          new T.BoxGeometry(0.75, 1.8 + j * 0.35, 0.7),
          j % 2 ? p.mid : p.earth,
          -5 + j * 2.8,
          0.7,
          -6,
        );
      const slab = mesh(new T.BoxGeometry(4, 0.5, 1), p.light, -2.2, 0.1, -6);
      slab.rotation.z = 0.15;
    }
    if (variant === 2) {
      water(0, -4.2, 3.6, 1.25);
      tree(-4.8, -4.8, 1.05, "palm");
      tree(5.8, -5.3, 1.3, "palm");
    }
    for (let j = 0; j < 18; j++) {
      const x = (random() - 0.5) * 20,
        z = random() * 15 - 9;
      if (Math.abs(x) < 5.8 && Math.abs(z) < 2.8) continue;
      rock(x, z, 0.15 + random() * 0.3, p.earth);
    }
  }
  if (id === "waste") {
    for (let j = 0; j < 6; j++) {
      const x = -11 + j * 4.4,
        h = 2.5 + random() * 3,
        z = -7 - random() * 3;
      for (let l = 0; l < 3; l++)
        mesh(
          new T.CylinderGeometry(
            1.8 - (l + 1) * 0.24,
            1.8 - l * 0.24,
            h / 3,
            5,
          ),
          [p.dark, p.mid, p.ground][l],
          x,
          (h * (l + 0.5)) / 3 - 0.2,
          z,
        );
    }
    for (let j = 0; j < 9; j++) {
      const x = (j % 2 ? -1 : 1) * (6 + random() * 4),
        z = -4 + random() * 8;
      rock(x, z, 0.5 + random() * 0.7, j % 2 ? p.mid : p.earth);
    }
    if (variant === 0) {
      branch([-6, 0, -4], [-5, 3.5, -4], 0.7);
      branch([-5, 3.5, -4], [-1, 4.3, -5], 0.65);
      branch([-0.2, 0, -5], [-1, 4.3, -5], 0.7);
      rock(-5, -4, 0.6, p.earth, 3.15);
      rock(-1, -5, 0.65, p.earth, 3.9);
    }
    if (variant === 1)
      for (let j = 0; j < 6; j++) rock(-5 + j * 2, -5, 0.8 + j * 0.07, p.mid);
    if (variant === 2) {
      tree(-6, -3, 1.6, "dead");
      tree(5.5, -4.8, 1.25, "dead");
      tree(-1.3, -6, 1, "dead");
    }
    for (let j = 0; j < 12; j++) {
      const x = (random() - 0.5) * 16,
        z = -3 - random() * 4;
      const crack = mesh(
        new T.BoxGeometry(0.025, 0.01, 0.8 + random()),
        p.dark,
        x,
        -0.02,
        z,
      );
      crack.rotation.y = random() * 6;
    }
  }
  if (id === "grass") {
    for (let j = 0; j < 7; j++)
      hill(
        -12 + j * 4,
        -1,
        -6 - random() * 3,
        4,
        1.5 + random(),
        3,
        j % 2 ? p.mid : p.light,
      );
    tree(-7, -3, 1.1);
    tree(7, -5, 1.3);
    if (variant === 0) {
      mesh(new T.CylinderGeometry(0.4, 0.7, 2.8, 6), p.light, 2.5, 1.2, -6);
      const rotor = new T.Group();
      rotor.position.set(2.5, 2.8, -5.7);
      root.add(rotor);
      for (let j = 0; j < 4; j++) {
        const blade = mesh(
          new T.BoxGeometry(0.18, 1.1, 0.06),
          p.earth,
          0,
          0,
          0,
          rotor,
        );
        blade.position.set(
          Math.sin((j * Math.PI) / 2) * 0.7,
          Math.cos((j * Math.PI) / 2) * 0.7,
          0,
        );
        blade.rotation.z = (-j * Math.PI) / 2;
      }
      motes.push({ object: rotor, rotor: true });
    }
    if (variant === 1) {
      water(0, -4.3, 6, 0.8);
      rock(-4, -3.3, 0.65);
      rock(4, -4.8, 0.8);
    }
    if (variant === 2)
      for (let j = 0; j < 5; j++) {
        const a = Math.PI * (j / 4);
        const m = rock(Math.cos(a) * 4, -4.7 - Math.sin(a), 0.75, p.earth);
        m.scale.y = 1.5;
      }
    for (let j = 0; j < 90; j++) {
      const x = (random() - 0.5) * 21,
        z = random() * 15 - 9;
      if (Math.abs(x) < 5.8 && Math.abs(z) < 2.8) continue;
      tuft(x, z, 0.5 + random());
      if (j % 4 === 0)
        mesh(new T.IcosahedronGeometry(0.065, 0), p.light, x, 0.35, z);
    }
  }
  if (id === "forest") {
    for (let j = 0; j < 14; j++)
      tree(
        -13 + j * 2,
        -7 - random() * 3,
        1.4 + random() * 0.6,
        j % 3 ? "pine" : "leaf",
      );
    for (const [x, z, s] of [
      [-8, 0, 1.6],
      [8.8, 1, 1.8],
      [-7.7, -3, 1.3],
      [7, -3.3, 1.5],
    ])
      tree(x, z, s, "pine");
    if (variant === 0) {
      rock(-6, -3, 1, p.mid);
      rock(5.8, -3.5, 0.8, p.mid);
      branch([-4, -0.05, -4.6], [0.5, 0.3, -5.1], 0.38);
    }
    if (variant === 1) {
      water(0.6, -4, 4.5, 1.0);
      for (let j = 0; j < 16; j++) {
        const point = new T.Mesh(
          new T.OctahedronGeometry(0.035),
          new T.MeshBasicMaterial({ color: p.light }),
        );
        point.position.set(
          (random() - 0.5) * 12,
          0.8 + random() * 2,
          -3 - random() * 4,
        );
        root.add(point);
        motes.push({
          object: point,
          base: point.position.clone(),
          phase: random() * 6,
        });
      }
    }
    if (variant === 2) {
      const ancient = tree(0, -7, 2.7);
      ancient.scale.x = 2.2;
      const shrine = mesh(
        new T.TorusGeometry(1.3, 0.13, 5, 12),
        p.accent,
        0,
        1.8,
        -5.5,
      );
      shrine.rotation.z = 0.15;
    }
    for (let j = 0; j < 70; j++) {
      const x = (random() - 0.5) * 21,
        z = random() * 14 - 8;
      if (Math.abs(x) < 5.8 && Math.abs(z) < 2.8) continue;
      tuft(x, z, 0.65 + random());
      if (j % 6 === 0) {
        mesh(new T.CylinderGeometry(0.035, 0.04, 0.22, 5), p.light, x, 0.11, z);
        const cap = mesh(
          new T.SphereGeometry(0.18, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2),
          p.accent,
          x,
          0.23,
          z,
        );
      }
    }
  }
  root.userData = {
    biome: id,
    variant,
    seed,
    landmarkCount: root.children.length,
  };
  return {
    root,
    tick(time, enabled = true) {
      if (!enabled) return;
      for (const w of wind)
        w.object.rotation.z = Math.sin(time * 1.1 + w.phase) * w.amount;
      for (const m of motes) {
        if (m.rotor) m.object.rotation.z = time * 0.24;
        else if (m.ripple) {
          m.object.material.opacity = 0.18 + 0.12 * Math.sin(time + m.phase);
          m.object.scale
            .copy(m.base)
            .multiplyScalar(1 + Math.sin(time * 0.7 + m.phase) * 0.09);
        } else
          m.object.position.y =
            m.base.y + Math.sin(time * 1.4 + m.phase) * 0.18;
      }
    },
    dispose() {
      const geometries = new Set(),
        mats = new Set();
      root.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            mats.add(m);
      });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
