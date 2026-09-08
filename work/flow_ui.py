from pathlib import Path
p=Path('src/tower.js'); s=p.read_text(encoding='utf-8')
a=s.index('function showMap(readonly = false) {'); b=s.index('function showReward()',a)
s=s[:a]+'''function showTitle() {
  openOverlay("title", `<div class="title-screen">
    <div class="title-art"><img src="/art/blade-clean.png" alt="烬火剑士" /></div>
    <div class="title-copy"><span class="title-number">01 / 星之塔</span><h1>星<span>烬</span></h1><p>一人，一副牌，一条登顶之路。</p>
    <div class="title-actions">${saved ? `<button class="primary-button" data-resume>继续游戏 <small>${HEROES.find(h => h.id === saved.hero).name} · ${Math.max(0, saved.floor + 1)} 层</small></button>` : ""}<button class="${saved ? "text-button" : "primary-button"}" data-new>开始游戏 ${icon("chevron")}</button></div>
    <span class="title-bottom">卡牌构筑 / 回合制冒险</span></div></div>`);
}
function showCharacters(chosen = "kael") {
  const hero = HEROES.find(h => h.id === chosen), c = CHARACTERS[chosen], relic = RELICS[c.relic];
  openOverlay("characters", `<div class="character-screen" style="--ink:${SCHOOLS[c.art].ink}">
    <button class="back-link" data-title>← 返回</button><div class="character-art"><img src="/art/${c.art}-clean.png" alt="${hero.title}" /></div>
    <div class="character-copy"><p class="selection-label">选择角色</p><div class="character-tabs">${HEROES.map(h => `<button data-character="${h.id}" aria-pressed="${h.id === chosen}">${h.name}</button>`).join("")}</div>
    <h1>${hero.name}</h1><h2>${hero.title}</h2><p>${c.description}</p><div class="character-stats">♡ ${c.hp} <span>◈ 99</span><span>${c.deck.length} 张牌</span></div>
    <div class="starter-relic">${icon(relic.icon)}<div><small>初始遗物</small><b>${relic.name}</b><p>${relic.text}</p></div></div>
    <div class="starter-deck"><small>初始牌组</small>${[...new Set(c.deck)].map(key => `<span title="${cardData({key}).description}">${CARDS[key].name} × ${c.deck.filter(k => k === key).length}</span>`).join("")}</div>
    <button class="primary-button" data-embark="${chosen}">踏入高塔 ${icon("chevron")}</button></div></div>`);
}
function showBlessing() {
  const hero = HEROES.find(h => h.id === run.hero), r = RELICS[CHARACTERS[run.hero].relic];
  openOverlay("blessing", `<div class="modal-card blessing-screen">${modalHeading("", "启程之赐", `${hero.name} · ♡ ${run.hp} · ◈ ${run.gold}`)}
  <div class="equipped-relic">${icon(r.icon)}<div><small>已装备</small><b>${r.name}</b><p>${r.text}</p></div></div>
  <div class="blessing-options"><button data-blessing="vitality">${icon("leaf")}<b>强韧</b><span>最大生命 +7</span></button><button data-blessing="gold">${icon("star")}<b>馈赠</b><span>金币 +75</span></button><button data-blessing="relic">${icon("shield")}<b>交换</b><span>失去 10 生命</span><small>获得旧王护符：开战 +10 格挡</small></button></div></div>`);
}
function showChest() {
  const relic = RELICS[run.chest];
  openOverlay("chest", `<div class="modal-card small-modal">${modalHeading("", "星之遗藏", "")}<div class="chest-relic">${icon(relic?.icon || "diamond")}<h2>${relic?.name || "空的宝箱"}</h2><p>${relic?.text || "所有遗物均已获得"}</p></div><button class="primary-button" data-chest>${relic ? "收下遗物" : "继续"}</button></div>`);
}
function showMap(readonly = false) {
  const rows = G.floors(run), available = readonly ? [] : G.availableNodes(run), height = rows.length * 100 + 30;
  const x = (f, c) => rows[f].length === 1 ? 300 : 100 + c * 200;
  const y = f => height - 65 - f * 100;
  let lines = "", nodes = "";
  rows.forEach((row, f) => row.forEach((n, c) => {
    for (const to of n.next || []) {
      const done = run.path[f] === c && run.path[f+1] === to;
      const reachable = f === run.floor && run.path[f] === c;
      lines += `<path d="M${x(f,c)} ${y(f)} L${x(f+1,to)} ${y(f+1)}" class="${done ? "traveled" : reachable ? "next-path" : ""}"/>`;
    }
    const active = f === run.floor + 1 && available.includes(c), visited = run.path[f] === c;
    nodes += `<button class="route-node ${active ? "available" : ""} ${visited ? "visited" : ""} ${n.type}" style="left:${x(f,c)/6}%;top:${y(f)}px" data-node="${c}" aria-label="第 ${f+1} 层 ${typeName(n.type)} 路线 ${c+1}${active ? " 可前往" : ""}" ${!active ? "disabled" : ""}><span>${icon(nodeIcon(n.type))}</span><b>${typeName(n.type)}</b>${f === run.floor && visited ? "<small>当前位置</small>" : ""}</button>`;
  }));
  openOverlay(readonly ? "map-view" : "map", `<div class="modal-card route-modal">${readonly ? closeButton : ""}<div class="route-heading"><div><h2>星之塔</h2><p>${run.floor < 0 ? "选择起点" : "沿连线前进"} · 15 层</p></div><div class="route-resources">♡ ${run.hp}/${run.maxHp}　◈ ${run.gold}<small>${HEROES.find(h => h.id === run.hero).name} · ${run.deck.length} 张牌</small></div></div><div class="route-legend">${["battle","elite","event","shop","camp","chest","boss"].map(t=>`<span>${icon(nodeIcon(t))}${typeName(t)}</span>`).join("")}</div><div class="route-scroll"><div class="route-board" style="height:${height}px"><svg viewBox="0 0 600 ${height}" preserveAspectRatio="none">${lines}</svg>${nodes}</div></div><div class="route-bottom">${run.relics.map(k => `<span title="${RELICS[k].text}">${icon(RELICS[k].icon)}${RELICS[k].name}</span>`).join("")}<button data-route-deck>牌组 ${run.deck.length}</button></div></div>`);
}
function centerMap() {
  const map = $(".route-scroll"), node = $(".route-node.available") || $(".route-node.visited:last-of-type");
  if (map) map.scrollTop = node ? parseFloat(node.style.top) - map.clientHeight + 115 : map.scrollHeight;
}
''' + s[b:]
# Route deck view must return to the route, including before the first battle.
s=s.replace('  if (el.dataset.character)', '  if (el.hasAttribute("data-route-deck")) { showDeck(); overlay = "route-deck"; }\n  if (el.dataset.character)')
s=s.replace('if (el.hasAttribute("data-close")) closeOverlay();', 'if (el.hasAttribute("data-close")) { if (overlay === "route-deck") showMap(); else closeOverlay(); }')
s=s.replace('if (e.key === "Tab") {', 'if (e.key === "Escape" && overlay === "route-deck") showMap();\n    if (e.key === "Tab") {')
p.write_text(s,encoding='utf-8')
