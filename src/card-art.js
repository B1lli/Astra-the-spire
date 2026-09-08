import { CARDS } from "./data.js";
import { ACTOR_INKS } from "./actor-ink.js";

export const CARD_ART = Object.freeze(
  Object.fromEntries(Object.keys(CARDS).map((key) => [key, `/art/cards/${key}.png`])),
);

// Keep the action point visible in the shallow hand/deck illustration window.
const ART_FOCUS = {
  strike: "50% 20%",
  guard: "50% 25%",
  brand: "50% 85%",
  finisher: "50% 20%",
  meteor: "50% 25%",
  strength: "50% 20%",
  fortress: "50% 85%",
};

export const SCHOOLS = {
  blade: { name: "赤刃 · 连击", ink: "#C83232", image: "blade" },
  ember: { name: "焚印 · 引爆", ink: "#C65F38", image: "ember" },
  aegis: { name: "星幕 · 护盾", ink: "#2148B8", image: "aegis" },
  oracle: { name: "预见 · 过牌", ink: "#63365F", image: "oracle" },
  gale: { name: "掠风 · 连锁", ink: "#008A4B", image: "gale" },
  echo: { name: "残像 · 机动", ink: "#30343A", image: "echo" },
};
function schoolForCard(card) {
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
export function cardSchool(card) {
  const school = schoolForCard(card);
  return { ...school, ink: ACTOR_INKS[card.hero] || school.ink };
}
export function cardArt(card) {
  const school = cardSchool(card);
  const image = CARD_ART[card.key] || `/art/${school.image}-clean.png`;
  return `<div class="card-illustration" style="--ink:${school.ink}"><img src="${image}" style="object-position:${ART_FOCUS[card.key] || "50% 50%"}" alt="" draggable="false" decoding="async"/><span class="school-mark">${school.name}</span></div>`;
}
export { cardText as cardSummary } from "./card-text.js";
