// ══════════════════════════════════════════════════════
// LOGIKA SINKRONISASI GOOGLE DRIVE & GIS AUTH
// ══════════════════════════════════════════════════════

// Ambil Access Token yang Valid
function getToken(){ 
  return _accessToken || localStorage.getItem(TOKEN_KEY); 
}

// Handler saat Google Identity Services Client Loaded
function gisLoaded() {
  console.log('[BukuKas] GIS loaded');
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: ''
  });
  gisReady = true;
  console.log('[BukuKas] GIS ready');
  maybeReady();
}

// Cek token tersimpan dan validasi
async function maybeReady() {
  if (!gisReady) return;

  const savedToken = localStorage.getItem(TOKEN_KEY);
  const expiry     = parseInt(localStorage.getItem(TOKEN_EXP_KEY) || '0');
  const isValid    = savedToken && Date.now() < expiry;

  if (!isValid) {
    if (savedToken) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXP_KEY);
      localStorage.removeItem(HAD_LOGIN_KEY);
    }
    console.log('[BukuKas] Tidak ada token valid, tampilkan tombol login');
    return;
  }

  // Verifikasi token masih diterima Google
  try {
    const check = await fetch(
      `https://www.googleapis.com/oauth2/v2/tokeninfo?access_token=${savedToken}`
    );
    if (!check.ok) throw new Error('Token rejected');
    _accessToken = savedToken;
    isLoggedIn = true;
    await updateAuthUI(true);
    showSyncStatus('syncing', 'Mengambil data...');
    await syncFromDrive();
    showSyncStatus('synced', 'Tersinkron');
  } catch(err) {
    console.warn('[BukuKas] Token tidak valid:', err);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    localStorage.removeItem(HAD_LOGIN_KEY);
  }
}

// Mulai Popup Alur Autentikasi Google
function handleLogin(){
  if(!gisReady || !tokenClient){
    showToast('Google API belum siap, tunggu sebentar lalu coba lagi.', 'error');
    return;
  }
  tokenClient.callback = async (resp) => {
    if(resp.error){
      const msg = {
        popup_blocked_by_browser: 'Popup diblokir. Izinkan popup di address bar lalu coba lagi.',
        access_denied: 'Akses ditolak. Pilih akun dan beri izin Drive.',
      }[resp.error] || ('Login gagal: ' + resp.error);
      showToast(msg, 'error');
      console.error('OAuth error:', resp);
      return;
    }
    try {
      // Ambil token dari GIS langsung
      const tok = resp.access_token;
      _accessToken = tok;
      localStorage.setItem(TOKEN_KEY, tok);
      localStorage.setItem(TOKEN_EXP_KEY, Date.now() + 55 * 60 * 1000);
      localStorage.setItem(HAD_LOGIN_KEY, '1');
      isLoggedIn = true;
      await updateAuthUI(true);
      showSyncStatus('syncing', 'Mengambil data...');
      await syncFromDrive();
      showSyncStatus('synced', 'Tersinkron');
    } catch(err) {
      showToast('Kesalahan setelah login: ' + err.message, 'error');
      console.error('Post-login error:', err);
    }
  };
  try {
    console.log('[BukuKas] Membuka popup OAuth...');
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch(err) {
    showToast('Gagal membuka popup: ' + err.message, 'error');
    console.error('requestAccessToken error:', err);
  }
}

// Log out dari Akun Google
function handleLogout(){
  if(tokenClient && _accessToken){
    google.accounts.oauth2.revoke(_accessToken, () => {});
  }
  _accessToken = null;
  isLoggedIn = false;
  updateAuthUI(false);
  driveFileId = null;
  localStorage.removeItem(FILE_ID_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
  localStorage.removeItem(HAD_LOGIN_KEY);
  showToast('Berhasil keluar.', '');
}

// Update Elemen UI Google Auth Status
async function updateAuthUI(loggedIn){
  const loginBtnEl = document.getElementById('loginBtn');
  const logoutBtnEl = document.getElementById('logoutBtn');
  const authUserEl = document.getElementById('authUser');
  const syncStatusEl = document.getElementById('syncStatus');
  const manualSyncBtnEl = document.getElementById('manualSyncBtn');

  if(loginBtnEl) loginBtnEl.style.display = loggedIn ? 'none' : '';
  if(logoutBtnEl) logoutBtnEl.style.display = loggedIn ? '' : 'none';
  if(authUserEl) authUserEl.style.display = loggedIn ? '' : 'none';
  if(syncStatusEl) syncStatusEl.style.display = loggedIn ? 'flex' : 'none';
  if(manualSyncBtnEl) manualSyncBtnEl.style.display = loggedIn ? '' : 'none';

  if(loggedIn){
    const dTitle = document.getElementById('driveInfoTitle');
    const dBody = document.getElementById('driveInfoBody');
    if(dTitle) dTitle.textContent = 'Sinkronisasi Aktif ✓';
    if(dBody) dBody.innerHTML = 'Data otomatis disimpan ke <strong>' + DRIVE_FILE + '</strong> di Google Drive setiap ada perubahan.';
    
    try {
      const info = await fetchUserInfo();
      if(info && authUserEl) {
        authUserEl.textContent = info.name || info.email || '';
      }
    } catch(e) {}
  } else {
    const dTitle = document.getElementById('driveInfoTitle');
    const dBody = document.getElementById('driveInfoBody');
    if(dTitle) dTitle.textContent = 'Sinkronisasi Google Drive';
    if(dBody) dBody.innerHTML = 'Login terlebih dahulu untuk mengaktifkan sinkronisasi otomatis.';
  }
}

// Hubungi userinfo endpoint
async function fetchUserInfo(){
  const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { 
    headers: { Authorization: `Bearer ${getToken()}` } 
  });
  if(!resp.ok) throw new Error('UserInfo failed');
  return resp.json();
}

// Render status dot di pojok atas
function showSyncStatus(state, label){
  const sDot = document.getElementById('syncDot');
  const sLabel = document.getElementById('syncLabel');
  if(sDot) sDot.className = 'sync-dot ' + state;
  if(sLabel) sLabel.textContent = label || '';
}

// Ambil atau buat file buku_kas_data.json di Google Drive
async function getOrCreateFileId(){
  const tok = getToken();
  if(driveFileId){
    const check = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id`,
      { headers: { Authorization: `Bearer ${tok}` } }
    );
    if(check.ok){ return driveFileId; }
    driveFileId = null; 
    localStorage.removeItem(FILE_ID_KEY);
  }
  
  // Cari file yang sudah ada
  const listResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='" + DRIVE_FILE + "' and trashed=false")}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${tok}` } }
  );
  const listData = await listResp.json();
  if(listData.files && listData.files.length > 0){
    driveFileId = listData.files[0].id;
    localStorage.setItem(FILE_ID_KEY, driveFileId);
    return driveFileId;
  }
  
  // Buat file baru
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name: DRIVE_FILE, mimeType: 'application/json' })], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(st)], { type: 'application/json' }));
  const createResp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: form }
  );
  const createData = await createResp.json();
  driveFileId = createData.id;
  localStorage.setItem(FILE_ID_KEY, driveFileId);
  return driveFileId;
}

// Simpan data state secara asinkron ke Google Drive
async function saveToDrive(){
  if(!isLoggedIn || !getToken()) return;
  showSyncStatus('syncing', 'Menyimpan...');
  try {
    const fileId = await getOrCreateFileId();
    await fetch(
       `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
       { 
         method: 'PATCH', 
         headers: { 
           Authorization: `Bearer ${getToken()}`,
           'Content-Type': 'application/json' 
         }, 
         body: JSON.stringify(st) 
       }
    );
    showSyncStatus('synced', 'Tersimpan');
  } catch(err) { 
    showSyncStatus('error', 'Gagal simpan'); 
    console.error('Drive save error:', err); 
  }
}

// Ambil data terbaru dari Google Drive
async function syncFromDrive(){
  if(!isLoggedIn || !getToken()) return;
  try {
    const fileId = await getOrCreateFileId();
    if(!fileId) return;
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if(!resp.ok) throw new Error('Drive read failed: ' + resp.status);
    const imported = await resp.json();
    if(imported && imported.transactions){
      st = imported;
      
      // Normalisasi state setelah sinkronisasi
      if(!st.settings) st.settings = { limitBulan: 0, limitKategori: {} };
      if(!st.debts) st.debts = [];
      if(!st.categories) st.categories = [...DEFAULT_CATS];
      if(!st.settings.limitKategori) st.settings.limitKategori = {};
      if(!st.tags) st.tags = [];
      if(!st.notes) st.notes = [];
      
      localSave(); 
      if(!curYear) initDate(); 
      initAll();
    }
  } catch(err) { 
    console.error('Drive sync error:', err); 
  }
}

// Pemicu Sinkronisasi Manual dari UI
async function manualSync(){
  if(!getToken()){ 
    showToast('Belum login.', 'error'); 
    return; 
  }
  showSyncStatus('syncing', 'Sinkronisasi...');
  await syncFromDrive();
  showSyncStatus('synced', 'Tersinkron');
  showToast('Sinkronisasi selesai!', 'success');
}
