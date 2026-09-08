import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/roguelike.js";
import { CHARACTERS, CARDS, RELICS, cardData } from "../src/data.js";
import { bladeRibbon } from "../src/blade-ribbon.js";
test("刀缝两端收尖，中间最宽且保持狭长轮廓", () => {
  const { positions, indices } = bladeRibbon();
  const widths = [];
  for (let i = 0; i < positions.length; i += 6)
    widths.push(positions[i + 4] - positions[i + 1]);
  assert.equal(widths[0], 0);
  assert.equal(widths.at(-1), 0);
  assert.equal(Math.max(...widths), widths[(widths.length - 1) / 2]);
  assert.ok(widths[1] < Math.max(...widths) * 0.02);
  const length = positions.at(-6) - positions[0];
  assert.ok(length / Math.max(...widths) > 20);
  assert.ok(positions.every(Number.isFinite));
  assert.ok(
    indices.every((index) => index >= 0 && index < positions.length / 3),
  );
});
function combat(hero = "kael", seed = 123) {
  const s = G.createRun(seed, hero);
  G.chooseBlessing(s, "gold");
  G.chooseNode(s, 0);
  return s;
}
function hand(s, keys) {
  s.battle.hand = keys.map((key) => G.newCard(s, key));
  s.battle.energy = 20;
  return s.battle.hand;
}
const play = (s, key, target = "shard") =>
  G.playCard(s, s.battle.hand.find((c) => c.key === key).uid, target);
function win(s) {
  s.battle.enemies.forEach((e) => (e.hp = 0));
  G.finishBattle(s);
}

test("开始前没有战斗：角色、遗物、独立牌组与祝福就绪", () => {
  for (const hero of Object.keys(CHARACTERS)) {
    const s = G.createRun(3, hero),
      c = CHARACTERS[hero];
    assert.equal(s.phase, "blessing");
    assert.equal(s.floor, -1);
    assert.equal(s.battle, null);
    assert.equal(s.hp, c.hp);
    assert.equal(s.gold, 99);
    assert.deepEqual(s.relics, [c.relic]);
    assert.deepEqual(
      s.deck.map((c) => c.key),
      c.deck,
    );
    assert.ok(s.deck.every((c) => cardData(c).hero === hero));
    assert.throws(() => G.chooseNode(s, 0));
    assert.throws(() => G.createRun(3, "missing"));
  }
});
test("剑士基础数值与标准初始牌组", () => {
  const s = G.createRun(1);
  assert.equal(s.hp, 80);
  assert.equal(s.deck.filter((c) => c.key === "strike").length, 5);
  assert.equal(CARDS.strike.damage, 6);
  assert.equal(CARDS.kaelGuard.block, 5);
  assert.equal(CARDS.brand.cost, 2);
  assert.equal(CARDS.brand.damage, 8);
});
test("祝福只可领取一次，三种选择均生效且不先开战", () => {
  for (const choice of ["vitality", "gold", "relic"]) {
    const s = G.createRun(2);
    G.chooseBlessing(s, choice);
    assert.equal(s.phase, "map");
    assert.equal(s.battle, null);
    assert.throws(() => G.chooseBlessing(s, choice));
    if (choice === "vitality") assert.equal(s.hp, 87);
    if (choice === "gold") assert.equal(s.gold, 174);
    if (choice === "relic") {
      assert.equal(s.hp, 70);
      assert.ok(s.relics.includes("shell"));
    }
  }
});
test("路线同种子复现、不同种子变化，节点无死路，不能跨越未连线路径", () => {
  const a = G.createRun(1),
    b = G.createRun(1),
    c = G.createRun(2);
  assert.deepEqual(a.map, b.map);
  assert.notDeepEqual(a.map, c.map);
  assert.equal(a.map.length, 15);
  a.map.slice(0, -1).forEach((row, f) =>
    row.forEach((n) => {
      assert.ok(n.next.length > 0);
      n.next.forEach((i) => assert.ok(a.map[f + 1][i]));
    }),
  );
  G.chooseBlessing(a, "gold");
  assert.deepEqual(G.availableNodes(a), [0, 1, 2]);
  G.chooseNode(a, 0);
  a.phase = "map";
  const before = JSON.stringify(a);
  assert.throws(() => G.chooseNode(a, 2), /相连/);
  assert.equal(JSON.stringify(a), before);
  G.chooseNode(a, 1);
  assert.equal(a.floor, 1);
});
test("首战仅一名敌人、三能量、随机五张手牌且牌堆守恒", () => {
  for (const hero of Object.keys(CHARACTERS)) {
    const s = combat(hero);
    assert.equal(G.alive(s).length, 1);
    assert.equal(s.battle.energy, 3);
    assert.equal(s.battle.hand.length, 5);
    assert.equal(
      new Set([...s.battle.hand, ...s.battle.draw].map((c) => c.uid)).size,
      s.deck.length,
    );
    assert.equal(s.battle.drawEvents.length, 5);
  }
  assert.deepEqual(combat(), combat());
  assert.notDeepEqual(
    combat("kael", 1).battle.hand,
    combat("kael", 2).battle.hand,
  );
});
test("首次遭遇之后难度渐进，精英、领主有独立战斗", () => {
  const s = combat();
  s.floor = 1;
  G.startBattle(s, "battle");
  assert.equal(G.alive(s).length, 1);
  s.floor = 3;
  G.startBattle(s, "battle");
  assert.equal(G.alive(s).length, 2);
  G.startBattle(s, "elite");
  assert.equal(s.battle.enemies[0].id, "warden");
  s.floor = 14;
  G.startBattle(s, "boss");
  assert.equal(s.battle.kind, "boss");
});
test("抽牌洗回弃牌堆且不复制、不丢牌", () => {
  const s = combat(),
    b = s.battle;
  b.discard = b.draw.splice(0, 4);
  b.drawEvents = [];
  G.draw(s, 3);
  assert.deepEqual(
    b.drawEvents.map((e) => e.reshuffled),
    [0, 4, 0],
  );
  assert.equal(
    new Set([...b.hand, ...b.draw, ...b.discard].map((c) => c.uid)).size,
    10,
  );
});
test("预览完整复现结果，绝不修改真实存档与随机序列", () => {
  const s = combat("lyra");
  hand(s, ["foresight"]);
  const before = JSON.stringify(s),
    uid = s.battle.hand[0].uid,
    p = G.previewCard(s, uid);
  assert.equal(p.valid, true);
  assert.equal(JSON.stringify(s), before);
  G.playCard(s, uid);
  assert.deepEqual(s, p.state);
});
test("不足能量、无效目标、非战斗状态均拒绝出牌且无副作用", () => {
  const s = combat();
  hand(s, ["brand"]);
  s.battle.energy = 1;
  let before = JSON.stringify(s);
  assert.throws(() => play(s, "brand"), /能量/);
  assert.equal(JSON.stringify(s), before);
  s.battle.energy = 3;
  before = JSON.stringify(s);
  assert.throws(() => play(s, "brand", "kael"), /敌人/);
  assert.equal(JSON.stringify(s), before);
  s.phase = "map";
  assert.throws(() => play(s, "brand"));
});
test("指向技能施加状态而不造成攻击伤害", () => {
  const s = combat("lyra");
  hand(s, ["frost"]);
  const hp = s.battle.enemies[0].hp;
  play(s, "frost");
  assert.equal(s.battle.enemies[0].hp, hp);
  assert.equal(s.battle.enemies[0].weak, 2);
  assert.equal(s.battle.enemies[0].vulnerable, 1);
});
test("易伤按基础伤害乘1.5，终结按之前的攻击次数加成", () => {
  const s = combat();
  s.battle.enemies[0].hp = 200;
  hand(s, ["brand", "strike", "finisher"]);
  play(s, "brand");
  assert.equal(play(s, "strike").hits[0].amount, 9);
  assert.equal(play(s, "finisher").hits[0].amount, 30);
});
test("剑士遗物每次胜利回血6，仅生效一次", () => {
  const s = combat();
  s.hp = 60;
  win(s);
  assert.equal(s.hp, 66);
  assert.throws(() => G.finishBattle(s));
  assert.equal(s.hp, 66);
});
test("术师遗物每回合仅首次技能抽1，下回合重置", () => {
  const s = combat("lyra");
  hand(s, ["guard", "guard"]);
  assert.equal(play(s, "guard").drawn, 1);
  assert.equal(play(s, "guard").drawn, 0);
  G.beginEnemyTurn(s);
  G.enemyAction(s, "shard");
  G.startPlayerTurn(s);
  hand(s, ["guard"]);
  assert.equal(play(s, "guard").drawn, 1);
});
test("游侠箭匣按攻击卡计数，多段攻击不重复计数", () => {
  const s = combat("syl");
  s.battle.enemies[0].hp = 200;
  hand(s, ["volley", "arrow", "arrow"]);
  play(s, "volley");
  play(s, "arrow");
  assert.equal(s.battle.block, 0);
  play(s, "arrow");
  assert.equal(s.battle.block, 5);
});
test("通用遗物共鸣不再依赖三名主角，镜片不依赖星棱", () => {
  const s = combat();
  s.relics.push("prism", "mirror");
  hand(s, ["kaelGuard", "kaelGuard", "kaelGuard"]);
  play(s, "kaelGuard");
  play(s, "kaelGuard");
  const r = play(s, "kaelGuard");
  assert.equal(r.resonance, true);
  assert.equal(r.energy, 1);
  assert.equal(r.drawn, 1);
  assert.equal(s.battle.block, 21);
});
test("力量逐段加成、残像按攻击卡叠盾、能力不进入弃牌堆", () => {
  const s = combat("syl");
  s.battle.enemies[0].hp = 200;
  hand(s, ["strength", "afterimage", "volley"]);
  play(s, "strength");
  play(s, "afterimage");
  const r = play(s, "volley");
  assert.deepEqual(
    r.hits.map((h) => h.amount),
    [6, 6, 6],
  );
  assert.equal(r.block, 3);
  assert.equal(s.battle.powers.length, 2);
});
test("燃烧越过格挡，敌人出手前斩杀并进入奖励", () => {
  const s = combat();
  const e = s.battle.enemies[0];
  e.hp = 3;
  e.burn = 4;
  e.block = 40;
  assert.equal(G.incoming(s).total, 0);
  G.beginEnemyTurn(s);
  assert.equal(e.hp, 0);
  assert.equal(e.block, 40);
  assert.equal(s.phase, "reward");
});
test("引爆消耗燃烧，贯穿不扣盾，破防降低本轮攻击", () => {
  const s = combat();
  const e = s.battle.enemies[0];
  e.hp = 200;
  e.burn = 5;
  hand(s, ["detonate", "pierce", "strike"]);
  assert.equal(play(s, "detonate").hits[0].amount, 21);
  assert.equal(e.burn, 0);
  e.block = 20;
  assert.equal(play(s, "pierce").hits[0].damage, 10);
  assert.equal(e.block, 20);
  e.block = 3;
  play(s, "strike");
  assert.equal(e.stagger, true);
});
test("结束回合弃牌、敌方执行意图、清空格挡并重抽五张", () => {
  const s = combat();
  s.battle.block = 4;
  G.beginEnemyTurn(s);
  assert.equal(s.battle.hand.length, 0);
  const r = G.enemyAction(s, "shard");
  assert.equal(r.hits[0].blocked, 4);
  assert.equal(s.hp, 78);
  G.startPlayerTurn(s);
  assert.equal(s.battle.turn, 2);
  assert.equal(s.battle.block, 0);
  assert.equal(s.battle.energy, 3);
  assert.equal(s.battle.hand.length, 5);
});
test("奖励与商店只提供所选角色牌，精英遗物无初始遗物", () => {
  for (const hero of Object.keys(CHARACTERS)) {
    const s = combat(hero);
    win(s);
    assert.equal(s.reward.cards.length, 3);
    assert.ok(s.reward.cards.every((k) => CARDS[k].hero === hero));
    G.takeReward(s, null);
    G.leaveReward(s);
    s.map[1][0].type = "shop";
    G.chooseNode(s, 0);
    assert.ok(s.shop.cards.every((k) => CARDS[k].hero === hero));
    assert.ok(!RELICS[s.shop.relic].starter);
    s.floor = 3;
    G.startBattle(s, "elite");
    win(s);
    assert.equal(s.reward.relics.length, 2);
    assert.ok(s.reward.relics.every((k) => !RELICS[k].starter));
  }
});
test("奖励可跳过，领取不可重复，遗物先领取才能离开", () => {
  const s = combat();
  G.startBattle(s, "elite");
  win(s);
  const size = s.deck.length;
  G.takeReward(s, null);
  assert.equal(s.deck.length, size);
  assert.throws(() => G.takeReward(s, null));
  assert.throws(() => G.leaveReward(s));
  G.takeRelic(s, s.reward.relics[0]);
  assert.throws(() => G.takeRelic(s, s.reward.relics[0]));
  G.leaveReward(s);
  assert.equal(s.phase, "map");
});
test("宝箱、营火、商店、事件均可返回地图", () => {
  const s = combat();
  s.phase = "map";
  s.map[1][0].type = "chest";
  G.chooseNode(s, 0);
  const key = s.chest;
  G.takeChest(s);
  assert.ok(s.relics.includes(key));
  assert.throws(() => G.takeChest(s));
  s.phase = "camp";
  G.camp(s, "upgrade", s.deck[0].uid);
  assert.equal(cardData(s.deck[0]).damage, 9);
  s.phase = "event";
  const hp = s.hp;
  G.eventChoice(s, "blood");
  assert.equal(s.hp, hp - 12);
  assert.equal(s.deck.at(-1).key, "meteor");
  s.phase = "shop";
  s.shop = { cards: ["ember"], relic: "fang", bought: [], removed: false };
  s.gold = 300;
  G.buy(s, "card", "ember");
  assert.equal(s.gold, 245);
  assert.throws(() => G.buy(s, "card", "ember"));
  G.buy(s, "remove", s.deck[1].uid);
  assert.throws(() => G.buy(s, "remove", s.deck[2].uid));
  s.phase = "camp";
  s.hp = 20;
  G.camp(s, "rest");
  assert.equal(s.hp, 44);
});
test("药水与失败、领主胜利完整结算", () => {
  const s = combat();
  assert.throws(() => G.drinkPotion(s));
  s.hp = 30;
  G.drinkPotion(s);
  assert.equal(s.hp, 50);
  assert.equal(s.potion, 0);
  s.hp = 1;
  G.beginEnemyTurn(s);
  G.enemyAction(s, "shard");
  assert.equal(s.phase, "defeat");
  const w = combat();
  w.floor = 14;
  G.startBattle(w, "boss");
  win(w);
  assert.equal(w.phase, "victory");
});
test("祝福、地图、战斗、奖励存档均可精确恢复", () => {
  const s = G.createRun(19, "lyra");
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  G.chooseBlessing(s, "vitality");
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  G.chooseNode(s, 1);
  const restored = JSON.parse(JSON.stringify(s));
  const c = s.battle.hand.find((c) => cardData(c).cost <= 3);
  G.playCard(s, c.uid, "shard");
  G.playCard(restored, c.uid, "shard");
  assert.deepEqual(s, restored);
  if (s.phase === "battle") win(s);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});
test("消耗牌只退出本场战斗，下一场恢复；诅咒不可打出", () => {
  const s = combat("syl");
  hand(s, ["quick", "wound"]);
  play(s, "quick");
  assert.equal(s.battle.exhaust.length, 1);
  assert.throws(() => play(s, "wound"), /无法打出/);
  G.startBattle(s, "battle");
  assert.equal(s.battle.exhaust.length, 0);
  assert.equal(
    [...s.battle.hand, ...s.battle.draw].filter((c) => c.key === "quick")
      .length,
    1,
  );
});
test("群攻结算多个敌人并进入奖励，无法对死去目标出牌", () => {
  const s = combat("lyra");
  s.floor = 3;
  G.startBattle(s, "battle");
  hand(s, ["nova", "sparkshot"]);
  s.battle.enemies.forEach((e) => (e.hp = 10));
  const r = play(s, "nova");
  assert.equal(r.hits.length, 2);
  assert.equal(s.phase, "reward");
  assert.throws(() => play(s, "sparkshot"));
});
