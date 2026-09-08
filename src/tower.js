import "./card-reading.css";
import { cardRulesHTML, installCardTooltips } from "./card-text.js";
import "./tower.css";
import "./mono.css";
import "./journey.css";
import "./biomes.css";
import "./actor-theme.css";
import "./ultimate.css";
import { ELEMENT_MAX, ULTIMATES } from "./ultimates.js";
import { ACTOR_INKS } from "./actor-ink.js";
import { BIOMES, BIOME_IDS, PALETTE_SOURCE, biomeLocation } from "./biomes.js";
import { BattleScene } from "./scene.js";
import { Sound } from "./audio.js";
import { icon } from "./icons.js";
import { cardArt, cardSchool, SCHOOLS } from "./card-art.js";
import { HEROES, MODELS, CARDS, RELICS, CHARACTERS, cardData } from "./data.js";
import * as G from "./roguelike.js";
import { dealCards, discardHand } from "./card-flow.js";

const relicImage = (key, className = "") =>
  `<img class="relic-art ${className}" src="/art/relics/${key}.png" alt="" draggable="false" decoding="async"/>`;

const $ = (s) => document.querySelector(s),
  sound = new Sound(),
  practice = new URLSearchParams(location.search).has("practice"),
  SAVE = "astral-ash-tower-v3";
let run = G.createRun(),
  busy = false,
  selected = null,
  hovered = null,
  overlay = null,
  fast = false,
  motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  scene,
  lastFocus;
let galleryReturn = "title";
let burstTrial = false,
  trialReturn = null;
let saved = null;
let aimPoint = null,
  dragCard = null,
  suppressClick = false;
try {
  const raw = localStorage.getItem(SAVE);
  if (raw && !practice) {
    const parsed = JSON.parse(raw);
    if (
      parsed.version === 3 &&
      CHARACTERS[parsed.hero] &&
      Array.isArray(parsed.map) &&
      Array.isArray(parsed.deck) &&
      [
        "blessing",
        "battle",
        "map",
        "reward",
        "event",
        "camp",
        "shop",
        "chest",
      ].includes(parsed.phase)
    )
      saved = parsed;
  }
} catch {}
$("#app").innerHTML =
  `<div class="atmosphere"></div><header class="topbar"><a href="./" class="brand">${icon("spark")}<span>星 烬<small>ASTRAL ASH · ASCENSION</small></span></a><div class="run-resources"><span class="health-resource">♡ <b id="hp"></b></span><span class="gold-resource">◈ <b id="gold"></b></span><button id="deck-button">${icon("diamond")}<b id="deck-count"></b> 张牌</button><button id="map-button">${icon("star")}<span id="floor"></span></button></div><div class="tools"><button id="sound" aria-label="切换音效" title="音效">${icon("sound")}</button><button id="motion" aria-label="切换镜头特效" title="镜头特效">${icon("eye")}</button><button id="speed" title="演出速度">1×</button><button id="help" aria-label="玩法说明">${icon("help")}</button><button id="pause" aria-label="暂停">${icon("pause")}</button></div></header>
<main id="battle-stage"><div id="scene" aria-label="三维卡牌战斗场景"></div><section class="location"><div class="eyebrow" id="floor-type">THE FIRST ASCENT / 01</div><h1 id="location-name">浮空圣所</h1><p id="location-sub">在破碎的世界，打出你的命运。</p><div id="relics"></div></section><aside class="tactical-panel"><div class="panel-label">敌方意图 <span>INTENT</span></div><div id="intent-list"></div><div id="threat"></div><p>意图公开。击杀、虚弱或破防可降低威胁。</p></aside><aside id="preview-panel"><div class="panel-label">出牌推演 <span>PREVIEW</span></div><div id="preview-content"></div></aside><div id="unit-labels"></div><div id="float-layer"></div><div id="cinema-bars"></div><div id="cast-banner"><small></small><strong></strong><span></span></div><div id="feedback"><small></small><strong></strong><span></span></div><div class="battle-message" id="battle-message">先施加易伤，再用连击兑现伤害。每一步，都算数。</div><div class="player-status"><div class="party-portraits">${HEROES.map((h) => `<span style="--hero:${h.color}" title="${h.name} · ${h.title}">${icon(h.icon)}</span>`).join("")}</div><div class="player-health"><div><b>星行者</b><span id="hp-detail"></span></div><div class="health-track"><i id="hp-fill"></i></div><div id="player-buffs"></div></div><div id="block-orb">${icon("shield")}<b>0</b></div><button id="potion" title="回复 20 生命，不消耗能量">${icon("leaf")}<span></span></button></div><div class="turn-stamp"><small>你的回合</small><strong id="turn-number">01</strong><span>PLAYER TURN</span></div></main>
<section class="hand-area"><div class="hand-top"><div id="chain"></div><div class="hand-hint" id="hand-hint">选牌 → 敌人</div><div id="combo-counter"></div></div><div class="hand-layout"><div class="energy-station"><div id="energy-orb"><span id="energy-number">3</span><small>能量</small></div><button id="draw-pile">${icon("diamond")}<span>抽牌堆 <b>7</b></span></button></div><div id="hand"></div><div class="end-station"><button id="end-turn">结束回合 ${icon("chevron")}<small>END TURN · E</small></button><button id="discard-pile">${icon("reset")}<span>弃牌堆 <b>0</b></span></button><button id="exhaust-pile">消耗区 <b>0</b></button></div></div></section><div class="bottom-line"><span>单人构筑 · 星之塔</span><span id="save-state">每次行动自动保存</span><span><kbd>1–9</kbd> 选牌 <kbd>Enter</kbd> 打出 <kbd>Esc</kbd> 取消</span></div><div id="modal" role="dialog" aria-modal="true" aria-label="冒险面板" hidden></div><div id="toast" role="status"></div><div id="loading"><div>${icon("spark")}</div><h2>星 烬</h2><p>正在重构星之轨迹…</p></div>`;

try {
  scene = new BattleScene($("#scene"), (id) => targetClick(id));
  scene.addUnits(MODELS);
  scene.onFrame = positionLabels;
  scene.motion = motion;
  const tempo = document.createElement("div");
  tempo.id = "time-dilation";
  tempo.hidden = true;
  document.body.append(tempo);
  scene.onTempo = (scale, label) => {
    tempo.hidden = !label;
    tempo.textContent = `${label} / ${scale.toFixed(2)}×`;
    document.body.classList.toggle("time-slow", scale < 0.5);
  };
  $("#motion").classList.toggle("off", !motion);
  $("#loading").classList.add("loaded");
} catch (error) {
  console.error(error);
  $("#loading").innerHTML =
    "<h2>无法启动 3D 战场</h2><p>请在支持 WebGL 的浏览器中开启硬件加速后重试。</p>";
}

const burstControl = document.createElement("button");
burstControl.id = "ultimate-button";
$(".energy-station").append(burstControl);
const trialControl = document.createElement("button");
trialControl.id = "trial-control";
trialControl.textContent = "试演 · 切换角色";
trialControl.hidden = true;
document.body.append(trialControl);
const nodeIcon = (t) =>
  ({
    battle: "sword",
    elite: "diamond",
    boss: "crown",
    camp: "bolt",
    event: "eye",
    shop: "star",
    chest: "diamond",
  })[t];
const typeName = (t) =>
  ({
    battle: "普通战斗",
    elite: "精英遭遇",
    boss: "最终领主",
    camp: "营火",
    event: "事件",
    shop: "商店",
    chest: "宝箱",
  })[t];
function save() {
  if (practice || burstTrial) return;
  try {
    if (["victory", "defeat"].includes(run.phase))
      localStorage.removeItem(SAVE);
    else {
      localStorage.setItem(SAVE, JSON.stringify(run));
      saved = structuredClone(run);
    }
    $("#save-state").textContent = "星轨已保存";
  } catch {
    $("#save-state").textContent = "浏览器未允许存档";
  }
}
function modelState() {
  return {
    target: run.battle?.target,
    units: MODELS.map((m) => ({
      ...m,
      visual: m.id === run.hero && run.phase === "battle" ? run.battle : {},
      absent:
        m.team === "ally"
          ? m.id !== run.hero || run.phase !== "battle"
          : !run.battle?.enemies.some((e) => e.id === m.id),
      hp:
        m.team === "ally"
          ? m.id === run.hero && run.hp > 0 && run.phase === "battle"
            ? 1
            : 0
          : run.battle?.enemies.find((e) => e.id === m.id)?.hp || 0,
    })),
  };
}
function cardHTML(instance, mode = "hand", index = 0) {
  const c = cardData(instance),
    hero = HEROES.find((h) => h.id === c.hero),
    isHand = mode === "hand",
    school = cardSchool(c);
  const unavailable =
    isHand &&
    (busy ||
      run.phase !== "battle" ||
      c.cost > run.battle.energy ||
      c.type === "curse");
  return `<button class="game-card ${c.type} ${c.upgraded ? "upgraded" : ""} ${selected === c.uid && isHand ? "selected" : ""} ${unavailable ? "unavailable" : ""}" style="--hero:${hero.color};--ink:${school.ink};--i:${index}" ${isHand ? `data-card="${c.uid}"` : `data-${mode}="${instance.uid || instance.key}"`} aria-label="${c.name}，${c.cost === 99 ? "无法打出" : c.cost + "能量"}，${c.description}" ${busy && isHand ? "disabled" : ""}><span class="card-cost">${c.cost === 99 ? "×" : c.cost}</span><span class="card-rarity">${c.rarity}</span><div class="card-art-wrap">${cardArt(c, hero.color)}<span class="card-hero">${hero.name} / ${c.type === "attack" ? "攻击" : c.type === "power" ? "能力" : c.type === "curse" ? "诅咒" : "技能"}</span></div><h3>${c.name}</h3><p>${cardRulesHTML(c)}</p><div class="card-foot"><span>${c.exhaust ? "消耗" : c.type === "power" ? "本场持续" : c.finisher ? "终结" : c.burn ? "燃烧" : c.vulnerable ? "易伤" : c.block ? "格挡" : ""}</span>${isHand ? `<kbd>${index + 1}</kbd>` : icon(hero.icon)}</div></button>`;
}
function intentText(e) {
  const i = e.intent,
    d = i.damage
      ? Math.floor(i.damage * (e.weak ? 0.75 : 1) * (e.stagger ? 0.5 : 1))
      : 0;
  return `${d ? `${d}${i.hits > 1 ? " × " + i.hits : ""} 伤害` : ""}${i.block ? " " + i.block + " 格挡" : ""}${i.weak ? " · 虚弱" : ""}${i.strength ? " · 强化" : ""}`;
}
function render() {
  document.body.classList.toggle("acting", busy);
  document.body.dataset.hero = run.hero;
  const b = run.battle,
    node = G.floors(run)[Math.max(0, run.floor)][run.path[run.floor] || 0];
  const ultimate = ULTIMATES[run.hero],
    charge = b?.elementCharge || 0;
  burstControl.hidden = run.phase !== "battle";
  burstControl.disabled = busy || b?.phase !== "player" || charge < ELEMENT_MAX;
  burstControl.classList.toggle("ready", charge >= ELEMENT_MAX);
  burstControl.style.setProperty(
    "--charge",
    `${(charge / ELEMENT_MAX) * 100}%`,
  );
  burstControl.innerHTML = `<span>${ultimate.element} <b>${charge} / ${ELEMENT_MAX}</b></span><strong>${ultimate.name}</strong><small>${charge >= ELEMENT_MAX ? "释放 · Q" : "出牌蓄能"}</small>`;
  burstControl.title = `出牌按费用蓄能，至少 1 格；跨回合保留。蓄满后不耗能量。${ultimate.description}`;
  trialControl.hidden = !burstTrial;
  trialControl.disabled = busy;
  $("#hp").textContent = `${run.hp} / ${run.maxHp}`;
  $("#gold").textContent = run.gold;
  $("#deck-count").textContent = run.deck.length;
  $("#floor").textContent = `${run.floor + 1} / ${G.floors(run).length} 层`;
  const location = biomeLocation(run.floor, run.path[run.floor] || 0, run.seed);
  document.body.dataset.biome = location.id;
  $("#location-name").textContent = location.name;
  $("#location-sub").textContent = node.sub;
  $("#floor-type").textContent =
    `${location.theme.name} · ${typeName(node.type)} / ${String(Math.max(1, run.floor + 1)).padStart(2, "0")}`;
  $("#hand-hint").textContent = busy
    ? ""
    : selected
      ? "选择目标"
      : "选牌 → 敌人";
  $("#relics").innerHTML = run.relics
    .map(
      (key) =>
        `<button class="relic" data-relic-info="${key}" title="${RELICS[key].name}：${RELICS[key].text}">${relicImage(key)}<span>${RELICS[key].name}</span></button>`,
    )
    .join("");
  for (const hero of HEROES) {
    const label = $("#ally-" + hero.id);
    if (label) {
      label.hidden = hero.id !== run.hero;
      label.innerHTML = `${hero.name}<small>♡ ${run.hp}/${run.maxHp}${b?.block ? ` · ⛨ ${b.block}` : ""}</small>`;
    }
  }
  if (!b) {
    $("#hand").innerHTML = "";
    scene?.sync(modelState());
    return;
  }
  $("#hp-detail").textContent = `${run.hp} / ${run.maxHp}`;
  $("#hp-fill").style.width = (run.hp / run.maxHp) * 100 + "%";
  $("#block-orb b").textContent = b.block;
  $("#block-orb").classList.toggle("active", b.block > 0);
  $("#player-buffs").innerHTML = [
    b.strength ? `力量 +${b.strength}` : "",
    b.weak ? `虚弱 ${b.weak}` : "",
    b.nextAttack ? `下一击 +${b.nextAttack}` : "",
    b.afterimage ? `残像 ${b.afterimage}` : "",
  ]
    .filter(Boolean)
    .map((t) => `<span>${t}</span>`)
    .join("");
  $("#potion span").textContent = run.potion;
  $("#potion").disabled = busy || run.potion === 0 || run.phase !== "battle";
  $("#turn-number").textContent = String(b.turn).padStart(2, "0");
  $(".turn-stamp small").textContent =
    b.phase === "player" ? "你的回合" : "敌方行动";
  $("#energy-number").textContent = b.energy;
  $("#energy-orb").classList.toggle("empty", b.energy === 0);
  $("#draw-pile b").textContent = b.draw.length;
  $("#discard-pile b").textContent = b.discard.length;
  $("#exhaust-pile b").textContent = b.exhaust.length;
  $("#end-turn").disabled =
    busy || run.phase !== "battle" || b.phase !== "player";
  $("#hand").style.setProperty("--count", b.hand.length);
  $("#hand").innerHTML = b.hand.map((c, i) => cardHTML(c, "hand", i)).join("");
  layoutHand();
  $("#chain").innerHTML =
    run.hero === "syl"
      ? `箭匣 ${b.attacks % 3} / 3`
      : run.hero === "lyra"
        ? `核心 · ${b.skillDrawn ? "已触发" : "待触发"}`
        : "";
  $("#combo-counter").innerHTML = `<b>${b.played}</b> 张已打出`;
  $("#intent-list").innerHTML = G.alive(run)
    .map(
      (e) =>
        `<button class="intent-row ${e.id === b.target ? "targeted" : ""}" data-target="${e.id}"><span class="intent-symbol ${e.intent.damage ? "danger" : ""}">${icon(e.intent.damage ? "sword" : "shield")}</span><span>${e.name}<small>${e.intent.label}</small></span><b>${intentText(e)}</b></button>`,
    )
    .join("");
  const threat = G.incoming(run);
  $("#threat").innerHTML =
    `<span>预计承伤</span><strong class="${threat.hpLoss ? "danger-text" : "safe-text"}">${threat.hpLoss}</strong><small>${threat.total} 威胁 − ${threat.block} 格挡</small>`;
  $("#unit-labels").innerHTML = G.alive(run)
    .map(
      (e) =>
        `<button class="unit-label ${e.id === b.target ? "targeted" : ""}" style="--blue:${ACTOR_INKS[e.id]}" id="label-${e.id}" data-target="${e.id}"><span class="enemy-intent ${e.intent.damage ? "damage-intent" : ""}">${icon(e.intent.damage ? "sword" : "shield")} ${intentText(e)}</span><span class="enemy-name">${e.rage ? "◆ 狂暴 · " : ""}${e.name}</span><span class="enemy-hp"><i style="width:${(e.hp / e.maxHp) * 100}%"></i></span><span class="enemy-hp-number">${e.hp} / ${e.maxHp}${e.block ? " · ⛨ " + e.block : ""}</span><span class="enemy-buffs">${e.vulnerable ? `<i>易伤 ${e.vulnerable}</i>` : ""}${e.burn ? `<i>燃烧 ${e.burn}</i>` : ""}${e.weak ? `<i>虚弱 ${e.weak}</i>` : ""}${e.stagger ? "<i>破防 · 攻击减半</i>" : ""}</span></button>`,
    )
    .join("");
  scene?.sync(modelState());
  positionLabels();
  renderPreview();
}
function layoutHand() {
  const hand = $("#hand"),
    count = hand.children.length;
  if (!count || innerWidth <= 900) return;
  const cardWidth = hand.firstElementChild.offsetWidth;
  const spacing =
    count > 1
      ? Math.min(12, (hand.clientWidth - 8 - count * cardWidth) / (count - 1))
      : 0;
  hand.style.setProperty("--overlap", `${spacing}px`);
}
window.addEventListener("resize", layoutHand);
function positionLabels() {
  updateAim();
  if (!scene) return;
  for (const hero of HEROES) {
    const label = document.querySelector(`#ally-${hero.id}`);
    if (label) {
      const p = scene.project(hero.id, -2.6);
      label.style.left = `${p.x + $("#scene").offsetLeft}px`;
      label.style.top = `${p.y + $("#scene").offsetTop + 7}px`;
    }
  }
  const host = $("#scene"),
    width = $("#battle-stage").clientWidth;
  const labels = G.alive(run)
    .map((e) => {
      const el = $("#label-" + e.id),
        p = scene.project(e.id, 0.1);
      return el
        ? {
            el,
            x: p.x + host.offsetLeft,
            y: p.y + host.offsetTop,
            width: el.offsetWidth,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);
  if (!labels.length) return;
  const originalCenter = labels.reduce((n, p) => n + p.x, 0) / labels.length;
  for (let i = 1; i < labels.length; i++)
    labels[i].x = Math.max(
      labels[i].x,
      labels[i - 1].x + (labels[i - 1].width + labels[i].width) / 2 + 7,
    );
  const arrangedCenter = labels.reduce((n, p) => n + p.x, 0) / labels.length;
  let shift = originalCenter - arrangedCenter;
  shift = Math.min(
    shift,
    width - labels.at(-1).width / 2 - 10 - labels.at(-1).x,
  );
  shift = Math.max(shift, labels[0].width / 2 + 10 - labels[0].x);
  for (const p of labels) {
    p.el.style.left = p.x + shift + "px";
    p.el.style.top = Math.max(110, p.y) + "px";
  }
}
function renderPreview() {
  if (!run.battle) return;
  const uid = selected || hovered,
    b = run.battle;
  const c = b.hand.find((c) => c.uid === uid);
  $("#preview-panel").hidden = !c;
  $("#hand-hint").classList.toggle("mobile-preview", Boolean(selected && c));
  if (!c) {
    $("#preview-content").innerHTML = "";
    return;
  }
  const data = cardData(c),
    p = G.previewCard(run, uid, b.target);
  if (selected && p.valid)
    $("#hand-hint").textContent =
      `伤害 ${p.damage} · 承伤 ${G.incoming(run).hpLoss} → ${p.incoming.hpLoss}${p.result.resonance ? " · 共鸣！" : ""}${p.result.hits.some((h) => h.dead) ? " · 可斩杀" : ""} · 点击敌人出牌`;
  $("#preview-content").innerHTML =
    `<div class="preview-card-name" style="color:${HEROES.find((h) => h.id === data.hero).color}">${icon(data.icon)}<h3>${data.name}</h3></div>${p.valid ? `<div class="preview-numbers"><div><span>生命伤害</span><b>${p.damage}</b></div><div><span>新增格挡</span><b>${p.result.block}</b></div></div><div class="preview-outcome">${p.result.hits.some((h) => h.dead) ? "<strong>斩杀</strong>" : ""}${p.result.hits.some((h) => h.broken) ? "<strong>破防</strong>" : ""}${p.result.resonance ? "<strong>共鸣：+1 能量、抽 1</strong>" : ""}<span>预计承伤 ${G.incoming(run).hpLoss} → <b>${p.incoming.hpLoss}</b></span></div>${selected === uid ? `<button id="confirm-card" class="small-primary">打出 <kbd>Enter</kbd></button>` : ""}` : `<div class="preview-warning">${p.reason}</div>`}`;
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 2200);
}
function float(id, text, color = "#ffe6be", index = 0) {
  if (!scene) return;
  const p = scene.project(id, -0.65);
  const el = document.createElement("div");
  el.className = "damage-number";
  el.textContent = text;
  el.style.cssText = `left:${p.x + $("#scene").offsetLeft + index * 18}px;top:${p.y + $("#scene").offsetTop + index * 12}px;color:${color}`;
  $("#float-layer").append(el);
  setTimeout(() => el.remove(), 1400);
}
function feedback(
  title,
  subtitle,
  color = "#e8cc99",
  label = "TACTICAL ADVANTAGE",
) {
  const el = $("#feedback");
  el.style.setProperty("--accent", color);
  el.querySelector("small").textContent = label;
  el.querySelector("strong").textContent = title;
  el.querySelector("span").textContent = subtitle;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(feedback.timer);
  feedback.timer = setTimeout(() => el.classList.remove("show"), 2100);
}
function selectCard(uid) {
  if (
    busy ||
    overlay ||
    run.phase !== "battle" ||
    run.battle.phase !== "player"
  )
    return;
  const card = run.battle.hand.find((c) => c.uid === uid);
  if (!card) return;
  const c = cardData(card);
  sound.unlock();
  sound.click();
  if (c.cost > run.battle.energy || c.type === "curse") {
    hovered = uid;
    renderPreview();
    toast(c.type === "curse" ? "创伤无法打出，可在商店移除" : "能量不足");
    return;
  }
  if ((c.type !== "attack" && !c.target) || c.all) {
    useCard(uid);
    return;
  }
  selected = selected === uid ? null : uid;
  aimPoint = null;
  render();
}
function targetClick(id) {
  if (busy || overlay || !G.alive(run).some((e) => e.id === id)) return;
  run.battle.target = id;
  if (selected) useCard(selected);
  else {
    sound.click();
    render();
  }
}
function enemyAt(x, y) {
  const label = document.elementFromPoint(x, y)?.closest("[data-target]");
  if (label) return label.dataset.target;
  // A generous projected hit area makes low-poly silhouettes usable with touch.
  const host = $("#scene").getBoundingClientRect();
  let nearest = null,
    distance = Infinity;
  for (const e of G.alive(run)) {
    const p = scene.project(e.id, -1.1),
      dx = x - host.left - p.x,
      dy = y - host.top - p.y;
    const d = (dx / 75) ** 2 + (dy / 90) ** 2;
    if (d < 1 && d < distance) {
      nearest = e.id;
      distance = d;
    }
  }
  return nearest;
}
function updateAim() {
  const svg = $("#target-arrow");
  if (!svg) return;
  const card = run.battle?.hand.find((c) => c.uid === selected);
  const data = card && cardData(card);
  const visible =
    data &&
    !data.all &&
    (data.type === "attack" || data.target) &&
    !busy &&
    !overlay;
  svg.style.display = visible ? "block" : "none";
  if (!visible) return;
  const el = $(`[data-card="${selected}"]`);
  if (!el) return;
  const rect = el.getBoundingClientRect(),
    host = $("#scene").getBoundingClientRect();
  const p = scene.project(run.battle.target, -1.1);
  const end =
    aimPoint && aimPoint.y < rect.top
      ? aimPoint
      : { x: p.x + host.left, y: p.y + host.top };
  const x = rect.left + rect.width / 2,
    y = rect.top + 12;
  const d = `M${x} ${y} Q${x + (end.x - x) * 0.25} ${Math.min(y, end.y) - 100} ${end.x} ${end.y}`;
  svg.setAttribute("viewBox", `0 0 ${innerWidth} ${innerHeight}`);
  svg.querySelector(".aim-path").setAttribute("d", d);
  svg.querySelector(".aim-outline").setAttribute("d", d);
  svg.querySelector("circle").setAttribute("cx", end.x);
  svg.querySelector("circle").setAttribute("cy", end.y);
}
async function useCard(uid) {
  if (busy || overlay || run.phase !== "battle") return;
  const p =
    uid === "ultimate"
      ? G.previewUltimate(run)
      : G.previewCard(run, uid, run.battle.target);
  if (!p.valid) {
    toast(p.reason);
    return;
  }
  const c = p.result.card,
    hero = HEROES.find((h) => h.id === c.hero),
    target = run.battle.target;
  scene.setInk();
  busy = true;
  selected = null;
  hovered = null;
  render();
  sound.unlock();
  sound.cast(c.cinematic ? "ultimate" : "skill");
  $("#cast-banner small").textContent = c.cinematic
    ? "ASTRAL FINISHER"
    : hero.title.toUpperCase();
  $("#cast-banner strong").textContent = c.name;
  $("#cast-banner span").textContent = p.result.resonance
    ? "共鸣即将触发"
    : c.finisher
      ? `${run.battle.attacks} 次攻击铺垫 · 伤害兑现`
      : c.type === "power"
        ? "能力觉醒 · 本场持续"
        : "";
  $("#cast-banner").style.setProperty("--accent", hero.color);
  $("#cast-banner").className = "show";
  $("#cinema-bars").classList.toggle("show", motion && !!c.cinematic);
  let drawing = Promise.resolve();
  try {
    await cardCloseup(c);
    await scene.performCard(c, p.result, () => {
      const r =
        uid === "ultimate" ? G.playUltimate(run) : G.playCard(run, uid, target);
      scene.units.get(run.hero)?.statusFx?.trigger(c);
      if (r.hits.length) sound.impact(c.cinematic ? "ultimate" : "skill");
      r.hits.forEach((h, i) =>
        float(
          h.id,
          h.damage ? "−" + h.damage : "格挡 " + h.absorbed,
          hero.color,
          i % 3,
        ),
      );
      if (r.block) float(c.hero, "格挡 +" + r.block, "#8ddfd9");
      if (r.heal) float(c.hero, "生命 +" + r.heal, "#b8e7a2", 1);
      const killed = r.hits.filter((h) => h.dead).length;
      const damage = r.hits.reduce((n, h) => n + h.damage, 0);
      if (r.resonance) {
        sound.resonate?.();
        feedback(
          "共鸣",
          `+1 能量 · 抽 1 张牌${r.block ? " · 格挡 +" + r.block : ""}`,
          "#9aeadb",
          "PERFECT SEQUENCE",
        );
      } else if (killed)
        feedback(
          killed > 1 ? "星火清场" : "精准斩杀",
          `${damage} 伤害 · 敌方意图已消除`,
          hero.color,
          "LETHAL EXECUTION",
        );
      else if (r.hits.some((h) => h.broken))
        feedback(
          "击碎防线",
          "破防 · 目标本轮伤害减半",
          "#ffcd91",
          "GUARD BREAK",
        );
      else if (c.finisher && run.battle.attacks > 1)
        feedback(
          "布局兑现",
          `${damage} 伤害 · 先前攻击全部转化为力量`,
          hero.color,
          "COMBO PAYOFF",
        );
      else if (r.block)
        feedback(
          "布下防线",
          `格挡 +${r.block} · 预计承伤 ${G.incoming(run).hpLoss}`,
          "#a5dbdf",
          "CALCULATED DEFENSE",
        );
      else if (c.type === "power")
        feedback(
          "力量觉醒",
          c.strength
            ? `力量 +${c.strength} · 每次命中都更强`
            : `残像 +${c.afterimage} · 每张攻击转化为格挡`,
          hero.color,
          "BUILD ACTIVATED",
        );
      else if (c.burn || c.vulnerable || c.weak)
        feedback(
          c.burn ? "埋下余烬" : c.vulnerable ? "弱点已暴露" : "压制攻势",
          c.burn
            ? `燃烧 +${c.burn} · 可等待灼烧或使用引爆`
            : c.vulnerable
              ? "易伤生效 · 下一击伤害提升 50%"
              : "虚弱生效 · 降低敌方攻击伤害",
          hero.color,
          "SETUP COMPLETE",
        );
      else if (r.drawn || r.energy)
        feedback(
          "掌控节奏",
          `${r.drawn ? "抽 " + r.drawn + " 张牌" : ""} ${r.energy ? "能量 +" + r.energy : ""}`,
          hero.color,
          "TEMPO ADVANTAGE",
        );
      $("#battle-message").textContent =
        `${hero.name} · ${c.name}${damage ? " — " + damage + " 伤害" : ""}${r.notes.length ? " · " + r.notes.join(" · ") : ""}`;
      render();
      drawing = dealCards(run.battle.drawEvents, flowOptions());
    });
    await drawing;
  } catch (error) {
    console.error(error);
    toast(error.message);
  } finally {
    document.body.classList.remove("attack-cinematic");
    $("#attack-caption")?.remove();
    scene.resize();
    scene.resetCamera();
    scene.setInk();
    document.documentElement.style.removeProperty("--blue");
    if (burstTrial && run.phase === "battle")
      run.battle.elementCharge = ELEMENT_MAX;
    busy = false;
    $("#cast-banner").className = "";
    $("#cinema-bars").className = "";
    render();
    save();
    if (run.phase !== "battle") showPhase();
  }
}
async function endTurn() {
  if (
    busy ||
    overlay ||
    run.phase !== "battle" ||
    run.battle.phase !== "player"
  )
    return;
  busy = true;
  selected = null;
  hovered = null;
  sound.unlock();
  render();
  await discardHand(flowOptions());
  const burn = G.beginEnemyTurn(run);
  burn.forEach((h) => float(h.id, "燃烧 −" + h.damage, "#f4a574"));
  render();
  if (run.phase === "battle") {
    for (const e of [...G.alive(run)]) {
      if (run.phase !== "battle") break;
      $("#battle-message").textContent = e.name + " · " + e.intent.label;
      await scene.performEnemy(e, () => {
        const r = G.enemyAction(run, e.id);
        if (!r) return;
        const damage = r.hits.reduce((n, h) => n + h.damage, 0),
          blocked = r.hits.reduce((n, h) => n + h.blocked, 0);
        if (damage) {
          sound.impact("attack");
          float(run.hero, "−" + damage, "#ffa18c");
        }
        if (blocked) float(run.hero, "格挡 " + blocked, "#9be6e2", 1);
        if (r.perfect && r.hits.length)
          feedback(
            "尽在掌握",
            `完全抵挡 ${blocked} 点伤害`,
            "#9ce4d3",
            "PERFECT BLOCK",
          );
        if (r.block) float(e.id, "格挡 +" + r.block, "#aecbd9");
        render();
      });
    }
    G.startPlayerTurn(run);
    render();
    if (run.phase === "battle")
      await dealCards(run.battle.drawEvents, flowOptions());
  }
  busy = false;
  render();
  save();
  if (run.phase !== "battle") showPhase();
  else {
    $("#battle-message").textContent =
      `第 ${run.battle.turn} 回合 · 能量恢复，重新规划你的星轨。`;
    feedback(
      "轮到你了",
      `${run.battle.energy} 能量 · ${run.battle.hand.length} 张手牌`,
      "#e9cb91",
      "YOUR TURN",
    );
  }
}

function openOverlay(kind, html) {
  scene?.endPresentation();
  document.body.classList.toggle("landscape-gallery", kind === "landscapes");
  document.body.classList.remove(
    "presentation",
    "title-presentation",
    "character-presentation",
  );
  selected = null;
  document.body.classList.toggle(
    "front-menu",
    ["title", "characters", "blessing"].includes(kind),
  );
  lastFocus = document.activeElement;
  overlay = kind;
  $("#modal").innerHTML = html;
  $("#modal").hidden = false;
  for (const sel of [".topbar", "#battle-stage", ".hand-area"])
    $(sel).inert = true;
  $("#modal").querySelector("button:not(:disabled)")?.focus();
  if (kind === "map" || kind === "map-view") centerMap();
}
function closeOverlay() {
  scene?.endPresentation();
  document.body.classList.remove(
    "presentation",
    "title-presentation",
    "character-presentation",
  );
  document.body.classList.remove("front-menu");
  document.body.classList.remove("landscape-gallery");
  overlay = null;
  $("#modal").hidden = true;
  for (const sel of [".topbar", "#battle-stage", ".hand-area"])
    $(sel).inert = false;
  lastFocus?.focus();
  render();
}
const closeButton =
  '<button class="close-overlay" data-close aria-label="关闭">×</button>';
function modalHeading(kicker, title, sub) {
  return `<div class="modal-heading"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>`;
}
function showTitle() {
  if (burstTrial && trialReturn) {
    run = trialReturn;
    trialReturn = null;
    burstTrial = false;
    resetScene();
    render();
  }
  trialControl.hidden = true;
  delete document.body.dataset.hero;
  openOverlay(
    "title",
    `<div class="title-screen">
    <div class="title-composition" aria-hidden="true"><div class="title-orbit"></div><div class="title-slash"></div><div class="manga-strip strip-one"><img src="/art/blade-clean.png" alt="" /></div><div class="manga-strip strip-two"><img src="/art/oracle-clean.png" alt="" /></div><div class="manga-strip strip-three"><img src="/art/gale-clean.png" alt="" /></div><span class="title-outline">ASCEND</span><div class="title-cross cross-one">+</div><div class="title-cross cross-two">+</div></div>
    <div class="title-copy"><span class="title-number">01 / 星之塔</span><h1>星<span>烬</span></h1><p>一人，一副牌，一条登顶之路。</p>
    <div class="title-actions">${saved ? `<button class="primary-button" data-resume>继续游戏 <small>${HEROES.find((h) => h.id === saved.hero).name} · ${Math.max(0, saved.floor + 1)} 层</small></button>` : ""}<button class="${saved ? "text-button" : "primary-button"}" data-new>开始游戏 ${icon("chevron")}</button><button class="text-button" data-landscapes>地图图鉴 ↗</button><button class="text-button" data-burst-menu>大招试演 ↗</button></div>
    <span class="title-bottom">卡牌构筑 / 回合制冒险</span></div></div>`,
  );
  document.body.classList.add("presentation", "title-presentation");
  scene.presentHero("kael", "title");
}
function showLandscapes(id = "desert", variant = 0) {
  if (overlay !== "landscapes")
    galleryReturn = overlay === "pause" ? "pause" : "title";
  const theme = BIOMES[id];
  openOverlay(
    "landscapes",
    `<div class="landscape-panel" style="--map-ink:${theme.ink};--map-paper:${theme.sky}">
    <header><button data-landscape-back>← 返回</button><span>地图图鉴</span><b>${String(BIOME_IDS.indexOf(id) * 3 + variant + 1).padStart(2, "0")} / 12</b></header>
    <nav aria-label="区域">${BIOME_IDS.map((key) => `<button data-biome="${key}" aria-pressed="${key === id}" style="--tab-color:${BIOMES[key].ground}">${BIOMES[key].name}</button>`).join("")}</nav>
    <div class="landscape-caption"><small>${theme.title} · ${theme.range[0] + 1}—${theme.range[1] + 1} 层</small><h1>${theme.variants[variant]}</h1></div>
    <footer><div class="landscape-variants" aria-label="场景">${theme.variants.map((name, i) => `<button data-landscape="${id}:${i}" aria-pressed="${i === variant}"><small>0${i + 1}</small>${name}</button>`).join("")}</div>
    <div class="landscape-palette"><div aria-label="区域主色卡">${theme.palette.map((hex) => `<span style="background:${hex}" title="${hex}" aria-label="${hex}"></span>`).join("")}</div><a href="${PALETTE_SOURCE.url}" target="_blank" rel="noopener">${PALETTE_SOURCE.name} / ${PALETTE_SOURCE.author} ↗</a></div></footer></div>`,
  );
  scene.previewBiome({
    id,
    theme,
    variant,
    name: theme.variants[variant],
    seed: 4200 + variant,
  });
}
function leaveLandscapes() {
  scene.endPresentation();
  resetScene();
  render();
  if (galleryReturn === "pause") showPause();
  else showTitle();
}
function showBurstTrials() {
  openOverlay(
    "burst-trials",
    `<div class="modal-card small-modal">${modalHeading("", "大招试演", "")}
    <div class="burst-trial-options">${HEROES.map((h) => `<button data-burst-trial="${h.id}" style="--trial-ink:${h.color}"><small>${h.name}</small><strong>${ULTIMATES[h.id].name}</strong><span>${ULTIMATES[h.id].description}</span></button>`).join("")}</div><button class="text-button" data-title>返回主菜单</button></div>`,
  );
}
function startBurstTrial(hero) {
  if (!burstTrial) trialReturn = run;
  burstTrial = true;
  run = G.createRun(Date.now(), hero);
  run.floor = 0;
  run.path = [0];
  G.startBattle(run, "elite");
  run.battle.elementCharge = ELEMENT_MAX;
  // Trial-only states demonstrate the same appearances driven by real battle buffs.
  if (hero === "kael") run.battle.strength = 2;
  if (hero === "lyra") run.battle.block = 19;
  if (hero === "syl") run.battle.afterimage = 3;
  scene.endPresentation();
  resetScene();
  closeOverlay();
  render();
}
function showCharacters(chosen = "kael") {
  document.body.dataset.hero = chosen;
  const hero = HEROES.find((h) => h.id === chosen),
    c = CHARACTERS[chosen],
    relic = RELICS[c.relic];
  openOverlay(
    "characters",
    `<div class="character-screen" style="--ink:${SCHOOLS[c.art].ink}">
    <button class="back-link" data-title>← 返回</button><div class="character-art"><img src="/art/${c.art}-clean.png" alt="${hero.title}" /></div>
    <div class="character-copy"><p class="selection-label">选择角色</p><div class="character-tabs">${HEROES.map((h) => `<button data-character="${h.id}" aria-pressed="${h.id === chosen}">${h.name}</button>`).join("")}</div>
    <h1>${hero.name}</h1><h2>${hero.title}</h2><p>${c.description}</p><div class="character-stats">♡ ${c.hp} <span>◈ 99</span><span>${c.deck.length} 张牌</span></div>
    <div class="starter-relic">${relicImage(c.relic)}<div><small>初始遗物</small><b>${relic.name}</b><p>${relic.text}</p></div></div>
    <div class="starter-deck"><small>初始牌组</small>${[...new Set(c.deck)].map((key) => `<span title="${cardData({ key }).description}">${CARDS[key].name} × ${c.deck.filter((k) => k === key).length}</span>`).join("")}</div>
    <button class="primary-button" data-embark="${chosen}">踏入高塔 ${icon("chevron")}</button></div></div>`,
  );
  document.body.classList.add("presentation", "character-presentation");
  scene.presentHero(chosen, "character");
}
function showBlessing() {
  const hero = HEROES.find((h) => h.id === run.hero),
    r = RELICS[CHARACTERS[run.hero].relic];
  openOverlay(
    "blessing",
    `<div class="modal-card blessing-screen">${modalHeading("", "启程之赐", `${hero.name} · ♡ ${run.hp} · ◈ ${run.gold}`)}
  <div class="equipped-relic">${relicImage(CHARACTERS[run.hero].relic)}<div><small>已装备</small><b>${r.name}</b><p>${r.text}</p></div></div>
  <div class="blessing-options"><button data-blessing="vitality">${icon("leaf")}<b>强韧</b><span>最大生命 +7</span></button><button data-blessing="gold">${icon("star")}<b>馈赠</b><span>金币 +75</span></button><button data-blessing="relic">${icon("shield")}<b>交换</b><span>失去 10 生命</span><small>获得旧王护符：开战 +10 格挡</small></button></div></div>`,
  );
}
function showChest() {
  const relic = RELICS[run.chest];
  openOverlay(
    "chest",
    `<div class="modal-card small-modal">${modalHeading("", "星之遗藏", "")}<div class="chest-relic">${relic ? relicImage(run.chest) : icon("diamond")}<h2>${relic?.name || "空的宝箱"}</h2><p>${relic?.text || "所有遗物均已获得"}</p></div><button class="primary-button" data-chest>${relic ? "收下遗物" : "继续"}</button></div>`,
  );
}
function showMap(readonly = false) {
  const rows = G.floors(run),
    available = readonly ? [] : G.availableNodes(run),
    height = rows.length * 100 + 30;
  const x = (f, c) => (rows[f].length === 1 ? 300 : 100 + c * 200);
  const y = (f) => height - 65 - f * 100;
  let lines = "",
    nodes = "";
  rows.forEach((row, f) =>
    row.forEach((n, c) => {
      for (const to of n.next || []) {
        const done = run.path[f] === c && run.path[f + 1] === to;
        const reachable = f === run.floor && run.path[f] === c;
        lines += `<path d="M${x(f, c)} ${y(f)} L${x(f + 1, to)} ${y(f + 1)}" class="${done ? "traveled" : reachable ? "next-path" : ""}"/>`;
      }
      const active = f === run.floor + 1 && available.includes(c),
        visited = run.path[f] === c;
      const region = biomeLocation(f, c, run.seed);
      nodes += `<button class="route-node ${active ? "available" : ""} ${visited ? "visited" : ""} ${n.type}" style="--node-ink:${region.theme.ink};--node-color:${region.theme.ground};left:${x(f, c) / 6}%;top:${y(f)}px" title="${region.name}" data-node="${c}" aria-label="第 ${f + 1} 层 ${typeName(n.type)} 路线 ${c + 1}${active ? " 可前往" : ""}" ${!active ? "disabled" : ""}><span>${icon(nodeIcon(n.type))}</span><b>${typeName(n.type)}</b>${f === run.floor && visited ? "<small>当前位置</small>" : ""}</button>`;
    }),
  );
  const bands = BIOME_IDS.map((id) => {
    const theme = BIOMES[id],
      top = y(theme.range[1]) - 49,
      bottom = y(theme.range[0]) + 50;
    return `<div class="route-region" style="top:${top}px;height:${bottom - top}px;--region-color:${theme.ground};--region-ink:${theme.ink}"><span>${theme.name}<small>${theme.range[0] + 1}—${theme.range[1] + 1}</small></span></div>`;
  }).join("");
  openOverlay(
    readonly ? "map-view" : "map",
    `<div class="modal-card route-modal">${readonly ? closeButton : ""}<div class="route-heading"><div><h2>星之塔</h2><p>${run.floor < 0 ? "选择起点" : "沿连线前进"} · 15 层</p></div><div class="route-resources">♡ ${run.hp}/${run.maxHp}　◈ ${run.gold}<small>${HEROES.find((h) => h.id === run.hero).name} · ${run.deck.length} 张牌</small></div></div><div class="route-legend">${["battle", "elite", "event", "shop", "camp", "chest", "boss"].map((t) => `<span>${icon(nodeIcon(t))}${typeName(t)}</span>`).join("")}</div><div class="route-scroll"><div class="route-board" style="height:${height}px">${bands}<svg viewBox="0 0 600 ${height}" preserveAspectRatio="none">${lines}</svg>${nodes}</div></div><div class="route-bottom">${run.relics.map((k) => `<span title="${RELICS[k].text}">${relicImage(k)}${RELICS[k].name}</span>`).join("")}<button data-route-deck>牌组 ${run.deck.length}</button></div></div>`,
  );
}
function centerMap() {
  const map = $(".route-scroll"),
    node = $(".route-node.available") || $(".route-node.visited:last-of-type");
  if (map)
    map.scrollTop = node
      ? parseFloat(node.style.top) - map.clientHeight + 115
      : map.scrollHeight;
}
function showReward() {
  const r = run.reward;
  openOverlay(
    "reward",
    `<div class="modal-card reward-modal">${modalHeading("ENCOUNTER CLEARED", "战斗胜利", `获得 ${r.gold} 金币${run.relics.includes("feather") ? " · 黎明之羽恢复 5 生命" : ""}。选一张牌加入牌组，或保持牌组精简。`)}<div class="reward-cards">${r.cardTaken ? '<div class="reward-taken">卡牌选择已完成 ✓</div>' : r.cards.map((key) => cardHTML({ key }, "reward")).join("")}</div>${!r.cardTaken ? '<button class="text-button" data-skip-reward>跳过卡牌奖励</button>' : ""}${r.relics.length ? `<div class="relic-reward"><h3>精英战利品 · 选择一件遗物</h3>${r.relicTaken ? "<p>遗物已获得 ✓</p>" : r.relics.map((key) => `<button class="relic-option" data-take-relic="${key}">${relicImage(key)}<span><b>${RELICS[key].name}</b><small>${RELICS[key].text}</small></span></button>`).join("")}</div>` : ""}<button class="primary-button" data-leave-reward ${!r.cardTaken || (r.relics.length && !r.relicTaken) ? "disabled" : ""}>下一层 ${icon("chevron")}</button></div>`,
  );
}
function showCamp(upgrade = false) {
  openOverlay(
    "camp",
    `<div class="modal-card ${upgrade ? "deck-modal" : "choice-modal"}">${modalHeading("A FIRE BETWEEN STARS", "营火", "本次营火只能选择一项：恢复生命，或永久升级一张牌。")}${
      upgrade
        ? `<div class="deck-grid">${run.deck
            .filter((c) => !c.upgraded && c.key !== "wound")
            .map((c) => cardHTML({ ...c, upgraded: true }, "upgrade"))
            .join(
              "",
            )}</div><button class="text-button" data-camp-back>返回营火</button>`
        : `<div class="choice-grid"><button class="choice-tile" data-rest>${icon("leaf")}<h3>休息</h3><p>恢复 ${Math.ceil(run.maxHp * 0.3)} 生命</p><strong>${run.hp} → ${Math.min(run.maxHp, run.hp + Math.ceil(run.maxHp * 0.3))}</strong></button><button class="choice-tile" data-upgrade-menu>${icon("sword")}<h3>锻造</h3><p>升级一张牌，永久强化其效果。</p><strong>选择一张</strong></button></div>`
    }</div>`,
  );
}
function showEvent() {
  openOverlay(
    "event",
    `<div class="modal-card choice-modal">${modalHeading("AN OFFER FROM THE VOID", G.floors(run)[run.floor][run.path[run.floor]].name, "选择一项。")}<div class="event-orb">${icon("spark")}</div><div class="event-choices"><button data-event="blood" ${run.hp <= 12 ? "disabled" : ""}><span><b>以血换星</b><small>失去 12 生命，获得「${CARDS[{ kael: "meteor", lyra: "nova", syl: "volley" }[run.hero]].name}」</small></span><i>高风险 / 爆发构筑</i></button><button data-event="curse"><span><b>接受无名遗赠</b><small>获得 85 金币，牌组加入 1 张无法打出的「裂隙创伤」</small></span><i>财富 / 牌组污染</i></button><button data-event="leave"><span><b>带着微光离开</b><small>恢复 5 生命，不接受交易。</small></span><i>稳健前行</i></button></div></div>`,
  );
}
function showShop(remove = false) {
  openOverlay(
    "shop",
    `<div class="modal-card shop-modal">${modalHeading("THE FALLING STAR BAZAAR", "流星集市", `你的金币：${run.gold} ◈。买下关键组件，或移除一张拖慢节奏的牌。`)}${remove ? `<div class="deck-grid">${run.deck.map((c) => cardHTML(c, "remove")).join("")}</div><button class="text-button" data-shop-back>返回集市</button>` : `<div class="shop-cards">${run.shop.cards.map((key) => `<div>${cardHTML({ key }, "shop-card")}<button class="purchase" data-buy-card="${key}" ${run.shop.bought.includes(key) || run.gold < 55 ? "disabled" : ""}>${run.shop.bought.includes(key) ? "已售出" : "55 ◈ · 购买"}</button></div>`).join("")}</div><div class="shop-services"><button data-buy-relic="${run.shop.relic}" ${run.relics.includes(run.shop.relic) || run.gold < 95 ? "disabled" : ""}>${relicImage(run.shop.relic)}<b>${RELICS[run.shop.relic]?.name}</b><small>${RELICS[run.shop.relic]?.text}</small><span>95 ◈</span></button><button data-remove-menu ${run.shop.removed || run.gold < 45 ? "disabled" : ""}>${icon("cross")}<b>遗忘一张牌</b><small>${run.shop.removed ? "本次移除已使用" : "永久移除一张卡牌，让核心更快到手。"}</small><span>45 ◈</span></button><button data-buy-potion ${run.gold < 35 || run.potion >= 3 ? "disabled" : ""}>${icon("leaf")}<b>星露药水</b><small>战斗中免费恢复 20 生命。最多携带 3 瓶。</small><span>35 ◈</span></button></div><button class="primary-button" data-leave-shop>继续攀升 ${icon("chevron")}</button>`}</div>`,
  );
}
function showDeck(pile = "deck") {
  const b = run.battle,
    cards = pile === "deck" ? run.deck : b[pile];
  const names = {
    deck: "你的构筑",
    draw: "抽牌堆",
    discard: "弃牌堆",
    exhaust: "消耗区",
  };
  openOverlay(
    "deck",
    `<div class="modal-card deck-modal">${closeButton}${modalHeading("CARDS & POSSIBILITIES", names[pile], `${cards.length} 张牌 · ${pile === "draw" ? "仅展示剩余牌，不泄露抽牌顺序。" : pile === "exhaust" ? "这些牌将在下一场战斗重新可用。" : ""}`)}<div class="deck-grid">${
      [...cards]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((c) => cardHTML(c, "inspect"))
        .join("") || '<p class="empty-pile">这里暂时没有卡牌。</p>'
    }</div></div>`,
  );
}
function showHelp() {
  openOverlay(
    "help",
    `<div class="modal-card help-modal">${closeButton}${modalHeading("THE ART OF PLANNING", "规则", "没有随机暴击。伤害可以推演，敌方行动可以预判。")}<div class="guide-grid"><div>${icon("sword")}<h3>每回合 3 能量，抽 5 张牌</h3><p>攻击牌：选牌后点敌人，或按 Enter。指向技能也需要选敌人，其余技能立即生效。结束回合弃掉手牌，敌人按公开意图行动。</p></div><div>${icon("spark")}<h3>角色与遗物</h3><p>单角色独立牌池。剑士战后回血；术师首张技能抽牌；游侠三次攻击叠盾。遗物全程生效。</p></div><div>${icon("diamond")}<h3>易伤、燃烧与破防</h3><p>易伤 +50% 攻击伤害；虚弱 −25% 攻击伤害。燃烧在敌方行动前扣血。打空敌人格挡，其本轮攻击减半。</p></div><div>${icon("shield")}<h3>格挡</h3><p>格挡抵挡本回合伤害，下次你的回合开始时清空。残像、力量与遗物本场持续。药水不耗能量。</p></div><div>${icon("crown")}<h3>构筑</h3><p>15 层路线包含战斗、精英、事件、商店与营火。精英掉落遗物；营火休息或升级；商店可删牌。</p></div><div>${icon("eye")}<h3>推演</h3><p>悬停卡牌查看生命伤害、斩杀、破防、共鸣与承伤变化。生命跨战斗保留，存档自动记录每次行动。</p></div></div><div class="starter-tip">指向牌：点击选牌再点敌人，或拖向敌人。右键 / Esc 取消。群攻与自身技能无需选敌人。</div><button class="primary-button" data-close>开始规划 ${icon("chevron")}</button></div>`,
  );
}
function showSchools() {
  const descriptions = {
    blade: "易伤铺垫，多次攻击叠高终结伤害。",
    ember: "施加燃烧，选择等待灼烧或引爆收割。",
    aegis: "格挡与回复，把敌方意图化为安全窗口。",
    oracle: "零费过牌、补充能量，寻找关键组合。",
    gale: "低费攻击、多段命中，触发箭匣。",
    echo: "残像随攻击叠盾，架势强化下一击。",
  };
  openOverlay(
    "schools",
    `<div class="modal-card school-gallery">${closeButton}${modalHeading("SIX INKS / SIX WAYS", "六道星轨", "")}
    <div class="school-grid">${Object.entries(SCHOOLS)
      .map(
        ([key, s]) =>
          `<article style="--ink:${s.ink}"><img src="/art/${key}-clean.png" alt="${s.name}流派日漫卡面"/><h3>${s.name}</h3><p>${descriptions[key]}</p></article>`,
      )
      .join("")}</div></div>`,
  );
}
function showPause() {
  openOverlay(
    "pause",
    `<div class="modal-card small-modal">${modalHeading("BETWEEN TWO HEARTBEATS", "暂停", "进度已保存。")}<button class="primary-button" data-close>继续冒险</button><button class="text-button" data-landscapes>地图图鉴</button><button class="text-button" data-title>返回主菜单</button><button class="text-button" data-new-confirm>开启新的攀登</button></div>`,
  );
}
function showResult() {
  sound.finish(run.phase === "victory");
  openOverlay(
    "result",
    `<div class="modal-card result-modal"><div class="result-icon">${icon(run.phase === "victory" ? "crown" : "diamond")}</div>${modalHeading(run.phase === "victory" ? "ASCENSION COMPLETE" : "ANOTHER PATH AWAITS", run.phase === "victory" ? "通关" : "战败", run.phase === "victory" ? "荒星守望者陨落。你用每一次抉择，走到了塔顶。" : "调整路线与构筑，再次攀登。")}<div class="result-stats"><div><b>${run.floor + 1} / ${G.floors(run).length}</b><span>到达层数</span></div><div><b>${run.stats.cards}</b><span>打出卡牌</span></div><div><b>${run.stats.damage}</b><span>累计伤害</span></div><div><b>${run.stats.blocked}</b><span>规划抵挡</span></div></div><button class="primary-button" data-new>再次攀登 ${icon("reset")}</button></div>`,
  );
}
function showPhase() {
  if (run.phase === "blessing") showBlessing();
  else if (run.phase === "chest") showChest();
  else if (run.phase === "reward") showReward();
  else if (run.phase === "map") showMap();
  else if (run.phase === "camp") showCamp();
  else if (run.phase === "shop") showShop();
  else if (run.phase === "event") showEvent();
  else if (["victory", "defeat"].includes(run.phase)) showResult();
}
async function cardCloseup(card) {
  if (!motion) return;
  if (card.type === "attack" || card.target) {
    document.body.classList.add("attack-cinematic");
    const caption = document.createElement("div");
    caption.id = "attack-caption";
    caption.innerHTML = `<small>${HEROES.find((h) => h.id === card.hero).name}</small><strong>${card.name}</strong>`;
    document.body.append(caption);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    scene.resize();
    if (!card.cinematic) await scene.attackerCloseup(card);
    return;
  }
  const school = cardSchool(card);
  const panel = document.createElement("div");
  panel.id = "card-closeup";
  panel.style.setProperty("--ink", ACTOR_INKS[card.hero]);
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `<div class="cutin-slash"></div><div class="cutin-card">${cardHTML(card, "cinematic")}</div><div class="cutin-caption"><small>${school.name}</small><strong>${card.name}</strong><span>${card.cinematic ? "终式 / FINAL ACT" : "星轨展开 / CARD ACT"}</span></div>`;
  document.body.append(panel);
  scene.cameraCue(card.hero, "portrait");
  scene.setTempo(card.cinematic ? 0.1 : 0.18, "凝神时刻");
  const duration = (card.cinematic ? 950 : 390) / (fast ? 1.7 : 1);
  try {
    await panel.animate(
      [
        { opacity: 0, transform: "translateX(-80px) skewX(-6deg)" },
        { opacity: 1, transform: "translateX(0) skewX(0)", offset: 0.2 },
        {
          opacity: 1,
          transform: "translateX(12px) scale(1.035)",
          offset: 0.78,
        },
        { opacity: 0, transform: "translateX(95px) scale(1.07)" },
      ],
      { duration, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" },
    ).finished;
  } finally {
    panel.remove();
    scene.setTempo(1);
  }
}
const flowOptions = () => ({ motion, speed: fast ? 1.7 : 1, sound });
async function openingDeal() {
  if (run.phase !== "battle") return;
  busy = true;
  selected = null;
  hovered = null;
  render();
  try {
    await dealCards(run.battle.drawEvents, flowOptions(), true);
  } finally {
    busy = false;
    render();
    save();
  }
}
function newRun(hero) {
  if (!hero) {
    showCharacters();
    return;
  }
  sound.unlock();
  burstTrial = false;
  trialReturn = null;
  run = G.createRun(Date.now(), hero);
  resetScene();
  render();
  save();
  showBlessing();
}
function resetScene() {
  scene.setBiome(biomeLocation(run.floor, run.path[run.floor] || 0, run.seed));
  scene.activeHero = run.hero;
  for (const hero of HEROES) {
    const u = scene.units.get(hero.id);
    u.base.set(-3.2, 0, 0.3);
    u.group.scale.setScalar(1.2);
  }
  const enemies = G.alive(run);
  enemies.forEach((enemy, i) => {
    const u = scene.units.get(enemy.id);
    u.base.set(
      enemies.length === 1 ? 3.1 : 2.8 + i * 1.4,
      0,
      enemies.length === 1 ? 0.3 : -1.3 + i * 2.6,
    );
  });
  for (const u of scene.units.values()) {
    u.dead = false;
    u.group.visible = true;
    u.group.position.copy(u.base);
    if (u.body.userData.rig) scene.restorePose(u);
  }
  scene.resetCamera?.();
}
function mutate(fn, next = showPhase) {
  try {
    fn();
    sound.click();
    selected = null;
    hovered = null;
    render();
    save();
    next();
  } catch (error) {
    toast(error.message);
  }
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (suppressClick) return;
  if (el.dataset.card) selectCard(Number(el.dataset.card));
  if (el.dataset.target) targetClick(el.dataset.target);
  if (el.id === "ultimate-button") useCard("ultimate");
  if (el.id === "trial-control" || el.hasAttribute("data-burst-menu"))
    showBurstTrials();
  if (el.dataset.burstTrial) startBurstTrial(el.dataset.burstTrial);
  if (el.id === "confirm-card") useCard(selected);
  if (el.hasAttribute("data-close")) {
    if (overlay === "route-deck") showMap();
    else closeOverlay();
  }
  if (el.dataset.node !== undefined)
    mutate(
      () => {
        G.chooseNode(run, Number(el.dataset.node));
        resetScene();
        closeOverlay();
      },
      () => (run.phase === "battle" ? openingDeal() : showPhase()),
    );
  if (el.dataset.reward) mutate(() => G.takeReward(run, el.dataset.reward));
  if (el.hasAttribute("data-skip-reward"))
    mutate(() => G.takeReward(run, null));
  if (el.dataset.takeRelic)
    mutate(() => G.takeRelic(run, el.dataset.takeRelic));
  if (el.hasAttribute("data-leave-reward")) mutate(() => G.leaveReward(run));
  if (el.hasAttribute("data-rest")) mutate(() => G.camp(run, "rest"));
  if (el.hasAttribute("data-upgrade-menu")) showCamp(true);
  if (el.dataset.upgrade)
    mutate(() => G.camp(run, "upgrade", Number(el.dataset.upgrade)));
  if (el.hasAttribute("data-camp-back")) showCamp();
  if (el.dataset.event) mutate(() => G.eventChoice(run, el.dataset.event));
  if (el.dataset.buyCard) mutate(() => G.buy(run, "card", el.dataset.buyCard));
  if (el.dataset.buyRelic)
    mutate(() => G.buy(run, "relic", el.dataset.buyRelic));
  if (el.hasAttribute("data-buy-potion")) mutate(() => G.buy(run, "potion"));
  if (el.hasAttribute("data-remove-menu")) showShop(true);
  if (el.dataset.remove)
    mutate(() => G.buy(run, "remove", Number(el.dataset.remove)));
  if (el.hasAttribute("data-shop-back")) showShop();
  if (el.hasAttribute("data-leave-shop"))
    mutate(() => {
      run.phase = "map";
    });
  if (el.dataset.relicInfo) {
    const r = RELICS[el.dataset.relicInfo];
    toast(r.name + "：" + r.text);
  }
  if (el.hasAttribute("data-landscapes")) showLandscapes();
  if (el.dataset.biome) showLandscapes(el.dataset.biome);
  if (el.dataset.landscape) {
    const [id, variant] = el.dataset.landscape.split(":");
    showLandscapes(id, Number(variant));
  }
  if (el.hasAttribute("data-landscape-back")) leaveLandscapes();
  if (el.hasAttribute("data-new")) newRun();
  if (el.hasAttribute("data-route-deck")) {
    showDeck();
    overlay = "route-deck";
  }
  if (el.dataset.character) showCharacters(el.dataset.character);
  if (el.dataset.embark) newRun(el.dataset.embark);
  if (el.hasAttribute("data-title")) showTitle();
  if (el.dataset.blessing)
    mutate(() => G.chooseBlessing(run, el.dataset.blessing));
  if (el.hasAttribute("data-chest")) mutate(() => G.takeChest(run));
  if (el.hasAttribute("data-new-confirm"))
    openOverlay(
      "restart",
      `<div class="modal-card small-modal">${modalHeading("A NEW CONSTELLATION", "重新开启攀登？", "当前这一局会被新冒险替代。")}<button class="primary-button" data-new>开始新冒险</button><button class="text-button" data-close>保留当前进度</button></div>`,
    );
  if (el.hasAttribute("data-resume")) {
    burstTrial = false;
    trialReturn = null;
    run = structuredClone(saved);
    resetScene();
    closeOverlay();
    if (run.battle?.phase === "enemy" && run.phase === "battle") {
      for (const enemy of G.alive(run)) G.enemyAction(run, enemy.id);
      G.startPlayerTurn(run);
    }
    render();
    save();
    showPhase();
  }
});
const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
arrow.id = "target-arrow";
arrow.setAttribute("aria-hidden", "true");
arrow.style.display = "none";
arrow.innerHTML = `<defs><marker id="arrow-head" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1 L11 6 L1 11 L4 6 Z" fill="currentColor"/></marker></defs><path class="aim-outline"/><path class="aim-path" marker-end="url(#arrow-head)"/><circle r="17"/>`;
document.body.append(arrow);
document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || busy || overlay) return;
  const el = e.target.closest("[data-card]");
  if (el)
    dragCard = {
      uid: Number(el.dataset.card),
      x: e.clientX,
      y: e.clientY,
      active: false,
    };
});
document.addEventListener("pointermove", (e) => {
  if (busy || overlay) return;
  if (
    dragCard &&
    !dragCard.active &&
    e.pointerType === "touch" &&
    Math.abs(e.clientX - dragCard.x) > Math.abs(e.clientY - dragCard.y)
  )
    return;
  if (
    dragCard &&
    !dragCard.active &&
    Math.hypot(e.clientX - dragCard.x, e.clientY - dragCard.y) > 12
  ) {
    const c = run.battle.hand.find((c) => c.uid === dragCard.uid);
    if (
      !c ||
      cardData(c).cost > run.battle.energy ||
      cardData(c).type === "curse"
    ) {
      dragCard = null;
      return;
    }
    dragCard.active = true;
    selected = c.uid;
    render();
  }
  if (!selected) return;
  const target = enemyAt(e.clientX, e.clientY);
  if (target) {
    const p = scene.project(target, -1.1),
      host = $("#scene").getBoundingClientRect();
    aimPoint = { x: p.x + host.left, y: p.y + host.top };
    if (run.battle.target !== target) {
      run.battle.target = target;
      renderPreview();
    }
  } else aimPoint = { x: e.clientX, y: e.clientY };
  document
    .querySelectorAll("[data-target]")
    .forEach((el) =>
      el.classList.toggle("aimed", el.dataset.target === target),
    );
  updateAim();
});
document.addEventListener("pointerup", (e) => {
  if (!dragCard?.active) {
    dragCard = null;
    return;
  }
  const uid = dragCard.uid;
  dragCard = null;
  suppressClick = true;
  setTimeout(() => {
    suppressClick = false;
  }, 0);
  const c = cardData(run.battle.hand.find((c) => c.uid === uid));
  const target = enemyAt(e.clientX, e.clientY);
  if ((c.type === "attack" || c.target) && !c.all) {
    if (target) {
      run.battle.target = target;
      useCard(uid);
    } else {
      selected = null;
      render();
    }
  } else if (e.clientY < $("#hand").getBoundingClientRect().top) useCard(uid);
  else {
    selected = null;
    render();
  }
});
document.addEventListener("pointercancel", () => {
  dragCard = null;
  selected = null;
  updateAim();
});
document.addEventListener("contextmenu", (e) => {
  if (selected) {
    e.preventDefault();
    selected = null;
    aimPoint = null;
    render();
  }
});
$("#hand").addEventListener("pointerover", (e) => {
  const card = e.target.closest("[data-card]");
  if (card && !busy) {
    hovered = Number(card.dataset.card);
    renderPreview();
  }
});
$("#hand").addEventListener("pointerleave", () => {
  hovered = null;
  renderPreview();
});
$("#end-turn").onclick = endTurn;
$("#deck-button").onclick = () => !busy && showDeck();
$("#draw-pile").onclick = () => !busy && showDeck("draw");
$("#discard-pile").onclick = () => !busy && showDeck("discard");
$("#exhaust-pile").onclick = () => !busy && showDeck("exhaust");
$("#map-button").onclick = () => !busy && showMap(true);
$("#help").onclick = () => !busy && showHelp();
const artButton = document.createElement("button");
artButton.id = "school-gallery-button";
artButton.textContent = "流派";
artButton.setAttribute("aria-label", "查看六大流派卡面");
artButton.onclick = () => !busy && showSchools();
$(".tools").prepend(artButton);
const teamLabels = document.createElement("div");
teamLabels.id = "team-labels";
teamLabels.innerHTML = `<div class="team-sides"><span>我方</span><span>敌方</span></div>${HEROES.map((h) => `<span class="ally-label" id="ally-${h.id}">${h.name}</span>`).join("")}`;
$("#battle-stage").append(teamLabels);
$("#pause").onclick = () => {
  if (!busy) {
    save();
    showPause();
  }
};
$("#potion").onclick = () => {
  if (!busy)
    mutate(
      () => {
        const n = G.drinkPotion(run);
        float(run.hero, "+" + n, "#a8e8ad");
      },
      () => {},
    );
};
$("#sound").onclick = () => {
  sound.unlock();
  sound.enabled = !sound.enabled;
  $("#sound").innerHTML = icon(sound.enabled ? "sound" : "mute");
};
$("#motion").onclick = () => {
  motion = !motion;
  scene.motion = motion;
  $("#motion").classList.toggle("off", !motion);
  toast(motion ? "电影镜头已开启" : "镜头已固定，保留战斗特效");
};
$("#speed").onclick = () => {
  fast = !fast;
  scene.speed = fast ? 1.7 : 1;
  $("#speed").textContent = fast ? "1.7×" : "1×";
};
document.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (overlay) {
    if (
      e.key === "Escape" &&
      ["deck", "help", "schools", "pause", "map-view", "restart"].includes(
        overlay,
      )
    )
      closeOverlay();
    if (e.key === "Escape" && overlay === "route-deck") showMap();
    if (e.key === "Escape" && overlay === "landscapes") leaveLandscapes();
    if (e.key === "Tab") {
      const buttons = [
        ...$("#modal").querySelectorAll("button:not(:disabled)"),
      ];
      if (
        buttons.length &&
        ((e.shiftKey && document.activeElement === buttons[0]) ||
          (!e.shiftKey && document.activeElement === buttons.at(-1)))
      ) {
        e.preventDefault();
        (e.shiftKey ? buttons.at(-1) : buttons[0]).focus();
      }
    }
    return;
  }
  if (busy) return;
  if (e.key === "Escape") {
    if (selected) {
      selected = null;
      render();
    } else showPause();
  }
  if (e.key.toLowerCase() === "q") {
    e.preventDefault();
    useCard("ultimate");
  }
  if (e.key.toLowerCase() === "e") {
    e.preventDefault();
    endTurn();
  }
  if (e.key === "Enter" && selected) {
    e.preventDefault();
    useCard(selected);
  }
  if (e.key.toLowerCase() === "h") showHelp();
  if (/^[1-9]$/.test(e.key)) {
    const card = run.battle.hand[Number(e.key) - 1];
    if (card) selectCard(card.uid);
  }
});
resetScene();
render();
showTitle();

installCardTooltips();
