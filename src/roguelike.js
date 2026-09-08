import { CARDS, RELICS, FLOORS, CHARACTERS, cardData } from "./data.js";
import { generateRoute } from "./route.js";
import { ELEMENT_MAX, ULTIMATES } from "./ultimates.js";
export { cardData };
export const alive = (s) => s.battle?.enemies.filter((e) => e.hp > 0) || [];
export function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export function shuffle(s, array) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function newCard(s, key) {
  return { uid: s.nextId++, key, upgraded: false };
}
export function createRun(seed = Date.now(), hero = "kael") {
  const character = CHARACTERS[hero];
  if (!character) throw new Error("无效角色");
  const s = {
    version: 3,
    hero,
    rng: seed >>> 0,
    seed: seed >>> 0,
    nextId: 1,
    phase: "blessing",
    floor: -1,
    path: [],
    hp: character.hp,
    maxHp: character.hp,
    gold: 99,
    relics: [character.relic],
    deck: [],
    battle: null,
    reward: null,
    shop: null,
    stats: {
      damage: 0,
      blocked: 0,
      resonances: 0,
      kills: 0,
      cards: 0,
      floors: 0,
    },
    history: [],
    potion: 1,
  };
  s.deck = character.deck.map((k) => newCard(s, k));
  s.map = generateRoute(() => random(s));
  return s;
}
export const floors = (s) => s.map || FLOORS;
export function availableNodes(s) {
  if (s.phase !== "map") return [];
  return s.floor < 0
    ? floors(s)[0].map((_, i) => i)
    : floors(s)[s.floor][s.path[s.floor]].next ||
        floors(s)[s.floor + 1]?.map((_, i) => i) ||
        [];
}
export function chooseBlessing(s, choice) {
  if (s.phase !== "blessing") throw new Error("祝福已选择");
  if (choice === "vitality") {
    s.maxHp += 7;
    s.hp += 7;
  } else if (choice === "gold") s.gold += 75;
  else if (choice === "relic") {
    s.hp -= 10;
    s.relics.push("shell");
  } else throw new Error("无效祝福");
  s.phase = "map";
}
export const cardPool = (s) =>
  Object.keys(CARDS).filter(
    (k) =>
      CARDS[k].hero === s.hero && !["基础", "诅咒"].includes(CARDS[k].rarity),
  );
const relicPool = (s) =>
  Object.keys(RELICS).filter(
    (k) => !RELICS[k].starter && !s.relics.includes(k),
  );
export function takeChest(s) {
  if (s.phase !== "chest") throw new Error("当前没有宝箱");
  if (s.chest) s.relics.push(s.chest);
  s.chest = null;
  s.phase = "map";
}
export function draw(s, n) {
  const b = s.battle;
  let count = 0;
  while (n-- > 0 && b.hand.length < 10) {
    let reshuffled = 0;
    if (!b.draw.length) {
      if (!b.discard.length) break;
      reshuffled = b.discard.length;
      b.draw = shuffle(s, b.discard);
      b.discard = [];
    }
    const card = b.draw.pop();
    b.hand.push(card);
    (b.drawEvents ??= []).push({
      uid: card.uid,
      remaining: b.draw.length,
      discard: b.discard.length,
      reshuffled,
    });
    count++;
  }
  return count;
}
function enemy(id, hp, strength = 0) {
  return {
    id,
    name:
      id === "warden" ? "荒星守望者" : id === "shard" ? "晶棘哨卫" : "虚空游灵",
    hp,
    maxHp: hp,
    block: 0,
    burn: 0,
    vulnerable: 0,
    weak: 0,
    stagger: false,
    strength,
    step: 0,
    intent: null,
  };
}
export function setIntents(s) {
  const b = s.battle;
  for (const e of alive(s)) {
    const scale = Math.floor(Math.max(0, s.floor) * 0.35),
      rage = e.id === "warden" && e.hp < e.maxHp / 2 ? 2 : 0;
    e.rage = !!rage;
    if (e.id === "shard")
      e.intent =
        e.step % 3 === 2
          ? { type: "defend", block: 12 + scale, label: "晶甲重塑" }
          : {
              type: "attack",
              damage: 6 + scale + e.strength,
              hits: e.step % 3 === 1 ? 2 : 1,
              label: e.step % 3 === 1 ? "双重刺击" : "晶棘突刺",
            };
    else if (e.id === "wisp")
      e.intent =
        e.step % 3 === 0
          ? {
              type: "debuff",
              weak: 1,
              damage: 3 + scale,
              hits: 1,
              label: "衰弱诅咒",
            }
          : e.step % 3 === 1
            ? {
                type: "attack",
                damage: 8 + scale + e.strength,
                hits: 1,
                label: "虚空射线",
              }
            : { type: "buff", strength: 2, block: 6, label: "虚空蓄力" };
    else {
      const pattern = e.step % 3;
      e.intent =
        pattern === 0
          ? {
              type: "attack",
              damage: (b.kind === "boss" ? 7 : 5) + scale + rage + e.strength,
              hits: 2,
              label: "双星重锤",
            }
          : pattern === 1
            ? {
                type: "defend",
                block: 18 + scale,
                strength: 2,
                label: "核心充能",
              }
            : {
                type: "attack",
                damage:
                  (b.kind === "boss" ? 18 : 12) + scale + e.strength + rage,
                hits: 1,
                label: "天穹崩落",
              };
    }
  }
}
export function startBattle(s, kind) {
  const f = s.floor;
  let enemies;
  if (kind === "boss") enemies = [enemy("warden", 210, 1)];
  else if (kind === "elite") enemies = [enemy("warden", 62 + f * 5)];
  else if (f === 0) enemies = [enemy("shard", 32)];
  else if (f < 3) enemies = [enemy(f % 2 ? "wisp" : "shard", 35 + f * 4)];
  else enemies = [enemy("shard", 28 + f * 2), enemy("wisp", 21 + f * 2)];
  s.phase = "battle";
  s.reward = null;
  s.battle = {
    kind,
    enemies,
    turn: 1,
    elementCharge: 0,
    phase: "player",
    energy: 3 + (s.relics.includes("capacitor") ? 1 : 0),
    maxEnergy: 3 + (s.relics.includes("capacitor") ? 1 : 0),
    block: s.relics.includes("shell") ? 10 : 0,
    strength: s.relics.includes("fang") ? 1 : 0,
    weak: 0,
    afterimage: 0,
    nextAttack: 0,
    attacks: 0,
    played: 0,
    skillDrawn: false,
    chain: [],
    resonances: 0,
    draw: shuffle(
      s,
      s.deck.map((c) => ({ ...c })),
    ),
    hand: [],
    drawEvents: [],
    discard: [],
    exhaust: [],
    powers: [],
    target: enemies[0].id,
    turnDamage: 0,
  };
  draw(s, s.relics.includes("capacitor") ? 4 : 5);
  setIntents(s);
}
export function damageValue(s, card, e) {
  const b = s.battle;
  let amount =
    (card.damage || 0) +
    b.strength +
    b.nextAttack +
    (card.finisher || 0) * b.attacks +
    (card.detonate || 0) * e.burn;
  if (b.weak) amount *= 0.75;
  if (e.vulnerable) amount *= 1.5;
  return Math.floor(amount);
}
export function hitEnemy(s, e, amount, pierce = false) {
  const oldBlock = e.block;
  const absorbed = pierce ? 0 : Math.min(e.block, amount);
  e.block -= absorbed;
  const damage = Math.min(e.hp, amount - absorbed);
  e.hp -= damage;
  s.stats.damage += damage;
  const broken = oldBlock > 0 && e.block === 0 && !pierce;
  if (broken) e.stagger = true;
  if (e.hp === 0) {
    s.stats.kills++;
    if (s.relics.includes("purse")) s.gold += 3;
  }
  return { id: e.id, amount, damage, absorbed, broken, dead: e.hp === 0 };
}
export function playCard(s, uid, targetId) {
  if (s.phase !== "battle" || s.battle.phase !== "player")
    throw new Error("当前无法出牌");
  const b = s.battle;
  const index = b.hand.findIndex((c) => c.uid === uid);
  if (index < 0) throw new Error("卡牌不在手牌中");
  const instance = b.hand[index],
    card = cardData(instance);
  if (card.type === "curse") throw new Error("创伤牌无法打出");
  if (card.cost > b.energy) throw new Error("能量不足");
  const targeted = card.type === "attack" || card.target;
  const target = alive(s).find((e) => e.id === (targetId || b.target));
  if (targeted && !target) throw new Error("请选择存活的敌人");
  b.drawEvents = [];
  const result = {
    card,
    targetId: target?.id,
    hits: [],
    block: 0,
    heal: 0,
    drawn: 0,
    resonance: false,
    chainBefore: [...b.chain],
    energy: 0,
    notes: [],
  };
  b.hand.splice(index, 1);
  b.energy -= card.cost;
  b.elementCharge = Math.min(
    ELEMENT_MAX,
    (b.elementCharge || 0) + Math.max(1, card.cost),
  );
  b.played++;
  s.stats.cards++;
  const targets = card.all ? alive(s) : targeted ? [target] : [];
  for (const e of targets) {
    if (card.type === "attack") {
      const damage = damageValue(s, card, e);
      for (let i = 0; i < (card.hits || 1) && e.hp > 0; i++)
        result.hits.push(hitEnemy(s, e, damage, card.pierce));
      if (card.detonate && e.burn) {
        result.notes.push(`引爆 ${e.burn} 层燃烧`);
        e.burn = 0;
      }
      if (e.hp === 0 && card.onKillEnergy) {
        b.energy += card.onKillEnergy;
        result.notes.push(`斩杀回能 +${card.onKillEnergy}`);
      }
    }
    if (e.hp > 0) {
      if (card.vulnerable) e.vulnerable += card.vulnerable;
      if (card.weak) e.weak += card.weak;
      if (card.burn)
        e.burn += card.burn + (s.relics.includes("candle") ? 2 : 0);
    }
  }
  if (card.type === "attack") {
    b.attacks++;
    if (s.relics.includes("quiver") && b.attacks % 3 === 0) {
      b.block += 5;
      result.block += 5;
      result.notes.push("逐风箭匣 · 格挡 +5");
    }
    b.nextAttack = 0;
    if (b.afterimage) {
      b.block += b.afterimage;
      result.block += b.afterimage;
      result.notes.push("风之残像");
    }
  }
  if (card.block) {
    b.block += card.block;
    result.block += card.block;
  }
  if (card.nextAttack) b.nextAttack += card.nextAttack;
  if (card.heal) {
    result.heal = Math.min(card.heal, s.maxHp - s.hp);
    s.hp += result.heal;
  }
  if (card.strength) b.strength += card.strength;
  if (card.afterimage) b.afterimage += card.afterimage;
  if (card.energy) {
    b.energy += card.energy;
    result.energy += card.energy;
  }
  if (card.draw) result.drawn += draw(s, card.draw);
  if (card.type === "skill" && s.relics.includes("starcore") && !b.skillDrawn) {
    b.skillDrawn = true;
    result.drawn += draw(s, 1);
    result.notes.push("星潮核心 · 抽 1");
  }
  if (s.relics.includes("mirror") && b.played === 3) {
    b.block += 6;
    result.block += 6;
  }
  if (s.relics.includes("prism") && b.played % 3 === 0) {
    if (b.resonances < 2) {
      b.resonances++;
      s.stats.resonances++;
      b.energy++;
      result.energy++;
      result.drawn += draw(s, 1);
      result.resonance = true;
    }
  }
  if (card.type === "power") b.powers.push(instance);
  else if (card.exhaust) b.exhaust.push(instance);
  else b.discard.push(instance);
  if (!alive(s).some((e) => e.id === b.target))
    b.target = alive(s)[0]?.id || null;
  if (!alive(s).length) {
    finishBattle(s);
    result.victory = true;
  }
  return result;
}
export function previewCard(s, uid, target) {
  const clone = structuredClone(s);
  try {
    const result = playCard(clone, uid, target);
    return {
      valid: true,
      result,
      state: clone,
      damage: result.hits.reduce((n, h) => n + h.damage, 0),
      blocked: result.hits.reduce((n, h) => n + h.absorbed, 0),
      incoming: incoming(clone),
    };
  } catch (e) {
    return { valid: false, reason: e.message };
  }
}
export function playUltimate(s) {
  if (s.phase !== "battle" || s.battle?.phase !== "player" || !alive(s).length)
    throw new Error("当前无法释放");
  const b = s.battle,
    card = ULTIMATES[s.hero];
  if ((b.elementCharge || 0) < ELEMENT_MAX) throw new Error("元素尚未蓄满");
  const result = {
    card,
    targetId: b.target,
    hits: [],
    block: 0,
    heal: 0,
    drawn: 0,
    energy: 0,
    notes: [],
    resonance: false,
  };
  b.elementCharge = 0;
  b.drawEvents = [];
  for (const e of alive(s)) {
    const damage = damageValue(s, card, e);
    for (let i = 0; i < (card.hits || 1) && e.hp > 0; i++)
      result.hits.push(hitEnemy(s, e, damage));
    if (e.hp > 0 && card.burn) e.burn += card.burn;
  }
  b.nextAttack = 0;
  if (card.block) {
    b.block += card.block;
    result.block = card.block;
  }
  s.stats.ultimates = (s.stats.ultimates || 0) + 1;
  if (!alive(s).some((e) => e.id === b.target))
    b.target = alive(s)[0]?.id || null;
  if (!alive(s).length) {
    finishBattle(s);
    result.victory = true;
  }
  return result;
}
export function previewUltimate(s) {
  const clone = structuredClone(s);
  try {
    const result = playUltimate(clone);
    return {
      valid: true,
      result,
      state: clone,
      damage: result.hits.reduce((n, h) => n + h.damage, 0),
      incoming: incoming(clone),
    };
  } catch (e) {
    return { valid: false, reason: e.message };
  }
}
export function incoming(s) {
  if (!s.battle) return { total: 0, hpLoss: 0, block: 0 };
  const total = alive(s)
    .filter((e) => e.hp > e.burn)
    .reduce((sum, e) => {
      const i = e.intent;
      if (!i.damage) return sum;
      return (
        sum +
        Math.floor(i.damage * (e.weak ? 0.75 : 1) * (e.stagger ? 0.5 : 1)) *
          (i.hits || 1)
      );
    }, 0);
  return {
    total,
    block: Math.min(total, s.battle.block),
    hpLoss: Math.max(0, total - s.battle.block),
  };
}
export function beginEnemyTurn(s) {
  if (s.phase !== "battle" || s.battle.phase !== "player")
    throw new Error("当前不能结束回合");
  const b = s.battle;
  b.phase = "enemy";
  b.discard.push(...b.hand);
  b.hand = [];
  b.weak = Math.max(0, b.weak - 1);
  const hits = [];
  for (const e of alive(s)) {
    if (e.burn) {
      hits.push(hitEnemy(s, e, e.burn, true));
      e.burn = Math.max(0, e.burn - 1);
    }
  }
  if (!alive(s).length) finishBattle(s);
  return hits;
}
export function enemyAction(s, id) {
  if (s.phase !== "battle" || s.battle.phase !== "enemy")
    throw new Error("不是敌方回合");
  const b = s.battle,
    e = alive(s).find((e) => e.id === id);
  if (!e) return null;
  const intent = e.intent;
  const result = { id, hits: [], block: 0, intent, perfect: false };
  e.block = 0;
  if (intent.damage) {
    const amount = Math.floor(
      intent.damage * (e.weak ? 0.75 : 1) * (e.stagger ? 0.5 : 1),
    );
    for (let i = 0; i < (intent.hits || 1) && s.hp > 0; i++) {
      const blocked = Math.min(b.block, amount);
      b.block -= blocked;
      const loss = Math.min(s.hp, amount - blocked);
      s.hp -= loss;
      b.turnDamage += loss;
      s.stats.blocked += blocked;
      result.hits.push({ amount, blocked, damage: loss });
    }
    result.perfect = result.hits.every((h) => h.damage === 0);
  }
  if (intent.block) {
    e.block = intent.block;
    result.block = intent.block;
  }
  if (intent.strength) e.strength += intent.strength;
  if (intent.weak) b.weak += intent.weak;
  e.vulnerable = Math.max(0, e.vulnerable - 1);
  e.weak = Math.max(0, e.weak - 1);
  e.stagger = false;
  e.step++;
  if (s.hp <= 0) {
    s.phase = "defeat";
    b.phase = "ended";
  }
  return result;
}
export function startPlayerTurn(s) {
  if (s.phase !== "battle" || s.battle.phase !== "enemy") return;
  const b = s.battle;
  b.drawEvents = [];
  b.turn++;
  b.phase = "player";
  b.block = 0;
  b.energy = b.maxEnergy;
  b.nextAttack = 0;
  b.attacks = 0;
  b.played = 0;
  b.skillDrawn = false;
  b.chain = [];
  b.resonances = 0;
  b.turnDamage = 0;
  draw(s, s.relics.includes("capacitor") ? 4 : 5);
  setIntents(s);
}
export function finishBattle(s) {
  if (s.phase !== "battle" || alive(s).length) throw new Error("战斗尚未结束");
  s.stats.floors++;
  if (s.relics.includes("feather")) s.hp = Math.min(s.maxHp, s.hp + 5);
  if (s.relics.includes("emberheart")) s.hp = Math.min(s.maxHp, s.hp + 6);
  s.battle.phase = "ended";
  if (s.battle.kind === "boss") {
    s.phase = "victory";
    return;
  }
  const gold =
    (s.battle.kind === "elite" ? 50 : 25) +
    s.floor * 4 +
    (s.relics.includes("purse") ? 20 : 0);
  s.gold += gold;
  s.phase = "reward";
  const pool = cardPool(s);
  s.reward = {
    gold,
    cards: shuffle(s, pool).slice(0, 3),
    relics:
      s.battle.kind === "elite" ? shuffle(s, relicPool(s)).slice(0, 2) : [],
    cardTaken: false,
    relicTaken: false,
  };
}
export function takeReward(s, key) {
  if (s.phase !== "reward" || s.reward.cardTaken)
    throw new Error("无法领取卡牌");
  if (key && !s.reward.cards.includes(key)) throw new Error("无效奖励");
  if (key) s.deck.push(newCard(s, key));
  s.reward.cardTaken = true;
}
export function takeRelic(s, key) {
  if (
    s.phase !== "reward" ||
    s.reward.relicTaken ||
    !s.reward.relics.includes(key)
  )
    throw new Error("无效遗物");
  s.relics.push(key);
  s.reward.relicTaken = true;
}
export function leaveReward(s) {
  if (
    s.phase !== "reward" ||
    !s.reward.cardTaken ||
    (s.reward.relics.length && !s.reward.relicTaken)
  )
    throw new Error("先选择奖励或跳过卡牌");
  s.phase = "map";
}
export function chooseNode(s, column) {
  if (s.phase !== "map") throw new Error("当前不在路线图");
  const next = s.floor + 1,
    node = floors(s)[next]?.[column];
  if (!node || !availableNodes(s).includes(column))
    throw new Error("路线未相连");
  s.floor = next;
  s.path.push(column);
  s.history.push(node.name);
  if (["battle", "elite", "boss"].includes(node.type))
    startBattle(s, node.type);
  else {
    s.phase = node.type;
    if (node.type === "chest") s.chest = shuffle(s, relicPool(s))[0] || null;
    if (node.type === "shop") {
      const pool = cardPool(s);
      s.shop = {
        cards: shuffle(s, pool).slice(0, 3),
        relic: shuffle(s, relicPool(s))[0],
        bought: [],
        removed: false,
      };
    }
  }
}
export function camp(s, action, uid) {
  if (s.phase !== "camp") throw new Error("当前不在营火");
  if (action === "rest")
    s.hp = Math.min(s.maxHp, s.hp + Math.ceil(s.maxHp * 0.3));
  else if (action === "upgrade") {
    const c = s.deck.find(
      (c) => c.uid === uid && !c.upgraded && c.key !== "wound",
    );
    if (!c) throw new Error("请选择未升级的卡牌");
    c.upgraded = true;
  } else throw new Error("无效营火行动");
  s.phase = "map";
}
export function eventChoice(s, action) {
  if (s.phase !== "event") throw new Error("当前不在事件");
  if (action === "blood") {
    if (s.hp <= 12) throw new Error("需要至少 13 生命");
    s.hp -= 12;
    s.deck.push(
      newCard(s, { kael: "meteor", lyra: "nova", syl: "volley" }[s.hero]),
    );
  } else if (action === "curse") {
    s.gold += 85;
    s.deck.push(newCard(s, "wound"));
  } else if (action === "leave") {
    s.hp = Math.min(s.maxHp, s.hp + 5);
  } else throw new Error("无效事件选项");
  s.phase = "map";
}
export function buy(s, kind, value) {
  if (s.phase !== "shop") throw new Error("当前不在商店");
  const prices = { card: 55, relic: 95, remove: 45, potion: 35 };
  const cost = prices[kind];
  if (cost === undefined || s.gold < cost) throw new Error("金币不足");
  if (kind === "card") {
    if (!s.shop.cards.includes(value) || s.shop.bought.includes(value))
      throw new Error("该卡牌已售出");
    s.deck.push(newCard(s, value));
    s.shop.bought.push(value);
  } else if (kind === "relic") {
    if (value !== s.shop.relic || s.relics.includes(value))
      throw new Error("遗物已售出");
    s.relics.push(value);
  } else if (kind === "remove") {
    const index = s.deck.findIndex((c) => c.uid === value);
    if (index < 0 || s.shop.removed || s.deck.length <= 5)
      throw new Error("无法移除此牌");
    s.deck.splice(index, 1);
    s.shop.removed = true;
  } else {
    if (s.potion >= 3) throw new Error("最多携带 3 瓶");
    s.potion++;
  }
  s.gold -= cost;
}
export function drinkPotion(s) {
  if (s.phase !== "battle" || s.battle.phase !== "player" || s.potion <= 0)
    throw new Error("无法使用药水");
  const healed = Math.min(20, s.maxHp - s.hp);
  if (!healed) throw new Error("生命已满");
  s.potion--;
  s.hp += healed;
  return healed;
}
