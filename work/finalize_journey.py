from pathlib import Path
p=Path('src/tower.js');s=p.read_text(encoding='utf-8')
s=s.replace('星行者小队','星行者').replace('星轨共鸣 · 三位英雄，一副牌组','单人构筑 · 星之塔')
s=s.replace('${run.stats.resonances}</b><span>共鸣','${run.stats.cards}</b><span>打出卡牌')
s=s.replace('<button class="text-button" data-new-confirm>开启新的攀登</button>', '<button class="text-button" data-title>返回主菜单</button><button class="text-button" data-new-confirm>开启新的攀登</button>')
p.write_text(s,encoding='utf-8')
p=Path('src/journey.css');s=p.read_text(encoding='utf-8');s+='''
#hand .game-card { touch-action:pan-x; }
.school-gallery article { --ink:var(--blue)!important; }
.school-gallery img { filter:grayscale(1); }
@media(max-width:700px) {
  .tools #pause { display:grid!important; }
  .tools #school-gallery-button { display:none; }
  #chain { font-size:11px; }
}
''';p.write_text(s,encoding='utf-8')
Path('README.md').write_text('''# 星烬 · ASTRAL ASH

单角色、单副牌的 3D 卡牌爬塔游戏。黑、纸白、钴蓝；开屏由实时角色建模、多幅漫画切片、程序化图形与镜头动画组成。

## 运行

Node.js 20.10+，支持 WebGL 的浏览器。

```sh
npm install
npm run dev
npm test
npm run build
npm run simulate
```

## 完整流程

开始 / 继续 → 三选一角色 → 初始遗物与祝福 → 15 层随机分岔地图 → 战斗 / 精英 / 事件 / 商店 / 营火 / 宝箱 → 领主 → 胜负结算与再次选角。

地图只能沿连线前进，能够提前查看后续路线。首战固定一名敌人。角色只使用自己的牌池；战斗生命、金币、升级、牌组、遗物跨房间保留。

| 角色 | 生命 | 初始遗物 | 打法 |
| --- | --- | --- | --- |
| 凯尔 | 80 | 战后回复 6 | 易伤、燃烧与终结 |
| 莉娅 | 70 | 每回合首张技能抽 1 | 过牌、护盾与法术 |
| 希尔 | 72 | 每回合每 3 张攻击获得 5 格挡 | 多段攻击与残像 |

基础回合 3 能量、抽 5 张、基础攻击 6、格挡 5。剑士 5 攻击、4 格挡、1 易伤攻击作为起始十张牌。手牌上限 10，回合末弃牌、牌库用尽后洗回弃牌堆。

攻击与指向技能可点击选牌后点击敌人，也可向敌人拖动。箭头吸附目标，预览与实际结算共用引擎。自身技能和群攻无需指定敌人。数字键选牌、Enter 打出、E 结束回合、Esc / 右键取消；手机横向滑动手牌，向上拖动出牌。

战后卡牌三选一可以跳过；精英额外选择遗物。营火休息恢复 30% 最大生命或升级一张牌；商店购买与移除；宝箱收取遗物。所有机制见游戏内规则面板。

## 演出与模型

Three.js 程序化低多边形角色：长衣、分层护甲、面部、发型与各自武器。剑士有蹬地、突进、挥剑、回位；术师与游侠使用远程动作。大招保留特写、慢动作与命中停顿，普通牌缩短特写以保持节奏。可在工具栏切换镜头、声音及速度；尊重系统减少动态效果设置。

六组无字卡面原稿与提示词见 `public/art/PROMPTS.md`。游戏展示统一为黑白图像与钴蓝界面；原始插画保留在资源目录。

## 架构与验证

- `src/data.js`：角色、独立牌组、卡牌和遗物。
- `src/route.js`：种子生成的有向路线。
- `src/roguelike.js`：纯状态引擎、战斗与房间流程。
- `src/tower.js`：界面、指向操作、存档和演出调度。
- `src/scene.js`：角色建模、场景、镜头与特效。
- `src/journey.css`：开屏、选角、地图与箭头。
- `tests/journey.test.js`：开局到结算的机制回归。
- `tests/simulate.js`：三角色各四个种子的完整路线模拟。
- `docs/experience-audit.md`：与《杀戮尖塔》的全流程对照。

存档键 `astral-ash-tower-v3`；旧小队版本存档仍保留但不加载到新规则。使用 `/?practice=1` 测试临时对局，不覆盖正常存档。字体联网加载，离线回退系统字体；游戏逻辑、模型和卡面均在本地。
''',encoding='utf-8')
