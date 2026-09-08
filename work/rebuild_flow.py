from pathlib import Path
p = Path('src/tower.js')
s = p.read_text(encoding='utf-8')
def replace(old, new):
    global s
    if old not in s: raise Exception('Missing: '+old[:90])
    s = s.replace(old, new)
replace('RELICS, FLOORS, cardData', 'RELICS, CHARACTERS, cardData')
replace('astral-ash-tower-v2', 'astral-ash-tower-v3')
replace('parsed.version === 2', 'parsed.version === 3 && CHARACTERS[parsed.hero] && Array.isArray(parsed.map)')
replace('      parsed.battle &&\n', '')
replace('["battle", "map", "reward", "event", "camp", "shop"]', '["blessing", "battle", "map", "reward", "event", "camp", "shop", "chest"]')
replace('shop: "star",', 'shop: "star", chest: "diamond",')
replace('shop: "商店",', 'shop: "商店", chest: "宝箱",')
replace('target: run.battle.target,', 'target: run.battle?.target,')
replace('      ...m,\n      hp:', '      ...m,\n      absent: m.team === "ally" ? m.id !== run.hero || run.phase !== "battle" : !run.battle?.enemies.some(e => e.id === m.id),\n      hp:')
replace('? run.hp > 0', '? m.id === run.hero && run.hp > 0 && run.phase === "battle"')
replace('run.battle.enemies.find', 'run.battle?.enemies.find')
replace('FLOORS', 'G.floors(run)')
replace('G.floors(run)[run.floor][run.path[run.floor] || 0]', 'G.floors(run)[Math.max(0, run.floor)][run.path[run.floor] || 0]')
replace('${icon(RELICS[key].icon)}</button>', '${icon(RELICS[key].icon)}<span>${RELICS[key].name}</span></button>')
replace('  $("#hp-detail").textContent', '''  for (const hero of HEROES) {
    const label = $("#ally-" + hero.id);
    if (label) { label.hidden = hero.id !== run.hero; label.innerHTML = `${hero.name}<small>♡ ${run.hp}/${run.maxHp}${b?.block ? ` · ⛨ ${b.block}` : ""}</small>`; }
  }
  if (!b) { $("#hand").innerHTML = ""; scene?.sync(modelState()); return; }
  $("#hp-detail").textContent''')
start = s.index('  $("#chain").innerHTML =')
end = s.index('  $("#intent-list").innerHTML', start)
s = s[:start] + '''  $("#chain").innerHTML = run.hero === "syl" ? `箭匣 ${b.attacks % 3} / 3` : run.hero === "lyra" ? `核心 · ${b.skillDrawn ? "已触发" : "待触发"}` : "";
  $("#combo-counter").innerHTML = `<b>${b.played}</b> 张已打出`;
''' + s[end:]
replace('function positionLabels() {', 'function positionLabels() {\n  updateAim();')
replace('function renderPreview() {', 'function renderPreview() {\n  if (!run.battle) return;')
replace('能量不足，尝试零费牌或完成共鸣', '能量不足')
replace('if (c.type !== "attack" && !c.target)', 'if ((c.type !== "attack" && !c.target) || c.all)')
replace('float("kael",', 'float(run.hero,')
replace('float("lyra",', 'float(run.hero,')
replace('function openOverlay(kind, html) {', 'function openOverlay(kind, html) {\n  selected = null;\n  document.body.classList.toggle("front-menu", ["title", "characters", "blessing"].includes(kind));')
replace('function closeOverlay() {', 'function closeOverlay() {\n  document.body.classList.remove("front-menu");')
replace('if (run.phase === "reward") showReward();', 'if (run.phase === "blessing") showBlessing();\n  else if (run.phase === "chest") showChest();\n  else if (run.phase === "reward") showReward();')
replace('function newRun() {\n  sound.unlock();\n  run = G.createRun();\n  resetScene();\n  closeOverlay();\n  save();\n  openingDeal();\n}', '''function newRun(hero) {
  if (!hero) { showCharacters(); return; }
  sound.unlock();
  run = G.createRun(Date.now(), hero);
  resetScene();
  render(); save(); showBlessing();
}''')
replace('function resetScene() {', '''function resetScene() {
  scene.activeHero = run.hero;
  for (const hero of HEROES) {
    const u = scene.units.get(hero.id);
    u.base.set(-3.2, 0, 0.3);
    u.group.scale.setScalar(1.2);
  }
  const enemies = G.alive(run);
  enemies.forEach((enemy, i) => {
    const u = scene.units.get(enemy.id);
    u.base.set(enemies.length === 1 ? 3.1 : 2.8 + i * 1.4, 0, enemies.length === 1 ? 0.3 : -1.3 + i * 2.6);
  });''')
replace('  if (el.dataset.card) selectCard', '  if (suppressClick) return;\n  if (el.dataset.card) selectCard')
replace('  if (el.hasAttribute("data-new")) newRun();', '''  if (el.hasAttribute("data-new")) newRun();
  if (el.dataset.character) showCharacters(el.dataset.character);
  if (el.dataset.embark) newRun(el.dataset.embark);
  if (el.hasAttribute("data-title")) showTitle();
  if (el.dataset.blessing) mutate(() => G.chooseBlessing(run, el.dataset.blessing));
  if (el.hasAttribute("data-chest")) mutate(() => G.takeChest(run));''')
replace('if (run.battle.phase === "enemy"', 'if (run.battle?.phase === "enemy"')
replace('    run = saved;\n    saved = null;', '    run = structuredClone(saved);')
replace('gale: "低费攻击、多段命中，串联共鸣。"', 'gale: "低费攻击、多段命中，触发箭匣。"')
replace('7 层路线包含', '15 层路线包含')
replace('${run.floor + 1} / 7', '${run.floor + 1} / ${G.floors(run).length}')
replace('连续打出三个不同英雄的牌，回 1 能量并抽 1 张牌，每回合最多两次。重复英雄会重新开始连锁。', '单角色独立牌池。剑士战后回血；术师首张技能抽牌；游侠三次攻击叠盾。遗物全程生效。')
replace('<h3>共鸣</h3>', '<h3>角色与遗物</h3>')
replace('试一试：破晓烙印 → 星幕 → 掠风，触发共鸣，再用落日裁决收尾。', '指向牌：点击选牌再点敌人，或拖向敌人。右键 / Esc 取消。群攻与自身技能无需选敌人。')
replace('失去 12 生命，获得传说卡「天陨 · 终焰」', '失去 12 生命，获得「${CARDS[{kael:"meteor",lyra:"nova",syl:"volley"}[run.hero]].name}」')
replace('你的牌组，由你雕琢', '选择一张')
replace('试着保留格挡、精简牌组，并用易伤与共鸣创造斩杀窗口。', '调整路线与构筑，再次攀登。')
replace('技能牌立即生效。', '指向技能也需要选敌人，其余技能立即生效。')
start = s.index('render();\nif (saved)')
s = s[:start] + 'resetScene();\nrender();\nshowTitle();\n'
p.write_text(s, encoding='utf-8')
