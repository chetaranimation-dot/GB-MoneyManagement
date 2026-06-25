// ══════════════════════════════════════════════════════
// ENTRY POINT, INISIALISASI & GLOBAL EVENT LISTENERS (MAIN)
// ══════════════════════════════════════════════════════

// ── KELOLA KATEGORI ──
function addCategory(){
  const catInput = document.getElementById('catNewInput');
  const v = catInput ? catInput.value.trim() : '';
  if(!v){
    showToast('Nama kategori kosong.', 'error');
    return;
  }
  if(st.categories.includes(v)){
    showToast('Kategori sudah ada.', 'error');
    return;
  }
  st.categories.push(v); 
  save(); 
  renderCategories(); 
  populateCatSelect();
  if(catInput) catInput.value = '';
  showToast('Kategori "' + v + '" ditambahkan!', 'success');
}

function deleteCategory(cat){
  if(!confirm('Hapus kategori "' + cat + '"?')) return;
  st.categories = st.categories.filter(c => c !== cat); 
  save(); 
  renderCategories(); 
  populateCatSelect(); 
  renderLimitKatSettings();
}

// ── KELOLA TAGS ──
function addTag(){
  const tagInput = document.getElementById('tagNewInput');
  const v = tagInput ? tagInput.value.trim() : '';
  if(!v){
    showToast('Nama tag kosong.', 'error');
    return;
  }
  if(st.tags.includes(v)){
    showToast('Tag sudah ada.', 'error');
    return;
  }
  st.tags.push(v); 
  save();
  renderTagList(); 
  populateTagPicker(); 
  renderTagFilterBar();
  if(tagInput) tagInput.value = '';
  showToast('Tag "' + v + '" ditambahkan!', 'success');
}

function deleteTag(tag){
  if(!confirm('Hapus tag "' + tag + '"? Tag ini akan dihapus dari semua transaksi.')) return;
  st.tags = st.tags.filter(t => t !== tag);
  st.transactions.forEach(tx => { 
    if(tx.tags) tx.tags = tx.tags.filter(t => t !== tag); 
  });
  activeTagFilters.delete(tag);
  save(); 
  renderTagList(); 
  populateTagPicker(); 
  renderTagFilterBar(); 
  renderTx();
  showToast('Tag dihaspus.', '');
}

// ── KELOLA HUTANG & PIUTANG ──
function addDebt(){
  const nameEl = document.getElementById('dtName');
  const amtEl = document.getElementById('dtAmt');
  const dateEl = document.getElementById('dtDate');
  const noteEl = document.getElementById('dtNote');

  const name = nameEl ? nameEl.value.trim() : '';
  const amt = amtEl ? parseFloat(amtEl.value) : NaN;
  const date = dateEl ? dateEl.value : '';
  const note = noteEl ? noteEl.value.trim() : '';

  if(!name){
    showToast('Nama harus diisi.', 'error');
    return;
  }
  if(isNaN(amt) || amt <= 0){
    showToast('Jumlah tidak valid.', 'error');
    return;
  }
  if(!date){
    showToast('Tanggal harus diisi.', 'error');
    return;
  }
  st.debts.push({ id: Date.now(), type: debtType, name, amount: amt, date, note });
  save(); 
  
  if(nameEl) nameEl.value = ''; 
  if(amtEl) amtEl.value = ''; 
  if(noteEl) noteEl.value = '';
  
  renderDebts(); 
  showToast((debtType === 'hutang' ? 'Hutang' : 'Piutang') + ' ditambahkan!', 'success');
}

function deleteDebt(id){
  if(!confirm('Hapus data ini?')) return;
  st.debts = st.debts.filter(d => d.id !== id);
  save(); 
  renderDebts();
}

function toggleDebtLunas(id, checked){
  const debt = st.debts.find(d => d.id === id);
  if(debt){
    debt.lunas = checked;
    save();
    renderDebts();
  }
}

// ── KELOLA LIMIT PENGATURAN FORM ──
function saveLimitBulan(){ 
  const sLimitBulan = document.getElementById('sLimitBulan');
  st.settings.limitBulan = sLimitBulan ? (parseFloat(sLimitBulan.value) || 0) : 0; 
  save(); 
  renderDashboard(); 
  showToast('Limit bulanan disimpan!', 'success'); 
}

function saveLimitKategori(){
  st.categories.forEach(cat => { 
    const el = document.getElementById('lk_' + cat.replace(/\s/g, '_')); 
    if(el) st.settings.limitKategori[cat] = parseFloat(el.value) || 0; 
  });
  save(); 
  renderDashboard(); 
  showToast('Limit kategori disimpan!', 'success');
}

function loadSettingsToForm(){ 
  const sLimitBulan = document.getElementById('sLimitBulan');
  if(sLimitBulan) sLimitBulan.value = st.settings.limitBulan || 0; 
}

// ── EKSPOR & IMPORT DATA CADANGAN ──
function importData(e){
  const file = e.target.files[0]; 
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imp = JSON.parse(ev.target.result);
      if(!imp.transactions) throw new Error('Format tidak valid.');
      if(!confirm('Impor akan mengganti SEMUA data saat ini. Lanjutkan?')) return;
      st = imp;
      
      // Normalisasi state setelah impor
      if(!st.settings) st.settings = { limitBulan: 0, limitKategori: {} };
      if(!st.debts) st.debts = [];
      if(!st.categories) st.categories = [...DEFAULT_CATS];
      if(!st.tags) st.tags = [];
      if(!st.notes) st.notes = [];
      
      save(); 
      initAll(); 
      showToast('Data berhasil diimpor!', 'success');
    } catch(err) { 
      showToast('Gagal mengimpor: ' + err.message, 'error'); 
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function clearAll(){
  if(!confirm('HAPUS SEMUA DATA? Tidak bisa dibatalkan.')) return;
  if(!confirm('Yakin benar-benar ingin menghapus semua data?')) return;
  st = { transactions: [], debts: [], categories: [...DEFAULT_CATS], tags: [], settings: { limitBulan: 0, limitKategori: {} }, notes: [] };
  save(); 
  initAll(); 
  showToast('Semua data dihapus.', '');
}

// ── APPLICATION INIT LOOPS ──
function initAll(){ 
  populateCatSelect(); 
  populateTagPicker(); 
  renderAll(); 
  renderDebts(); 
  renderTagFilterBar();
  
  const searchEl = document.getElementById('txSearch');
  if(searchEl && !searchEl.dataset.bound){
    searchEl.dataset.bound = '1';
    searchEl.addEventListener('input', function(){
      txSearch = this.value || '';
      renderTx();
    });
  }
}

function init(){
  initDate();
  
  const today = new Date().toISOString().slice(0, 10);
  const txDate = document.getElementById('txDate');
  const dtDate = document.getElementById('dtDate');
  
  if(txDate) txDate.value = today;
  if(dtDate) dtDate.value = today;
  
  initAll();
}

function addSavingGoal(){
  const nameEl = document.getElementById('savTargetName');
  const tgtEl = document.getElementById('savTargetAmount');
  const depEl = document.getElementById('savDepositAmount');
  const freqEl = document.getElementById('savFrequency');
  const curEl = document.getElementById('savCurrentAmount');

  const name = nameEl ? nameEl.value.trim() : '';
  const tgt = tgtEl ? parseFloat(tgtEl.value) : 0;
  const dep = depEl ? parseFloat(depEl.value) : 0;
  const freq = freqEl ? freqEl.value : 'minggu';
  const cur = curEl ? parseFloat(curEl.value) : 0;

  if(!name){
    showToast('Nama target harus diisi.', 'error');
    return;
  }
  if(isNaN(tgt) || tgt <= 0){
    showToast('Nominal target tidak valid.', 'error');
    return;
  }
  if(isNaN(dep) || dep <= 0){
    showToast('Uang yang ditabung tidak valid.', 'error');
    return;
  }

  if(!st.savings) st.savings = [];
  st.savings.push({
    name,
    target: tgt,
    deposit: dep,
    frequency: freq,
    current: isNaN(cur) ? 0 : cur
  });
  save();

  if(nameEl) nameEl.value = '';
  if(tgtEl) tgtEl.value = '';
  if(depEl) depEl.value = '';
  if(curEl) curEl.value = '0';

  renderSavings();
  showToast('Rencana tabungan ditambahkan!', 'success');
}

function deleteSavingGoal(idx){
  if(!confirm('Hapus tujuan tabungan ini?')) return;
  st.savings.splice(idx, 1);
  save();
  renderSavings();
  renderDashboard();
}

function toggleEditSavingGoal(idx, editing){
  if (!st.savings[idx]) return;
  st.savings[idx].editing = editing;
  renderSavings();
}

function saveEditedSavingGoal(idx){
  const nameEl = document.getElementById(`editSavName_${idx}`);
  const tgtEl = document.getElementById(`editSavTarget_${idx}`);
  const depEl = document.getElementById(`editSavDeposit_${idx}`);
  const freqEl = document.getElementById(`editSavFreq_${idx}`);

  const name = nameEl ? nameEl.value.trim() : '';
  const tgt = tgtEl ? parseFloat(tgtEl.value) : 0;
  const dep = depEl ? parseFloat(depEl.value) : 0;
  const freq = freqEl ? freqEl.value : 'minggu';

  if(!name){
    showToast('Nama target harus diisi.', 'error');
    return;
  }
  if(isNaN(tgt) || tgt <= 0){
    showToast('Nominal target tidak valid.', 'error');
    return;
  }
  if(isNaN(dep) || dep <= 0){
    showToast('Uang yang ditabung tidak valid.', 'error');
    return;
  }

  const g = st.savings[idx];
  g.name = name;
  g.target = tgt;
  g.deposit = dep;
  g.frequency = freq;
  delete g.editing;

  save();
  renderSavings();
  renderDashboard();
  showToast('Rencana tabungan berhasil diperbarui!', 'success');
}

function adjustSavingGoalAmount(idx, isAdd){
  const inp = document.getElementById(`addDepAmt_${idx}`);
  if(!inp) return;
  const amt = parseFloat(inp.value);
  if(isNaN(amt) || amt <= 0){
    showToast('Masukkan nominal rupiah yang valid.', 'error');
    return;
  }
  const g = st.savings[idx];
  if(isAdd){
    g.current = (g.current || 0) + amt;
    showToast(`Berhasil menambah tabungan ${rp(amt)}!`, 'success');
  } else {
    g.current = Math.max(0, (g.current || 0) - amt);
    showToast(`Berhasil menarik tabungan ${rp(amt)}!`, 'success');
  }
  inp.value = '';
  save();
  renderSavings();
  renderDashboard();
}

// Bind click event listeners saat DOM dimuat
document.addEventListener('DOMContentLoaded', () => {
  // Bind sort change
  const sortMode = document.getElementById('sortMode');
  if(sortMode) {
    sortMode.addEventListener('change', function(){
      const rangeEl = document.getElementById('dateRangeWrap');
      if(rangeEl) rangeEl.style.display = this.value === 'rentang' ? '' : 'none';
      renderTx();
    });
  }

  // Tutup modal saat klik backdrop backdrop
  const expModal = document.getElementById('exportModal');
  if(expModal) {
    expModal.addEventListener('click', function(e){
      if(e.target === this) closeExportModal();
    });
  }
  const evalModal = document.getElementById('evalConfirmModal');
  if(evalModal) {
    evalModal.addEventListener('click', function(e){
      if(e.target === this) closeEvalConfirm();
    });
  }
  const editModal = document.getElementById('editTxModal');
  if(editModal) {
    editModal.addEventListener('click', function(e){
      if(e.target === this) closeEditTx();
    });
  }
  const editTagModal = document.getElementById('editTagModal');
  if(editTagModal) {
    editTagModal.addEventListener('click', function(e){
      if(e.target === this) closeEditTagModal();
    });
  }

  // Auto-sync saat koneksi kembali
  window.addEventListener('online', async () => {
    if(!isLoggedIn) return;
    showSyncStatus('syncing', 'Koneksi kembali...');
    showToast('Koneksi kembali — menyinkronkan data...', '');
    if (typeof saveToFirebase === 'function') {
      await saveToFirebase();
    }
  });

  window.addEventListener('offline', () => {
    if (!isLoggedIn) return;
    showSyncStatus('error', 'Offline');
  });

  // Call main initialization
  init();
});
