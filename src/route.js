const names = {
  battle: "巡卫",
  elite: "执刑者",
  camp: "营火",
  shop: "集市",
  event: "未知",
  chest: "宝箱",
  boss: "荒星守望者",
};
export function generateRoute(random) {
  const rows = Array.from({ length: 15 }, (_, floor) =>
    Array.from({ length: floor === 14 ? 1 : 3 }, (_, column) => {
      let type;
      if (floor < 2) type = "battle";
      else if (floor === 14) type = "boss";
      else if (floor === 13) type = "camp";
      else if (floor === 7) type = "chest";
      else {
        const pool = [
          "battle",
          "event",
          "battle",
          "camp",
          "shop",
          ...(floor >= 3 ? ["elite"] : []),
        ];
        type = pool[Math.floor(random() * pool.length)];
      }
      return { type, name: names[type], sub: "", column, next: [] };
    }),
  );
  // Each lane continues, with one adjacent branch. No teleporting across the map.
  for (let f = 0; f < rows.length - 1; f++) {
    for (const node of rows[f]) {
      if (rows[f + 1].length === 1) node.next = [0];
      else {
        const c = node.column;
        const adjacent = c === 0 ? 1 : c === 2 ? 1 : random() < 0.5 ? 0 : 2;
        node.next = [c, adjacent].sort();
      }
    }
  }
  rows[3][0].type = "elite";
  rows[3][0].name = names.elite;
  rows[3][2].type = "camp";
  rows[3][2].name = names.camp;
  rows[5][1].type = "shop";
  rows[5][1].name = names.shop;
  return rows;
}
