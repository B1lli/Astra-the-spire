from pathlib import Path
p=Path('src/tower.js');s=p.read_text(encoding='utf-8')
s=s.replace('svg.hidden = !visible;', 'svg.style.display = visible ? "block" : "none";')
s=s.replace('arrow.hidden = true;', 'arrow.style.display = "none";')
s=s.replace('scene.setInk(cardSchool(c).ink);','scene.setInk();')
s=s.replace('  document.documentElement.style.setProperty("--blue", cardSchool(c).ink);\n','')
s=s.replace('el.style.setProperty("--ink", cardSchool(card).ink);','el.style.setProperty("--ink", "#2148B8");')
s=s.replace('panel.style.setProperty("--ink", school.ink);','panel.style.setProperty("--ink", "#2148B8");')
s=s.replace('const p = scene.project(hero.id, -2.6);','const p = scene.project(hero.id, -2.6);')
# Keep a valid up-to-date continue entry when returning to the menu.
s=s.replace('else localStorage.setItem(SAVE, JSON.stringify(run));','else { localStorage.setItem(SAVE, JSON.stringify(run)); saved = structuredClone(run); }')
# No unnecessary full-card cinematic for every basic action.
s=s.replace('const duration = (card.cinematic ? 1050 : 750)', 'const duration = (card.cinematic ? 950 : 390)')
p.write_text(s,encoding='utf-8')
p=Path('src/scene.js');s=p.read_text(encoding='utf-8').replace('new T.Vector3(0, 10, 21)', 'new T.Vector3(0, 6, 14)');p.write_text(s,encoding='utf-8')
p=Path('src/journey.css');s=p.read_text(encoding='utf-8');s+='''
.game-card { --ink:var(--blue)!important; }
.game-card img { filter:grayscale(1) contrast(1.08); }
#relics .relic { transform:none; border-radius:0; }
.route-node:disabled { opacity:.58; }
.route-node.visited:disabled { opacity:1; }
''';p.write_text(s,encoding='utf-8')
