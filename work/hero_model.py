from pathlib import Path
p=Path('src/scene.js');s=p.read_text(encoding='utf-8')
a=s.index('  hero(g, u, i) {');b=s.index('  enemy(g, u) {',a)
s=s[:a]+'''  hero(g, u, i) {
    const ink = this.mat("#111829"), paper = this.mat("#edf0f7"), steel = this.mat("#667494");
    const rig = { legs: [], arms: [], weapon: null, cape: null }; g.userData.rig = rig;
    const plate = (parent, points, depth, material, position = [0,0,0]) => {
      const shape = new T.Shape(); shape.moveTo(...points[0]); points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
      return this.mesh(new T.ExtrudeGeometry(shape, {depth, bevelEnabled:false}), material, parent, position);
    };
    for (const x of [-.22,.22]) {
      const leg = new T.Group(); leg.position.set(x,1.05,0); g.add(leg); rig.legs.push(leg);
      this.mesh(new T.CylinderGeometry(.13,.11,.78,5),ink,leg,[0,-.38,0]);
      this.mesh(new T.BoxGeometry(.24,.45,.22),steel,leg,[0,-.72,.04]);
      this.mesh(new T.BoxGeometry(.27,.19,.44),ink,leg,[0,-.97,.1]);
      plate(leg,[[-.1,0],[.13,0],[.07,-.27],[-.09,-.18]],.05,paper,[0,-.55,.17]);
    }
    this.mesh(new T.CylinderGeometry(.39,.25,.74,6),ink,g,[0,1.48,0]).scale.z=.72;
    plate(g,[[-.35,.24],[0,.34],[.35,.24],[.22,-.27],[0,-.36],[-.22,-.27]],.1,i===0?paper:steel,[0,1.57,.17]);
    this.mesh(new T.BoxGeometry(.53,.10,.37),paper,g,[0,1.10,0]);
    this.mesh(new T.OctahedronGeometry(.105),ink,g,[0,1.1,.25]);
    const cape = new T.Group(); cape.position.set(0,1.9,-.20);g.add(cape);rig.cape=cape;
    plate(cape,[[-.35,0],[-.5,-.55],[-.76,-1.45],[-.23,-1.28],[0,-.40]],.025,ink);
    plate(cape,[[.05,-.15],[.36,0],[.62,-1.50],[.23,-1.2]],.025,i===1?paper:steel);
    for (const side of [-1,1]) {
      const collar = this.mesh(new T.BoxGeometry(.15,.42,.38),ink,g,[side*.23,1.98,-.08]); collar.rotation.z=side*-.25;
      const shoulder = this.mesh(new T.OctahedronGeometry(side===-1 && i===0?.35:.26),i===0?paper:ink,g,[side*.46,1.86,0]);shoulder.scale.set(1,.7,1);
      const arm = new T.Group();arm.position.set(side*.48,1.81,0);g.add(arm);rig.arms.push(arm);
      this.mesh(new T.CylinderGeometry(.12,.10,.5,5),ink,arm,[0,-.25,.01]);
      this.mesh(new T.CylinderGeometry(.14,.11,.33,5),steel,arm,[side*.035,-.60,.08]);
      this.mesh(new T.BoxGeometry(.16,.20,.19),paper,arm,[side*.035,-.80,.11]);
      plate(arm,[[-.1,0],[.1,.05],[.12,-.25],[-.04,-.38]],.035,paper,[0,-.44,.20]);
    }
    this.mesh(new T.CylinderGeometry(.1,.12,.20,6),paper,g,[0,2.03,0]);
    const face = this.mesh(new T.IcosahedronGeometry(.255,1),paper,g,[0,2.27,.02]);face.scale.set(.84,1.07,.87);
    this.mesh(new T.BoxGeometry(.32,.065,.07),ink,g,[0,2.30,.207]);
    this.mesh(new T.BoxGeometry(.20,.014,.015),paper,g,[0,2.31,.252]);
    const hair = this.mesh(new T.IcosahedronGeometry(.29,0),i===0?paper:ink,g,[0,2.42,-.03]);hair.scale.set(1,.8,.9);
    for(let n=0;n<8;n++) {
      const angle=n*Math.PI*2/8;
      const spike=this.mesh(new T.ConeGeometry(.12,.4+(n%3)*.07,3),i===0?paper:ink,g,[Math.cos(angle)*.23,2.53+Math.sin(angle)*.10,Math.sin(angle)*.16-.06]);
      spike.rotation.z=-Math.cos(angle)*.8;spike.rotation.x=Math.sin(angle)*.45;
    }
    if(i===0) {
      const sword=new T.Group();sword.position.set(.69,1.04,.25);sword.rotation.set(.28,0,-.3);g.add(sword);rig.weapon=sword;
      plate(sword,[[-.12,0],[-.12,1.7],[0,2.05],[.12,1.7],[.12,0]],.07,paper,[0,.12,0]);
      this.mesh(new T.BoxGeometry(.035,1.65,.085),ink,sword,[0,.96,-.005]);
      this.mesh(new T.BoxGeometry(.55,.09,.19),steel,sword,[0,.1,0]);
      this.mesh(new T.CylinderGeometry(.065,.065,.35,6),ink,sword,[0,-.10,0]);
      plate(cape,[[-.25,-.05],[-.9,.03],[-1.32,-.25],[-.88,-.16],[-.32,-.26]],.025,paper);
    } else if(i===1) {
      const staff=new T.Group();staff.position.set(.65,1.14,.15);g.add(staff);
      this.mesh(new T.CylinderGeometry(.035,.055,2.20,6),ink,staff,[0,.1,0]);
      const halo=this.mesh(new T.TorusGeometry(.36,.035,4,8),paper,staff,[0,1.38,0]);halo.rotation.z=Math.PI/8;
      this.mesh(new T.OctahedronGeometry(.20),steel,staff,[0,1.38,0]);
      plate(g,[[-.26,0],[-.47,-1.12],[0,-1.25],[.48,-1.12],[.26,0]],.06,paper,[0,1.10,-.03]);
      for(const side of [-1,1]) {const crown=this.mesh(new T.ConeGeometry(.085,.7,3),paper,g,[side*.25,2.74,-.03]);crown.rotation.z=side*-.25;}
    } else {
      const bow=new T.Group();bow.position.set(.69,1.54,.3);bow.rotation.z=-.1;g.add(bow);
      plate(bow,[[0,-.95],[.37,-.53],[.45,0],[.37,.53],[0,.95],[.22,.42],[.27,0],[.22,-.42]],.045,paper);
      this.mesh(new T.CylinderGeometry(.009,.009,1.90,3),steel,bow,[0,0,0]);
      this.mesh(new T.CylinderGeometry(.16,.14,.75,5),ink,g,[-.30,1.5,-.32]);
      for(let n=0;n<4;n++) this.mesh(new T.ConeGeometry(.07,.22,3),paper,g,[-.42+n*.07,2.03,-.30]);
      plate(cape,[[.23,0],[.95,.10],[1.55,-.16],[1.2,-.24],[.64,-.15]],.025,paper);
    }
  }
''' +s[b:]
s=s.replace('    this.buildWorld();','    this.buildWorld();\n    this.environment = this.scene.children.filter(o => !o.isLight && o !== sky);')
start=s.index('  delay(ms) {')
s=s[:start]+'''  presentHero(id, mode = "title") {
    this.presentation = {id, mode, started:performance.now()};
    this.environment.forEach(o => o.visible = false);
    for(const [key,u] of this.units) {
      u.group.visible = key === id;
      if(key === id) { u.group.position.set(mode === "title" ? 1.55 : -1.7,0,0);u.group.scale.setScalar(1.55);u.body.rotation.y=-.35;u.selector.visible=false;u.ring.visible=false; }
    }
    this.setInk("#2148B8");
  }
  endPresentation() {
    this.presentation=null;this.environment.forEach(o => o.visible=true);
    for(const u of this.units.values()) u.ring.visible=true;
  }
''' +s[start:]
s=s.replace('    this.composer.render();','''    if (this.presentation) {
      const p=this.presentation, elapsed=(now-p.started)/1000, actor=this.units.get(p.id);
      const entry=this.motion ? Math.exp(-elapsed*3) : 0;
      actor.body.rotation.y=-.35+(this.motion ? Math.sin(this.time*.35)*.12 : 0);
      this.camera.position.set(entry*1.4,3.0+entry*1.5,10.4+entry*5);
      this.camera.lookAt(0,2.0,0);
      this.camera.rotateZ(entry*-.045);
    }
    this.composer.render();''')
p.write_text(s,encoding='utf-8')
