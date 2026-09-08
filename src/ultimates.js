export const ELEMENT_MAX = 6;
export const ULTIMATES = {
  kael: {
    name: "陨日天坠",
    element: "焰",
    hero: "kael",
    damage: 28,
    burn: 3,
    description: "全体 28 伤害 · 燃烧 3",
  },
  lyra: {
    name: "苍穹星葬",
    element: "星",
    hero: "lyra",
    damage: 18,
    block: 12,
    description: "全体 18 伤害 · 格挡 12",
  },
  syl: {
    name: "万刃归岚",
    element: "岚",
    hero: "syl",
    damage: 5,
    hits: 5,
    description: "全体 5 × 5 伤害",
  },
};
for (const skill of Object.values(ULTIMATES))
  Object.assign(skill, {
    type: "attack",
    all: true,
    cinematic: true,
    ultimate: true,
    cost: 0,
  });
