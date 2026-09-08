import * as T from 'three';
import { bladeRibbon } from './blade-ribbon.js';

export function subjectShot(scene, subject, offset, roll = 0, cut = false) {
  const focus = subject.clone(), position = focus.clone().add(new T.Vector3(...offset));
  scene.shot = {focus, position, roll, distance: 1, orbit: 0};
  if (cut) { scene.camera.position.copy(position); scene.cameraFocus.copy(focus); scene.cameraRoll = roll; }
}
function ribbon(add, parent, material, length, width) {
  const data = bladeRibbon(length, width, .28, 32), geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(data.positions, 3));
  geometry.setIndex(data.indices);
  return add(geometry, material, parent);
}

// Each sequence hands damage back to the caller exactly once at the final impact.
export async function characterRelease({scene, actor, target, root, add, paper, ink, tween, phase, charge}) {
  const home = actor.base.clone(), rig = actor.body.userData.rig;
  if (actor.body.userData.id === 'lyra') {
    phase('summoning'); charge.visible = false;
    const crystals = [];
    for (let i = 0; i < 5; i++) {
      const group = new T.Group(); root.add(group);
      group.position.copy(home).add(new T.Vector3(-.5 + i * .55, -2, -1.1 - i * .22));
      const crystal = add(new T.OctahedronGeometry(.38), ink, group); crystal.scale.set(1, 3.8, 1);
      const seam = add(new T.OctahedronGeometry(.21), paper, group); seam.scale.set(.3, 6, 1.9);
      crystals.push(group);
    }
    scene.setTempo(.22, "晶阵破土");
    subjectShot(scene, home.clone().add(new T.Vector3(.5, .25, -.8)), [2, .45, 4], -.08, true);
    await tween(850, t => {
      crystals.forEach((c,i) => {const q=Math.max(0,Math.min(1,(t-i*.09)/.64)); c.position.y=-2+q*4; c.rotation.z=-.15+q*.3;});
      rig.arms[1].rotation.x = -1.8;
      scene.shake = .025;
    });
    phase('focusing');
    const muzzle = home.clone().add(new T.Vector3(1.6, 2.1, 0));
    const nucleus = add(new T.OctahedronGeometry(.36), paper); nucleus.position.copy(muzzle);
    subjectShot(scene, muzzle, [-1.5, .6, 3.2], .035, true);
    await tween(650, t => {
      crystals.forEach((c,i) => {c.rotation.z=.3+t*.55; c.position.y=2+Math.sin(t*3+i)*.12;});
      nucleus.rotation.set(t*4,t*6,0); nucleus.scale.setScalar(.3+t*1.7);
      rig.arms[1].rotation.x = -1.8-t*.4;
    });
    phase('firing'); scene.setTempo(.6, "星流贯穿");
    const end = target.clone().add(new T.Vector3(0,1.1,0)), direction=end.clone().sub(muzzle);
    const beam = new T.Group(); root.add(beam); beam.position.copy(muzzle);
    beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), direction.clone().normalize());
    for(let i=0;i<3;i++) {
      const shaft=add(new T.CylinderGeometry(i ? .035 : .16,i ? .035 : .25,direction.length(),4),i ? paper:ink,beam);
      shaft.position.set((i-1)*.12,direction.length()/2,0);
    }
    subjectShot(scene, muzzle.clone().lerp(end,.55), [1,1.3,6.7], -.045,true);
    await tween(560,t=> {beam.scale.y=Math.min(1,t*3); beam.scale.x=beam.scale.z=.8+Math.sin(t*24)*.1; nucleus.scale.setScalar(1.5-t); scene.shake=.045;});
    await tween(160,t=> {beam.scale.x=beam.scale.z=1-t;});
    crystals.forEach(c=>c.visible=false); nucleus.visible=false;
    return;
  }
  phase('coiling'); charge.visible=false;
  // A spectral edge extends the bow into a close-combat crescent, keeping the archer's silhouette.
  const edgeRoot = new T.Group(); (rig.effectWeapon || actor.body).add(edgeRoot);
  const edge = ribbon(add, edgeRoot, paper, 2.8, .11); edge.rotation.z=Math.PI/2;
  const marks=[];
  const victim = scene.units.get(scene.target);
  scene.setTempo(.22, '踏风');
  try {
    subjectShot(scene, home.clone().add(new T.Vector3(.1,.55,.1)), [.7,.35,3.4], -.08,true);
    await tween(480,t=> {actor.body.scale.y=1-t*.16; actor.body.rotation.z=-t*.28; rig.legs.forEach((leg,i)=>leg.rotation.x=(i ? -1:1)*t*.65); edge.scale.setScalar(t);});
    for(let strike=0;strike<5;strike++) {
      phase(`dash-${strike+1}`);
      scene.setTempo(.7, "穿身");
      const from = actor.group.position.clone();
      const destination = target.clone().add(new T.Vector3(strike%2 ? -1.6:1.6,0,strike%2 ? .8:-.6)); destination.y=0;
      const middle=from.clone().lerp(destination,.5).add(new T.Vector3(0,1.25,0));
      subjectShot(scene,middle,[0,1,6.4],strike%2 ? .08:-.08,true);
      actor.body.scale.y=1;
      await tween(strike===4 ? 290:210,t=> {
        const q=1-Math.pow(1-t,3); actor.group.position.lerpVectors(from,destination,q);
        actor.body.rotation.y=strike%2 ? -Math.PI/2:Math.PI/2;
        actor.body.rotation.z=(strike%2 ? 1:-1)*.3;
        rig.arms[1].rotation.x=-1.8+t*2.7;
      });
      phase(`slash-${strike+1}`);
      const cut=ribbon(add,root,strike%2 ? ink:paper,4.8,.075);
      cut.position.copy(target).add(new T.Vector3(0,1.25,.65)); cut.rotation.z=strike%2 ? -.55:.5;
      marks.push(cut);
      subjectShot(scene,cut.position,[.3,.15,strike===4 ? 3.7:4.5],strike%2 ? -.06:.06,true);
      scene.shake=.09;
      const sparks = new T.Group(); root.add(sparks); sparks.position.copy(cut.position);
      for(let i=0;i<9;i++) {
        const p=add(new T.OctahedronGeometry(1),paper,sparks);
        p.position.set(Math.cos(i*2.4)*.55,Math.sin(i*2.4)*.55,.1);
        p.scale.set(.025,.17,.025); p.rotation.z=i*2.4;
      }
      if(victim) victim.body.rotation.z=strike%2 ? .15:-.15;
      scene.setTempo(.08, "刃停");
      await tween(strike===4 ? 230:100,t=>{cut.scale.y=1-t*.75;});
      cut.visible=false; sparks.visible=false;
      if(victim) victim.body.rotation.z=0;
    }
    phase('finishing');
    subjectShot(scene,actor.group.position.clone().add(new T.Vector3(0,1.6,0)),[.4,.3,4],.04,true);
    await tween(320,t=> {actor.body.rotation.z*=.94; rig.arms[1].rotation.x=.9-t*.8;});
  } finally {
    edgeRoot.removeFromParent(); edge.geometry.dispose();
    actor.group.position.copy(home);
  }
}
