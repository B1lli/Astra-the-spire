// Apollo by AdamCYounis: https://lospec.com/palette-list/apollo
export const PALETTE_SOURCE = {
  name: "Apollo",
  author: "AdamCYounis",
  url: "https://lospec.com/palette-list/apollo",
};
export const BIOMES = {
  desert: {
    name: "沙漠",
    title: "流金沙海",
    range: [0, 3],
    sky: "#e7d5b3",
    ink: "#7a4841",
    ground: "#e8c170",
    earth: "#ad7757",
    light: "#e7d5b3",
    mid: "#de9e41",
    dark: "#884b2b",
    accent: "#73bed3",
    foliage: "#75a743",
    palette: ["#e7d5b3", "#e8c170", "#de9e41", "#ad7757", "#884b2b", "#73bed3"],
    variants: ["晨砂台地", "断碑沙海", "月牙绿洲"],
  },
  waste: {
    name: "荒原",
    title: "赤岩边境",
    range: [4, 7],
    sky: "#d7b594",
    ink: "#602c2c",
    ground: "#c09473",
    earth: "#7a4841",
    light: "#e7d5b3",
    mid: "#cf573c",
    dark: "#4d2b32",
    accent: "#4f8fba",
    foliage: "#ad7757",
    palette: ["#d7b594", "#c09473", "#cf573c", "#ad7757", "#7a4841", "#4d2b32"],
    variants: ["风蚀峡口", "赤岩荒原", "枯木裂谷"],
  },
  grass: {
    name: "草原",
    title: "长风牧野",
    range: [8, 10],
    sky: "#a4dddb",
    ink: "#25562e",
    ground: "#a8ca58",
    earth: "#ad7757",
    light: "#d0da91",
    mid: "#75a743",
    dark: "#468232",
    accent: "#73bed3",
    foliage: "#468232",
    palette: ["#a4dddb", "#d0da91", "#a8ca58", "#75a743", "#468232", "#ad7757"],
    variants: ["迎风坡", "溪谷草甸", "古石环"],
  },
  forest: {
    name: "森林",
    title: "苍翠秘境",
    range: [11, 14],
    sky: "#a4dddb",
    ink: "#19332d",
    ground: "#468232",
    earth: "#4d2b32",
    light: "#a8ca58",
    mid: "#25562e",
    dark: "#19332d",
    accent: "#73bed3",
    foliage: "#75a743",
    palette: ["#19332d", "#25562e", "#468232", "#75a743", "#a8ca58", "#73bed3"],
    variants: ["苔石林地", "萤光溪径", "古树圣所"],
  },
};
export const BIOME_IDS = Object.keys(BIOMES);
export function biomeForFloor(floor) {
  return (
    BIOME_IDS.find(
      (id) => floor >= BIOMES[id].range[0] && floor <= BIOMES[id].range[1],
    ) || (floor < 0 ? "desert" : "forest")
  );
}
export function biomeLocation(floor, column = 0, seed = 0) {
  const id = biomeForFloor(floor),
    theme = BIOMES[id];
  const variant =
    floor === 14
      ? 2
      : (((Math.max(0, floor) - theme.range[0] + column) % 3) + 3) % 3;
  return {
    id,
    theme,
    variant,
    name: theme.variants[variant],
    seed:
      ((seed >>> 0) ^
        Math.imul(floor + 2, 2654435761) ^
        Math.imul(column + 1, 1597334677)) >>>
      0,
  };
}
export function landscapeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
