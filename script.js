/* ═══════════════════════════════════════════════════════════
   SpendSmart — script.js
   All features: Onboarding modal · Dark/Light mode ·
   CRUD transactions · Donut chart · Budget alerts ·
   Reports · Settings · CSV export · localStorage
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────
   STORAGE KEYS
────────────────────────────────────── */
const LS = {
  TXNS:    'ss_txns_v4',
  NID:     'ss_nid_v4',
  NAME:    'ss_name_v4',
  SALARY:  'ss_salary_v4',
  BUDGET:  'ss_budget_v4',
  CATS:    'ss_cats_v4',
  CUR:     'ss_cur_v4',
  THEME:   'ss_theme_v4',
  SEEN:    'ss_seen_v4',
};

/* ──────────────────────────────────────
   DEFAULT CATEGORIES
────────────────────────────────────── */
let COLORS = {
  Food:'#EF4444', Transport:'#06B6D4', Shopping:'#8B5CF6',
  Bills:'#F59E0B', Health:'#10B981',   Fun:'#EC4899',
  Salary:'#059669', Freelance:'#3B82F6', Others:'#F97316'
};
let ICONS = {
  Food:'🍕', Transport:'🚌', Shopping:'🛍️', Bills:'💡',
  Health:'💊', Fun:'🎮', Salary:'💼', Freelance:'💻', Others:'📦'
};
let BKGS = {
  Food:'rgba(239,68,68,.13)', Transport:'rgba(6,182,212,.13)',
  Shopping:'rgba(139,92,246,.13)', Bills:'rgba(245,158,11,.13)',
  Health:'rgba(16,185,129,.13)', Fun:'rgba(236,72,153,.13)',
  Salary:'rgba(5,150,105,.13)', Freelance:'rgba(59,130,246,.13)',
  Others:'rgba(249,115,22,.13)'
};

/* ──────────────────────────────────────
   STATE
────────────────────────────────────── */
let txns      = [];          // transactions array
let nid       = 1;           // next id
let userName  = '';          // user's display name
let salary    = 0;           // monthly salary
let budget    = 0;           // monthly budget cap
let currency  = '₹';        // currency symbol
let editId    = null;        // id being edited
let txFilter  = 'all';       // transactions page filter
let typeMap   = { q:'expense', m:'expense' }; // current type per form
let curPage   = 'dashboard'; // active page

/* ──────────────────────────────────────
   LOAD FROM LOCALSTORAGE
────────────────────────────────────── */
function load() {
  try { txns = JSON.parse(localStorage.getItem(LS.TXNS) || '[]'); } catch { txns = []; }
  nid      = parseInt(localStorage.getItem(LS.NID)    || '1');
  userName = localStorage.getItem(LS.NAME)   || '';
  salary   = parseFloat(localStorage.getItem(LS.SALARY) || '0');
  budget   = parseFloat(localStorage.getItem(LS.BUDGET) || '0');
  currency = localStorage.getItem(LS.CUR)    || '₹';

  // Custom categories
  try {
    const saved = JSON.parse(localStorage.getItem(LS.CATS) || '{}');
    if (saved.colors) Object.assign(COLORS, saved.colors);
    if (saved.icons)  Object.assign(ICONS,  saved.icons);
    if (saved.bkgs)   Object.assign(BKGS,   saved.bkgs);
  } catch {}
}

function save() {
  localStorage.setItem(LS.TXNS,   JSON.stringify(txns));
  localStorage.setItem(LS.NID,    nid);
  localStorage.setItem(LS.NAME,   userName);
  localStorage.setItem(LS.SALARY, salary);
  localStorage.setItem(LS.BUDGET, budget);
  localStorage.setItem(LS.CUR,    currency);
  localStorage.setItem(LS.CATS,   JSON.stringify({ colors:COLORS, icons:ICONS, bkgs:BKGS }));
}

/* ──────────────────────────────────────
   UTILITIES
────────────────────────────────────── */
function fmt(n) {
  const a = Math.abs(n);
  if (a >= 10000000) return currency + (n/10000000).toFixed(1) + 'Cr';
  if (a >= 100000)   return currency + (n/100000).toFixed(1) + 'L';
  if (a >= 1000)     return currency + (n/1000).toFixed(1) + 'K';
  return currency + Number(n).toLocaleString('en-IN');
}
function todayStr()   { return new Date().toISOString().slice(0,10); }
function monthName()  { return new Date().toLocaleString('en-IN', {month:'long', year:'numeric'}); }
function greetWord()  {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function $id(id)      { return document.getElementById(id); }
function setText(id, v){ const e=$id(id); if(e) e.textContent = v; }
function setWidth(id, pct){ const e=$id(id); if(e) e.style.width = Math.min(100, Math.max(0, pct))+'%'; }

/* ──────────────────────────────────────
   DARK / LIGHT MODE
────────────────────────────────────── */
function applyTheme() {
  const t   = localStorage.getItem(LS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', t);
  const ico = $id('themeIcon');
  if (ico) ico.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(LS.THEME, next);
  const ico = $id('themeIcon');
  if (ico) ico.textContent = next === 'dark' ? '☀️' : '🌙';
  showToast(next === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on');
}

/* ──────────────────────────────────────
   SIDEBAR
────────────────────────────────────── */
function toggleSidebar() {
  $id('sidebar').classList.toggle('open');
  $id('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  $id('sidebar').classList.remove('open');
  $id('sidebarOverlay').classList.remove('open');
}

/* ──────────────────────────────────────
   NAVIGATION
────────────────────────────────────── */
function goTo(page, linkEl) {
  curPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = $id('page-' + page);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  closeSidebar();
  renderPage(page);
}
function renderPage(page) {
  if (page === 'dashboard')    renderDash();
  if (page === 'transactions') renderTxPage();
  if (page === 'budget')       renderBudget();
  if (page === 'reports')      renderReports();
  if (page === 'settings')     renderSettings();
}

/* ──────────────────────────────────────
   ONBOARDING MODAL  (👤 feature)
────────────────────────────────────── */
function openOnboard() {
  const bd = $id('obBackdrop');
  if (!bd) return;
  bd.classList.remove('hidden');

  // Pre-fill current values if already set
  const ni = $id('obName');   if (ni) ni.value = userName;
  const si = $id('obSalary'); if (si) si.value = salary || '';

  setTimeout(() => $id('obName')?.focus(), 180);
}
function closeOnboard() {
  $id('obBackdrop')?.classList.add('hidden');
}

function handleSave() {
  const name = ($id('obName')?.value || '').trim();
  const sal  = parseFloat($id('obSalary')?.value || '0');

  if (!name) { shakeEl($id('obName')); return; }

  userName = name;
  salary   = sal > 0 ? sal : 0;

  // Remove old auto-salary transaction; insert new if salary provided
  txns = txns.filter(t => !t._auto);
  if (salary > 0) {
    txns.push({
      id: nid++, type: 'income', category: 'Salary',
      desc: 'Monthly Salary', amount: salary,
      date: todayStr(), _auto: true
    });
  }

  localStorage.setItem(LS.SEEN, '1');
  save();
  syncUserUI();
  closeOnboard();
  showToast('Welcome, ' + userName + '! 🎉');
  renderPage(curPage);
}

function handleSkip() {
  // Skip → reset everything to zero
  txns     = [];
  salary   = 0;
  userName = '';
  localStorage.setItem(LS.SEEN, '1');
  save();
  syncUserUI();
  closeOnboard();
  renderPage(curPage);
}

function syncUserUI() {
  const av = userName ? userName[0].toUpperCase() : '?';
  const nm = userName || 'Guest';
  setText('sbAv',   av);
  setText('sbName', nm);
  setText('topAv',  av);
  const topAvatar = $id('topAv');
  if (topAvatar) topAvatar.textContent = av;
}

/* ──────────────────────────────────────
   ADD / EDIT MODAL
────────────────────────────────────── */
function openAddModal(id) {
  editId = id || null;
  const bd = $id('addBackdrop');
  if (!bd) return;
  bd.classList.add('open');

  setText('addModalTitle', editId ? 'Edit Transaction' : 'Add Transaction');
  setText('mSave', editId ? 'Save Changes' : '＋ Add Transaction');

  if (editId) {
    const t = txns.find(x => x.id === editId);
    if (t) {
      if ($id('mDesc')) $id('mDesc').value = t.desc;
      if ($id('mAmt'))  $id('mAmt').value  = t.amount;
      if ($id('mCat'))  $id('mCat').value  = t.category;
      if ($id('mDate')) $id('mDate').value  = t.date;
      setType(t.type, 'm');
    }
  } else {
    if ($id('mDesc')) $id('mDesc').value = '';
    if ($id('mAmt'))  $id('mAmt').value  = '';
    if ($id('mDate')) $id('mDate').value  = todayStr();
    setType('expense', 'm');
  }
  syncSelects();
  setTimeout(() => $id('mDesc')?.focus(), 130);
}
function closeAddModal() {
  $id('addBackdrop')?.classList.remove('open');
  editId = null;
}
function closeAddBg(e) {
  if (e && e.target === $id('addBackdrop')) closeAddModal();
}

/* ──────────────────────────────────────
   TYPE TOGGLE (expense / income)
────────────────────────────────────── */
function setType(type, view) {
  const mode = view === 'q' || view === 'm' ? view : 'q';
  typeMap[mode] = ['expense','income'].includes(type) ? type : 'expense';

  const eId = mode === 'q' ? 'qExpBtn' : 'mExpBtn';
  const iId = mode === 'q' ? 'qIncBtn' : 'mIncBtn';
  const eBtn = $id(eId), iBtn = $id(iId);
  if (!eBtn || !iBtn) return;
  eBtn.classList.remove('active');
  iBtn.classList.remove('active');
  (type === 'income' ? iBtn : eBtn).classList.add('active');
}

/* ──────────────────────────────────────
   ADD / UPDATE TRANSACTION
────────────────────────────────────── */
function addTxn(view) {
  const dId = view === 'q' ? 'qDesc' : 'mDesc';
  const aId = view === 'q' ? 'qAmt'  : 'mAmt';
  const cId = view === 'q' ? 'qCat'  : 'mCat';
  const dtId= view === 'q' ? 'qDate' : 'mDate';

  const desc = ($id(dId)?.value || '').trim();
  const amt  = parseFloat($id(aId)?.value  || '0');
  const cat  = $id(cId)?.value   || 'Others';
  const date = $id(dtId)?.value  || todayStr();
  const type = typeMap[view]     || 'expense';

  if (!desc)       { shakeEl($id(dId)); return; }
  if (!amt||amt<=0){ shakeEl($id(aId)); return; }

  if (editId) {
    const i = txns.findIndex(t => t.id === editId);
    if (i >= 0) Object.assign(txns[i], { desc, amount:amt, category:cat, date, type, _auto:false });
    editId = null;
  } else {
    txns.push({ id:nid++, type, category:cat, desc, amount:amt, date, _auto:false });
  }

  if ($id(dId)) $id(dId).value = '';
  if ($id(aId)) $id(aId).value = '';

  if (view === 'm') closeAddModal();

  save();
  renderPage(curPage);
  budgetAlert();
  showToast('Transaction saved ✓');
}

/* ──────────────────────────────────────
   DELETE
────────────────────────────────────── */
function delTxn(id) {
  if (!confirm('Delete this transaction?')) return;
  txns = txns.filter(t => t.id !== id);
  save();
  renderPage(curPage);
  showToast('Deleted ✓');
}

/* ──────────────────────────────────────
   BUDGET ALERT  🔔
────────────────────────────────────── */
function budgetAlert() {
  if (!budget) return;
  const exp = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
  const pct = (exp/budget)*100;
  if (pct >= 100 && !sessionStorage.getItem('alert100')) {
    sessionStorage.setItem('alert100','1');
    showToast('⚠️ You have exceeded your budget!', 4500);
  } else if (pct >= 75 && !sessionStorage.getItem('alert75')) {
    sessionStorage.setItem('alert75','1');
    showToast('⚡ You\'ve used 75% of your budget', 3800);
  }
}

/* ──────────────────────────────────────
   DONUT CHART  (pure SVG)
────────────────────────────────────── */
function drawDonut(svgId, data) {
  const svg = $id(svgId);
  if (!svg) return;
  svg.querySelectorAll('.dsg').forEach(g => g.remove());

  const r=76, cx=110, cy=110, C=2*Math.PI*r;
  const tot = data.reduce((s,d)=>s+d.v, 0);
  if (!tot) return;

  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.setAttribute('class','dsg');
  g.setAttribute('transform',`rotate(-90,${cx},${cy})`);

  let acc = 0;
  data.forEach(d => {
    const f  = d.v/tot;
    const dl = Math.max(f*C - 4, 0);
    const c  = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
    c.setAttribute('fill','none'); c.setAttribute('stroke', d.c);
    c.setAttribute('stroke-width','28');
    c.setAttribute('stroke-dasharray', `${dl} ${C-dl}`);
    c.setAttribute('stroke-dashoffset', -(acc*C));
    g.appendChild(c);
    acc += f;
  });
  svg.appendChild(g);
}

function catData() {
  const m = {};
  txns.filter(t=>t.type==='expense').forEach(t => { m[t.category] = (m[t.category]||0)+t.amount; });
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([n,v]) => ({ n, v, c: COLORS[n]||'#888' }));
}

/* ──────────────────────────────────────
   RENDER DASHBOARD
────────────────────────────────────── */
function renderDash() {
  const inc  = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0);
  const exp  = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
  const bal  = inc - exp;
  const sav  = inc > 0 ? Math.round((Math.max(0,bal)/inc)*100) : 0;
  const incC = txns.filter(t=>t.type==='income').length;
  const expC = txns.filter(t=>t.type==='expense').length;

  // Greeting + period
  setText('dashHello', userName ? `${greetWord()}, ${userName} 👋` : 'Welcome to SpendSmart 👋');
  setText('dashSub',   `Your financial overview · ${monthName()}`);
  setText('sbPeriod',  monthName());
  setText('chartPeriod', monthName());

  // Stat cards — all start at zero, only show data if user has entries
  setText('sIncome',   fmt(inc));
  setText('sExpense',  fmt(exp));
  setText('sBalance',  fmt(bal));
  setText('sSavings',  sav + '%');
  setText('sIncomeC',  incC + ' transactions');
  setText('sExpenseC', expC + ' transactions');

  // Balance card text color
  const bv = $id('sBalance');
  if (bv) bv.style.color = bal < 0 ? 'var(--c-rose)' : '';

  // Progress bars
  const mx = Math.max(inc, exp, 1);
  setWidth('pIncome',  inc/mx*100);
  setWidth('pExpense', exp/mx*100);
  setWidth('pBalance', Math.min(100, Math.abs(bal)/mx*100));
  setWidth('pSavings', Math.min(100, sav));

  // Donut chart
  const cd   = catData();
  const totE = cd.reduce((s,d)=>s+d.v, 0);
  drawDonut('donutDash', cd);

  setText('donutTop',   cd.length ? cd[0].n.slice(0,5) : '—');
  setText('spentBadge', fmt(totE) + ' spent');

  const leg = $id('dashLegend');
  if (leg) {
    leg.innerHTML = cd.length
      ? cd.map(d=>`<div class="leg-item">
          <div class="leg-dot" style="background:${d.c}"></div>
          <span class="leg-name">${d.n}</span>
          <span class="leg-val" style="color:${d.c}">${fmt(d.v)}</span>
        </div>`).join('')
      : '<div class="leg-empty">Add expenses to see chart</div>';
  }

  // Transaction count
  setText('dashCnt', txns.length + ' entries');

  // Recent transactions (latest 12)
  const list = $id('dashList');
  if (list) {
    list.innerHTML = txns.length
      ? [...txns].reverse().slice(0,12).map(t=>rowHTML(t)).join('')
      : `<div class="empty-box">
           <div class="empty-ico">📭</div>
           <div class="empty-title">No transactions yet</div>
           <div class="empty-text">Use the form to add your first one!</div>
         </div>`;
  }

  syncSelects();
  const qd = $id('qDate'); if (qd && !qd.value) qd.value = todayStr();
}

/* ──────────────────────────────────────
   RENDER TRANSACTIONS PAGE
────────────────────────────────────── */
function renderTxPage() {
  // Sync category filter
  const cf = $id('txCatFilter');
  if (cf) {
    const prev = cf.value;
    cf.innerHTML = '<option value="">All categories</option>' +
      Object.keys(COLORS).map(k=>`<option value="${k}">${ICONS[k]} ${k}</option>`).join('');
    if (prev && COLORS[prev]) cf.value = prev;
  }
  renderTxns();
}

function renderTxns() {
  const s   = ($id('txSearch')?.value||'').toLowerCase();
  const cat = $id('txCatFilter')?.value || '';
  let list  = [...txns].reverse();

  if (txFilter !== 'all') list = list.filter(t=>t.type===txFilter);
  if (s)   list = list.filter(t=>t.desc.toLowerCase().includes(s)||t.category.toLowerCase().includes(s));
  if (cat) list = list.filter(t=>t.category===cat);

  const box = $id('txList');
  if (!box) return;
  box.innerHTML = list.length
    ? list.map(t=>rowHTML(t)).join('')
    : `<div class="empty-box">
         <div class="empty-ico">🔍</div>
         <div class="empty-title">No transactions found</div>
         <div class="empty-text">Try adjusting your search or filter</div>
       </div>`;
}

function setFilter(type, btn) {
  txFilter = type;
  document.querySelectorAll('.fpill').forEach(p=>p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTxns();
}

/* ──────────────────────────────────────
   TRANSACTION ROW HTML
────────────────────────────────────── */
function rowHTML(t) {
  return `<div class="txn-row">
    <div class="txn-ic" style="background:${BKGS[t.category]||'rgba(0,0,0,.06)'}">${ICONS[t.category]||'📦'}</div>
    <div class="txn-info">
      <div class="txn-desc">${esc(t.desc)}</div>
      <div class="txn-meta">${t.category}${t._auto?' · auto':''}</div>
    </div>
    <div class="txn-date">${t.date}</div>
    <div class="txn-amt ${t.type==='income'?'inc':'exp'}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
    <div class="txn-acts">
      <button class="ico-btn edit" onclick="openAddModal(${t.id})" title="Edit">✎</button>
      <button class="ico-btn"      onclick="delTxn(${t.id})"       title="Delete">✕</button>
    </div>
  </div>`;
}

/* ──────────────────────────────────────
   RENDER BUDGET PAGE
────────────────────────────────────── */
function renderBudget() {
  const inp = $id('budgetInp');
  if (inp && budget) inp.value = budget;

  const exp = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
  const pct = budget > 0 ? Math.min(100, Math.round(exp/budget*100)) : 0;
  const cls = pct>=100 ? 'over' : pct>=75 ? 'warn' : 'ok';
  const note= pct>=100
    ? `⚠️ Over budget by ${fmt(exp-budget)}! Cut back now.`
    : pct>=75
    ? `⚡ ${100-pct}% left — be careful spending`
    : `✅ ${fmt(budget-exp)} remaining`;

  const bv = $id('budgetView');
  if (bv) {
    bv.innerHTML = !budget
      ? '<p style="color:var(--tx2);font-size:14px;margin-top:14px">Set a budget above to start tracking your limits.</p>'
      : `<div class="budget-track-wrap">
          <div class="budget-track-top"><span>${fmt(exp)} spent</span><span>${pct}% of ${fmt(budget)}</span></div>
          <div class="b-track"><div class="b-fill ${cls}" style="width:${pct}%"></div></div>
          <div class="budget-note" style="color:${cls==='over'?'var(--c-rose)':cls==='warn'?'var(--c-amber)':'var(--c-green)'}">${note}</div>
        </div>`;
  }

  // Category breakdown
  const cd = catData();
  const te = cd.reduce((s,d)=>s+d.v, 0);
  const cb = $id('catBudget');
  if (cb) {
    cb.innerHTML = cd.length
      ? cd.map(d => {
          const p = te ? (d.v/te*100).toFixed(1) : 0;
          return `<div class="cat-brow">
            <div class="cat-bic" style="background:${BKGS[d.n]||'rgba(0,0,0,.06)'}">${ICONS[d.n]||'📦'}</div>
            <div class="cat-binfo">
              <div class="cat-bname">${d.n}</div>
              <div class="cat-bmeta"><span>${fmt(d.v)}</span><span>${p}%</span></div>
              <div class="cat-bbar"><div class="cat-bfill" style="width:${p}%;background:${d.c}"></div></div>
            </div>
          </div>`;
        }).join('')
      : '<p style="color:var(--tx2);font-size:14px">No expense data yet.</p>';
  }

  // Last 7
  const wl = $id('weekList');
  if (wl) {
    const recent = [...txns].reverse().slice(0,7);
    wl.innerHTML = recent.length
      ? recent.map(t=>`<div class="week-row">
          <div>
            <div class="week-desc">${esc(t.desc)}</div>
            <div class="week-meta">${t.date} · ${t.category}</div>
          </div>
          <div class="week-amt" style="color:${t.type==='income'?'var(--c-green)':'var(--c-rose)'}">
            ${t.type==='income'?'+':'-'}${fmt(t.amount)}
          </div>
        </div>`).join('')
      : '<p style="color:var(--tx2);font-size:14px">No transactions yet.</p>';
  }
}

function saveBudget() {
  const v = parseFloat($id('budgetInp')?.value||'0');
  if (v>0) {
    budget = v; save();
    sessionStorage.removeItem('alert100');
    sessionStorage.removeItem('alert75');
    renderBudget();
    showToast('Budget set to ' + fmt(budget) + ' ✓');
    budgetAlert();
  } else { shakeEl($id('budgetInp')); }
}

/* ──────────────────────────────────────
   RENDER REPORTS PAGE  📊
────────────────────────────────────── */
function renderReports() {
  const cd  = catData();
  const te  = cd.reduce((s,d)=>s+d.v, 0);
  const inc = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0);
  const mx  = Math.max(inc, te, 1);

  drawDonut('donutRep', cd);
  setText('repTotal', fmt(te));

  const rl = $id('repLegend');
  if (rl) {
    rl.innerHTML = cd.length
      ? cd.map(d=>`<div class="leg-item">
          <div class="leg-dot" style="background:${d.c}"></div>
          <span class="leg-name">${d.n}</span>
          <span class="leg-val" style="color:${d.c}">${fmt(d.v)}</span>
        </div>`).join('')
      : '<div class="leg-empty">No expense data yet</div>';
  }

  // Bar chart
  const bc = $id('barChart');
  if (bc) {
    const bal = inc - te;
    const sav = inc > 0 ? Math.round(Math.max(0,bal)/inc*100) : 0;
    bc.innerHTML = `
      <div class="bar-item">
        <span class="bar-lbl">Income</span>
        <div class="bar-track"><div class="bar-fill inc" style="width:${(inc/mx*100).toFixed(1)}%"></div></div>
        <span class="bar-val" style="color:var(--c-green)">${fmt(inc)}</span>
      </div>
      <div class="bar-item">
        <span class="bar-lbl">Expenses</span>
        <div class="bar-track"><div class="bar-fill exp" style="width:${(te/mx*100).toFixed(1)}%"></div></div>
        <span class="bar-val" style="color:var(--c-rose)">${fmt(te)}</span>
      </div>
      <div style="margin-top:20px;padding:18px;background:var(--bg-input);border-radius:var(--r2);border:1px solid var(--bd)">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--tx3);margin-bottom:6px">Net Balance</div>
        <div style="font-size:28px;font-weight:900;color:${bal>=0?'var(--c-green)':'var(--c-rose)'}">${fmt(bal)}</div>
        <div style="font-size:13px;color:var(--tx2);margin-top:5px">${sav}% savings rate</div>
      </div>`;
  }

  // Top categories
  const tc = $id('topCats');
  if (tc) {
    tc.innerHTML = cd.length
      ? cd.map((d,i) => {
          const p = te ? (d.v/te*100).toFixed(1) : 0;
          return `<div class="tc-row">
            <div class="tc-rank">#${i+1}</div>
            <div class="tc-ic" style="background:${BKGS[d.n]||'rgba(0,0,0,.06)'}">${ICONS[d.n]||'📦'}</div>
            <div class="tc-info">
              <div class="tc-name">${d.n}</div>
              <div class="tc-bar"><div class="tc-fill" style="width:${p}%;background:${d.c}"></div></div>
            </div>
            <div class="tc-amt">${fmt(d.v)}</div>
          </div>`;
        }).join('')
      : '<p style="color:var(--tx2);font-size:14px;padding:10px 0">No data yet.</p>';
  }
}

/* ──────────────────────────────────────
   RENDER SETTINGS
────────────────────────────────────── */
function renderSettings() {
  const an = $id('accName'); if(an) an.value = userName;
  const ac = $id('accCur');  if(ac) ac.value = currency;
  renderCatList();
}
function saveAccount() {
  const n = ($id('accName')?.value||'').trim();
  const c = $id('accCur')?.value || '₹';
  if (!n) { shakeEl($id('accName')); return; }
  userName = n; currency = c;
  save(); syncUserUI();
  showToast('Account saved ✓');
}
function addCat() {
  const name  = ($id('newCatName')?.value||'').trim();
  const emoji = ($id('newCatEmoji')?.value||'').trim() || '📦';
  if (!name) { shakeEl($id('newCatName')); return; }
  const hue = Math.floor(Math.random()*360);
  COLORS[name] = `hsl(${hue},60%,58%)`;
  ICONS[name]  = emoji;
  BKGS[name]   = `hsla(${hue},60%,58%,0.14)`;
  if ($id('newCatName'))  $id('newCatName').value  = '';
  if ($id('newCatEmoji')) $id('newCatEmoji').value = '';
  save(); renderCatList(); syncSelects();
  showToast(`"${name}" added ✓`);
}
function removeCat(k) {
  if (!confirm(`Remove category "${k}"?`)) return;
  delete COLORS[k]; delete ICONS[k]; delete BKGS[k];
  save(); renderCatList(); syncSelects();
}
function renderCatList() {
  const box = $id('catsList');
  if (!box) return;
  box.innerHTML = Object.keys(COLORS).map(k=>`
    <div class="cat-row">
      <div class="cat-row-ic">${ICONS[k]||'📦'}</div>
      <div class="cat-row-name">${k}</div>
      <button class="remove-btn" onclick="removeCat('${k}')">Remove</button>
    </div>`).join('');
}
function clearData() {
  if (!confirm('⚠️ Delete ALL transactions? This cannot be undone.')) return;
  txns = []; nid = 1;
  sessionStorage.removeItem('alert100');
  sessionStorage.removeItem('alert75');
  save(); renderPage(curPage);
  showToast('All data cleared');
}

/* ──────────────────────────────────────
   EXPORT CSV  💾
────────────────────────────────────── */
function exportCSV() {
  if (!txns.length) { showToast('No data to export'); return; }
  const rows = [
    ['ID','Type','Category','Description','Amount','Date'],
    ...txns.map(t=>[t.id, t.type, t.category, `"${String(t.desc).replace(/"/g,'""')}"`, t.amount, t.date])
  ];
  const csv  = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {href:url, download:'spendsmart_export.csv'});
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV exported ✓');
}

/* ──────────────────────────────────────
   SYNC CATEGORY <SELECT> ELEMENTS
────────────────────────────────────── */
function syncSelects() {
  document.querySelectorAll('select[id$="Cat"]').forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = Object.keys(COLORS)
      .map(k=>`<option value="${k}">${ICONS[k]||'📦'} ${k}</option>`)
      .join('');
    if (prev && COLORS[prev]) sel.value = prev;
  });
}

/* ──────────────────────────────────────
   TOAST NOTIFICATION
────────────────────────────────────── */
function showToast(msg, dur) {
  const t = $id('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), dur||2700);
}

/* ──────────────────────────────────────
   SHAKE (validation feedback)
────────────────────────────────────── */
function shakeEl(el) {
  if (!el) return;
  el.style.borderColor = 'var(--c-rose)';
  el.style.boxShadow   = '0 0 0 3px rgba(225,29,72,.22)';
  el.animate(
    [{transform:'translateX(0)'},{transform:'translateX(-7px)'},
     {transform:'translateX(7px)'},{transform:'translateX(0)'}],
    {duration:320, easing:'ease-in-out'}
  );
  setTimeout(()=>{ el.style.borderColor=''; el.style.boxShadow=''; }, 900);
}

/* ──────────────────────────────────────
   KEYBOARD SHORTCUTS
────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeOnboard(); closeAddModal(); closeSidebar();
  }
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter') {
    const id = document.activeElement?.id || '';
    if (id.startsWith('q')) addTxn('q');
    if (id.startsWith('m')) addTxn('m');
    if (id==='obName'||id==='obSalary') handleSave();
  }
});

/* ──────────────────────────────────────
   WIRE ONBOARD BUTTONS
────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  $id('obSave')?.addEventListener('click', handleSave);
  $id('obSkip')?.addEventListener('click', handleSkip);
  $id('obClose')?.addEventListener('click', closeOnboard);

  $id('obName')?.addEventListener('keydown',   e => e.key==='Enter' && handleSave());
  $id('obSalary')?.addEventListener('keydown', e => e.key==='Enter' && handleSave());
});

/* ──────────────────────────────────────
   INIT
────────────────────────────────────── */
function init() {
  applyTheme();   // apply saved dark/light
  load();         // load localStorage data
  syncSelects();  // populate category dropdowns
  syncUserUI();   // update avatar / name in topbar + sidebar
  setText('sbPeriod', monthName());

  // Set today's date on quick form
  const qd = $id('qDate'); if (qd) qd.value = todayStr();

  // Render dashboard
  renderDash();

  // Show onboarding after 4.5s if user has not seen it
  if (!localStorage.getItem(LS.SEEN)) {
    setTimeout(openOnboard, 4500);
  }
}

init();
