// ══════════════════════════════════════════════════════
// LOGIKA TAMPILAN, RENDER DATA & MODAL (UI)
// ══════════════════════════════════════════════════════

// Ganti Menu Tab Aktif
function switchTab(id){
  const tabIds = ['dashboard', 'transaksi', 'hutang', 'tabungan', 'pengaturan', 'data'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', tabIds[i] === id);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  
  const panelEl = document.getElementById('panel-' + id);
  if(panelEl) panelEl.classList.add('active');
  
  if(id === 'pengaturan'){
    loadSettingsToForm();
    renderCategories();
    renderLimitKatSettings();
    renderTagList();
    if (typeof loadApiKeyToForm === 'function') {
      loadApiKeyToForm();
    }
  }
  if(id === 'data') {
    renderSummary();
    const noteArea = document.getElementById('exportNoteInput');
    if (noteArea) noteArea.value = st.exportNote || '';
  }
  if(id === 'hutang') renderDebts();
  if(id === 'tabungan') renderSavings();
}

// Tampilkan Toast Notifikasi Kecil di Pojok Bawah
function showToast(msg, type){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg; 
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_tt); 
  _tt = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── RENDER: DASHBOARD ──
function renderDashboard(){
  const dMonthLabel = document.getElementById('dashMonthLabel');
  if(dMonthLabel) dMonthLabel.textContent = MONTHS[curMonth] + ' ' + curYear;
  
  const txs = txForMonth(curYear, curMonth);
  const totalMasuk = txs.filter(t => t.type === 'pemasukan').reduce((a, t) => a + t.amount, 0);
  const totalKeluar = txs.filter(t => t.type === 'pengeluaran').reduce((a, t) => a + t.amount, 0);
  const saldo = totalMasuk - totalKeluar;
  
  const dSaldo = document.getElementById('dSaldo');
  if(dSaldo) {
    dSaldo.textContent = rp(saldo);
    dSaldo.style.color = saldo >= 0 ? 'var(--gold)' : 'var(--red)';
  }
  
  const dMasuk = document.getElementById('dMasuk');
  if(dMasuk) dMasuk.textContent = rp(totalMasuk);
  
  const dKeluar = document.getElementById('dKeluar');
  if(dKeluar) dKeluar.textContent = rp(totalKeluar);
  
  const dMasukSub = document.getElementById('dMasukSub');
  if(dMasukSub) dMasukSub.textContent = txs.filter(t => t.type === 'pemasukan').length + ' transaksi';
  
  const dKeluarSub = document.getElementById('dKeluarSub');
  if(dKeluarSub) dKeluarSub.textContent = txs.filter(t => t.type === 'pengeluaran').length + ' transaksi';
  
  // Rata-rata per hari aktual (hanya hari yang ada pengeluaran)
  const hariKeluar = new Set(txs.filter(t => t.type === 'pengeluaran').map(t => t.date));
  const jmlHari = hariKeluar.size;
  const dRata = document.getElementById('dRata');
  const dRataSub = document.getElementById('dRataSub');
  
  if(jmlHari > 0){
    const rataHari = totalKeluar / jmlHari;
    if(dRata) dRata.textContent = rp(Math.round(rataHari));
    if(dRataSub) dRataSub.textContent = jmlHari + ' hari aktual tercatat';
  } else {
    if(dRata) dRata.textContent = '—';
    if(dRataSub) dRataSub.textContent = 'belum ada pengeluaran';
  }
  
  const lb = st.settings.limitBulan;
  const dLimitTotal = document.getElementById('dashLimitTotal');
  const dSisa = document.getElementById('dSisa');
  const dSisaSub = document.getElementById('dSisaSub');
  
  if(lb > 0){
    if(dLimitTotal) dLimitTotal.style.display = '';
    const pct = Math.min(100, (totalKeluar / lb) * 100);
    const col = limitColor(pct);
    const dLimitTotalItem = document.getElementById('dashLimitTotalItem');
    if(dLimitTotalItem) {
      dLimitTotalItem.innerHTML = `
        <div class="limit-row"><span class="limit-name">Total Pengeluaran</span><span class="limit-nums" style="color:${col};">${rp(totalKeluar)} / ${rp(lb)} (${pct.toFixed(1)}%)</span></div>
        <div class="limit-bar-wrap"><div class="limit-bar-fill" style="width:${pct}%;background:${col};"></div></div>`;
    }
    const sisa = lb - totalKeluar;
    if(dSisa) {
      dSisa.textContent = rp(sisa);
      dSisa.style.color = sisa >= 0 ? 'var(--text-dim)' : 'var(--red)';
    }
    if(dSisaSub) dSisaSub.textContent = rp(lb) + ' limit / bulan';
  } else {
    if(dLimitTotal) dLimitTotal.style.display = 'none';
    if(dSisa) {
      dSisa.textContent = '—';
      dSisa.style.color = 'var(--text-mute)';
    }
    if(dSisaSub) dSisaSub.textContent = 'limit belum diatur';
  }
  
  const catsWL = st.categories.filter(c => st.settings.limitKategori[c] > 0);
  const dLimitKat = document.getElementById('dashLimitKat');
  if(dLimitKat) {
    if(!catsWL.length){ 
      dLimitKat.style.display = 'none'; 
    } else {
      dLimitKat.style.display = '';
      const dLimitKatItems = document.getElementById('dashLimitKatItems');
      if(dLimitKatItems) {
        dLimitKatItems.innerHTML = catsWL.map(cat => {
          const spent = txs.filter(t => t.type === 'pengeluaran' && t.category === cat).reduce((a, t) => a + t.amount, 0);
          const lim = st.settings.limitKategori[cat];
          const pct = Math.min(100, (spent / lim) * 100);
          const col = limitColor(pct);
          return `<div class="limit-item"><div class="limit-row"><span class="limit-name">${escH(cat)}</span><span class="limit-nums" style="color:${col};">${rp(spent)} / ${rp(lim)} (${pct.toFixed(1)}%)</span></div><div class="limit-bar-wrap"><div class="limit-bar-fill" style="width:${pct}%;background:${col};"></div></div></div>`;
        }).join('');
      }
    }
  }
  
  const recent = [...st.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const dRecentBody = document.getElementById('dashRecentBody');
  if(dRecentBody) {
    dRecentBody.innerHTML = recent.length === 0 ?
      '<tr><td colspan="5" class="empty-state">Belum ada transaksi.</td></tr>' :
      recent.map(t => `<tr>
        <td class="td-date">${shortDate(t.date)}</td>
        <td><span class="badge badge-${t.type === 'pemasukan' ? 'masuk' : 'keluar'}">${t.type === 'pemasukan' ? 'Masuk' : 'Keluar'}</span></td>
        <td class="td-amt" style="color:${t.type === 'pemasukan' ? 'var(--green)' : 'var(--red)'};">${rp(t.amount)}</td>
        <td style="color:var(--text-mute);font-size:11px;">${escH(t.category)}</td>
        <td class="td-note">${escH(t.note) || '—'}</td>
      </tr>`).join('');
  }

  // Render savings summary on dashboard
  const dSavSec = document.getElementById('dashSavingsSection');
  const dSavItems = document.getElementById('dashSavingsItems');
  if(dSavSec && dSavItems) {
    if(!st.savings || st.savings.length === 0) {
      dSavSec.style.display = 'none';
    } else {
      dSavSec.style.display = '';
      dSavItems.innerHTML = st.savings.map(g => {
        const cur = g.current || 0;
        const tgt = g.target || 0;
        const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
        return `
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:4px; padding:10px; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:11px; gap:8px;">
              <span style="font-weight:500; font-family:'Playfair Display',serif; color:var(--text); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:125px;" title="${escH(g.name)}">${escH(g.name)}</span>
              <span style="font-family:'DM Mono',monospace; color:var(--gold-dim); font-weight:bold;">${pct}%</span>
            </div>
            <div style="background:var(--bg); border:1px solid var(--border); height:6px; border-radius:3px; overflow:hidden;">
              <div style="background:var(--gold); height:100%; width:${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// ── RENDER: TRANSAKSI ──
function renderTx(){
  const txMonthLabel = document.getElementById('txMonthLabel');
  if(txMonthLabel) txMonthLabel.textContent = MONTHS[curMonth] + ' ' + curYear;
  
  const sortModeEl = document.getElementById('sortMode');
  const mode = sortModeEl ? sortModeEl.value : 'terbaru';
  let txs = txForMonth(curYear, curMonth);
  if(txFilter !== 'semua') txs = txs.filter(t => t.type === txFilter);

  const dateFromEl = document.getElementById('dateFrom');
  const dateToEl = document.getElementById('dateTo');

  let renderTxs = mode === 'rentang'
    ? (txFilter === 'semua' ? [...st.transactions] : st.transactions.filter(t => t.type === txFilter))
    : txs;

  if(activeTagFilters.size > 0){
    renderTxs = renderTxs.filter(t => {
      const txTags = t.tags || [];
      return [...activeTagFilters].every(tag => txTags.includes(tag));
    });
  }

  if(txSearch.trim()){
    const q = txSearch.trim().toLowerCase();
    renderTxs = renderTxs.filter(t =>
      (t.category || '').toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q) ||
      (t.tags || []).some(tag => String(tag).toLowerCase().includes(q))
    );
  }
  renderTxs = applySort(renderTxs, mode);

  visibleTxIds = renderTxs.map(t => t.id);
  const tbody = document.getElementById('txBody');
  if(!tbody) return;

  let sel = document.getElementById('txSelectionSummary');
  if(!sel && tbody){
    sel = document.createElement('div');
    sel.id = 'txSelectionSummary';
    sel.style.margin = '10px 0';
    tbody.closest('table').parentNode.insertBefore(sel, tbody.closest('table'));
  }
  if(!renderTxs.length){
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada transaksi.</td></tr>';
    renderTagSummary([]);
    if(sel) sel.innerHTML = '';
    return;
  }

  renderTagSummary(renderTxs);

  const grouped = {};
  renderTxs.forEach(t => {
    if(!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });

  const dates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
  const rows = [];
  rows.push(`<tr><td colspan="8"><label style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;"><input type="checkbox" id="txSelectAll" class="custom-cb"> Pilih Semua yang tampil</label></td></tr>`);

  dates.forEach(date => {
    const items = grouped[date];
    const total = items.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);
    const d = new Date(date + 'T00:00:00');
    const lbl = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    rows.push(`<tr class="day-sep-row">
      <td colspan="8">
        <div class="day-sep-label" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <span>${lbl}</span>
          <span style="font-size:11px;font-weight:700;color:var(--gold);">${rp(total)} • ${items.length} transaksi</span>
        </div>
      </td>
    </tr>`);

    items.forEach(t => {
      const tagHtml = (t.tags && t.tags.length)
        ? t.tags.map(g => `<span class="tag-display">${escH(g)}</span>`).join(' ')
        : '<span style="color:var(--text-mute);font-size:10px;">—</span>';

      rows.push(`<tr>
        <td><input type="checkbox" class="custom-cb" ${selectedTxIds.has(t.id) ? 'checked' : ''} onchange="this.checked ? selectedTxIds.add('${t.id}') : selectedTxIds.delete('${t.id}'); updateSelectedSummary();"></td>
        <td class="td-date">${shortDate(t.date)}</td>
        <td><span class="badge badge-${t.type === 'pemasukan' ? 'masuk' : 'keluar'}">${t.type === 'pemasukan' ? 'Masuk' : 'Keluar'}</span></td>
        <td class="td-amt" style="color:${t.type === 'pemasukan' ? 'var(--green)' : 'var(--red)'};">${rp(t.amount)}</td>
        <td style="color:var(--text-mute);font-size:11px;">${escH(t.category)}</td>
        <td>${tagHtml}</td>
        <td class="td-note">${escH(t.note) || '—'}</td>
        <td class="td-del" style="white-space:nowrap;">
          <button class="del-btn" onclick="openEditTx('${t.id}')" title="Edit" style="color:var(--text-mute);">✎</button>
          <button class="del-btn" onclick="deleteTx('${t.id}')" title="Hapus">✕</button>
        </td>
      </tr>`);
    });
  });

  tbody.innerHTML = rows.join('');
  const sa = document.getElementById('txSelectAll');
  if(sa){
    sa.checked = visibleTxIds.length > 0 && visibleTxIds.every(id => selectedTxIds.has(id));
    sa.onchange = function(){
      if(this.checked) visibleTxIds.forEach(id => selectedTxIds.add(id));
      else visibleTxIds.forEach(id => selectedTxIds.delete(id));
      renderTx();
    };
  }
  updateSelectedSummary();
}

function updateSelectedSummary(){
  const el = document.getElementById('txSelectionSummary');
  if(!el) return;
  let masuk = 0, keluar = 0, count = 0;
  st.transactions.forEach(t => {
    if(selectedTxIds.has(t.id)){
      count++;
      if(t.type === 'pemasukan') masuk += t.amount;
      else keluar += t.amount;
    }
  });
  const netto = masuk - keluar;
  if (count === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
  } else {
    el.style.display = 'flex';
    el.innerHTML = `
      <div>
        Dipilih: <strong>${count}</strong> transaksi &nbsp; | &nbsp; 
        Masuk: <span style="color:var(--green); font-weight:500;">${rp(masuk)}</span> &nbsp; | &nbsp; 
        Keluar: <span style="color:var(--red); font-weight:500;">${rp(keluar)}</span> &nbsp; | &nbsp; 
        Netto: <span style="font-weight:bold; color:${netto >= 0 ? 'var(--green)' : 'var(--red)'}">${rp(netto)}</span>
      </div>
      <button type="button" class="btn btn-ghost" onclick="selectedTxIds.clear(); renderTx();" style="padding: 6px 12px; font-size: 10px; letter-spacing:0.04em; text-transform:uppercase;">Bersihkan Pilihan</button>
    `;
  }
}

function renderTagSummary(txs){
  const el = document.getElementById('tagSummary');
  if(!el) return;
  if(activeTagFilters.size === 0){ 
    el.classList.remove('visible'); 
    return; 
  }
  const totalK = txs.filter(t => t.type === 'pengeluaran').reduce((a, t) => a + t.amount, 0);
  const totalM = txs.filter(t => t.type === 'pemasukan').reduce((a, t) => a + t.amount, 0);
  
  const labelEl = document.getElementById('tagSummaryLabel');
  const keluarEl = document.getElementById('tagSummaryKeluar');
  const masukEl = document.getElementById('tagSummaryMasuk');
  const countEl = document.getElementById('tagSummaryCount');
  
  if(labelEl) labelEl.textContent = [...activeTagFilters].join(' + ');
  if(keluarEl) keluarEl.textContent = rp(totalK);
  if(masukEl) masukEl.textContent = rp(totalM);
  if(countEl) countEl.textContent = txs.length + ' transaksi';
  
  el.classList.add('visible');
}

// ── SORT HELPER ──
function applySort(txs, mode){
  const arr = [...txs];
  if(mode === 'terbaru')       return arr.sort((a,b) => b.date.localeCompare(a.date));
  if(mode === 'terlama')       return arr.sort((a,b) => a.date.localeCompare(b.date));
  if(mode === 'terbesar')      return arr.sort((a,b) => b.amount - a.amount);
  if(mode === 'terkecil')      return arr.sort((a,b) => a.amount - b.amount);
  if(mode === 'kat-terbesar')  return arr.sort((a,b) => a.category.localeCompare(b.category) || b.amount - a.amount);
  if(mode === 'kat-terkecil')  return arr.sort((a,b) => a.category.localeCompare(b.category) || a.amount - b.amount);
  if(mode === 'tag-az')        return arr.sort((a,b) => (a.tags && a.tags[0] || '').localeCompare(b.tags && b.tags[0] || '') || b.date.localeCompare(a.date));
  if(mode === 'rentang'){
    const from = document.getElementById('dateFrom') ? document.getElementById('dateFrom').value : '';
    const to = document.getElementById('dateTo') ? document.getElementById('dateTo').value : '';
    return arr.filter(t => (!from || t.date >= from) && (!to || t.date <= to)).sort((a,b) => b.date.localeCompare(a.date));
  }
  return arr;
}

// ── RENDER: DEBTS ──
function renderDebts(){
  const hutang = st.debts.filter(d => d.type === 'hutang').sort((a,b) => b.date.localeCompare(a.date));
  const piutang = st.debts.filter(d => d.type === 'piutang').sort((a,b) => b.date.localeCompare(a.date));
  
  const tHutlbl = document.getElementById('totalHutangLabel');
  const tPiulbl = document.getElementById('totalPiutangLabel');
  
  // Only calculate unpaid debts or show grand totals?
  // Let's show grand total of unpaid debts vs total debts, or let's calculate total unpaid.
  // The user said: "Jika checkbox dicentang, maka warna text jadi abu-abu (artinya lunas)."
  // Showing total unpaid would be incredibly helpful, or let's match they want: total amount. Let's do total unpaid and total!
  const unpaidHutang = hutang.filter(d => !d.lunas).reduce((a,d) => a + d.amount, 0);
  const unpaidPiutang = piutang.filter(d => !d.lunas).reduce((a,d) => a + d.amount, 0);
  
  if(tHutlbl) tHutlbl.textContent = rp(unpaidHutang) + ' belum lunas';
  if(tPiulbl) tPiulbl.textContent = rp(unpaidPiutang) + ' belum lunas';
  
  const hBody = document.getElementById('hutangBody');
  if(hBody) {
    hBody.innerHTML = hutang.length === 0 ?
      '<tr><td colspan="6" class="empty-state">Tidak ada hutang.</td></tr>' :
      hutang.map(d => `<tr class="${d.lunas ? 'lunas-row' : ''}">
        <td style="text-align:center;"><input type="checkbox" class="custom-cb" ${d.lunas ? 'checked' : ''} onchange="toggleDebtLunas(${d.id}, this.checked)"></td>
        <td class="td-date">${shortDate(d.date)}</td>
        <td>${escH(d.name)}</td>
        <td class="td-amt" style="color:var(--amber);">${rp(d.amount)}</td>
        <td class="td-note">${escH(d.note) || '—'}</td>
        <td class="td-del"><button class="del-btn" onclick="deleteDebt(${d.id})">✕</button></td>
      </tr>`).join('');
  }
  
  const pBody = document.getElementById('piutangBody');
  if(pBody) {
    pBody.innerHTML = piutang.length === 0 ?
      '<tr><td colspan="6" class="empty-state">Tidak ada piutang.</td></tr>' :
      piutang.map(d => `<tr class="${d.lunas ? 'lunas-row' : ''}">
        <td style="text-align:center;"><input type="checkbox" class="custom-cb" ${d.lunas ? 'checked' : ''} onchange="toggleDebtLunas(${d.id}, this.checked)"></td>
        <td class="td-date">${shortDate(d.date)}</td>
        <td>${escH(d.name)}</td>
        <td class="td-amt" style="color:var(--blue);">${rp(d.amount)}</td>
        <td class="td-note">${escH(d.note) || '—'}</td>
        <td class="td-del"><button class="del-btn" onclick="deleteDebt(${d.id})">✕</button></td>
      </tr>`).join('');
  }
}

// ── RENDER: SETTINGS ──
function renderCategories(){
  const cList = document.getElementById('catList');
  if(cList) {
    cList.innerHTML = st.categories.map(c =>
      `<div class="cat-chip">${escH(c)}<button onclick="deleteCategory('${escH(c)}')" title="Hapus">×</button></div>`).join('');
  }
}

function renderLimitKatSettings(){
  const limitKatSettings = document.getElementById('limitKatSettings');
  if(limitKatSettings) {
    limitKatSettings.innerHTML = st.categories.map(cat =>
      `<div class="limit-settings-item"><div class="lsi-name">${escH(cat)}</div><input class="lsi-input" type="number" id="lk_${cat.replace(/\s/g,'_')}" min="0" step="1000" placeholder="0" value="${st.settings.limitKategori[cat] || 0}"></div>`).join('');
  }
}

function populateCatSelect(){
  const txCat = document.getElementById('txCat');
  if(txCat) {
    txCat.innerHTML = st.categories.map(c => `<option value="${escH(c)}">${escH(c)}</option>`).join('');
  }
}

// ── RENDER: DATA SUMMARY ──
function renderSummary(){
  const map = {};
  st.transactions.forEach(t => {
    const d = new Date(t.date + 'T00:00:00');
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if(!map[k]) map[k] = { masuk: 0, keluar: 0, count: 0, y: d.getFullYear(), m: d.getMonth() };
    if(t.type === 'pemasukan') map[k].masuk += t.amount; else map[k].keluar += t.amount;
    map[k].count++;
  });
  const keys = Object.keys(map).sort().reverse();
  const tbody = document.getElementById('summaryBody');
  if(!tbody) return;
  if(!keys.length){ 
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data.</td></tr>'; 
    return; 
  }
  tbody.innerHTML = keys.map(k => {
    const r = map[k], saldo = r.masuk - r.keluar;
    return `<tr><td class="td-date">${MONTHS[r.m]} ${r.y}</td><td class="td-amt" style="color:var(--green);font-size:13px;">${rp(r.masuk)}</td><td class="td-amt" style="color:var(--red);font-size:13px;">${rp(r.keluar)}</td><td class="td-amt" style="color:${saldo >= 0 ? 'var(--gold)' : 'var(--red)'};font-size:13px;">${rp(saldo)}</td><td style="color:var(--text-mute);font-size:11px;">${r.count}</td></tr>`;
  }).join('');
}

// ── EKSPOR PDF (Print Windows Frame) ──
function openExportModal(){
  const map = {};
  st.transactions.forEach(t => {
    const d = new Date(t.date + 'T00:00:00');
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if(!map[k]) map[k] = { y: d.getFullYear(), m: d.getMonth() };
  });
  const keys = Object.keys(map).sort().reverse();
  const expBulanSel = document.getElementById('exportBulanSel');
  if(expBulanSel) {
    expBulanSel.innerHTML = keys.map(k =>
      `<option value="${k}">${MONTHS[map[k].m]} ${map[k].y}</option>`).join('');
  }
  const modal = document.getElementById('exportModal');
  if(modal) modal.classList.add('open');
}

function closeExportModal(){ 
  const modal = document.getElementById('exportModal');
  if(modal) modal.classList.remove('open'); 
}

function onExportPeriodChange(){
  const periodVal = document.getElementById('exportPeriod') ? document.getElementById('exportPeriod').value : '';
  const picker = document.getElementById('exportBulanPicker');
  if(picker) picker.style.display = periodVal === 'pilih-bulan' ? '' : 'none';
}

function doExportPDF(){
  const period = document.getElementById('exportPeriod') ? document.getElementById('exportPeriod').value : '';
  const incTx = document.getElementById('expTx') ? document.getElementById('expTx').checked : false;
  const incDebt = document.getElementById('expDebt') ? document.getElementById('expDebt').checked : false;
  const incSumCat = document.getElementById('expSummary') ? document.getElementById('expSummary').checked : false;
  const incSavings = document.getElementById('expSavings') ? document.getElementById('expSavings').checked : false;
  const incMonthly = document.getElementById('expMonthly') ? document.getElementById('expMonthly').checked : false;

  // Tentukan transaksi yang disertakan
  let txs = st.transactions;
  let periodeLabel = 'Semua Periode';
  let daysCount = 30;

  if(period === 'bulan-ini'){
    txs = txForMonth(curYear, curMonth);
    periodeLabel = MONTHS[curMonth] + ' ' + curYear;
    daysCount = new Date(curYear, curMonth + 1, 0).getDate();
  } else if(period === 'pilih-bulan'){
    const sel = document.getElementById('exportBulanSel') ? document.getElementById('exportBulanSel').value : '';
    const [y, m] = sel.split('-').map(Number);
    txs = txForMonth(y, m - 1);
    periodeLabel = MONTHS[m - 1] + ' ' + y;
    daysCount = new Date(y, m, 0).getDate();
  } else {
    // Semua periode
    if (txs.length > 0) {
      const dates = txs.map(t => new Date(t.date + 'T00:00:00').getTime());
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const diffTime = Math.abs(maxDate - minDate);
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const keluar = txs.filter(t => t.type === 'pengeluaran');
  const masuk = txs.filter(t => t.type === 'pemasukan');
  const totalKeluar = keluar.reduce((a, t) => a + t.amount, 0);
  const totalMasuk = masuk.reduce((a, t) => a + t.amount, 0);

  // Ringkasan per kategori
  const katMap = {};
  keluar.forEach(t => { katMap[t.category] = (katMap[t.category] || 0) + t.amount; });

  // Semua bulan
  const monthMap = {};
  st.transactions.forEach(t => {
    const d = new Date(t.date + 'T00:00:00');
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if(!monthMap[k]) monthMap[k] = { masuk: 0, keluar: 0, y: d.getFullYear(), m: d.getMonth() };
    if(t.type === 'pemasukan') monthMap[k].masuk += t.amount; else monthMap[k].keluar += t.amount;
  });

  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const lb = st.settings.limitBulan || 0;
  const sisaLimit = lb - totalKeluar;

  let html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
  <title>Nota Keuangan — ${periodeLabel}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Georgia',serif;color:#1a1a1a;background:#fff;padding:40px;max-width:800px;margin:0 auto;}
    h1{font-size:22px;font-weight:700;letter-spacing:0.04em;color:#1a1a1a;margin-bottom:4px;}
    .sub{font-size:12px;color:#666;letter-spacing:0.08em;margin-bottom:32px;}
    .divider{border:none;border-top:2px solid #1a1a1a;margin:24px 0;}
    .divider-thin{border:none;border-top:1px solid #ddd;margin:16px 0;}
    h2{font-size:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#444;margin-bottom:14px;}
    .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px;}
    .sum-box{border:1px solid #ddd;border-radius:4px;padding:14px;}
    .sum-lbl{font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:monospace;}
    .sum-val{font-size:18px;font-weight:700;}
    .sum-masuk{color:#1a7a40;} .sum-keluar{color:#c0392b;} .sum-saldo{color:#8a6010;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px;}
    thead th{background:#f0f0f0;padding:9px 12px;text-align:left;font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;border-bottom:2px solid #ccc;}
    tbody td{padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;}
    tbody tr:last-child td{border-bottom:none;}
    .amt-keluar{color:#c0392b;font-weight:600;} .amt-masuk{color:#1a7a40;font-weight:600;}
    .amt-hutang{color:#b07030;font-weight:600;} .amt-piutang{color:#2060c0;font-weight:600;}
    .section{margin-bottom:32px;}
    .footer{margin-top:40px;font-size:10px;color:#aaa;letter-spacing:0.08em;font-family:monospace;text-align:right;}
    .badge{display:inline-block;padding:1px 7px;border-radius:3px;font-size:9px;letter-spacing:0.1em;font-family:monospace;}
    .badge-k{background:#fde8e8;color:#c0392b;} .badge-m{background:#e8f8ee;color:#1a7a40;}
    @media print{
      body{padding:20px;}
      button{display:none!important;}
    }
  </style></head><body>
  <h1>Nota Keuangan</h1>
  <div class="sub">Periode: ${periodeLabel} &nbsp;·&nbsp; Dicetak: ${now}</div>
  <hr class="divider">

  <div class="section">
    <div class="summary-grid">
      <div class="sum-box"><div class="sum-lbl">Total Pemasukan</div><div class="sum-val sum-masuk">${rp(totalMasuk)}</div></div>
      <div class="sum-box"><div class="sum-lbl">Total Pengeluaran</div><div class="sum-val sum-keluar">${rp(totalKeluar)}</div></div>
      <div class="sum-box"><div class="sum-lbl">Saldo Bersih</div><div class="sum-val sum-saldo">${rp(totalMasuk - totalKeluar)}</div></div>
    </div>
    
    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
      <div style="border: 1px solid #ddd; border-radius: 4px; padding: 14px;">
        <div class="sum-lbl">Rata-rata Pengeluaran / Hari</div>
        <div class="sum-val" style="color:#2c3e50; font-size:18px;">${rp(Math.round(totalKeluar / daysCount))}</div>
        <div style="font-size:9px; color:#888; font-family:monospace; margin-top:4px;">Dihitung dari ${daysCount} hari periode ini</div>
      </div>
      <div style="border: 1px solid #ddd; border-radius: 4px; padding: 14px;">
        <div class="sum-lbl">Sisa Limit Bulanan</div>
        ${lb > 0 ? `
          <div class="sum-val" style="font-size:18px; color: ${sisaLimit >= 0 ? '#1a7a40' : '#c0392b'};">
            ${rp(sisaLimit)}
          </div>
          <div style="font-size:9px; color:#888; font-family:monospace; margin-top:4px;">Batas bulanan: ${rp(lb)} (${((totalKeluar / lb) * 100).toFixed(1)}% terpakai)</div>
        ` : `
          <div class="sum-val" style="font-size:18px; color:#888;">—</div>
          <div style="font-size:9px; color:#888; font-family:monospace; margin-top:4px;">Batas bulanan tidak diatur</div>
        `}
      </div>
    </div>
  </div>`;

  if (st.exportNote && st.exportNote.trim()) {
    html += `<div class="section" style="background:#f9f9f9; border-left:4px solid #1a1a1a; padding:15px; margin-bottom:24px; border-radius:4px;">
      <h2 style="margin-bottom:8px; font-size:12px; font-family:monospace; color:#555;">Evaluasi / Catatan Tambahan</h2>
      <p style="font-size:12px; line-height:1.6; white-space:pre-wrap; color:#333; font-family:'Georgia',serif;">${escH(st.exportNote.trim())}</p>
    </div>`;
  }

  if(incSumCat && Object.keys(katMap).length){
    html += `<div class="section"><h2>Ringkasan per Kategori</h2>
    <table><thead><tr><th>Kategori</th><th>Total Pengeluaran</th><th>Batas Pemakaian</th></tr></thead><tbody>`;
    Object.entries(katMap).sort((a,b) => b[1] - a[1]).forEach(([cat,amt]) => {
      const cLimit = st.settings.limitKategori[cat] || 0;
      const cLimitStr = cLimit > 0 ? rp(cLimit) : '—';
      html += `<tr><td>${escH(cat)}</td><td class="amt-keluar">${rp(amt)}</td><td style="color:#555;">${cLimitStr}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  if(incSavings && st.savings && st.savings.length){
    html += `<div class="section"><h2>Rencana Tabungan</h2>
    <table><thead><tr><th>Nama Impian</th><th>Uang Terkumpul</th><th>Nominal Target</th><th>Sisa</th><th>Aturan Menabung</th><th>Estimasi Terpenuhi</th></tr></thead><tbody>`;
    st.savings.forEach(g => {
      const cur = g.current || 0;
      const tgt = g.target || 0;
      const rem = Math.max(0, tgt - cur);
      const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
      const dep = g.deposit || 0;
      const freq = g.frequency || 'minggu';
      
      let est = '—';
      if (rem <= 0) {
        est = 'Selesai';
      } else if (dep > 0) {
        const periods = Math.ceil(rem / dep);
        if (freq === 'hari') {
          est = `${periods} hari (~${Math.ceil(periods / 7)} minggu)`;
        } else if (freq === 'minggu') {
          est = `${periods} minggu (~${Math.ceil(periods / 4.34)} bulan)`;
        } else if (freq === 'bulan') {
          est = `${periods} bulan (~${(periods / 12).toFixed(1)} tahun)`;
        }
      }
      
      html += `<tr>
        <td><strong>${escH(g.name)}</strong> <span style="color:#666; font-size:10px;">(${pct}%)</span></td>
        <td class="amt-masuk">${rp(cur)}</td>
        <td>${rp(tgt)}</td>
        <td style="color:#c0392b;">${rp(rem)}</td>
        <td>${rp(dep)} / ${freq}</td>
        <td style="font-family:monospace; color:#8a6010;">${est}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  if(incTx && txs.length){
    const sorted = [...txs].sort((a,b) => b.date.localeCompare(a.date));
    html += `<div class="section"><h2>Daftar Transaksi</h2>
    <table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Tag</th><th>Jumlah</th><th>Catatan</th></tr></thead><tbody>`;
    sorted.forEach(t => {
      const cls = t.type === 'pemasukan' ? 'amt-masuk' : 'amt-keluar';
      const badge = t.type === 'pemasukan' ? '<span class="badge badge-m">Masuk</span>' : '<span class="badge badge-k">Keluar</span>';
      const tagStr = (t.tags && t.tags.length) ? t.tags.join(', ') : '—';
      html += `<tr><td>${fullDate(t.date)}</td><td>${badge}</td><td>${escH(t.category)}</td><td style="color:#888;font-size:10px;">${escH(tagStr)}</td><td class="${cls}">${rp(t.amount)}</td><td style="color:#888;">${escH(t.note) || '—'}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  if(incDebt && st.debts.length){
    const hutang = st.debts.filter(d => d.type === 'hutang');
    const piutang = st.debts.filter(d => d.type === 'piutang');
    html += `<div class="section"><h2>Hutang & Piutang</h2>`;
    if(hutang.length){
      html += `<p style="font-size:11px;font-family:monospace;letter-spacing:0.1em;color:#b07030;margin-bottom:8px;">HUTANG</p>
      <table><thead><tr><th>Tanggal</th><th>Kepada</th><th>Jumlah</th><th>Catatan</th></tr></thead><tbody>`;
      hutang.forEach(d => { html += `<tr><td>${fullDate(d.date)}</td><td>${escH(d.name)}</td><td class="amt-hutang">${rp(d.amount)}</td><td style="color:#888;">${escH(d.note) || '—'}</td></tr>`; });
      html += `</tbody></table>`;
    }
    if(piutang.length){
      html += `<p style="font-size:11px;font-family:monospace;letter-spacing:0.1em;color:#2060c0;margin:16px 0 8px;">PIUTANG</p>
      <table><thead><tr><th>Tanggal</th><th>Dari</th><th>Jumlah</th><th>Catatan</th></tr></thead><tbody>`;
      piutang.forEach(d => { html += `<tr><td>${fullDate(d.date)}</td><td>${escH(d.name)}</td><td class="amt-piutang">${rp(d.amount)}</td><td style="color:#888;">${escH(d.note) || '—'}</td></tr>`; });
      html += `</tbody></table>`;
    }
    html += `</div>`;
  }

  if(incMonthly && Object.keys(monthMap).length){
    html += `<div class="section"><h2>Ringkasan Semua Bulan</h2>
    <table><thead><tr><th>Bulan</th><th>Pemasukan</th><th>Pengeluaran</th><th>Saldo</th></tr></thead><tbody>`;
    Object.keys(monthMap).sort().reverse().forEach(k => {
      const r = monthMap[k], s = r.masuk - r.keluar;
      html += `<tr><td>${MONTHS[r.m]} ${r.y}</td><td class="amt-masuk">${rp(r.masuk)}</td><td class="amt-keluar">${rp(r.keluar)}</td><td style="color:${s >= 0 ? '#8a6010' : '#c0392b'};font-weight:600;">${rp(s)}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  html += `<div class="footer">Digenerate oleh GB - Money Management · ${now}</div>
  <script>window.onload=() => window.print();<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  if(w) {
    w.document.write(html);
    w.document.close();
  }
  closeExportModal();
}

// ── EDIT TRANSAKSI MODAL LOGIC ──
function openEditTx(id){
  const tx = st.transactions.find(t => t.id === id);
  if(!tx){ 
    showToast('Transaksi tidak ditemukan.', 'error'); 
    return; 
  }
  _editTxId = id;
  _editTxTags = new Set(tx.tags || []);

  setEditType(tx.type);

  const etDate = document.getElementById('etDate');
  const etAmt = document.getElementById('etAmt');
  const etNote = document.getElementById('etNote');
  
  if(etDate) etDate.value = tx.date;
  if(etAmt) etAmt.value = tx.amount;
  if(etNote) etNote.value = tx.note || '';

  const sel = document.getElementById('etCat');
  if(sel) {
    sel.innerHTML = st.categories.map(c =>
      `<option value="${escH(c)}"${c === tx.category ? ' selected' : ''}>${escH(c)}</option>`
    ).join('');
  }

  const picker = document.getElementById('etTagPicker');
  if(picker) {
    if(!st.tags || st.tags.length === 0){
      picker.innerHTML = '<span class="tag-empty">Belum ada tag</span>';
    } else {
      picker.innerHTML = st.tags.map(t => {
        const isSel = _editTxTags.has(t);
        return `<span class="tag-chip-opt${isSel ? ' selected' : ''}" data-tag="${escH(t)}"
          onclick="toggleEditTag('${escH(t)}')">${escH(t)}</span>`;
      }).join('');
    }
  }

  const modal = document.getElementById('editTxModal');
  if(modal) modal.classList.add('open');
}

function setEditType(type){
  const etKeluar = document.getElementById('etKeluar');
  const etMasuk = document.getElementById('etMasuk');
  const etCatField = document.getElementById('etCatField');
  
  if(etKeluar) etKeluar.className = 'type-btn' + (type === 'pengeluaran' ? ' active-out' : '');
  if(etMasuk) etMasuk.className = 'type-btn' + (type === 'pemasukan' ? ' active-in' : '');
  if(etCatField) etCatField.style.display = type === 'pengeluaran' ? '' : 'none';
}

function toggleEditTag(tag){
  if(_editTxTags.has(tag)) _editTxTags.delete(tag);
  else _editTxTags.add(tag);
  document.querySelectorAll('#etTagPicker .tag-chip-opt').forEach(el => {
    el.classList.toggle('selected', _editTxTags.has(el.dataset.tag));
  });
}

function closeEditTx(){
  const modal = document.getElementById('editTxModal');
  if(modal) modal.classList.remove('open');
  _editTxId = null;
}

function saveEditTx(){
  if(!_editTxId) return;
  const dateVal = document.getElementById('etDate') ? document.getElementById('etDate').value : '';
  const amtVal = document.getElementById('etAmt') ? parseFloat(document.getElementById('etAmt').value) : NaN;
  const noteVal = document.getElementById('etNote') ? document.getElementById('etNote').value.trim() : '';
  
  const etKeluar = document.getElementById('etKeluar');
  const type = etKeluar && etKeluar.classList.contains('active-out') ? 'pengeluaran' : 'pemasukan';
  
  const etCat = document.getElementById('etCat');
  const cat = type === 'pengeluaran' && etCat ? etCat.value : '—';

  if(!dateVal){ 
    showToast('Tanggal harus diisi.', 'error'); 
    return; 
  }
  if(isNaN(amtVal) || amtVal <= 0){ 
    showToast('Jumlah tidak valid.', 'error'); 
    return; 
  }

  const idx = st.transactions.findIndex(t => t.id === _editTxId);
  if(idx === -1){ 
    showToast('Transaksi tidak ditemukan.', 'error'); 
    return; 
  }
  st.transactions[idx] = { ...st.transactions[idx], type, date: dateVal, amount: amtVal, category: cat, note: noteVal, tags: [..._editTxTags] };
  save();
  closeEditTx();
  renderAll();
  showToast('Transaksi diperbarui!', 'success');
}

// ── EDIT TAG LOGIC ──
function openEditTagModal(tag){
  _editTagOld = tag;
  const editTagInput = document.getElementById('editTagInput');
  const editTagModal = document.getElementById('editTagModal');
  
  if(editTagInput) editTagInput.value = tag;
  if(editTagModal) editTagModal.classList.add('open');
  
  setTimeout(() => {
    if(editTagInput) {
      editTagInput.focus();
      editTagInput.select();
    }
  }, 100);
}

function closeEditTagModal(){
  const modal = document.getElementById('editTagModal');
  if(modal) modal.classList.remove('open');
  _editTagOld = null;
}

function saveEditTag(){
  const inp = document.getElementById('editTagInput');
  if(!inp) return;
  const newName = inp.value.trim();
  if(!newName){ 
    showToast('Nama tag tidak boleh kosong.', 'error'); 
    inp.focus(); 
    return; 
  }
  if(newName === _editTagOld){ 
    closeEditTagModal(); 
    return; 
  }
  if(st.tags.includes(newName)){ 
    showToast('Tag "' + newName + '" sudah ada.', 'error'); 
    return; 
  }

  const idx = st.tags.indexOf(_editTagOld);
  if(idx !== -1) st.tags[idx] = newName;

  st.transactions.forEach(tx => {
    if(!tx.tags) return;
    const ti = tx.tags.indexOf(_editTagOld);
    if(ti !== -1) tx.tags[ti] = newName;
  });

  if(activeTagFilters.has(_editTagOld)){
    activeTagFilters.delete(_editTagOld);
    activeTagFilters.add(newName);
  }

  save();
  closeEditTagModal();
  renderTagList();
  populateTagPicker();
  renderTagFilterBar();
  renderTx();
  showToast('Tag "' + newName + '" diperbarui!', 'success');
}

// ── EDIT TRANSACTION & INFLOW/OUTFLOW BUTTON TOGGLE ──
function setTxType(t){
  txType = t;
  const tbKeluar = document.getElementById('tbKeluar');
  const tbMasuk = document.getElementById('tbMasuk');
  const txCatField = document.getElementById('txCatField');
  
  if(tbKeluar) tbKeluar.className = 'type-btn' + (t === 'pengeluaran' ? ' active-out' : '');
  if(tbMasuk) tbMasuk.className = 'type-btn' + (t === 'pemasukan' ? ' active-in' : '');
  if(txCatField) txCatField.style.display = t === 'pengeluaran' ? '' : 'none';
}

function addTransaction(){
  const txDateEl = document.getElementById('txDate');
  const txAmtEl = document.getElementById('txAmt');
  const txCatEl = document.getElementById('txCat');
  const txNoteEl = document.getElementById('txNote');
  
  const date = txDateEl ? txDateEl.value : '';
  const amt = txAmtEl ? parseFloat(txAmtEl.value) : NaN;
  const cat = txCatEl ? txCatEl.value : '';
  const note = txNoteEl ? txNoteEl.value.trim() : '';
  
  if(!date){ 
    showToast('Tanggal harus diisi.', 'error'); 
    return; 
  }
  if(isNaN(amt) || amt <= 0){ 
    showToast('Jumlah tidak valid.', 'error'); 
    return; 
  }
  if(txType === 'pengeluaran' && !cat){ 
    showToast('Pilih kategori.', 'error'); 
    return; 
  }
  
  st.transactions.push({
    id: Date.now() + '_' + Math.random().toString(36).slice(2,6),
    type: txType,
    date,
    amount: amt,
    category: txType === 'pemasukan' ? '—' : cat,
    note,
    tags: [...selectedTxTags]
  });
  
  save();
  if(txAmtEl) txAmtEl.value = ''; 
  if(txNoteEl) txNoteEl.value = '';
  selectedTxTags = new Set();
  
  populateTagPicker();
  renderAll(); 
  showToast('Transaksi ditambahkan!', 'success');
}

function deleteTx(id){
  if(!confirm('Hapus transaksi ini?')) return;
  st.transactions = st.transactions.filter(t => t.id !== id);
  save(); 
  renderAll();
}

function setFilter(f){
  txFilter = f;
  ['fAll','fOut','fIn'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('active');
  });
  
  const activeId = ({ semua: 'fAll', pengeluaran: 'fOut', pemasukan: 'fIn' })[f];
  if(activeId) {
    const el = document.getElementById(activeId);
    if(el) el.classList.add('active');
  }
  renderTx();
}

// ── TAGS LIST & FORM SELECTORS ──
function renderTagList(){
  const el = document.getElementById('tagList');
  if(!el) return;
  if(st.tags.length === 0){
    el.innerHTML = '<span style="font-size:11px;color:var(--text-mute);">Belum ada tag.</span>';
    return;
  }
  el.innerHTML = st.tags.map(t => `
    <div class="cat-chip">
      <span>${escH(t)}</span>
      <button class="cat-chip-edit" onclick="openEditTagModal('${escH(t).replace(/'/g, "\\'")}')" title="Edit">✎</button>
      <button onclick="deleteTag('${escH(t).replace(/'/g, "\\'")}')" title="Hapus">×</button>
    </div>`).join('');
}

function populateTagPicker(){
  const picker = document.getElementById('txTagPicker');
  if(!picker) return;
  selectedTxTags = new Set();
  if(st.tags.length === 0){
    picker.innerHTML = '<span class="tag-empty">Belum ada tag — tambahkan di Pengaturan</span>';
    return;
  }
  picker.innerHTML = st.tags.map(t =>
    `<span class="tag-chip-opt" data-tag="${escH(t)}" onclick="toggleTxTag('${escH(t)}')">${escH(t)}</span>`
  ).join('');
}

function toggleTxTag(tag){
  if(selectedTxTags.has(tag)) selectedTxTags.delete(tag);
  else selectedTxTags.add(tag);
  document.querySelectorAll('#txTagPicker .tag-chip-opt').forEach(el => {
    el.classList.toggle('selected', selectedTxTags.has(el.dataset.tag));
  });
}

function renderTagFilterBar(){
  const bar = document.getElementById('tagFilterBar');
  const chips = document.getElementById('tagFilterChips');
  if(!bar || !chips) return;
  if(st.tags.length === 0){ 
    bar.style.display = 'none'; 
    return; 
  }
  bar.style.display = 'flex';
  chips.innerHTML = st.tags.map(t => {
    const active = activeTagFilters.has(t);
    return `<button class="filter-btn tag-filter-btn${active ? ' active' : ''}" onclick="toggleTagFilter('${escH(t)}')">${escH(t)}</button>`;
  }).join('');
}

function toggleTagFilter(tag){
  if(activeTagFilters.has(tag)) activeTagFilters.delete(tag);
  else activeTagFilters.add(tag);
  renderTagFilterBar(); 
  renderTx();
}

// ── DEBT FORMS TOGGLE ──
function setDebtType(t){
  debtType = t;
  const dtHutang = document.getElementById('dtHutang');
  const dtPiutang = document.getElementById('dtPiutang');
  
  if(dtHutang) dtHutang.className = 'type-btn' + (t === 'hutang' ? ' active-htg' : '');
  if(dtPiutang) dtPiutang.className = 'type-btn' + (t === 'piutang' ? ' active-piu' : '');
}

// Master Render Method
function renderAll(){ 
  renderDashboard(); 
  renderTx(); 
}

function renderSavings() {
  const listEl = document.getElementById('savingsList');
  if(!listEl) return;
  if(!st.savings || st.savings.length === 0){
    listEl.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-mute);">Belum ada rencana tabungan.</div>';
    return;
  }

  listEl.innerHTML = st.savings.map((g, index) => {
    const cur = g.current || 0;
    const tgt = g.target || 0;
    const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
    const remaining = Math.max(0, tgt - cur);
    const dep = g.deposit || 0;
    const freq = g.frequency || 'minggu'; // hari, minggu, bulan

    let predictionText = '';
    if (remaining <= 0) {
      predictionText = '<span style="color:var(--green); font-weight:bold;">🎉 Target Tercapai!</span>';
    } else if (dep <= 0) {
      predictionText = '<span style="color:var(--text-mute);">Masukkan jumlah tabungan untuk melihat prediksi</span>';
    } else {
      const periods = Math.ceil(remaining / dep);
      if (freq === 'hari') {
        const parts = [];
        parts.push(`~${Math.ceil(periods / 7)} minggu`);
        parts.push(`~${Math.ceil(periods / 30.4)} bulan`);
        parts.push(`~${(periods / 365).toFixed(1)} tahun`);
        predictionText = `Terpenuhi dalam <strong>${periods} hari</strong> (${parts.join(', ')})`;
      } else if (freq === 'minggu') {
        const parts = [];
        parts.push(`~${Math.ceil(periods / 4.34)} bulan`);
        parts.push(`~${(periods / 52.14).toFixed(1)} tahun`);
        predictionText = `Terpenuhi dalam <strong>${periods} minggu</strong> (${parts.join(', ')})`;
      } else if (freq === 'bulan') {
        const parts = [];
        parts.push(`~${(periods / 12).toFixed(1)} tahun`);
        predictionText = `Terpenuhi dalam <strong>${periods} bulan</strong> (${parts.join(', ')})`;
      }
    }

    if (g.editing) {
      return `
        <div class="savings-card" style="border-color: var(--gold); background: var(--bg); box-shadow: 0 0 10px rgba(212,175,55,0.08);">
          <div class="sc-header">
            <span style="font-size:12px; font-weight:bold; color:var(--gold); font-family: 'Playfair Display', serif;">Edit Rencana Tabungan</span>
            <button class="sc-del" onclick="toggleEditSavingGoal(${index}, false)">Batal</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:5px;">
            <div class="field">
              <label style="font-size:11px; color:var(--text-dim); display:block; margin-bottom:4px;">Nama Impian</label>
              <input type="text" id="editSavName_${index}" value="${escH(g.name)}" style="background:var(--bg-card); border:1px solid var(--border); border-radius:4px; color:var(--text); padding:8px 10px; font-size:12px; width:100%; outline:none;">
            </div>
            <div class="field">
              <label style="font-size:11px; color:var(--text-dim); display:block; margin-bottom:4px;">Nominal Target (Rp)</label>
              <input type="number" id="editSavTarget_${index}" value="${g.target}" style="background:var(--bg-card); border:1px solid var(--border); border-radius:4px; color:var(--text); padding:8px 10px; font-size:12px; width:100%; outline:none; font-family:'DM Mono',monospace;">
            </div>
            <div class="field">
              <label style="font-size:11px; color:var(--text-dim); display:block; margin-bottom:4px;">Tabungan per Periode (Rp)</label>
              <input type="number" id="editSavDeposit_${index}" value="${g.deposit}" style="background:var(--bg-card); border:1px solid var(--border); border-radius:4px; color:var(--text); padding:8px 10px; font-size:12px; width:100%; outline:none; font-family:'DM Mono',monospace;">
            </div>
            <div class="field">
              <label style="font-size:11px; color:var(--text-dim); display:block; margin-bottom:4px;">Frekuensi</label>
              <select id="editSavFreq_${index}" style="background:var(--bg-card); border:1px solid var(--border); border-radius:4px; color:var(--text); padding:8px 10px; font-size:12px; width:100%; outline:none; font-family:inherit;">
                <option value="hari" ${freq === 'hari' ? 'selected' : ''}>Per Hari</option>
                <option value="minggu" ${freq === 'minggu' ? 'selected' : ''}>Per Minggu</option>
                <option value="bulan" ${freq === 'bulan' ? 'selected' : ''}>Per Bulan</option>
              </select>
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="btn" onclick="saveEditedSavingGoal(${index})" style="flex:1; padding: 6px; font-size:11px; height: 32px;">✓ Simpan</button>
            <button class="btn btn-ghost" onclick="toggleEditSavingGoal(${index}, false)" style="flex:1; padding: 6px; font-size:11px; height: 32px;">Batal</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="savings-card">
        <div class="sc-header">
          <div class="sc-title">${escH(g.name)}</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="sc-del" onclick="toggleEditSavingGoal(${index}, true)" title="Edit Rencana" style="color:var(--text-dim); hover:color:var(--gold);">✎</button>
            <button class="sc-del" onclick="deleteSavingGoal(${index})" title="Hapus">✕</button>
          </div>
        </div>
        <div class="sc-amounts">
          <span class="sc-cur">${rp(cur)}</span>
          <span class="sc-tgt">Target: ${rp(tgt)}</span>
        </div>
        <div class="sc-bar-container">
          <div class="sc-bar" style="width: ${pct}%"></div>
        </div>
        <div class="sc-progress-text">${pct}% dari target terpenuhi (${rp(remaining)} tersisa)</div>
        <div class="sc-details">
          <div>Rencana: <strong>${rp(dep)}</strong> per ${freq}</div>
          <div class="sc-prediction">${predictionText}</div>
        </div>
        <div class="sc-actions">
          <input type="number" id="addDepAmt_${index}" placeholder="Tambah Rp" style="width: 100px; padding: 6px; font-size: 11px; font-family: 'DM Mono', monospace; background:var(--bg); border:1px solid var(--border); border-radius:4px; color:var(--text); outline:none;">
          <button class="btn" style="padding: 6px 12px; font-size:11px; height:29px;" onclick="adjustSavingGoalAmount(${index}, true)">Tambah</button>
          <button class="btn btn-ghost" style="padding: 6px 12px; font-size:11px; height:29px;" onclick="adjustSavingGoalAmount(${index}, false)">Tarik</button>
        </div>
      </div>
    `;
  }).join('');
}

function exportToCSV() {
  const includeSavings = document.getElementById('csvIncludeSavings') ? document.getElementById('csvIncludeSavings').checked : false;
  
  const hasTx = st.transactions && st.transactions.length > 0;
  const hasSavings = includeSavings && st.savings && st.savings.length > 0;
  
  if (!hasTx && !hasSavings) {
    showToast('Tidak ada data untuk diekspor.', 'error');
    return;
  }
  
  const csvRows = [];
  
  if (hasTx) {
    // Header columns
    const headers = ['ID', 'Tanggal', 'Jenis', 'Jumlah (Rp)', 'Kategori', 'Tag', 'Catatan'];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    
    st.transactions.forEach(t => {
      const tagsStr = (t.tags || []).join(';');
      const row = [
        `"${String(t.id).replace(/"/g, '""')}"`,
        `"${String(t.date).replace(/"/g, '""')}"`,
        t.type === 'pemasukan' ? '"Pemasukan"' : '"Pengeluaran"',
        t.amount,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${tagsStr.replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
  }
  
  if (hasSavings) {
    if (csvRows.length > 0) {
      csvRows.push('');
      csvRows.push('');
    }
    csvRows.push('"RENCANA TABUNGAN"');
    const headersSav = ['Nama Impian', 'Uang Terkumpul (Rp)', 'Nominal Target (Rp)', 'Sisa (Rp)', 'Aturan Menabung', 'Estimasi Terpenuhi'];
    csvRows.push(headersSav.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    
    st.savings.forEach(g => {
      const cur = g.current || 0;
      const tgt = g.target || 0;
      const rem = Math.max(0, tgt - cur);
      const dep = g.deposit || 0;
      const freq = g.frequency || 'minggu';
      
      let est = '—';
      if (rem <= 0) {
        est = 'Selesai';
      } else if (dep > 0) {
        const periods = Math.ceil(rem / dep);
        if (freq === 'hari') {
          est = `${periods} hari (~${Math.ceil(periods / 7)} minggu)`;
        } else if (freq === 'minggu') {
          est = `${periods} minggu (~${Math.ceil(periods / 4.34)} bulan)`;
        } else if (freq === 'bulan') {
          est = `${periods} bulan (~${(periods / 12).toFixed(1)} tahun)`;
        }
      }
      
      const row = [
        `"${g.name.replace(/"/g, '""')}"`,
        cur,
        tgt,
        rem,
        `"${rp(dep)} per ${freq}"`,
        `"${est}"`
      ];
      csvRows.push(row.join(','));
    });
  }
  
  // "sep=," explicitly signals to Excel that comma is the delimiter, splitting data across columns beautifully in any region setting.
  const csvString = '\uFEFF' + 'sep=,\r\n' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'GB_Money_Management_Export_' + new Date().toISOString().substring(0,10) + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('Spreadsheet berhasil diekspor!', 'success');
}
