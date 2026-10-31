// Rybna Wyspa: the Tab farm panel (warehouse + hotbar, quests, album, players, log and trash bin, ranking, farm and rebirth) and the shop.

import { BLOCKS, BLOCK_BY_ID, CATS } from '../data/blocks.js';
import { SPECIES, RARITIES } from '../data/species.js';
import { TRAITS, VARIANTS } from '../data/traits.js';
import { UPGRADES, levelOf, REBIRTH_LEVEL, REBIRTH_MULT } from '../data/progress.js';
import { fmtZl, fmtNum, esc, fmtKg } from '../util.js';
import { questText } from '../game/farm.js';
import { TRASH_MS } from '../net/store.js';

const $ = (id) => document.getElementById(id);

const ACTIONS = { buy: 'kupił(a)', upgrade: 'ulepszył(a)', remove: 'zdjął(ęła) do kosza', restore: 'przywrócił(a)', quest: '', sale: 'sprzedał(a)', offline: '', rebirth: 'zrobił(a) rebirth', place: 'postawił(a)', join: 'dołączył(a)' };

function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return `${Math.round(s)} s temu`;
  if (s < 3600) return `${Math.round(s / 60)} min temu`;
  if (s < 86400) return `${Math.round(s / 3600)} h temu`;
  return `${Math.round(s / 86400)} d temu`;
}

export class Panels {
  constructor(game) {
    this.g = game;
    this.tab = 'wh';
    this.open = false;
    this.shopOpen = false;
    this.shopCat = 'spawn';
    $('p-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.tab = b.dataset.tab;
      for (const x of $('p-tabs').children) x.classList.toggle('on', x === b);
      this.render();
    });
    $('p-body').addEventListener('click', (e) => this.onClick(e));
    const st = $('shop-tabs');
    for (const c of CATS) {
      const b = document.createElement('button');
      b.dataset.cat = c.id;
      b.textContent = c.name;
      st.appendChild(b);
    }
    const up = document.createElement('button');
    up.dataset.cat = 'up';
    up.textContent = 'Ulepszenia';
    st.appendChild(up);
    st.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.shopCat = b.dataset.cat;
      this.renderShop();
    });
    $('shop-grid').addEventListener('click', (e) => this.onShop(e));
  }

  get s() { return this.g.store.state; }

  toggle(on = !this.open) {
    this.open = on;
    $('panel').classList.toggle('hidden', !on);
    if (on) this.render();
  }

  toggleShop(on = !this.shopOpen) {
    this.shopOpen = on;
    $('shop').classList.toggle('hidden', !on);
    if (on) this.renderShop();
  }

  refresh() {
    if (this.open) this.render();
    if (this.shopOpen) this.renderShop();
  }

  render() {
    const b = $('p-body');
    const fn = this['tab_' + this.tab];
    b.innerHTML = fn ? fn.call(this) : '';
  }

  tab_wh() {
    const s = this.s;
    const types = BLOCKS.filter((d) => (s.wh[d.id] || 0) > 0 || this.g.hotbarSlots.includes(d.id));
    const slots = this.g.hotbarSlots;
    let html = `<h3>Pasek: kliknij slot, potem blok z magazynu</h3><div class="chips" style="margin-bottom:16px">`;
    for (let i = 1; i < 9; i++) {
      const t = slots[i];
      html += `<button class="btn ${this.g.selSlot === i ? 'pri' : ''}" data-slot="${i}">${i + 1}: ${t ? esc(BLOCK_BY_ID[t].name) : 'pusty'}</button>`;
    }
    html += `</div><h3>Wspólny magazyn farmy</h3>`;
    if (!types.length) html += `<p class="muted">Magazyn jest pusty. Kup coś w sklepie (stragan przy starcie, klawisz E).</p>`;
    html += `<div class="grid">`;
    for (const d of types) {
      html += `<div class="card click" data-assign="${d.id}"><img src="${this.g.icons.block(d.id)}" alt=""><b>${esc(d.name)}</b><small>w magazynie: ${s.wh[d.id] || 0}</small></div>`;
    }
    return html + '</div>';
  }

  tab_quests() {
    const q = this.s.quests || [];
    let html = '<h3>Zadania farmy (wspólne dla wszystkich)</h3><div class="list">';
    if (!q.length) html += '<div class="li">Zadania pojawią się za chwilę.</div>';
    for (const x of q) {
      const p = Math.min(1, x.prog / x.n);
      const prog = x.kind === 'earn' || x.kind === 'big' ? `${fmtZl(x.prog, 0)} / ${fmtZl(x.n, 0)}` : `${Math.floor(x.prog)} / ${x.n}`;
      html += `<div class="li"><div class="grow"><div>${esc(questText(x, (v) => fmtZl(v, 0)))}</div><div class="muted">nagroda: ${fmtZl(x.reward, 0)}</div></div><div class="bar"><i style="width:${(p * 100).toFixed(0)}%"></i></div><span class="muted">${prog}</span></div>`;
    }
    return html + '</div>';
  }

  tab_album() {
    const a = this.s.album || {};
    const found = Object.keys(a).length;
    let html = `<h3>Album ryb: ${found} / ${SPECIES.length} gatunków</h3><div class="grid">`;
    for (const sp of SPECIES) {
      const rec = a[sp.idx];
      const R = RARITIES[sp.rarity];
      const miss = !rec;
      const secret = sp.rarity === 6 && miss;
      const rc = R.color === '#b9c2cc' ? '#6b7785' : R.color;
      html += `<div class="card album-card ${miss ? 'miss' : ''}" style="--rc:${rc}" title="${secret ? '???' : esc(sp.info)}"><img src="${this.g.icons.fish(sp.idx)}" alt="" style="width:120px;height:72px;object-fit:contain"><b>${secret ? '???' : esc(sp.name)}</b><span class="lat">${secret ? '' : esc(sp.latin || 'gatunek nieopisany')}</span><span class="rar">${R.name}</span>`;
      html += `<div class="vs">${[0, 1, 2, 3].map((v) => `<i class="v${v} ${rec && rec.v && rec.v[v] ? 'on' : ''}" title="${v ? VARIANTS[v].name : 'zwykła'}"></i>`).join('')}</div>`;
      if (rec) html += `<small>sprzedane: ${fmtNum(rec.n, 0)} · rekord ${fmtKg(rec.w)} · traity: ${Object.keys(rec.t || {}).length}</small>`;
      html += `</div>`;
    }
    html += '</div><h3 style="margin-top:18px">Traity odkryte na tej farmie</h3><div class="chips">';
    const seen = new Set();
    for (const rec of Object.values(a)) for (const t of Object.keys(rec.t || {})) seen.add(+t);
    for (const t of TRAITS) html += `<span class="chip" style="opacity:${seen.has(t.idx) ? 1 : 0.3}">${seen.has(t.idx) ? esc(t.name) + ' ×' + String(t.m).replace('.', ',') : '???'}</span>`;
    return html + '</div>';
  }

  tab_stats() {
    const st = Object.entries(this.s.stats || {}).sort((a, b) => (b[1].earned || 0) - (a[1].earned || 0));
    const online = this.g.onlineList();
    let html = `<h3>Na wyspie teraz</h3><div class="list" style="margin-bottom:14px">`;
    for (const p of online) html += `<div class="li"><span style="width:12px;height:12px;border-radius:50%;border:1.5px solid var(--ink);background:${esc(p.c || '#4aa8ff')}"></span><span class="grow">${esc(p.n)}${p.leader ? ' <span class="muted">(liczy fizykę wyspy)</span>' : ''}</span></div>`;
    html += `</div><h3>Statystyki graczy na tej farmie</h3><div class="list">`;
    if (!st.length) html += '<div class="li">Jeszcze nikt nic nie sprzedał.</div>';
    for (const [, v] of st) html += `<div class="li"><b class="grow">${esc(v.n || 'Gracz')}</b><span class="muted">sprzedane ${fmtNum(v.sold || 0, 0)}</span><span class="muted">zarobił(a) ${fmtZl(v.earned || 0, 0)}</span><span class="muted">postawione ${v.built || 0}</span><span class="muted">zdjęte ${v.removed || 0}</span></div>`;
    return html + '</div>';
  }

  tab_log() {
    const trash = Object.entries(this.s.trash || {}).filter(([, e]) => Date.now() - e.at < TRASH_MS).sort((a, b) => b[1].at - a[1].at);
    let html = `<h3>Kosz (15 min, każdy może przywrócić)</h3><div class="list" style="margin-bottom:14px">`;
    if (!trash.length) html += '<div class="li">Kosz jest pusty.</div>';
    for (const [tid, e] of trash) {
      const d = BLOCK_BY_ID[e.b.t];
      const left = Math.max(0, TRASH_MS - (Date.now() - e.at)) / 60000;
      html += `<div class="li"><img src="${this.g.icons.block(e.b.t)}" style="width:36px;height:36px" alt=""><span class="grow">${esc(d ? d.name : e.b.t)} <span class="muted">zdjął(ęła) ${esc(e.bn || 'Gracz')}, ${ago(e.at)}, zostało ${Math.ceil(left)} min</span></span><button class="btn small pri" data-restore="${tid}">Przywróć</button></div>`;
    }
    html += `</div><h3>Dziennik</h3><div class="list">`;
    const log = (this.s.log || []).slice().reverse().slice(0, 80);
    if (!log.length) html += '<div class="li">Pusto.</div>';
    for (const l of log) {
      const verb = ACTIONS[l.a] ?? l.a;
      html += `<div class="li"><span class="grow">${l.a === 'quest' || l.a === 'offline' ? esc(l.x) : `<b>${esc(l.n || 'Gracz')}</b> ${esc(verb)} ${esc(l.x || '')}`}</span><span class="muted">${ago(l.at)}</span></div>`;
    }
    return html + '</div>';
  }

  tab_rank() {
    const list = this.g.ranking();
    let html = `<h3>Ranking farm (zarobek na minutę)</h3><div class="list">`;
    if (!list) return html + '<div class="li">Ładowanie…</div></div>';
    if (!list.length) html += '<div class="li">Brak danych (ranking działa tylko online).</div>';
    list.forEach((f, i) => {
      const me = f.id === this.s.id;
      html += `<div class="li" style="${me ? 'background:rgba(42,143,134,0.12)' : ''}"><b style="width:28px">${i + 1}.</b><span class="grow">${esc(f.name || f.id)} <span class="muted">${f.pub ? 'publiczna' : 'prywatna'} · poziom ${levelOf(f.earned || 0)}${f.rb ? ` · rebirth ${f.rb}` : ''}</span></span><b>${fmtZl(f.rate || 0, 0)}/min</b><span class="muted">razem ${fmtZl(f.earned || 0, 0)}</span></div>`;
    });
    return html + '</div>';
  }

  tab_farm() {
    const s = this.s;
    const lvl = levelOf(s.earned);
    const online = this.g.onlineList();
    const votes = Object.values(s.vote || {}).filter(Boolean).length;
    const can = lvl >= REBIRTH_LEVEL;
    let html = `<h3>${esc(s.name)}</h3><div class="list">`;
    html += `<div class="li"><span class="grow">Kod wyspy</span><b>${esc(s.pub ? 'publiczna' : s.id)}</b></div>`;
    html += `<div class="li"><span class="grow">Zarobione razem</span><b>${fmtZl(s.earned, 0)}</b></div>`;
    html += `<div class="li"><span class="grow">Stały mnożnik cen (rebirthy: ${s.rebirths || 0})</span><b>×${(s.mult || 1).toFixed(2)}</b></div>`;
    html += `<div class="li"><span class="grow">Ryby na wyspie</span><b>${this.g.fishCount()} / 400</b></div></div>`;
    html += `<h3 style="margin-top:14px">Rebirth</h3><div class="list"><div class="li"><span class="grow">Resetuje bloki, kasę, poziom i ulepszenia. Zostaje album i statystyki. Mnożnik cen rośnie ×${REBIRTH_MULT}. Wymaga poziomu ${REBIRTH_LEVEL} i głosu wszystkich na wyspie.</span>`;
    html += can ? `<button class="btn ${s.vote && s.vote[this.g.uid] ? '' : 'pri'}" data-vote="1">${s.vote && s.vote[this.g.uid] ? 'Cofnij głos' : 'Głosuję za'}</button><span class="muted">${votes}/${online.length}</span>` : `<span class="muted">od poziomu ${REBIRTH_LEVEL}</span>`;
    return html + '</div></div>';
  }

  onClick(e) {
    const t = e.target.closest('[data-slot],[data-assign],[data-restore],[data-vote]');
    if (!t) return;
    if (t.dataset.slot) { this.g.selSlot = +t.dataset.slot; this.render(); }
    else if (t.dataset.assign) { this.g.assignSlot(t.dataset.assign); this.render(); }
    else if (t.dataset.restore) { this.g.store.restore(t.dataset.restore).then((ok) => { if (!ok) this.g.hud.toast('Nie da się przywrócić (brak bloku i kasy).', 'err'); this.render(); }); }
    else if (t.dataset.vote) { const s = this.s; this.g.store.vote(!(s.vote && s.vote[this.g.uid])).then(() => this.render()); }
  }

  renderShop() {
    const s = this.s;
    $('shop-cash').textContent = fmtZl(s.cash);
    for (const b of $('shop-tabs').children) b.classList.toggle('on', b.dataset.cat === this.shopCat);
    const lvl = levelOf(s.earned);
    let html = '';
    if (this.shopCat === 'up') {
      for (const u of UPGRADES) {
        const l = s.up[u.id] || 0;
        const max = l >= u.vals.length - 1;
        const cost = max ? 0 : u.cost[l + 1];
        html += `<div class="item"><b>${esc(u.name)}</b><div class="desc">${esc(u.desc)}</div><div class="own">teraz: ${esc(u.fmt(u.vals[l]))}${max ? '' : ` → ${esc(u.fmt(u.vals[l + 1]))}`}</div>`;
        html += max ? `<div class="lv">maksymalny poziom</div>` : `<div class="price">${fmtZl(cost, 0)}</div><div class="row"><button class="btn pri" data-up="${u.id}" ${s.cash < cost ? 'disabled' : ''}>Ulepsz</button></div>`;
        html += `</div>`;
      }
    } else {
      for (const d of BLOCKS.filter((x) => x.cat === this.shopCat)) {
        const locked = d.lvl > lvl;
        html += `<div class="item ${locked ? 'lock' : ''}"><img src="${this.g.icons.block(d.id)}" alt=""><b>${esc(d.name)}</b><div class="desc">${esc(d.desc || describe(d))}</div><div class="price">${fmtZl(d.cost)}</div><div class="own">w magazynie: ${s.wh[d.id] || 0}</div>`;
        if (locked) html += `<div class="lv">od poziomu ${d.lvl}</div>`;
        else html += `<div class="row">${[1, 5, 20].map((n) => `<button class="btn ${n === 1 ? 'pri' : ''}" data-buy="${d.id}" data-n="${n}" ${s.cash < d.cost * n ? 'disabled' : ''}>×${n}</button>`).join('')}</div>`;
        html += `</div>`;
      }
    }
    $('shop-grid').innerHTML = html;
  }

  onShop(e) {
    const b = e.target.closest('[data-buy],[data-up]');
    if (!b || b.disabled) return;
    if (b.dataset.buy) {
      const n = +b.dataset.n;
      this.g.store.buy(b.dataset.buy, n).then((ok) => {
        if (ok) { this.g.audio.play('ui_buy'); this.g.autoSlot(b.dataset.buy); this.g.hud.toast(`Kupione: ${n} × ${BLOCK_BY_ID[b.dataset.buy].name}`); }
        else this.g.hud.toast('Za mało kasy.', 'err');
        this.renderShop();
      });
    } else if (b.dataset.up) {
      this.g.store.buyUpgrade(b.dataset.up).then((ok) => {
        if (ok) { this.g.audio.play('ui_buy'); this.g.applyUpgrades(); }
        this.renderShop();
      });
    }
  }
}

function describe(d) {
  if (d.kind === 'spawner') {
    const names = ['pospolite', 'niepospolite', 'rzadkie', 'epickie', 'legendarne', 'mityczne'];
    const tot = d.w.reduce((a, b) => a + b, 0);
    const best = d.w.map((w, i) => [w, i]).filter(([w]) => w > 0).map(([w, i]) => `${names[i]} ${Math.round((w / tot) * 100)}%`).slice(-3).join(', ');
    return `${d.manual ? 'Ręczny' : `Co ${d.every} s`}: ${best}${d.secret ? ', szansa na sekretne' : ''}`;
  }
  if (d.kind === 'belt') return `Taśma ${String(d.speed).replace('.', ',')} m/s. Ryby na niej schną.`;
  if (d.kind === 'flume') return 'Woda niesie ryby, nie psują się.';
  if (d.kind === 'machine' && d.trait) return `${Math.round(d.chance * 100)}% na trait ${TRAITS.find((t) => t.id === d.trait).name} ×${String(TRAITS.find((t) => t.id === d.trait).m).replace('.', ',')}`;
  return '';
}
