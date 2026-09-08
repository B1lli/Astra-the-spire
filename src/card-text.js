export function cardText(c) {
  const p = [];
  if (c.type === 'curse') return '无法打出。';
  if (c.damage) p.push(`${c.all ? '对所有敌人' : ''}造成 ${c.damage} 点伤害${c.hits > 1 ? `，共 ${c.hits} 次` : ''}。`);
  if (c.block) p.push(`获得 ${c.block} 点格挡。`);
  if (c.draw) p.push(`抽 ${c.draw} 张牌。`);
  if (c.energy) p.push(`获得 ${c.energy} 点能量。`);
  if (c.heal) p.push(`恢复 ${c.heal} 点生命。`);
  if (c.vulnerable) p.push(`施加 ${c.vulnerable} 回合易伤。`);
  if (c.weak) p.push(`施加 ${c.weak} 回合虚弱。`);
  if (c.burn) p.push(`施加 ${c.burn} 层燃烧。`);
  if (c.strength) p.push(`获得 ${c.strength} 点力量。`);
  if (c.afterimage) p.push(`本场战斗每打出一张攻击牌，获得 ${c.afterimage} 点格挡。`);
  if (c.nextAttack) p.push(`本回合下一张攻击牌额外造成 ${c.nextAttack} 点伤害。`);
  if (c.finisher) p.push(`本回合此前每打出一张攻击牌，额外造成 ${c.finisher} 点伤害。`);
  if (c.detonate) p.push(`移除目标全部燃烧，每层额外造成 ${c.detonate} 点伤害。`);
  if (c.pierce) p.push('无视目标的格挡。');
  if (c.onKillEnergy) p.push(`若击杀目标，获得 ${c.onKillEnergy} 点能量。`);
  if (c.exhaust) p.push('消耗。');
  return p.join('');
}
export const KEYWORDS = {
  '格挡': '抵挡等量的攻击伤害。在你的下回合开始时清空。',
  '易伤': '受到的攻击伤害增加 50%，持续指定回合。',
  '虚弱': '造成的攻击伤害减少 25%，持续指定回合。',
  '燃烧': '敌人行动前失去等同层数的生命，然后减少 1 层。无视格挡。',
  '力量': '每次攻击命中的伤害增加等同力量的数值，持续本场战斗。',
  '消耗': '打出后移入消耗区，本场战斗不再抽到。下场战斗恢复。',
  '能量': '用于支付卡牌费用。每回合开始时恢复。',
  '无法打出': '不能使用这张牌，但仍会抽到它。',
};
export function cardKeywords(text) { return Object.entries(KEYWORDS).filter(([key]) => text.includes(key)); }
export function cardRulesHTML(c) {
  return cardText(c).replace(/(无法打出|格挡|易伤|虚弱|燃烧|力量|消耗|能量|\d+)/g, word => /^\d+$/.test(word) ? `<b>${word}</b>` : `<span class="card-keyword">${word}</span>`);
}
export function installCardTooltips() {
  const tip = document.createElement('aside'); tip.id = 'card-keyword-help'; tip.role = 'tooltip'; tip.hidden = true; document.body.append(tip);
  let active;
  const hide = () => { active?.removeAttribute('aria-describedby'); active = null; tip.hidden = true; };
  const show = card => {
    if (!card) return hide();
    const entries = cardKeywords(card.querySelector('p')?.textContent || '');
    if (!entries.length) return hide();
    hide(); active = card; card.setAttribute('aria-describedby', tip.id);
    tip.innerHTML = entries.map(([key, value]) => `<section><strong>${key}</strong><p>${value}</p></section>`).join('');
    tip.hidden = false;
    const r = card.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right + w + 12 < innerWidth ? r.right + 12 : r.left - w - 12))}px`;
    tip.style.top = `${Math.max(8, Math.min(innerHeight - h - 8, r.top))}px`;
  };
  document.addEventListener('pointerover', e => { const c=e.target.closest('.game-card'); if(c !== active) show(c); });
  document.addEventListener('focusin', e => show(e.target.closest('.game-card')));
  document.addEventListener('focusout', e => { if (e.target.closest('.game-card') === active) hide(); });
  document.addEventListener('pointerdown', hide);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') hide(); });
  document.addEventListener('scroll', hide, true); window.addEventListener('resize', hide);
  new MutationObserver(() => { if(active && !active.isConnected) hide(); }).observe(document.querySelector('#app'), {childList:true,subtree:true});
}
