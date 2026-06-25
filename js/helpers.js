// ══════════════════════════════════════════════════════
// HELPERS & UTILITIES
// ══════════════════════════════════════════════════════

// Format Angka ke Rupiah
function rp(n){
  if(n === undefined || n === null) return '—';
  const abs = Math.abs(n);
  return (n < 0 ? '-' : '') + 'Rp ' + abs.toLocaleString('id-ID');
}

// Format Tanggal Singkat (contoh: 17 Jun)
function shortDate(s){ 
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); 
}

// Format Tanggal Lengkap (contoh: 17 Juni 2026)
function fullDate(s){ 
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); 
}

// Filter Transaksi Berdasarkan Bulan dan Tahun
function txForMonth(y, m){ 
  return st.transactions.filter(t => { 
    const d = new Date(t.date + 'T00:00:00'); 
    return d.getFullYear() === y && d.getMonth() === m; 
  }); 
}

// Amankan Teks dari Tag HTML (Sanitasi / HTML Escaping)
function escH(s){ 
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
}

// Tentukan Warna untuk Status Limit Bulanan/Kategori
function limitColor(p){ 
  return p >= 100 ? 'var(--red)' : p >= 75 ? 'var(--amber)' : 'var(--green)'; 
}

// Inisialisasi Bulan dan Tahun Saat Ini
function initDate(){ 
  const n = new Date(); 
  curYear = n.getFullYear(); 
  curMonth = n.getMonth(); 
}

// Ubah Bulan Aktif ke Depan / Belakang
function changeMonth(d){
  curMonth += d;
  if(curMonth < 0){
    curMonth = 11;
    curYear--;
  } 
  if(curMonth > 11){
    curMonth = 0;
    curYear++;
  }
  renderAll();
}

// Save to Local Storage Only
function localSave(){ 
  localStorage.setItem(KEY, JSON.stringify(st)); 
}

// Save Local & Trigger Cloud Firebase Sync
function save(){
  localSave();
  if(!isLoggedIn){ 
    _pendingSync = true; 
    return; 
  }
  clearTimeout(syncTimer);
  showSyncStatus('syncing', 'Menyimpan...');
  syncTimer = setTimeout(() => {
    if (typeof saveToFirebase === 'function') {
      saveToFirebase();
    }
  }, 1500);
}

// Theme Toggle & Mode Control
function toggleTheme(){
  const isDark = document.documentElement.classList.contains('theme-dark');
  if(isDark){
    document.documentElement.classList.remove('theme-dark');
    localStorage.setItem('gb_theme', 'light');
  } else {
    document.documentElement.classList.add('theme-dark');
    localStorage.setItem('gb_theme', 'dark');
  }
  updateThemeUI();
}

function updateThemeUI(){
  const isDark = document.documentElement.classList.contains('theme-dark');
  const labelEl = document.getElementById('themeToggleLabel');
  const iconEl = document.getElementById('themeToggleIcon');
  if(labelEl && iconEl){
    if(isDark){
      labelEl.textContent = 'Dark Mode';
      iconEl.textContent = '☾';
    } else {
      labelEl.textContent = 'Light Mode';
      iconEl.textContent = '☼';
    }
  }
}

// Run updateThemeUI immediately upon DOM ready
document.addEventListener('DOMContentLoaded', updateThemeUI);
