import { characterRelease, subjectShot } from "./character-release.js";
import * as T from "three";
import { ACTOR_INKS } from "./actor-ink.js";
import { bladeRibbon } from "./blade-ribbon.js";

function dispose(root) {
  const geometries = new Set(),
    materials = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) materials.add(o.material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

export async function performCataclysm(scene, card, result, onImpact) {
  if (!scene.motion) {
    onImpact();
    return;
  }
  const root = new T.Group(),
    actor = scene.units.get(card.hero),
    color = ACTOR_INKS[card.hero];
  const victims = [...new Set(result.hits.map((h) => h.id))];
  const target =
    scene.units.get(victims[0] || result.targetId)?.base.clone() ||
    new T.Vector3(3, 0, 0);
  target.y = 0.2;
  const ink = new T.MeshBasicMaterial({
    color,
    toneMapped: false,
    side: T.DoubleSide,
  });
  const paper = new T.MeshBasicMaterial({
    color: "#fafaf7",
    toneMapped: false,
    side: T.DoubleSide,
  });
  const stone = new T.MeshStandardMaterial({
    color: "#819796",
    flatShading: true,
    roughness: 1,
  });
  const add = (geometry, material, parent = root) => {
    const mesh = new T.Mesh(geometry, material);
    parent.add(mesh);
    return mesh;
  };
  const tween = (ms, update) =>
    new Promise((resolve) => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, ((now - start) * scene.speed) / ms);
        update(t);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  const phase = (name) => {
    scene.host.dataset.cinematicPhase = name;
    document.body.dataset.burstPhase = name;
  };
  const wide = (sky = false) => {
    scene.shot = {
      focus: target.clone().add(new T.Vector3(-1, sky ? 4.2 : 1.1, 0)),
      position: new T.Vector3(0.2, sky ? 7.5 : 5.6, sky ? 20 : 15.5),
      roll: -0.035,
      distance: 1,
      orbit: 0,
    };
  };
  const charge = new T.Group();
  root.add(charge);
  charge.position.copy(actor.base).add(new T.Vector3(0, 2.4, 0));
  const core = add(new T.OctahedronGeometry(0.28), paper, charge);
  const seals = [];
  for (let i = 0; i < 3; i++) {
    const ring = add(
      new T.TorusGeometry(0.65 + i * 0.19, 0.014, 3, 64),
      i === 1 ? paper : ink,
      charge,
    );
    ring.rotation.set(i * 0.75, 0.6 + i * 0.4, 0);
    seals.push(ring);
  }
  const meteors = [];
  const count = card.hero === "kael" ? 4 : card.hero === "lyra" ? 7 : 11;
  for (let i = 0; i < count; i++) {
    const group = new T.Group();
    root.add(group);
    group.visible = false;
    const offset = new T.Vector3(
      ((i % 3) - 1) * 1.2,
      0,
      Math.floor(i / 3) * 0.7 - 0.5,
    );
    const end = target.clone().add(offset),
      start = end
        .clone()
        .add(new T.Vector3(card.hero === "syl" ? -7 : -4, 10 + i * 0.5, -2));
    if (card.hero === "syl") {
      const shape = bladeRibbon(i === 0 ? 5 : 3.5, 0.22, 0.3, 28),
        geo = new T.BufferGeometry();
      geo.setAttribute(
        "position",
        new T.Float32BufferAttribute(shape.positions, 3),
      );
      geo.setIndex(shape.indices);
      const blade = add(geo, i % 2 ? paper : ink, group);
      blade.rotation.z = -1.0;
      blade.material.side = T.DoubleSide;
    } else {
      const radius =
        i === 0 && card.hero === "kael"
          ? 1.65
          : card.hero === "lyra"
            ? 0.42
            : 0.38;
      const body = add(
        card.hero === "kael"
          ? new T.IcosahedronGeometry(radius, 1)
          : new T.OctahedronGeometry(radius),
        stone,
        group,
      );
      body.rotation.set(i, 0.4, 0.2);
      body.scale.y = card.hero === "lyra" ? 2.3 : 1;
      const orbit = add(
        new T.TorusGeometry(radius * 1.15, 0.045, 4, 24),
        paper,
        group,
      );
      orbit.rotation.x = 0.8;
      const tailDirection = start.clone().sub(end).normalize();
      for (let j = 0; j < 2; j++) {
        const tail = add(
          new T.ConeGeometry(radius * (j ? 0.35 : 0.8), j ? 6.6 : 5, 5),
          j ? paper : ink,
          group,
        );
        tail.position.copy(tailDirection).multiplyScalar(j ? 3.4 : 2.65);
        tail.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          tailDirection,
        );
      }
    }
    group.position.copy(start);
    meteors.push({ group, start, end, delay: i * 0.025 });
  }
  const blast = add(new T.IcosahedronGeometry(1, 1), paper);
  blast.position.copy(target);
  blast.visible = false;
  const waves = [];
  for (let i = 0; i < 4; i++) {
    const m = add(new T.RingGeometry(0.985, 1, 96), i % 2 ? ink : paper);
    m.rotation.x = Math.PI / 2;
    m.position.copy(target);
    m.position.y = 0.15 + i * 0.08;
    m.visible = false;
    waves.push(m);
  }
  const debris = [];
  const debrisGeo = new T.OctahedronGeometry(0.18);
  for (let i = 0; i < 52; i++) {
    const a = i * 2.39996,
      speed = 2 + (i % 7) * 0.5;
    const m = add(debrisGeo, i % 4 ? stone : paper);
    m.visible = false;
    debris.push({
      mesh: m,
      velocity: new T.Vector3(
        Math.cos(a) * speed,
        2 + (i % 5),
        Math.sin(a) * speed,
      ),
    });
  }
  const cracks = [];
  for (let i = 0; i < 14; i++) {
    const shape = bladeRibbon(3 + (i % 4), 0.08, 0.12, 12),
      geo = new T.BufferGeometry();
    geo.setAttribute(
      "position",
      new T.Float32BufferAttribute(shape.positions, 3),
    );
    geo.setIndex(shape.indices);
    const m = add(geo, ink);
    m.rotation.set(-Math.PI / 2, 0, (i * Math.PI * 2) / 14);
    m.position.copy(target);
    m.position.y = 0.04;
    m.visible = false;
    cracks.push(m);
  }
  const dome = add(
    new T.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new T.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      toneMapped: false,
    }),
  );
  dome.position.copy(target);
  dome.visible = false;
  scene.scene.add(root);
  scene.setInk(color);
  const uniforms = scene.mono.uniforms;
  document.body.classList.add("ultimate-cinematic");
  try {
    phase("awakening");
    scene.shake = 0.24;
    scene.setTempo(0.12, "觉醒");
    scene.cameraCue(card.hero, "attacker");
    await tween(180, (t) => {
      uniforms.worldInk.value = Math.min(1, t * 2.3);
      uniforms.verticalSmear.value = Math.sin(t * Math.PI) * 0.024;
    });
    phase("charging");
    await tween(670, (t) => {
      charge.scale.setScalar(0.6 + t * 1.8);
      core.rotation.y = t * 9;
      seals.forEach((r, i) => {
        r.rotation.z = t * (5 + i);
        r.rotation.x += 0.035;
      });
      actor.body.rotation.x = -0.1 * t;
      const rig = actor.body.userData.rig;
      if (rig) rig.arms[1].rotation.x = -1.6 * t;
      subjectShot(scene, actor.base.clone().add(new T.Vector3(0, 1.9, 0)), [1.1, .3, 4.1 - t * .6], -.04);
    });
    if (card.hero !== "kael") {
      await characterRelease({scene, actor, target, root, add, paper, ink, tween, phase, charge});
    } else {
      phase("atmosphere");
      charge.visible = false;
      const main = meteors[0]; main.group.visible = true;
      main.group.scale.setScalar(1.75);
      const heat = add(new T.IcosahedronGeometry(1.72, 1), new T.MeshBasicMaterial({color, wireframe:true}), main.group);
      for(let i=0;i<12;i++) {
        const fissure=add(new T.OctahedronGeometry(1), paper, main.group);
        const a=i*2.399; fissure.position.set(Math.cos(a)*1.05,Math.sin(a)*1.05,1.15);
        fissure.scale.set(.02,.22+(i%3)*.13,.035); fissure.rotation.z=a;
      }
      const embers = [];
      for(let i=0;i<38;i++) {
        const shard = add(new T.OctahedronGeometry(1), i%3 ? paper:ink, main.group);
        shard.scale.set(.025,.15+(i%5)*.12,.025);
        embers.push(shard);
      }
      // The huge surface barely turns: mass first, acceleration second.
      subjectShot(scene, main.start, [1.5,.4,9],-.15,true);
      await tween(850,t=> {
        main.group.rotation.z=t*.08; heat.rotation.y=t*.12;
        heat.scale.setScalar(1.015+Math.sin(t*18)*.015);
        embers.forEach((e,i)=>{const a=i*2.399, q=(t+i/38)%1; e.position.set(Math.cos(a)*3-q*2,Math.sin(a)*2.8+q*5,-.5+(i%4)); e.rotation.z=-.55;});
      });
      phase("falling");
      scene.setTempo(.18,"陨星迫近");
      await tween(1150,t=> {
        for(const m of meteors) {
          const q=Math.max(0,Math.min(1,(t-m.delay)/(1-m.delay)));
          m.group.visible=q>0;
          m.group.position.lerpVectors(m.start,m.end,q*q);
          m.group.rotation.y=q*.12;
        }
        const focus=main.group.position.clone();
        subjectShot(scene,focus,[1.5,.3,9+t*.6],-.15+t*.08);
        embers.forEach((e,i)=>{const a=i*2.399,q=(t*2+i/38)%1; e.position.set(Math.cos(a)*2.9-q*2,Math.sin(a)*2.9+q*6,(i%4)-.5);});
        scene.shake=.025+t*.035;
      });
      phase("collision");
      subjectShot(scene,target.clone().add(new T.Vector3(0,.65,0)),[1,.25,7],-.08,true);
      await tween(180,t=>{ main.group.position.y=.8-t*.7; heat.scale.setScalar(1+t*.15); });
    }
    phase("detonation");
    scene.setTempo(0.065, "崩解");
    scene.shake = 0.38;
    scene.cameraCue(victims[0] || result.targetId || card.hero, "impact");
    meteors.forEach((m) => (m.group.visible = false));
    waves.forEach((m) => (m.visible = card.hero === "kael"));
    cracks.forEach((m) => (m.visible = card.hero !== "syl"));
    dome.visible = card.hero === "lyra";
    onImpact();
    blast.visible = card.hero !== "syl";
    for (const id of victims) {
      const u = scene.units.get(id);
      u.body.rotation.z = -0.18;
    }
    await tween(150, (t) => {
      uniforms.verticalSmear.value = (1 - t) * 0.012;
      waves.forEach((m, i) => m.scale.setScalar(0.2 + t * (2 + i)));
      blast.scale.set(1 + t * 3, 1.5 + t * 2, 1 + t * 3);
    });
    phase("aftershock");
    blast.visible = false;
    if (card.hero === "kael") subjectShot(scene, target.clone().add(new T.Vector3(0,.5,0)), [2,1,9], .025, true);
    else if(card.hero === "lyra") subjectShot(scene, actor.base.clone().add(new T.Vector3(0,1.5,0)), [1,.5,5], 0, true);
    else wide();
    scene.setTempo(0.28, "余震");
    await tween(1000, (t) => {
      waves.forEach((m, i) => {
        m.scale.setScalar(1 + (t + i * 0.08) * 10);
        m.visible = card.hero === "kael" && t < 0.9;
      });
      cracks.forEach((m) => m.scale.setScalar(0.5 + t));
      for (const d of debris) {
        d.mesh.visible = card.hero !== "syl";
        d.mesh.position.copy(target).addScaledVector(d.velocity, t * 1.4);
        d.mesh.position.y = Math.max(0.12, d.mesh.position.y - 5 * t * t);
        d.mesh.rotation.set(t * 4, t * 6, 0);
        d.mesh.scale.setScalar(1 - t * 0.8);
      }
      dome.scale.setScalar(1 + t * 6);
      dome.material.opacity = 0.6 * (1 - t);

    });
    phase("return");
    await tween(480, (t) => {
      uniforms.worldInk.value = 1 - t;
      root.scale.setScalar(1 - t * 0.12);
    });
  } finally {
    uniforms.worldInk.value = 0;
    uniforms.verticalSmear.value = 0;
    document.body.classList.remove("ultimate-cinematic");
    delete document.body.dataset.burstPhase;
    delete scene.host.dataset.cinematicPhase;
    scene.scene.remove(root);
    dispose(root);
    actor.group.position.copy(actor.base);
    scene.restorePose(actor);
    for (const id of victims) scene.units.get(id).body.rotation.z = 0;
    scene.setTempo(1);
    scene.resetCamera();
  }
}
