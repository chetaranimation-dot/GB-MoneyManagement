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
  // Peringatan jika Google API tidak berhasil dimuat dalam 8 detik
  setTimeout(() => {
    if(!gisReady){
      showToast('Google API gagal dimuat. Cek koneksi internet lalu refresh halaman.', 'error');
      console.warn('[BukuKas] GIS tidak siap setelah 8 detik');
    }
  }, 8000);
  
  initDate();
  
  const today = new Date().toISOString().slice(0, 10);
  const txDate = document.getElementById('txDate');
  const dtDate = document.getElementById('dtDate');
  
  if(txDate) txDate.value = today;
  if(dtDate) dtDate.value = today;
  
  initAll();
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
    if(!isLoggedIn || !getToken()) return;
    showSyncStatus('syncing', 'Koneksi kembali...');
    showToast('Koneksi kembali — menyinkronkan data...', '');
    await saveToDrive();
  });

  window.addEventListener('offline', () => {
    if (!isLoggedIn) return;
    showSyncStatus('error', 'Offline');
  });

  // Call main initialization
  init();
});
