export const SCHOOLS = {
  blade: { name: "赤刃 · 连击", ink: "#C83232", image: "blade" },
  ember: { name: "焚印 · 引爆", ink: "#C65F38", image: "ember" },
  aegis: { name: "星幕 · 护盾", ink: "#2148B8", image: "aegis" },
  oracle: { name: "预见 · 过牌", ink: "#63365F", image: "oracle" },
  gale: { name: "掠风 · 连锁", ink: "#008A4B", image: "gale" },
  echo: { name: "残像 · 机动", ink: "#30343A", image: "echo" },
};
export function cardSchool(card) {
  const key = card.key;
  if (["ember", "detonate", "meteor", "siphon"].includes(key))
    return SCHOOLS.ember;
  if (["foresight", "focus", "nova", "frost"].includes(key))
    return SCHOOLS.oracle;
  if (["parry", "afterimage", "echo", "wound"].includes(key))
    return SCHOOLS.echo;
  return card.hero === "kael"
    ? SCHOOLS.blade
    : card.hero === "lyra"
      ? SCHOOLS.aegis
      : SCHOOLS.gale;
}
export function cardArt(card) {
  const school = cardSchool(card);
  return `<div class="card-illustration" style="--ink:${school.ink}"><img src="/art/${school.image}-clean.png" alt="" draggable="false" decoding="async"/><span class="school-mark">${school.name}</span></div>`;
}
export function cardSummary(c) {
  const parts = [];
  if (c.type === "curse") return "无法打出";
  if (c.damage)
    parts.push(
      `${c.all ? "全体" : ""}伤害 ${c.damage}${c.hits > 1 ? "×" + c.hits : ""}`,
    );
  if (c.block) parts.push(`格挡 ${c.block}`);
  if (c.draw) parts.push(`抽 ${c.draw}`);
  if (c.energy) parts.push(`能量 +${c.energy}`);
  if (c.heal) parts.push(`回复 ${c.heal}`);
  if (c.vulnerable) parts.push(`易伤 ${c.vulnerable}`);
  if (c.weak) parts.push(`虚弱 ${c.weak}`);
  if (c.burn) parts.push(`燃烧 ${c.burn}`);
  if (c.strength) parts.push(`力量 +${c.strength}`);
  if (c.afterimage) parts.push(`每次攻击获得 ${c.afterimage} 格挡`);
  if (c.nextAttack) parts.push(`下一击 +${c.nextAttack}`);
  if (c.finisher) parts.push(`本回合每次先前攻击 +${c.finisher}`);
  if (c.detonate) parts.push(`消耗燃烧，每层 +${c.detonate}`);
  if (c.pierce) parts.push("无视格挡");
  if (c.onKillEnergy) parts.push(`击杀：能量 +${c.onKillEnergy}`);
  return parts.join(" · ");
}
