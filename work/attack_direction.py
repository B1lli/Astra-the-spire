from pathlib import Path
p=Path('src/scene.js');s=p.read_text(encoding='utf-8')
s=s.replace('import * as T from "three";', 'import * as T from "three";\nimport { bladeRibbon } from "./blade-ribbon.js";')
a=s.index('  slash(pos, color, angle = 0) {');b=s.index('  cameraCue(',a)
s=s[:a]+'''  slash(pos, color, angle = -.48) {
    const cut = new T.Group();
    cut.position.copy(pos).add(new T.Vector3(0,1.45,0));
    cut.quaternion.copy(this.camera.quaternion);
    cut.rotateZ(angle);
    const layers = [[4.8,.22,.19,0x152550], [4.65,.045,.19,0xffffff]];
    for (const [length,width,curve,ink] of layers) {
      const ribbon = bladeRibbon(length,width,curve);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.Float32BufferAttribute(ribbon.positions,3));
      geometry.setIndex(ribbon.indices);
      const material = new T.MeshBasicMaterial({color:ink, side:T.DoubleSide, transparent:true, depthWrite:false, depthTest:false});
      const mesh = new T.Mesh(geometry,material);
      mesh.renderOrder=12+cut.children.length;
      mesh.position.z=cut.children.length*.008;
      cut.add(mesh);
    }
    this.addEffect(cut,.28,t=>{
      const opening=Math.min(1,t/.16);
      cut.scale.set(.12+.88*(1-Math.pow(1-opening,3)), .15+.85*Math.sin(Math.PI*Math.min(1,t/.9)),1);
      cut.children.forEach(mesh=>mesh.material.opacity = 1-Math.pow(t,1.7));
    });
  }
  async attackerCloseup(card) {
    const actor=this.units.get(card.hero),rig=actor.body.userData.rig;
    this.host.dataset.cinematicPhase="attacker";
    this.cameraCue(card.hero,"attacker");
    this.setTempo(.14,"蓄势");
    actor.body.rotation.y=1.12;
    await this.motionTween(.085,t=>{
      actor.body.scale.y=1-.08*t;
      actor.body.rotation.x=-.14*t;
      rig.legs[0].rotation.x=-.36*t;
      rig.legs[1].rotation.x=.42*t;
      rig.arms[0].rotation.x=(card.hero === "syl" ? -.8 : -.35)*t;
      rig.arms[1].rotation.x=-1.12*t;
      if(rig.weapon) rig.weapon.rotation.x=-1.05*t;
      rig.cape.rotation.x=-.22*t;
    });
    await this.delay(card.cinematic ? 380 : 240);
  }
''' +s[b:]
s=s.replace('    const unit = this.units.get(id);\n    this.shot = {', '''    const unit = this.units.get(id);
    if (["attacker","pursuit","impact"].includes(style)) {
      const focus=unit.group.position.clone().add(new T.Vector3(0,style === "attacker" ? 2.3 : 1.45,0));
      const offset=style === "attacker" ? new T.Vector3(3.5,.35,4.1) : style === "impact" ? new T.Vector3(.8,.7,6.2) : new T.Vector3(-1.8,2.2,9.2);
      this.shot={focus,position:focus.clone().add(offset),distance:1,orbit:0,roll:style === "attacker" ? -.035 : style === "impact" ? .035 : -.02};
      return;
    }
    this.shot = {''')
s=s.replace('    this.shot = null;\n    this.shake = 0;', '    this.shot = null;\n    delete this.host.dataset.cinematicPhase;\n    this.shake = 0;')
s=s.replace('''    this.cameraCue(
      targets[0] || card.hero,
      dramatic ? "ultimate" : targets.length ? "attack" : "guard",
    );''','''    this.cameraCue(targets[0] || card.hero, targets.length ? "pursuit" : "guard");
    if (targets.length) this.host.dataset.cinematicPhase="release";''')
s=s.replace('    if (card.hero === "kael" && !card.all) {', '    if (card.hero === "kael" && !card.all) {')
s=s.replace('await this.motionTween(0.2, (t)', 'await this.motionTween(0.09, (t)')
a=s.index('      this.beamTrail(\n        home.clone()');b=s.index('      await this.motionTween(0.19',a)
s=s[:a]+'''      this.setTempo(1.65,"突进");
''' + s[b:]
s=s.replace('''    for (const id of targets) {
      const to = this.units''','''    const melee = card.hero === "kael" && !card.all;
    if (!melee) for (const id of targets) {
      const to = this.units''')
s=s.replace('    await this.delay(220);\n    for (const id of targets)', '''    if (!melee) await this.delay(220);
    this.host.dataset.cinematicPhase="impact";
    this.cameraCue(targets[0],"impact");
    for (const id of targets)''')
s=s.replace('''      this.shock(pos, color, dramatic ? 1.7 : 0.65);
      if (card.hero === "kael" || dramatic) this.slash(pos, color);''','''      if (melee) {
        this.slash(pos,color,dramatic ? -.65 : -.48);
        this.burst(pos.clone().add(new T.Vector3(0,1.4,0)),color,dramatic ? 32 : 16,.38);
        this.shake=dramatic ? .16 : .085;
      } else this.shock(pos, color, dramatic ? 1.2 : .55);''')
s=s.replace('performance.now() + (dramatic ? 180 : 95)', 'performance.now() + (dramatic ? 180 : 115)')
a=s.index('    this.camera.position\n      .copy(this.baseCamera)', s.index('  animate(now)'));b=s.index('    if (this.motion) {',a)
s=s[:a]+'''    const cameraDestination = shot?.position || this.baseCamera.clone()
      .applyAxisAngle(new T.Vector3(0,1,0),this.cameraOrbit)
      .multiplyScalar((this.baseScale || 1)*this.cameraDistance)
      .add(this.cameraFocus.clone().multiplyScalar(.7));
    this.camera.position.lerp(cameraDestination,lerp);
''' +s[b:]
p.write_text(s,encoding='utf-8')
p=Path('src/tower.js');s=p.read_text(encoding='utf-8')
s=s.replace('      impactCut(c, r);\n','')
a=s.index('function impactCut(');b=s.index('async function cardCloseup',a);s=s[:a]+s[b:]
s=s.replace('''async function cardCloseup(card) {
  if (!motion) return;''','''async function cardCloseup(card) {
  if (!motion) return;
  if (card.type === "attack" || card.target) {
    document.body.classList.add("attack-cinematic");
    const caption=document.createElement("div");
    caption.id="attack-caption";
    caption.innerHTML=`<small>${HEROES.find(h=>h.id===card.hero).name}</small><strong>${card.name}</strong>`;
    document.body.append(caption);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    scene.resize();
    await scene.attackerCloseup(card);
    return;
  }''')
s=s.replace('''  } finally {
    scene.resetCamera();''','''  } finally {
    document.body.classList.remove("attack-cinematic");
    $("#attack-caption")?.remove();
    scene.resize();
    scene.resetCamera();''')
p.write_text(s,encoding='utf-8')
