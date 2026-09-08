import * as T from 'three';
import { ACTOR_INKS } from './actor-ink.js';

export function statusAppearance(state = {}) {
  return { shield: state.block > 0, weapon: state.strength > 0 || state.nextAttack > 0,
    wings: state.afterimage > 0 || state.elementCharge >= 6,
    charged: state.elementCharge >= 6, active: state.block > 0 || state.strength > 0 || state.nextAttack > 0 || state.afterimage > 0 || state.elementCharge >= 6 };
}

// All reusable particles are pointed solid geometry; no sprites or circular billboards.
export class StatusFX {
  constructor(actor, id) {
    this.root = new T.Group(); actor.body.add(this.root);
    this.root.name = `status-${id}`;
    this.id = id; this.pulse = 0; this.state = statusAppearance();
    const color = ACTOR_INKS[id];
    this.material = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .65, metalness: .72, roughness: .19, transparent: true, opacity: .88, depthWrite: false });
    this.light = new T.MeshBasicMaterial({ color: '#fafaf7', transparent: true, opacity: .82, depthWrite: false });
    this.geometry = new T.OctahedronGeometry(1, 0);
    this.wings = new T.Group(); this.root.add(this.wings);
    // Wings spread in the actor's sagittal plane so the side-on battle camera reads every feather.
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const feather = this.piece(this.wings, [side * .12, 1.7 + i * .15, -.35 - i * .22], [.065, .75 - i * .08, .19]);
      feather.rotation.x = -.7 - i * .19; feather.rotation.z = side * (.25 + i * .08);
      feather.userData.rest = feather.rotation.x;
      const seam = new T.Mesh(this.geometry, this.light);
      seam.scale.set(.25, .86, 1.06); feather.add(seam);
      if (id === 'kael') { feather.scale.y *= .65; feather.position.y -= .3; feather.rotation.x -= .4; }
      if (id === 'lyra') { feather.scale.z *= 1.45; feather.position.y += .15; }
      if (id === 'syl') { feather.scale.y *= 1.2; feather.scale.z *= .6; }
      feather.userData.rest = feather.rotation.x;
    }
    this.shield = new T.Group(); this.root.add(this.shield);
    for (let i = 0; i < 3; i++) {
      const panel = this.piece(this.shield, [(i - 1) * .34, 1.25, .72 + (i === 1 ? .12 : 0)], [.25, .62, .065]);
      panel.rotation.y = (i - 1) * -.35;
      const seam = new T.Mesh(this.geometry, this.light);
      seam.scale.set(.08, .9, 1.08); panel.add(seam);
      if (id === 'kael') { panel.scale.y *= .65; panel.position.y -= .15; }
      if (id === 'syl') { panel.scale.x *= .35; panel.rotation.z = -.5; }
    }
    this.weapon = new T.Group(); (actor.body.userData.rig?.effectWeapon || actor.body.userData.rig?.weapon || actor.body).add(this.weapon);
    for (let i = 0; i < 3; i++) this.piece(this.weapon, [(i - 1) * .18, .8 + i * .22, .08], [.035, .7, .045]);
    this.particles = new T.Group(); this.root.add(this.particles);
    for (let i = 0; i < 24; i++) {
      const p = this.piece(this.particles, [0, 0, 0], [i % 3 === 0 ? .055 : .022, .12 + (i % 4) * .045, .018], i % 5 === 0);
      p.rotation.set(i * .73, i * 1.31, i * .47);
    }
    this.set({});
  }
  piece(parent, position, scale, white = false) {
    const mesh = new T.Mesh(this.geometry, white ? this.light : this.material);
    mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  set(value) { this.state = statusAppearance(value); }
  trigger(card) {
    this.pulse = 1;
    this.kind = card.heal ? 'heal' : card.draw || card.energy ? 'flow' : card.type === 'attack' ? 'blade' : 'rise';
  }
  tick(dt, time, motion, visible) {
    this.pulse = Math.max(0, this.pulse - dt * .85);
    const s = this.state;
    this.root.visible = visible && (s.active || this.pulse > 0);
    this.weapon.visible = visible && (s.weapon || s.charged || this.pulse > 0 && this.kind === 'blade');
    this.shield.visible = s.shield; this.wings.visible = s.wings;
    const t = motion ? time : 0;
    this.material.emissiveIntensity = .65 + (motion ? Math.sin(t * 2) * .18 : 0);
    this.wings.children.forEach((p, i) => { p.rotation.x = p.userData.rest + Math.sin(t * 1.4 + i * .3) * .035; });
    this.wings.scale.setScalar(s.charged ? 1.15 : .85);
    this.shield.rotation.y = Math.sin(t * .8) * .07;
    this.particles.visible = motion;
    this.particles.children.forEach((p, i) => {
      const phase = (t * (this.id === 'syl' ? .43 : .26) + i / 24) % 1;
      const angle = i * 2.399 + t * .24;
      const width = .62 + (i % 3) * .12 + this.pulse * .25;
      p.position.set(Math.cos(angle) * width, .18 + phase * 2.8, Math.sin(angle) * width);
      if (this.kind === 'flow' && this.pulse > 0) p.position.y = 1.3 + Math.sin(angle) * .75;
      if (this.kind === 'heal' && this.pulse > 0) p.position.y = 2.9 - phase * 2.7;
      p.scale.y = (.08 + (i % 4) * .055) * Math.sin(phase * Math.PI);
      p.rotation.z = this.id === 'syl' ? -.65 : Math.sin(angle) * .3;
    });
  }
}
