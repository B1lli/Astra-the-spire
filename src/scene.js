import * as T from "three";
import { StatusFX } from "./status-fx.js";
import { bladeRibbon } from "./blade-ribbon.js";
import { buildBiome } from "./biome-world.js";
import { performCataclysm } from "./cataclysm.js";
import { ACTOR_INKS, applyActorInk, inkVector } from "./actor-ink.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export class BattleScene {
  constructor(host, onTarget) {
    this.host = host;
    this.onTarget = onTarget;
    this.units = new Map();
    this.effects = [];
    this.time = 0;
    this.shake = 0;
    this.speed = 1;
    this.target = "warden";
    this.scene = new T.Scene();
    this.scene.fog = new T.FogExp2("#FAFAF7", 0.019);
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    host.append(this.renderer.domElement);
    this.camera = new T.PerspectiveCamera(35, 1, 0.1, 180);
    this.baseCamera = new T.Vector3(0, 6, 14);
    this.camera.position.copy(this.baseCamera);
    this.camera.lookAt(0, 0.1, 0);
    this.scene.add(new T.HemisphereLight(0xc8e4e9, 0x443738, 2.3));
    const sun = new T.DirectionalLight(0xffddab, 4.2);
    sun.position.set(-7, 15, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -12,
      right: 12,
      top: 12,
      bottom: -12,
      near: 0.1,
      far: 50,
    });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    const rim = new T.DirectionalLight(0x68dbde, 2.5);
    rim.position.set(8, 7, -8);
    this.scene.add(rim);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(800, 600), 0.65, 0.6, 1.05);
    this.bloom.enabled = false;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.mono = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        ink: { value: new T.Vector3(0.129, 0.282, 0.722) },
        resolution: { value: new T.Vector2(800, 600) },
        colored: { value: 1 },
        worldInk: { value: 0 },
        verticalSmear: { value: 0 },
        actorInks: { value: Object.values(ACTOR_INKS).map(inkVector) },
      },
      vertexShader:
        "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 ink; uniform vec2 resolution; uniform float colored; uniform vec3 actorInks[6]; uniform float worldInk; uniform float verticalSmear; varying vec2 vUv;
        float lum(vec2 uv){return dot(texture2D(tDiffuse,uv).rgb,vec3(.299,.587,.114));}
        void main(){float l=lum(vUv);vec2 d=1.0/resolution;
          float edge=abs(l-lum(vUv+vec2(d.x,0.0)))+abs(l-lum(vUv+vec2(0.0,d.y)));
          vec4 source=texture2D(tDiffuse,vUv);
          if(verticalSmear>.0001){
            vec3 smear=source.rgb*.2;
            for(int tap=1;tap<=4;tap++){float off=float(tap)*verticalSmear*.25;smear+=(texture2D(tDiffuse,vUv+vec2(0.,off)).rgb+texture2D(tDiffuse,vUv-vec2(0.,off)).rgb)*.1;}
            source.rgb=smear;l=dot(smear,vec3(.299,.587,.114));
          }
          float actorIndex=floor(source.a*10.0+.5)-1.0;
          bool actor=actorIndex>=0.0&&actorIndex<6.0&&abs(source.a-(actorIndex+1.0)/10.0)<.015;
          if(!actor && worldInk<.001){gl_FragColor=vec4(source.rgb*(1.0-min(edge*.3,.12)),1.0);return;}
          vec3 chosenInk=ink;
          for(int i=0;i<6;i++){if(abs(float(i)-actorIndex)<.1)chosenInk=actorInks[i];}
          chosenInk=mix(chosenInk,ink,worldInk);
          float density=clamp((.96-l)*2.3+edge*3.0,0.0,1.0);
          density=floor(density*4.0+.35)/4.0;
          if(density>.15&&density<.4){vec2 p=mod(gl_FragCoord.xy,4.0)-2.0;density=length(p)<.8?.45:.12;}
          vec3 comic=mix(vec3(.9804,.9804,.9686),chosenInk,density);
          gl_FragColor=vec4(actor?comic:mix(source.rgb,comic,worldInk),1.0);
        }`,
    });
    this.composer.addPass(this.mono);
    const sky = new T.Mesh(
      new T.SphereGeometry(90, 24, 16),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new T.Color("#FAFAF7").multiplyScalar(4) },
          bottom: { value: new T.Color("#FAFAF7").multiplyScalar(4) },
        },
        vertexShader:
          "varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader:
          "uniform vec3 top;uniform vec3 bottom;varying vec3 vPos;void main(){float h=normalize(vPos).y;vec3 col=mix(bottom,top,smoothstep(-0.2,0.8,h));float sun=pow(max(dot(normalize(vPos),normalize(vec3(-0.2,0.35,-1.0))),0.0),24.0);col+=vec3(0.06,0.04,0.015)*sun;gl_FragColor=vec4(col,1.0);}",
      }),
    );
    this.scene.add(sky);
    this.buildWorld();
    this.environment = this.scene.children.filter(
      (o) => !o.isLight && o !== sky,
    );
    this.legacyEnvironment = [...this.environment];
    this.legacyLights = this.scene.children.filter((o) => o.isPointLight);
    this.sky = sky;
    this.sun = sun;
    this.rim = rim;
    this.ambient = this.scene.children.find((o) => o.isHemisphereLight);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.raycaster = new T.Raycaster();
    host.addEventListener("pointerdown", (e) => {
      const r = host.getBoundingClientRect();
      this.raycaster.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        this.camera,
      );
      const hits = this.raycaster.intersectObjects(
        [...this.units.values()]
          .filter((u) => u.group.visible)
          .map((u) => u.body),
        true,
      );
      if (hits.length) {
        let obj = hits[0].object;
        while (obj && !obj.userData.id) obj = obj.parent;
        if (obj) this.onTarget(obj.userData.id);
      }
    });
    this.cameraFocus = new T.Vector3(0, 0.3, 0);
    this.cameraDistance = 1;
    this.cameraOrbit = 0;
    this.cameraRoll = 0;
    this.motion = true;
    this.last = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }
  setBiome(location) {
    const key = `${location.id}:${location.variant}:${location.seed}`;
    this.biome = location;
    if (key !== this.biomeKey) {
      if (this.landscape) {
        this.scene.remove(this.landscape.root);
        this.landscape.dispose();
      }
      this.landscape = buildBiome(location.id, location.variant, location.seed);
      this.scene.add(this.landscape.root);
      this.environment = [this.landscape.root];
      this.biomeKey = key;
    }
    [...this.legacyEnvironment, ...this.legacyLights].forEach(
      (o) => (o.visible = false),
    );
    this.host.dataset.biome = location.id;
    this.host.dataset.variant = String(location.variant);
    this.setEnvironmentColor(!this.presentation);
  }
  setEnvironmentColor(enabled) {
    const colored = enabled && !!this.biome;
    this.mono.uniforms.colored.value = 1;
    const skyColor = colored ? this.biome.theme.sky : "#FAFAF7";
    this.sky.material.uniforms.top.value
      .set(skyColor)
      .multiplyScalar(colored ? 1 : 4);
    this.sky.material.uniforms.bottom.value
      .set(skyColor)
      .multiplyScalar(colored ? 1 : 4);
    this.scene.fog.color.set(skyColor);
    this.scene.fog.density = colored ? 0.013 : 0.019;
    this.sun.color.set(colored ? "#ffffff" : "#ffddab");
    this.sun.intensity = colored ? 2.4 : 4.2;
    this.rim.color.set(colored ? "#ebede9" : "#68dbde");
    this.rim.intensity = colored ? 0.6 : 2.5;
    this.ambient.color.set(colored ? "#ebede9" : "#c8e4e9");
    this.ambient.groundColor.set(colored ? this.biome.theme.earth : "#443738");
    this.ambient.intensity = colored ? 1.4 : 2.3;
  }
  previewBiome(location) {
    this.endPresentation();
    this.setBiome(location);
    this.landscapePreview = true;
    for (const u of this.units.values()) u.group.visible = false;
    this.resetCamera();
    this.resize();
  }
  mat(color, emissive = 0, intensity = 0) {
    return new T.MeshStandardMaterial({
      color,
      roughness: 0.85,
      flatShading: true,
      emissive,
      emissiveIntensity: intensity,
    });
  }
  mesh(geo, mat, parent, pos = [0, 0, 0]) {
    const m = new T.Mesh(geo, mat);
    m.position.set(...pos);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  glow(color) {
    return new T.MeshBasicMaterial({
      color: color || ACTOR_INKS[this.activeHero] || "#2148b8",
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: T.NormalBlending,
      side: T.DoubleSide,
    });
  }
  ring(parent, r, color, y = 0, tube = 0.025) {
    const m = this.mesh(
      new T.TorusGeometry(r, tube, 5, 72),
      this.glow(color),
      parent,
      [0, y, 0],
    );
    m.rotation.x = Math.PI / 2;
    return m;
  }
  buildWorld() {
    const root = this.scene;
    const earth = this.mat("#725949");
    const topGeo = new T.CylinderGeometry(7.2, 7.6, 0.75, 9, 1);
    const top = this.mesh(
      topGeo,
      [this.mat("#8a7355"), this.mat("#b8a27a"), earth],
      root,
      [0, -0.6, 0],
    );
    top.rotation.y = 0.18;
    const rock = new T.CylinderGeometry(7.5, 3.3, 3.8, 9, 3);
    const p = rock.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) + Math.sin(i * 12.3) * 0.4);
      p.setZ(i, p.getZ(i) + Math.cos(i * 5.7) * 0.4);
      if (y < 0) p.setY(i, y + Math.sin(i * 9) * 0.6);
    }
    rock.computeVertexNormals();
    this.mesh(rock, earth, root, [0, -2.8, 0]);
    const arena = this.mesh(
      new T.CylinderGeometry(5.8, 5.9, 0.16, 48),
      this.mat("#a79a7b"),
      root,
      [0, -0.14, 0],
    );
    for (let j = 0; j < 3; j++) {
      const line = this.mesh(
        new T.TorusGeometry(3 + j * 1.2, 0.025, 3, 80),
        this.mat("#d5c29a"),
        root,
        [0, -0.04, 0],
      );
      line.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const slab = this.mesh(
        new T.BoxGeometry(0.8, 0.07, 0.15),
        this.mat("#d8caaa"),
        root,
        [Math.sin(a) * 5.35, -0.02, Math.cos(a) * 5.35],
      );
      slab.rotation.y = a;
    }
    for (let i = 0; i < 55; i++) {
      const a = i * 2.399,
        r = 5.9 + (Math.sin(i * 9) + 1) * 0.5;
      const m = this.mesh(
        new T.DodecahedronGeometry(0.15 + (i % 5) * 0.07, 0),
        this.mat(["#a68a62", "#c1ad80", "#71644f"][i % 3]),
        root,
        [Math.cos(a) * r, -0.02, Math.sin(a) * r],
      );
      m.scale.y = 0.5;
      m.rotation.set(i, i * 0.5, i * 0.7);
    }
    this.arch = new T.Group();
    this.arch.position.set(-3, 0.02, -4.2);
    this.arch.rotation.y = 0.2;
    root.add(this.arch);
    const stone = this.mat("#89968c");
    const stoneLight = this.mat("#b6bbaa");
    for (const x of [-1.8, 1.8]) {
      this.mesh(new T.BoxGeometry(1.2, 0.25, 1.15), stoneLight, this.arch, [
        x,
        0.05,
        0,
      ]);
      for (let y = 0; y < 4; y++) {
        const block = this.mesh(
          new T.BoxGeometry(0.72, 0.8, 0.8),
          y % 2 ? stone : stoneLight,
          this.arch,
          [x, 0.6 + y * 0.78, 0],
        );
        block.rotation.y = (y % 2 ? 1 : -1) * 0.03;
      }
      this.mesh(new T.BoxGeometry(1.1, 0.22, 1), stoneLight, this.arch, [
        x,
        3.5,
        0,
      ]);
    }
    for (let i = 0; i < 7; i++) {
      if (i === 3) continue;
      const a = (i / 6) * Math.PI;
      const block = this.mesh(
        new T.BoxGeometry(0.85, 0.65, 0.85),
        i % 2 ? stone : stoneLight,
        this.arch,
        [Math.cos(a) * 1.8, 3.5 + Math.sin(a) * 1.7, 0],
      );
      block.rotation.z = a - Math.PI / 2;
    }
    this.portal = this.ring(this.arch, 1.15, "#78d9c5", 2.9, 0.015);
    this.portal.rotation.x = 0;
    this.portal.material.opacity = 0.35;
    this.mesh(
      new T.OctahedronGeometry(0.35),
      this.mat("#8de8d6", "#5cf0d5", 2),
      this.arch,
      [0, 2.9, 0],
    );
    this.crystals = [];
    for (const [x, z, s] of [
      [4.9, -3.4, 1.5],
      [5.8, -2.3, 0.9],
      [4.3, -4.3, 1],
      [-5.7, 1.8, 1],
      [-6.2, 2.7, 0.55],
      [2.6, 5.3, 0.65],
    ])
      this.crystalCluster(x, z, s);
    for (const [x, z, s] of [
      [-5.6, -3.4, 0.8],
      [2.4, -5.5, 0.8],
      [5.8, 3.2, 0.5],
    ])
      this.tree(x, z, s);
    for (const [x, z] of [
      [-4, 4.4],
      [1, -5.9],
    ]) {
      this.mesh(new T.CylinderGeometry(0.4, 0.55, 1, 5), stone, root, [
        x,
        0.35,
        z,
      ]);
      this.mesh(
        new T.OctahedronGeometry(0.22),
        this.mat("#ffd2a1", "#ff9c44", 3),
        root,
        [x, 1.05, z],
      );
      const light = new T.PointLight(0xffaa55, 4, 5);
      light.position.set(x, 1.5, z);
      root.add(light);
    }
    for (let i = 0; i < 14; i++) {
      const g = new T.Group();
      const a = i * 2.399,
        r = 17 + (i % 4) * 8;
      g.position.set(Math.cos(a) * r, -6 - (i % 4) * 2, Math.sin(a) * r - 10);
      const sc = 1 + (i % 3);
      this.mesh(new T.ConeGeometry(sc, sc * 2.5, 5), this.mat("#415355"), g, [
        0,
        -sc,
        0,
      ]).rotation.z = Math.PI;
      this.mesh(new T.CylinderGeometry(sc, sc, 0.3, 5), this.mat("#6b7770"), g);
      root.add(g);
    }
    const dustGeo = new T.BufferGeometry();
    const arr = new Float32Array(220 * 3);
    for (let i = 0; i < 220; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 35;
      arr[i * 3 + 1] = Math.random() * 12 - 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    dustGeo.setAttribute("position", new T.BufferAttribute(arr, 3));
    this.dust = new T.Points(
      dustGeo,
      new T.PointsMaterial({
        color: "#ffe0a5",
        size: 0.035,
        transparent: true,
        opacity: 0.6,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    root.add(this.dust);
  }
  crystalCluster(x, z, s) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    this.scene.add(group);
    for (let i = 0; i < 5; i++) {
      const h = (i === 0 ? 2.1 : 0.7 + Math.random()) * s;
      const c = this.mesh(
        new T.OctahedronGeometry(1, 0),
        this.mat(i % 2 ? "#5ca9a0" : "#9ce6cd", "#38d5b3", 0.25),
        group,
        [
          (i === 0 ? 0 : Math.cos(i * 2) * 0.5) * s,
          h * 0.37,
          (i === 0 ? 0 : Math.sin(i * 2) * 0.5) * s,
        ],
      );
      c.scale.set(0.27 * s, h * 0.75, 0.32 * s);
      c.rotation.z = (i - 2) * 0.12;
      this.crystals.push(c);
    }
    this.ring(group, 0.7 * s, "#7adfc5", 0.02, 0.015);
  }
  tree(x, z, s) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(s);
    this.scene.add(group);
    this.mesh(
      new T.CylinderGeometry(0.12, 0.23, 2.1, 5),
      this.mat("#65554a"),
      group,
      [0, 0.9, 0],
    );
    for (let i = 0; i < 5; i++) {
      const leaf = this.mesh(
        new T.IcosahedronGeometry(0.8 + (i % 2) * 0.25, 0),
        this.mat(["#d79b5d", "#c18d55", "#e5b874"][i % 3]),
        group,
        [Math.sin(i * 2) * 0.6, 1.8 + (i % 3) * 0.4, Math.cos(i * 2) * 0.5],
      );
      leaf.scale.y = 0.65;
    }
  }
  addUnits(units) {
    const positions = [
      [-2.9, 0.1],
      [-3.4, -2.1],
      [-4.2, 2.3],
      [3.0, -1.8],
      [3.0, 0.5],
      [3.5, 2.4],
    ];
    units.forEach((u, i) => {
      const group = new T.Group();
      group.position.set(positions[i][0], 0, positions[i][1]);
      this.scene.add(group);
      const body = new T.Group();
      group.add(body);
      body.userData.id = u.id;
      body.rotation.y = u.team === "ally" ? Math.PI / 2 : -Math.PI / 2;
      const ring = this.ring(
        group,
        u.id === "warden" ? 1.05 : 0.67,
        u.team === "ally" ? u.color : "#d69492",
        0.025,
        0.022,
      );
      ring.material.opacity = 0.42;
      const selector = this.ring(
        group,
        u.id === "warden" ? 1.3 : 0.85,
        "#ffd798",
        0.04,
        0.035,
      );
      selector.visible = false;
      if (u.team === "ally") this.hero(body, u, i);
      else this.enemy(body, u);
      const actorIndex = Object.keys(ACTOR_INKS).indexOf(u.id);
      const actorInk = applyActorInk(body, ACTOR_INKS[u.id], actorIndex);
      this.mono.uniforms.actorInks.value[actorIndex] = actorInk.value;
      ring.material.color.set(ACTOR_INKS[u.id]);
      selector.material.color.set(ACTOR_INKS[u.id]);
      this.units.set(u.id, {
        actorInk,
        group,
        body,
        ring,
        selector,
        base: group.position.clone(),
        dead: false,
        phase: i,
      });
    });
  }
  hero(g, u, i) {
    const ink = this.mat("#111829"),
      paper = this.mat("#edf0f7"),
      steel = this.mat("#667494");
    const rig = { legs: [], arms: [], weapon: null, cape: null };
    g.userData.rig = rig;
    const plate = (parent, points, depth, material, position = [0, 0, 0]) => {
      const shape = new T.Shape();
      shape.moveTo(...points[0]);
      points.slice(1).forEach((p) => shape.lineTo(...p));
      shape.closePath();
      return this.mesh(
        new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
        material,
        parent,
        position,
      );
    };
    for (const x of [-0.22, 0.22]) {
      const leg = new T.Group();
      leg.position.set(x, 1.05, 0);
      g.add(leg);
      rig.legs.push(leg);
      this.mesh(
        new T.CylinderGeometry(0.13, 0.11, 0.78, 5),
        ink,
        leg,
        [0, -0.38, 0],
      );
      this.mesh(
        new T.BoxGeometry(0.24, 0.45, 0.22),
        steel,
        leg,
        [0, -0.72, 0.04],
      );
      this.mesh(new T.BoxGeometry(0.27, 0.19, 0.44), ink, leg, [0, -0.97, 0.1]);
      plate(
        leg,
        [
          [-0.1, 0],
          [0.13, 0],
          [0.07, -0.27],
          [-0.09, -0.18],
        ],
        0.05,
        paper,
        [0, -0.55, 0.17],
      );
    }
    this.mesh(
      new T.CylinderGeometry(0.39, 0.25, 0.74, 6),
      ink,
      g,
      [0, 1.48, 0],
    ).scale.z = 0.72;
    plate(
      g,
      [
        [-0.35, 0.24],
        [0, 0.34],
        [0.35, 0.24],
        [0.22, -0.27],
        [0, -0.36],
        [-0.22, -0.27],
      ],
      0.1,
      i === 0 ? paper : steel,
      [0, 1.57, 0.17],
    );
    this.mesh(new T.BoxGeometry(0.53, 0.1, 0.37), paper, g, [0, 1.1, 0]);
    this.mesh(new T.OctahedronGeometry(0.105), ink, g, [0, 1.1, 0.25]);
    const cape = new T.Group();
    cape.position.set(0, 1.9, -0.2);
    g.add(cape);
    rig.cape = cape;
    plate(
      cape,
      [
        [-0.35, 0],
        [-0.5, -0.55],
        [-0.76, -1.45],
        [-0.23, -1.28],
        [0, -0.4],
      ],
      0.025,
      ink,
    );
    plate(
      cape,
      [
        [0.05, -0.15],
        [0.36, 0],
        [0.62, -1.5],
        [0.23, -1.2],
      ],
      0.025,
      i === 1 ? paper : steel,
    );
    for (const side of [-1, 1]) {
      const collar = this.mesh(new T.BoxGeometry(0.15, 0.42, 0.38), ink, g, [
        side * 0.23,
        1.98,
        -0.08,
      ]);
      collar.rotation.z = side * -0.25;
      const shoulder = this.mesh(
        new T.OctahedronGeometry(side === -1 && i === 0 ? 0.35 : 0.26),
        i === 0 ? paper : ink,
        g,
        [side * 0.46, 1.86, 0],
      );
      shoulder.scale.set(1, 0.7, 1);
      const arm = new T.Group();
      arm.position.set(side * 0.48, 1.81, 0);
      g.add(arm);
      rig.arms.push(arm);
      this.mesh(
        new T.CylinderGeometry(0.12, 0.1, 0.5, 5),
        ink,
        arm,
        [0, -0.25, 0.01],
      );
      this.mesh(new T.CylinderGeometry(0.14, 0.11, 0.33, 5), steel, arm, [
        side * 0.035,
        -0.6,
        0.08,
      ]);
      this.mesh(new T.BoxGeometry(0.16, 0.2, 0.19), paper, arm, [
        side * 0.035,
        -0.8,
        0.11,
      ]);
      plate(
        arm,
        [
          [-0.1, 0],
          [0.1, 0.05],
          [0.12, -0.25],
          [-0.04, -0.38],
        ],
        0.035,
        paper,
        [0, -0.44, 0.2],
      );
    }
    this.mesh(
      new T.CylinderGeometry(0.1, 0.12, 0.2, 6),
      paper,
      g,
      [0, 2.03, 0],
    );
    const face = this.mesh(
      new T.IcosahedronGeometry(0.255, 1),
      paper,
      g,
      [0, 2.27, 0.02],
    );
    face.scale.set(0.84, 1.07, 0.87);
    if (i === 1) {
      for (const side of [-1, 1]) {
        const eye = this.mesh(new T.BoxGeometry(0.09, 0.022, 0.035), ink, g, [
          side * 0.1,
          2.3,
          0.23,
        ]);
        eye.rotation.z = side * 0.13;
        plate(
          g,
          [
            [-0.13, 0.2],
            [0.12, 0.18],
            [0.18, -0.45],
            [0.04, -0.68],
            [-0.12, -0.3],
          ],
          0.07,
          ink,
          [side * 0.23, 2.3, -0.02],
        );
      }
    } else {
      this.mesh(new T.BoxGeometry(0.32, 0.065, 0.07), ink, g, [0, 2.3, 0.207]);
      this.mesh(
        new T.BoxGeometry(0.2, 0.014, 0.015),
        paper,
        g,
        [0, 2.31, 0.252],
      );
    }
    const hair = this.mesh(
      new T.IcosahedronGeometry(0.29, 0),
      i === 0 ? paper : ink,
      g,
      [0, 2.42, -0.03],
    );
    hair.scale.set(1, 0.8, 0.9);
    for (let n = 0; n < (i === 1 ? 0 : 8); n++) {
      const angle = (n * Math.PI * 2) / 8;
      const spike = this.mesh(
        new T.ConeGeometry(0.12, 0.4 + (n % 3) * 0.07, 3),
        i === 0 ? paper : ink,
        g,
        [
          Math.cos(angle) * 0.23,
          2.53 + Math.sin(angle) * 0.1,
          Math.sin(angle) * 0.16 - 0.06,
        ],
      );
      spike.rotation.z = -Math.cos(angle) * 0.8;
      spike.rotation.x = Math.sin(angle) * 0.45;
    }
    if (i === 0) {
      const sword = new T.Group();
      sword.position.set(0.69, 1.04, 0.25);
      sword.rotation.set(0.28, 0, -0.3);
      g.add(sword);
      rig.weapon = sword;
      plate(
        sword,
        [
          [-0.12, 0],
          [-0.12, 1.7],
          [0, 2.05],
          [0.12, 1.7],
          [0.12, 0],
        ],
        0.07,
        paper,
        [0, 0.12, 0],
      );
      this.mesh(
        new T.BoxGeometry(0.035, 1.65, 0.085),
        ink,
        sword,
        [0, 0.96, -0.005],
      );
      this.mesh(new T.BoxGeometry(0.55, 0.09, 0.19), steel, sword, [0, 0.1, 0]);
      this.mesh(
        new T.CylinderGeometry(0.065, 0.065, 0.35, 6),
        ink,
        sword,
        [0, -0.1, 0],
      );
      plate(
        cape,
        [
          [-0.25, -0.05],
          [-0.9, 0.03],
          [-1.32, -0.25],
          [-0.88, -0.16],
          [-0.32, -0.26],
        ],
        0.025,
        paper,
      );
    } else if (i === 1) {
      const staff = new T.Group();
      staff.position.set(0.65, 1.14, 0.15);
      g.add(staff);
      rig.effectWeapon = staff;
      this.mesh(
        new T.CylinderGeometry(0.035, 0.055, 2.2, 6),
        ink,
        staff,
        [0, 0.1, 0],
      );
      const halo = this.mesh(
        new T.TorusGeometry(0.36, 0.035, 4, 8),
        paper,
        staff,
        [0, 1.38, 0],
      );
      halo.rotation.z = Math.PI / 8;
      this.mesh(new T.OctahedronGeometry(0.2), steel, staff, [0, 1.38, 0]);
      plate(
        g,
        [
          [-0.26, 0],
          [-0.47, -1.12],
          [0, -1.25],
          [0.48, -1.12],
          [0.26, 0],
        ],
        0.06,
        paper,
        [0, 1.1, -0.03],
      );
      for (const side of [-1, 1]) {
        const crown = this.mesh(new T.ConeGeometry(0.085, 0.7, 3), paper, g, [
          side * 0.25,
          2.74,
          -0.03,
        ]);
        crown.rotation.z = side * -0.25;
      }
    } else {
      const bow = new T.Group();
      bow.position.set(0.69, 1.54, 0.3);
      bow.rotation.z = -0.1;
      g.add(bow);
      rig.effectWeapon = bow;
      plate(
        bow,
        [
          [0, -0.95],
          [0.37, -0.53],
          [0.45, 0],
          [0.37, 0.53],
          [0, 0.95],
          [0.22, 0.42],
          [0.27, 0],
          [0.22, -0.42],
        ],
        0.045,
        paper,
      );
      this.mesh(
        new T.CylinderGeometry(0.009, 0.009, 1.9, 3),
        steel,
        bow,
        [0, 0, 0],
      );
      this.mesh(
        new T.CylinderGeometry(0.16, 0.14, 0.75, 5),
        ink,
        g,
        [-0.3, 1.5, -0.32],
      );
      for (let n = 0; n < 4; n++)
        this.mesh(new T.ConeGeometry(0.07, 0.22, 3), paper, g, [
          -0.42 + n * 0.07,
          2.03,
          -0.3,
        ]);
      plate(
        cape,
        [
          [0.23, 0],
          [0.95, 0.1],
          [1.55, -0.16],
          [1.2, -0.24],
          [0.64, -0.15],
        ],
        0.025,
        paper,
      );
    }
  }
  enemy(g, u) {
    if (u.id === "warden") {
      const rock = this.mat("#4a555b"),
        trim = this.mat("#a89676"),
        core = this.mat("#ffc795", "#ff9149", 2);
      for (const x of [-0.42, 0.42]) {
        this.mesh(new T.DodecahedronGeometry(0.45), rock, g, [
          x,
          0.42,
          0,
        ]).scale.set(0.8, 1.2, 1);
        this.mesh(new T.BoxGeometry(0.62, 0.28, 0.74), rock, g, [x, 0.15, 0.1]);
      }
      this.mesh(
        new T.DodecahedronGeometry(0.82, 0),
        rock,
        g,
        [0, 1.45, 0],
      ).scale.set(1, 0.95, 0.65);
      this.mesh(new T.OctahedronGeometry(0.32), core, g, [0, 1.5, 0.52]);
      for (const x of [-1, 1]) {
        this.mesh(new T.IcosahedronGeometry(0.57), trim, g, [x, 1.9, 0]);
        this.mesh(new T.DodecahedronGeometry(0.42), rock, g, [
          x * 1.1,
          1.1,
          0.05,
        ]).scale.y = 1.3;
        this.mesh(new T.ConeGeometry(0.21, 0.75, 4), core, g, [x, 2.42, 0]);
      }
      this.mesh(new T.DodecahedronGeometry(0.45), rock, g, [0, 2.45, 0]);
      this.mesh(new T.BoxGeometry(0.5, 0.06, 0.08), core, g, [0, 2.48, 0.4]);
      this.mesh(new T.ConeGeometry(0.24, 0.6, 4), trim, g, [0, 2.95, 0]);
    } else {
      const color = u.id === "shard" ? "#b1a2c5" : "#91b7d2";
      const m = this.mat(color, "#9c78eb", 0.35);
      this.mesh(new T.OctahedronGeometry(0.65), m, g, [0, 1.2, 0]).scale.y =
        1.35;
      this.mesh(
        new T.OctahedronGeometry(0.19),
        this.mat("#ebd9ff", "#bf92ff", 2),
        g,
        [0, 1.2, 0.52],
      );
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const p = this.mesh(new T.ConeGeometry(0.24, 0.75, 4), m, g, [
          Math.cos(a) * 0.65,
          1.2 + Math.sin(a) * 0.6,
          0,
        ]);
        p.rotation.z = a - Math.PI / 2;
      }
      this.ring(g, 0.5, "#b598ed", 0.2, 0.015);
    }
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.mono.uniforms.resolution.value.set(
      w * this.renderer.getPixelRatio(),
      h * this.renderer.getPixelRatio(),
    );
    this.camera.aspect = w / h;
    this.camera.position
      .copy(this.baseCamera)
      .multiplyScalar(w / h < 1.3 ? 1.3 : 1);
    this.baseScale = w / h < 1.3 ? 1.3 : 1;
    this.camera.updateProjectionMatrix();
  }
  project(id, extra = 0) {
    const u = this.units.get(id);
    const p = u.group.position.clone();
    p.y += (id === "warden" ? 3.45 : 2.65) + extra;
    p.project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * this.host.clientWidth,
      y: (-p.y * 0.5 + 0.5) * this.host.clientHeight,
    };
  }
  sync(state) {
    this.target = state.target;
    for (const u of state.units) {
      const mesh = this.units.get(u.id);
      if (u.team === "ally") {
        mesh.statusFx ||= new StatusFX(mesh, u.id);
        mesh.statusFx.set(u.visual || {});
      }
      if (u.hp <= 0 && !mesh.dead && !u.absent) {
        this.burst(
          mesh.group.position.clone().add(new T.Vector3(0, 1, 0)),
          u.color,
          55,
        );
        mesh.dead = true;
      }
      if (u.hp > 0) mesh.dead = false;
      mesh.selector.visible = u.hp > 0 && u.id === state.target;
      mesh.group.visible = u.hp > 0;
    }
  }
  addEffect(obj, duration, update) {
    this.scene.add(obj);
    this.effects.push({ obj, age: 0, duration, update });
    return obj;
  }
  burst(pos, color, count = 65, power = 1) {
    count = Math.max(1, Math.floor(count));
    const geo = new T.BufferGeometry();
    const arr = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      arr.set([pos.x, pos.y, pos.z], i * 3);
      vel.push(
        new T.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 7,
          (Math.random() - 0.5) * 8,
        ).multiplyScalar(power),
      );
    }
    geo.setAttribute("position", new T.BufferAttribute(arr, 3));
    const mat = new T.PointsMaterial({
      color: new T.Color(color).multiplyScalar(3),
      size: 0.09,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const points = new T.Points(geo, mat);
    this.addEffect(points, 1.2, (t, dt) => {
      for (let i = 0; i < count; i++) {
        arr[i * 3] += vel[i].x * dt;
        arr[i * 3 + 1] += vel[i].y * dt;
        arr[i * 3 + 2] += vel[i].z * dt;
        vel[i].y -= 4 * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 1 - t;
    });
  }
  shock(pos, color, power = 1) {
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(
        new T.TorusGeometry(0.2, 0.035, 5, 64),
        this.glow(color),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.1 + i * 0.14;
      this.addEffect(ring, 0.8 + i * 0.14, (t) => {
        ring.scale.setScalar(1 + t * 15 * power);
        ring.material.opacity = (1 - t) * 0.9;
      });
    }
    for (let i = 0; i < 10 * power; i++) {
      const shard = new T.Mesh(
        new T.OctahedronGeometry(0.1 + Math.random() * 0.13),
        this.glow(color),
      );
      shard.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const v = new T.Vector3(
        Math.cos(a) * 3,
        2 + Math.random() * 4,
        Math.sin(a) * 3,
      ).multiplyScalar(power);
      this.addEffect(shard, 1.1, (t, dt) => {
        shard.position.addScaledVector(v, dt);
        v.y -= 7 * dt;
        shard.rotation.x += dt * 6;
        shard.rotation.z += dt * 4;
        shard.material.opacity = 1 - t;
      });
    }
    this.burst(
      pos.clone().add(new T.Vector3(0, 1, 0)),
      color,
      90 * power,
      power,
    );
    this.shake = 0.22 * power;
  }
  slash(pos, color, angle = -0.48) {
    const cut = new T.Group();
    cut.position.copy(pos).add(new T.Vector3(0, 1.45, 0));
    cut.quaternion.copy(this.camera.quaternion);
    cut.rotateZ(angle);
    const layers = [
      [4.8, 0.22, 0.19, color],
      [4.65, 0.045, 0.19, 0xffffff],
    ];
    for (const [length, width, curve, ink] of layers) {
      const ribbon = bladeRibbon(length, width, curve);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(ribbon.positions, 3),
      );
      geometry.setIndex(ribbon.indices);
      const material = new T.MeshBasicMaterial({
        color: new T.Color(ink).multiplyScalar(ink === 0xffffff ? 4 : 1),
        side: T.DoubleSide,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const mesh = new T.Mesh(geometry, material);
      mesh.renderOrder = 12 + cut.children.length;
      mesh.position.z = cut.children.length * 0.008;
      cut.add(mesh);
    }
    this.addEffect(cut, 0.28, (t) => {
      cut.quaternion.copy(this.camera.quaternion);
      cut.rotateZ(angle);
      const opening = Math.min(1, t / 0.16);
      cut.scale.set(
        0.12 + 0.88 * (1 - Math.pow(1 - opening, 3)),
        0.15 + 0.85 * Math.sin(Math.PI * Math.min(1, t / 0.9)),
        1,
      );
      cut.children.forEach(
        (mesh) => (mesh.material.opacity = 1 - Math.pow(t, 1.7)),
      );
    });
  }
  async attackerCloseup(card) {
    const actor = this.units.get(card.hero),
      rig = actor.body.userData.rig;
    this.host.dataset.cinematicPhase = "attacker";
    this.cameraCue(card.hero, "attacker");
    this.setTempo(0.14, "蓄势");
    actor.body.rotation.y = 1.12;
    const scenery = this.environment.map((object) => [object, object.visible]);
    this.setEnvironmentColor(false);
    scenery.forEach(([object]) => {
      object.visible = false;
    });
    try {
      await this.motionTween(0.085, (t) => {
        actor.body.scale.y = 1 - 0.08 * t;
        actor.body.rotation.x = -0.14 * t;
        rig.legs[0].rotation.x = -0.36 * t;
        rig.legs[1].rotation.x = 0.42 * t;
        rig.arms[0].rotation.x = (card.hero === "syl" ? -0.8 : -0.35) * t;
        rig.arms[1].rotation.x = -1.12 * t;
        if (rig.weapon) rig.weapon.rotation.x = 0.28 - 0.62 * t;
        rig.cape.rotation.x = -0.22 * t;
      });
      await this.delay(card.cinematic ? 950 : 650);
    } finally {
      this.setEnvironmentColor(true);
      scenery.forEach(([object, visible]) => {
        object.visible = visible;
      });
    }
  }
  cameraCue(id, style = "attack") {
    const unit = this.units.get(id);
    if (["attacker", "pursuit", "impact"].includes(style)) {
      const focus = unit.group.position
        .clone()
        .add(new T.Vector3(0, style === "attacker" ? 2.55 : 1.45, 0));
      const offset =
        style === "attacker"
          ? new T.Vector3(2.5, 0.18, 3.0)
          : style === "impact"
            ? new T.Vector3(0.8, 0.7, 6.2)
            : new T.Vector3(-1.8, 2.2, 9.2);
      this.shot = {
        focus,
        position: focus.clone().add(offset),
        distance: 1,
        orbit: 0,
        roll:
          style === "attacker" ? -0.035 : style === "impact" ? 0.035 : -0.02,
      };
      return;
    }
    this.shot = {
      focus: unit.base
        .clone()
        .multiplyScalar(
          style === "portrait" ? 0.9 : style === "ultimate" ? 0.6 : 0.45,
        )
        .add(new T.Vector3(0, 0.6, 0)),
      distance:
        style === "portrait"
          ? 0.55
          : style === "ultimate"
            ? 0.62
            : style === "guard"
              ? 0.77
              : 0.71,
      orbit:
        style === "portrait"
          ? 0.22
          : style === "ultimate"
            ? -0.3
            : style === "guard"
              ? 0.1
              : -0.14,
      roll: style === "ultimate" ? -0.025 : 0.012,
    };
  }
  resetCamera() {
    this.shot = null;
    delete this.host.dataset.cinematicPhase;
    this.shake = 0;
    this.hitStop = 0;
    this.setTempo(1);
  }
  setTempo(scale, label = "") {
    this.tempoTarget = this.motion ? scale : 1;
    this.onTempo?.(this.tempoTarget, this.motion ? label : "");
  }
  setInk(hex = ACTOR_INKS[this.activeHero] || "#2148B8") {
    const value = parseInt(hex.slice(1), 16);
    this.mono.uniforms.ink.value.set(
      ((value >> 16) & 255) / 255,
      ((value >> 8) & 255) / 255,
      (value & 255) / 255,
    );
  }
  beamTrail(from, to, color, straight = false) {
    const curve = new T.CatmullRomCurve3([
      from,
      from
        .clone()
        .lerp(to, 0.5)
        .add(new T.Vector3(0, straight ? 0 : 0.65, 0)),
      to,
    ]);
    const trail = new T.Mesh(
      new T.TubeGeometry(curve, 22, 0.04, 5, false),
      this.glow(color),
    );
    this.addEffect(trail, 0.45, (t) => {
      trail.material.opacity = (1 - t) * 0.85;
    });
  }
  shieldFx(id, color) {
    const pos = this.units
      .get(id)
      .base.clone()
      .add(new T.Vector3(0, 1, 0));
    const shield = new T.Mesh(
      new T.IcosahedronGeometry(1.25, 1),
      new T.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    shield.position.copy(pos);
    this.addEffect(shield, 0.85, (t) => {
      shield.rotation.y = t * 0.7;
      shield.scale.setScalar(0.85 + Math.sin(t * Math.PI) * 0.2);
      shield.material.opacity = Math.sin(t * Math.PI) * 0.7;
    });
    for (let i = 0; i < 8; i++) {
      const r = new T.Mesh(new T.OctahedronGeometry(1), this.glow(color));
      r.position.copy(pos);
      const angle = i * 2.399;
      r.scale.set(.025, .25, .025);
      this.addEffect(r, .8, (t) => {
        r.position.set(pos.x + Math.cos(angle) * (.5 + t * .4), pos.y - .7 + t * 1.7, pos.z + Math.sin(angle) * .7);
        r.material.opacity = Math.sin(t * Math.PI);
      });
    }
  }

  async performCard(card, result, onImpact) {
    if (card.cinematic) return performCataclysm(this, card, result, onImpact);
    const actor = this.units.get(card.hero),
      color = ACTOR_INKS[card.hero];
    const targets = [...new Set(result.hits.map((h) => h.id))];
    if (card.target && !targets.length && result.targetId)
      targets.push(result.targetId);
    const dramatic = !!card.cinematic;
    this.setTempo(1.15, "星轨释放");
    this.cameraCue(
      targets[0] || card.hero,
      targets.length ? "pursuit" : "guard",
    );
    if (targets.length) this.host.dataset.cinematicPhase = "release";
    if (!targets.length) {
      const rig = actor.body.userData.rig;
      if (rig)
        await this.motionTween(0.18, (t) => {
          rig.arms[0].rotation.x = -0.9 * t;
          rig.arms[1].rotation.x = -1.2 * t;
        });
      this.shieldFx(card.hero, color);
      this.burst(
        actor.base.clone().add(new T.Vector3(0, 1.2, 0)),
        color,
        35,
        0.35,
      );
      await this.delay(230);
      onImpact();
      this.setTempo(0.35, "法术展开");
      if (result.resonance) this.resonanceFx();
      await this.delay(480);
      this.restorePose(actor);
      this.resetCamera();
      return;
    }
    const charge = new T.Group();
    charge.position.copy(actor.base);
    for (let i = 0; i < (dramatic ? 3 : 1); i++)
      this.ring(charge, 0.7 + i * 0.25, color, 0.08 + i * 0.05, 0.022);
    this.addEffect(charge, dramatic ? 1.8 : 0.75, (t) => {
      charge.rotation.y = t * 3;
      charge.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.5);
      charge.children.forEach((m) => (m.material.opacity = 1 - t));
    });
    if (dramatic) {
      const rune = new T.Group();
      rune.position.set(1, 0.09, 0);
      for (let i = 0; i < 3; i++)
        this.ring(rune, 3.4 + i * 0.4, color, i * 0.04, 0.03);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const gem = this.mesh(
          new T.OctahedronGeometry(0.16),
          this.glow(color),
          rune,
          [1 + Math.cos(a) * 4, 0.1, Math.sin(a) * 4],
        );
        gem.scale.y = 2;
      }
      this.addEffect(rune, 2, (t) => {
        rune.rotation.y = t * 0.5;
        rune.children.forEach(
          (m) => (m.material.opacity = Math.sin(t * Math.PI)),
        );
      });
      this.burst(
        actor.base.clone().add(new T.Vector3(0, 1.4, 0)),
        color,
        100,
        0.6,
      );
      await this.delay(350);
    }
    const home = actor.base.clone();
    const primary = this.units.get(targets[0]).base;
    if (card.hero === "kael" && !card.all) {
      const direction = primary.clone().sub(home).normalize();
      actor.body.rotation.y = Math.atan2(direction.x, direction.z);
      const end = primary.clone().addScaledVector(direction, -1.05);
      const rig = actor.body.userData.rig;
      await this.motionTween(0.09, (t) => {
        actor.body.scale.set(1 + t * 0.1, 1 - t * 0.24, 1);
        actor.body.rotation.x = -0.2 * t;
        rig.legs[0].rotation.x = -0.65 * t;
        rig.legs[1].rotation.x = 0.65 * t;
        rig.arms[1].rotation.x = -1.1 * t;
        rig.weapon.rotation.x = -0.9 * t;
      });
      this.burst(home.clone().add(new T.Vector3(0, 0.2, 0)), color, 35, 0.5);
      this.shock(home, color, 0.4);
      this.setTempo(1.65, "突进");
      await this.motionTween(0.19, (t) => {
        actor.group.position.lerpVectors(home, end, t * t);
        actor.group.position.y = Math.sin(t * Math.PI) * 0.22;
        actor.body.scale.set(1, 1, 1);
        actor.body.rotation.x = 0.55;
        rig.legs[0].rotation.x = -0.9;
        rig.legs[1].rotation.x = 0.8;
        rig.arms[0].rotation.x = 0.7;
        rig.arms[1].rotation.x = -1.2 + t * 1.4;
        rig.weapon.rotation.x = -0.9 + t * 2;
        rig.cape.rotation.x = -0.4;
      });
      actor.group.position.copy(end);
    } else {
      const rig = actor.body.userData.rig;
      if (rig)
        await this.motionTween(0.16, (t) => {
          actor.body.rotation.x = -0.12 * t;
          rig.arms[1].rotation.x = -1.25 * t;
          rig.arms[0].rotation.x = card.hero === "syl" ? -0.7 * t : -0.35 * t;
        });
    }
    const melee = card.hero === "kael" && !card.all;
    if (!melee)
      for (const id of targets) {
        const to = this.units
          .get(id)
          .base.clone()
          .add(new T.Vector3(0, 1, 0));
        const from = card.all
          ? to.clone().add(new T.Vector3(-2, 9, -1))
          : actor.group.position.clone().add(new T.Vector3(0, 1.1, 0));
        this.beamTrail(from, to, color);
        if (card.all) {
          const beam = new T.Mesh(
            new T.CylinderGeometry(0.08, 0.3, 10, 10, 1, true),
            this.glow(color),
          );
          beam.position.copy(to);
          beam.position.y = 5;
          this.addEffect(beam, 1.1, (t) => {
            beam.scale.x = beam.scale.z = 0.5 + Math.sin(t * Math.PI) * 2;
            beam.material.opacity = 1 - t;
          });
        }
        const orb = new T.Mesh(
          new T.IcosahedronGeometry(dramatic ? 0.28 : 0.13, 1),
          this.glow(color),
        );
        orb.position.copy(from);
        this.addEffect(orb, 0.22, (t) => {
          orb.position.lerpVectors(from, to, t);
          orb.scale.setScalar(1 + t);
        });
      }
    if (!melee) await this.delay(220);
    this.host.dataset.cinematicPhase = "impact";
    this.cameraCue(targets[0], "impact");
    for (const id of targets) {
      const pos = this.units.get(id).base.clone();
      if (melee) {
        this.slash(pos, color, dramatic ? -0.65 : -0.48);
        this.burst(
          pos.clone().add(new T.Vector3(0, 1.4, 0)),
          color,
          dramatic ? 32 : 16,
          0.38,
        );
        this.shake = dramatic ? 0.16 : 0.085;
      } else this.shock(pos, color, dramatic ? 1.2 : 0.55);
      const victim = this.units.get(id);
      const flinch = new T.Group();
      this.addEffect(flinch, 0.38, (t) => {
        victim.body.rotation.z = Math.sin(t * Math.PI) * -0.22;
      });
    }
    this.hitStop = performance.now() + (dramatic ? 180 : 115);
    this.setTempo(dramatic ? 0.16 : 0.28, dramatic ? "终结时刻" : "命中瞬间");
    onImpact();
    if (result.resonance) this.resonanceFx();
    if (card.hits > 1)
      for (let n = 1; n < card.hits; n++) {
        await this.delay(95);
        const to = this.units.get(targets[0]).base.clone();
        this.beamTrail(
          actor.base.clone().add(new T.Vector3(0, 1, 0)),
          to.clone().add(new T.Vector3(0, 1, 0)),
          color,
        );
        this.shock(to, color, 0.45);
      }
    await this.delay(dramatic ? 720 : 430);
    this.setTempo(1.25, "余势释放");
    if (card.hero === "kael" && !card.all) {
      const start = actor.group.position.clone();
      const retreat = new T.Group();
      this.addEffect(retreat, 0.23, (t) =>
        actor.group.position.lerpVectors(start, home, t),
      );
      await this.delay(240);
      actor.group.position.copy(home);
    }
    this.restorePose(actor);
    this.resetCamera();
  }
  motionTween(duration, update) {
    return new Promise((resolve) =>
      this.addEffect(new T.Group(), duration, (t) => {
        update(t);
        if (t >= 1) resolve();
      }),
    );
  }
  restorePose(actor) {
    actor.body.rotation.set(0, Math.PI / 2, 0);
    actor.body.scale.set(1, 1, 1);
    const rig = actor.body.userData.rig;
    if (!rig) return;
    for (const limb of [...rig.legs, ...rig.arms]) limb.rotation.set(0, 0, 0);
    if (rig.weapon) rig.weapon.rotation.x = 0.28;
    rig.cape.rotation.x = 0;
  }
  resonanceFx() {
    this.shieldFx(
      this.activeHero || "kael",
      ACTOR_INKS[this.activeHero || "kael"],
    );
    this.bloom.strength = 1.1;
    const pulse = new T.Group();
    this.addEffect(pulse, 0.9, (t) => {
      this.bloom.strength = 0.65 + (1 - t) * 0.45;
    });
  }
  async performEnemy(enemy, onImpact) {
    const hero = this.activeHero || "kael";
    this.cameraCue(
      enemy.intent.damage ? hero : enemy.id,
      enemy.intent.damage ? "attack" : "guard",
    );
    if (enemy.intent.damage) {
      const start = this.units
        .get(enemy.id)
        .base.clone()
        .add(new T.Vector3(0, 1.4, 0));
      const end = this.units
        .get(hero)
        .base.clone()
        .add(new T.Vector3(0, 1, 0));
      this.beamTrail(start, end, "#daa4cf");
      const orb = new T.Mesh(
        new T.OctahedronGeometry(0.2),
        this.glow("#d39fc9"),
      );
      orb.position.copy(start);
      this.addEffect(orb, 0.3, (t) => orb.position.lerpVectors(start, end, t));
      await this.delay(300);
      this.shock(end, "#dda7bc", 0.55);
      this.shieldFx(hero, "#a0d7db");
      onImpact();
      await this.delay(330);
    } else {
      this.shieldFx(enemy.id, "#a8bfe9");
      await this.delay(250);
      onImpact();
      await this.delay(250);
    }
    this.resetCamera();
  }
  presentHero(id, mode = "title") {
    this.setEnvironmentColor(false);
    const narrow = this.host.clientWidth < 700;
    this.presentation = { id, mode, started: performance.now() };
    this.units
      .get(id)
      .actorInk.value.copy(
        inkVector(mode === "title" ? "#2148b8" : ACTOR_INKS[id]),
      );
    this.environment.forEach((o) => (o.visible = false));
    for (const [key, u] of this.units) {
      u.group.visible = key === id;
      if (key === id) {
        u.group.position.set(
          narrow
            ? mode === "title"
              ? 0.65
              : 0
            : mode === "title"
              ? 1.55
              : -1.7,
          narrow && mode === "character" ? 2.1 : 0,
          0,
        );
        u.group.scale.setScalar(narrow ? (mode === "title" ? 1.25 : 1) : 1.55);
        u.body.rotation.y = -0.35;
        u.selector.visible = false;
        u.ring.visible = false;
      }
    }
    this.setInk(mode === "title" ? "#2148b8" : ACTOR_INKS[id]);
  }
  endPresentation() {
    this.presentation = null;
    this.landscapePreview = false;
    this.setEnvironmentColor(true);
    this.environment.forEach((o) => (o.visible = true));
    for (const [id, u] of this.units) {
      u.ring.visible = true;
      u.actorInk.value.copy(inkVector(ACTOR_INKS[id]));
    }
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms / this.speed));
  }
  animate(now) {
    requestAnimationFrame(this.animate);
    const realDt = Math.min((now - this.last) / 1000, 0.05) * this.speed;
    this.tempo = T.MathUtils.lerp(
      this.tempo ?? 1,
      this.tempoTarget ?? 1,
      1 - Math.exp(-realDt * 14),
    );
    let dt = realDt * this.tempo;
    this.last = now;
    if (now < this.hitStop) dt *= 0.08;
    this.time += dt;
    this.landscape?.tick(this.time, this.motion);
    this.dust.rotation.y = this.time * 0.015;
    this.portal.rotation.z = this.time * 0.2;
    for (const u of this.units.values()) {
      u.statusFx?.tick(realDt, this.time, this.motion, u.group.visible && !this.presentation);
      u.body.position.y = Math.sin(this.time * 2 + u.phase) * 0.045;
      u.ring.material.opacity = 0.28 + Math.sin(this.time * 2 + u.phase) * 0.1;
      u.selector.rotation.z = this.time * 0.35;
    }
    const pending = this.effects;
    this.effects = [];
    for (const e of pending) {
      e.age += dt;
      const t = Math.min(e.age / e.duration, 1);
      e.update(t, dt);
      if (t >= 1) {
        this.scene.remove(e.obj);
        e.obj.traverse((o) => {
          o.geometry?.dispose();
          if (o.material) {
            if (Array.isArray(o.material))
              o.material.forEach((m) => m.dispose());
            else o.material.dispose();
          }
        });
      } else this.effects.push(e);
    }
    this.shake *= 0.86;
    const shot = this.motion && this.shot;
    const lerp = 1 - Math.exp(-realDt * 8);
    this.cameraFocus.lerp(shot ? shot.focus : new T.Vector3(0, 0.3, 0), lerp);
    this.cameraDistance = T.MathUtils.lerp(
      this.cameraDistance,
      shot ? shot.distance : 1,
      lerp,
    );
    this.cameraOrbit = T.MathUtils.lerp(
      this.cameraOrbit,
      shot ? shot.orbit : 0,
      lerp,
    );
    this.cameraRoll = T.MathUtils.lerp(
      this.cameraRoll,
      shot ? shot.roll : 0,
      lerp,
    );
    const cameraDestination =
      shot?.position ||
      this.baseCamera
        .clone()
        .applyAxisAngle(new T.Vector3(0, 1, 0), this.cameraOrbit)
        .multiplyScalar((this.baseScale || 1) * this.cameraDistance)
        .add(this.cameraFocus.clone().multiplyScalar(0.7));
    this.camera.position.lerp(cameraDestination, lerp);
    if (this.motion) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    this.camera.lookAt(this.cameraFocus);
    this.camera.rotateZ(this.cameraRoll);
    if (this.presentation) {
      const p = this.presentation,
        elapsed = (now - p.started) / 1000,
        actor = this.units.get(p.id);
      const entry = this.motion ? Math.exp(-elapsed * 3) : 0;
      actor.body.rotation.y =
        -0.35 + (this.motion ? Math.sin(this.time * 0.35) * 0.12 : 0);
      this.camera.position.set(
        entry * 1.4,
        3.0 + entry * 1.5,
        10.4 + entry * 5,
      );
      this.camera.lookAt(0, 2.0, 0);
      this.camera.rotateZ(entry * -0.045);
    }
    if (this.landscapePreview) {
      const narrow = this.host.clientWidth < 700;
      this.camera.position.set(0, narrow ? 11 : 7.5, narrow ? 26 : 18);
      this.camera.lookAt(0, 1, -3);
    }
    this.composer.render();
    this.onFrame?.();
  }
}
