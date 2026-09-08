import * as G from "../src/roguelike.js";
import { cardData } from "../src/data.js";
function choices(s) {
  const list = [];
  for (const card of s.battle.hand) {
    const c = cardData(card);
    const targets =
      c.type === "attack" || c.target
        ? G.alive(s).map((e) => e.id)
        : [s.battle.target];
    for (const target of targets) {
      const p = G.previewCard(s, card.uid, target);
      if (!p.valid) continue;
      const before = G.incoming(s),
        after = p.incoming;
      let score =
        p.damage * 0.95 +
        (before.hpLoss - after.hpLoss) * 1.6 +
        p.result.drawn * 2.5 +
        p.result.energy * 5 +
        p.result.block * 0.1 +
        p.result.heal * 2 +
        (p.result.resonance ? 5 : 0);
      if (c.strength) score += c.strength * 8;
      if (c.afterimage) score += c.afterimage * 4;
      if (c.vulnerable)
        score += G.alive(s).find((e) => e.id === target).hp > 15 ? 4 : 0;
      if (c.burn) score += c.burn * 2;
      if (c.weak) score += 3;
      score -= c.cost * 1.5;
      list.push({ uid: card.uid, target, p, score });
    }
  }
  return list;
}
function fight(s) {
  let turns = 0;
  while (s.phase === "battle" && turns++ < 45) {
    let plays = 0;
    while (s.phase === "battle" && plays++ < 25) {
      const options = choices(s);
      if (!options.length) break;
      for (const opt of options) {
        if (opt.p.state.phase === "battle") {
          const next = choices(opt.p.state);
          opt.score +=
            (next.length ? Math.max(...next.map((x) => x.score)) : 0) * 0.7;
        }
      }
      options.sort((a, b) => b.score - a.score);
      if (options[0].score < 0.5) break;
      G.playCard(s, options[0].uid, options[0].target);
    }
    if (s.phase !== "battle") break;
    if (s.hp < 35 && s.potion) G.drinkPotion(s);
    G.beginEnemyTurn(s);
    if (s.phase !== "battle") break;
    for (const e of [...G.alive(s)]) {
      if (s.phase !== "battle") break;
      G.enemyAction(s, e.id);
    }
    G.startPlayerTurn(s);
  }
  return turns;
}
const results = [];
for (const hero of ["kael", "lyra", "syl"])
  for (let seed = 1; seed <= 4; seed++) {
    const s = G.createRun(seed, hero);
    G.chooseBlessing(s, "vitality");
    let steps = 0;
    while (!["victory", "defeat"].includes(s.phase)) {
      if (++steps > 100) throw Error("Flow stalled: " + s.phase);
      if (s.phase === "battle") fight(s);
      else if (s.phase === "reward") {
        const priorities = [
          "strength",
          "afterimage",
          "mend",
          "ember",
          "brand",
          "focus",
          "nova",
          "volley",
          "parry",
          "fortress",
          "detonate",
          "foresight",
          "echo",
        ];
        const key = [...s.reward.cards].sort(
          (a, b) =>
            (priorities.indexOf(a) < 0 ? 99 : priorities.indexOf(a)) -
            (priorities.indexOf(b) < 0 ? 99 : priorities.indexOf(b)),
        )[0];
        G.takeReward(s, key);
        if (s.reward.relics.length) G.takeRelic(s, s.reward.relics[0]);
        G.leaveReward(s);
      } else if (s.phase === "map") {
        const priorities =
          s.hp < s.maxHp * 0.7
            ? ["camp", "event", "chest", "shop", "battle", "elite", "boss"]
            : ["chest", "event", "camp", "battle", "shop", "elite", "boss"];
        const next = G.availableNodes(s).sort(
          (a, b) =>
            priorities.indexOf(s.map[s.floor + 1][a].type) -
            priorities.indexOf(s.map[s.floor + 1][b].type),
        )[0];
        G.chooseNode(s, next);
      } else if (s.phase === "chest") G.takeChest(s);
      else if (s.phase === "shop") {
        if (s.gold >= 95 && s.shop.relic) G.buy(s, "relic", s.shop.relic);
        if (s.gold >= 55) G.buy(s, "card", s.shop.cards[0]);
        s.phase = "map";
      } else if (s.phase === "event")
        G.eventChoice(
          s,
          s.hp > 50 &&
            !s.deck.some((c) => ["meteor", "nova", "volley"].includes(c.key))
            ? "blood"
            : "leave",
        );
      else if (s.phase === "camp") {
        if (s.hp < s.maxHp * 0.7) G.camp(s, "rest");
        else {
          const card =
            s.deck.find((c) => c.key === "meteor" && !c.upgraded) ||
            s.deck.find((c) => !c.upgraded);
          G.camp(s, "upgrade", card.uid);
        }
      } else throw Error("Unhandled " + s.phase);
    }
    results.push({
      hero,
      seed,
      result: s.phase,
      floor: s.floor + 1,
      hp: s.hp,
      damage: s.stats.damage,
      resonances: s.stats.resonances,
    });
  }
console.table(results);
console.log(
  "Wins",
  results.filter((r) => r.result === "victory").length + "/" + results.length,
);
