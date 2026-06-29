// ══════════════════════════════════════════════════════
// FIREBASE AUTH & FIRESTORE INTEGRATION
// ══════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase configuration from environment or direct manual setup.
// If configuring via the AI Studio editor settings, use these exact VITE_ variables.
const firebaseConfig = {
  apiKey: "AIzaSyBW51yFOUgEtAuL3KLhbR0npQbabs2G7dA",
  authDomain: "gabriel-protocol.firebaseapp.com",
  projectId: "gabriel-protocol",
  storageBucket: "gabriel-protocol.firebasestorage.app",
  messagingSenderId: "792718635622",
  appId: "1:792718635622:web:a86a59cb1189bba8a9f3a7",
  measurementId: "G-38SWDYZFWC"
};

// Check if credentials are placeholders or actually supplied
const hasFirebaseCredentials = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId;

let app, auth, db;

if (hasFirebaseCredentials) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("[Firebase] Berhasil inisialisasi SDK");
  } catch (err) {
    console.error("[Firebase] Gagal inisialisasi SDK:", err);
  }
} else {
  console.warn("[Firebase] Menggunakan kredensial kosong/placeholder. Silakan konfigurasikan VITE_FIREBASE_* di .env.");
}

// ── AUTHENTICATION FUNCTIONS ──

// Trigger Google Pop-up Auth Flow
window.handleLogin = async function() {
  if (!hasFirebaseCredentials) {
    showToast("Firebase belum dikonfigurasi! Harap lengkapi credentials Firebase di tab Settings.", "error");
    return;
  }
  const provider = new GoogleAuthProvider();
  try {
    showToast("Menghubungkan ke Google...", "");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    showToast("Selamat datang, " + user.displayName + "!", "success");
  } catch (err) {
    if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
      showUnauthorizedDomainInstructions();
      showToast("Domain belum didaftarkan di Firebase Console!", "error");
    } else {
      showToast("Gagal login: " + err.message, "error");
    }
    console.error("Auth error:", err);
  }
};

// Helper to show detailed setup steps for auth/unauthorized-domain error
function showUnauthorizedDomainInstructions() {
  const container = document.getElementById('loginErrorContainer');
  if (!container) return;
  
  const currentHost = window.location.hostname;
  
  container.innerHTML = `
    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: left; font-size: 13px; color: #fca5a5; line-height: 1.5; animation: slideInUp 0.4s ease;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: #f87171; font-weight: 700; font-size: 14px;">
        <svg style="width: 18px; height: 18px; flex-shrink: 0;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Domain Otorisasi Diperlukan</span>
      </div>
      <p style="margin-bottom: 12px; color: #e4e4e7; font-size: 12px;">
        Firebase memblokir login karena domain aplikasi ini belum didaftarkan sebagai Authorized Domain di proyek Firebase Anda.
      </p>
      
      <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 10px; margin-bottom: 14px; border: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-bottom: 4px; font-weight: 600;">Salin Domain Ini:</div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <code id="domainNameCode" style="font-family: monospace; color: #60a5fa; font-size: 11px; word-break: break-all; font-weight: 600;">${currentHost}</code>
          <button onclick="copyDomainToClipboard()" style="background: rgba(255,255,255,0.15); border: none; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; transition: background 0.2s; white-space: nowrap; font-weight: 600;">Salin</button>
        </div>
      </div>
      
      <div style="font-weight: 600; color: #ffffff; margin-bottom: 6px; font-size: 12px;">Cara Mengatasi di Firebase Console:</div>
      <ol style="margin: 0; padding-left: 18px; color: #d4d4d8; display: flex; flex-direction: column; gap: 6px; font-size: 11.5px;">
        <li>Buka <a href="https://console.firebase.google.com/" target="_blank" style="color: #60a5fa; text-decoration: underline; font-weight: 500;">Firebase Console</a> Anda.</li>
        <li>Pilih proyek Anda, lalu masuk ke menu <strong>Build > Authentication</strong>.</li>
        <li>Klik tab <strong>Settings</strong> di bagian atas.</li>
        <li>Pilih submenu <strong>Authorized domains</strong> (Domain otorisasi).</li>
        <li>Klik tombol <strong>Add domain</strong> (Tambahkan domain).</li>
        <li>Tempel (Paste) domain yang sudah Anda salin di atas, lalu klik <strong>Add</strong>.</li>
        <li>Kembali ke sini dan klik <strong>Masuk dengan Google</strong> kembali!</li>
      </ol>
    </div>
  `;
}

window.copyDomainToClipboard = function() {
  const currentHost = window.location.hostname;
  navigator.clipboard.writeText(currentHost).then(() => {
    showToast("Domain disalin ke clipboard!", "success");
  }).catch(() => {
    showToast("Gagal menyalin otomatis, silakan salin manual.", "error");
  });
};

// Helper to show Firestore security rules instructions
window.showFirestoreRulesInstructions = function() {
  const container = document.getElementById('globalNotificationArea');
  if (!container) return;
  
  container.style.display = 'block';
  container.innerHTML = `
    <div style="background: rgba(229, 169, 60, 0.1); border: 1.5px solid #e5a93c; border-radius: 14px; padding: 20px; text-align: left; font-size: 13.5px; color: var(--text, #ffffff); line-height: 1.6; animation: slideInUp 0.4s ease; max-width: 100%; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative;">
      <button onclick="document.getElementById('globalNotificationArea').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text-mute, #a1a1a6); font-size: 22px; cursor: pointer; transition: color 0.2s;" title="Tutup">×</button>
      
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: #e5a93c; font-weight: 700; font-size: 15px;">
        <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Aturan Keamanan Firestore Diperlukan (Missing/Insufficient Permissions)</span>
      </div>
      
      <p style="margin-bottom: 14px; color: var(--text-mute, #a1a1a6); font-size: 12.5px;">
        Proyek Firebase Anda saat ini memblokir penyimpanan data karena aturan keamanan (Security Rules) bawaan melarang akses tulis/baca. Selesaikan ini dengan menyalin aturan keamanan di bawah ini ke Firestore Anda.
      </p>
      
      <div style="background: #18181c; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <span style="font-size: 11px; text-transform: uppercase; font-family: monospace; color: #a1a1aa; font-weight: 600;">Aturan Firestore (Security Rules)</span>
          <button onclick="copyRulesToClipboard()" style="background: rgba(229, 169, 60, 0.2); border: 1px solid #e5a93c; color: #e5a93c; padding: 4px 12px; border-radius: 6px; font-size: 11.5px; cursor: pointer; transition: all 0.2s; font-weight: 600;">Salin Aturan</button>
        </div>
        <pre style="margin: 0; padding: 14px; font-family: monospace; font-size: 11px; color: #34d399; overflow-x: auto; line-height: 1.5; text-align: left;"><code id="firestoreRulesCode">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global safety net catches all and denies by default
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidUserConfig(data) {
      return (data.theme == null || (data.theme is string && data.theme.size() <= 10)) &&
             (data.thresholdVeryBad == null || (data.thresholdVeryBad is number && data.thresholdVeryBad >= 0 && data.thresholdVeryBad <= 24)) &&
             (data.thresholdBad == null || (data.thresholdBad is number && data.thresholdBad >= 0 && data.thresholdBad <= 24)) &&
             (data.thresholdFair == null || (data.thresholdFair is number && data.thresholdFair >= 0 && data.thresholdFair <= 24)) &&
             (data.habitsConfig == null || (data.habitsConfig is list && data.habitsConfig.size() <= 50)) &&
             (data.limitBulanan == null || (data.limitBulanan is number && data.limitBulanan >= 0));
    }

    function isValidUserDay(data) {
      return data.hours is number &&
             data.hours >= 0 &&
             data.hours <= 24 &&
             data.completedHabits is list &&
             data.completedHabits.size() <= 100;
    }

    function isValidDateId(id) {
       return id is string && id.size() <= 20 && id.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    }

    // Match rules
    match /users/{userId} {
      allow read, delete: if isOwner(userId);
      allow create, update: if isOwner(userId) && isValidUserConfig(request.resource.data);

      match /config/{configId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidUserConfig(request.resource.data);
      }

      match /days/{dateId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidUserDay(request.resource.data) && isValidDateId(dateId);
      }
      
      match /summary/{summaryId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId);
      }

      // Buku Kas Data Subcollection
      match /data/{dataId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}</code></pre>
      </div>
      
      <div style="font-weight: 600; color: #ffffff; margin-bottom: 8px; font-size: 12.5px;">Langkah-langkah di Firebase Console Anda:</div>
      <ol style="margin: 0; padding-left: 20px; color: var(--text-mute, #a1a1a6); display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
        <li>Buka <a href="https://console.firebase.google.com/" target="_blank" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">Firebase Console</a> Anda.</li>
        <li>Pilih proyek Firebase Anda, lalu masuk to menu <strong>Firestore Database</strong> di panel kiri.</li>
        <li>Klik tab <strong>Rules</strong> (Aturan) di bagian atas halaman.</li>
        <li>Hapus aturan yang ada, lalu tempelkan (Paste) Aturan Firestore yang baru disalin di atas.</li>
        <li>Klik tombol <strong>Publish</strong> (Publikasikan) di sudut kanan atas.</li>
        <li>Setelah dipublikasikan, kembali ke sini dan coba klik tombol <strong>⟳ Sinkronisasi</strong> di tab Data atau simpan transaksi baru!</li>
      </ol>
    </div>
  `;
};

window.copyRulesToClipboard = function() {
  const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global safety net catches all and denies by default
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidUserConfig(data) {
      return (data.theme == null || (data.theme is string && data.theme.size() <= 10)) &&
             (data.thresholdVeryBad == null || (data.thresholdVeryBad is number && data.thresholdVeryBad >= 0 && data.thresholdVeryBad <= 24)) &&
             (data.thresholdBad == null || (data.thresholdBad is number && data.thresholdBad >= 0 && data.thresholdBad <= 24)) &&
             (data.thresholdFair == null || (data.thresholdFair is number && data.thresholdFair >= 0 && data.thresholdFair <= 24)) &&
             (data.habitsConfig == null || (data.habitsConfig is list && data.habitsConfig.size() <= 50)) &&
             (data.limitBulanan == null || (data.limitBulanan is number && data.limitBulanan >= 0));
    }

    function isValidUserDay(data) {
      return data.hours is number &&
             data.hours >= 0 &&
             data.hours <= 24 &&
             data.completedHabits is list &&
             data.completedHabits.size() <= 100;
    }

    function isValidDateId(id) {
       return id is string && id.size() <= 20 && id.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    }

    // Match rules
    match /users/{userId} {
      allow read, delete: if isOwner(userId);
      allow create, update: if isOwner(userId) && isValidUserConfig(request.resource.data);

      match /config/{configId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidUserConfig(request.resource.data);
      }

      match /days/{dateId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidUserDay(request.resource.data) && isValidDateId(dateId);
      }
      
      match /summary/{summaryId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId);
      }

      // Buku Kas Data Subcollection
      match /data/{dataId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}`;
  navigator.clipboard.writeText(rulesText).then(() => {
    showToast("Aturan Firestore disalin ke clipboard!", "success");
  }).catch(() => {
    showToast("Gagal menyalin otomatis, silakan salin secara manual.", "error");
  });
};

// Log Out
window.handleLogout = async function() {
  if (!confirm("Apakah Anda yakin ingin keluar?")) return;
  try {
    if (auth) {
      await signOut(auth);
    }
    showToast("Berhasil keluar.", "success");
    // Reload state and show login screen
    location.reload();
  } catch (err) {
    showToast("Gagal keluar: " + err.message, "error");
    console.error("Signout error:", err);
  }
};

// ── DATA PERSISTENCE & SYNCING ──

// Save local state to Firestore
window.saveToFirebase = async function() {
  if (!auth || !db || !auth.currentUser) return;
  
  const userId = auth.currentUser.uid;
  showSyncStatus('syncing', 'Menyimpan...');
  
  try {
    // 1. Save main state to Firestore
    const dataRef = doc(db, "users", userId, "data", "buku_kas");
    await setDoc(dataRef, st, { merge: false }); // save entire state object
    
    // 2. Refresh the real-time summary hub for the main homepage!
    await window.kirimRingkasanKeHub();
    
    showSyncStatus('synced', 'Tersimpan ke Cloud');
  } catch (err) {
    showSyncStatus('error', 'Gagal simpan');
    console.error("Firebase save error:", err);
    if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission'))) {
      if (typeof window.showFirestoreRulesInstructions === 'function') {
        window.showFirestoreRulesInstructions();
      }
    }
  }
};

// Sync state from Firestore
window.syncFromFirebase = async function() {
  if (!auth || !db || !auth.currentUser) return;
  
  const userId = auth.currentUser.uid;
  showSyncStatus('syncing', 'Mengunduh...');
  
  try {
    const dataRef = doc(db, "users", userId, "data", "buku_kas");
    const docSnap = await getDoc(dataRef);
    
    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      if (cloudData && cloudData.transactions) {
        // Populate state with cloud data
        st = cloudData;
        
        // Normalisasi state setelah sinkronisasi
        if (!st.settings) st.settings = { limitBulan: 0, limitKategori: {} };
        if (!st.debts) st.debts = [];
        if (!st.categories) st.categories = [...DEFAULT_CATS];
        if (!st.settings.limitKategori) st.settings.limitKategori = {};
        if (!st.tags) st.tags = [];
        if (!st.notes) st.notes = [];
        if (!st.savings) st.savings = [];
        
        localSave(); // Save to localStorage
        if (typeof initDate === 'function' && !curYear) initDate();
        if (typeof initAll === 'function') initAll();
        
        showSyncStatus('synced', 'Tersinkron');
        console.log("[Firebase] Data berhasil diunduh dari cloud!");
      }
    } else {
      // First-time user, push existing localStorage data to Firestore
      console.log("[Firebase] Pengguna baru, melakukan migrasi data lokal ke cloud...");
      await window.saveToFirebase();
    }
  } catch (err) {
    showSyncStatus('error', 'Gagal sinkronisasi');
    console.error("Firebase sync error:", err);
    if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission'))) {
      if (typeof window.showFirestoreRulesInstructions === 'function') {
        window.showFirestoreRulesInstructions();
      }
    }
  }
};

// Trigger manual sync button (Two-way sync: saves current local state first to update Homepage, then pulls latest from cloud)
window.manualSync = async function() {
  if (!auth || !auth.currentUser) {
    showToast("Belum login.", "error");
    return;
  }
  showSyncStatus('syncing', 'Sinkronisasi...');
  try {
    // 1. Upload local data first (backed up & synced to individual subcollections for the homepage)
    await window.saveToFirebase();
    // 2. Refresh local state from the latest database backup
    await window.syncFromFirebase();
    showToast("Sinkronisasi Firebase berhasil!", "success");
  } catch (err) {
    console.error("Manual sync error:", err);
    showToast("Gagal sinkronisasi data.", "error");
  }
};

// ── HUB SUMMARY EXPORTER (Web C Reflection) ──

// Calculates metrics and sends them to the parent homepage hub path: users/{USER_ID}/summary/money
window.kirimRingkasanKeHub = async function() {
  if (!auth || !db || !auth.currentUser) return;
  
  const userId = auth.currentUser.uid;
  const dataCollRef = collection(db, "users", userId, "data");
  const configRef = doc(db, "users", userId, "config", "main");
  const hubRef = doc(db, "users", userId, "summary", "money");
  
  try {
    const transactions = (typeof st !== 'undefined' && st && st.transactions) ? st.transactions : [];
    
    // 1. Sync Limit Bulanan to Config
    const limitBulanan = (typeof st !== 'undefined' && st && st.settings && st.settings.limitBulan) || 0;
    await setDoc(configRef, { limitBulanan: limitBulanan }, { merge: true });
    
    // 2. Sync transactions
    // To handle deletions, we first get all existing documents in 'data' subcollection
    const querySnapshot = await getDocs(dataCollRef);
    const existingDocIds = [];
    querySnapshot.forEach((docSnap) => {
      // Ignore the app's own state document
      if (docSnap.id !== 'buku_kas') {
         existingDocIds.push(docSnap.id);
      }
    });
    
    // Save/Update current transactions
    const currentTxIds = new Set();
    const savePromises = transactions.map(tx => {
      currentTxIds.add(tx.id);
      
      // Convert to valid ISO string at noon UTC to ensure correct date falls on the same calendar day in all timezones
      let isoDate = tx.date;
      try {
        if (!isoDate.includes('T')) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
            isoDate = tx.date + "T12:00:00.000Z";
          } else {
            isoDate = new Date(tx.date).toISOString();
          }
        }
      } catch(e) {}
      
      return setDoc(doc(db, "users", userId, "data", tx.id), {
        amount: Number(tx.amount),
        type: tx.type,
        date: isoDate,
        deskripsi: tx.note || tx.category || 'Transaksi'
      }); // Do not merge, we want to fully replace the transaction document
    });
    
    await Promise.all(savePromises);
    
    // Delete missing transactions
    const deletePromises = [];
    for (const docId of existingDocIds) {
      if (!currentTxIds.has(docId)) {
        deletePromises.push(deleteDoc(doc(db, "users", userId, "data", docId)));
      }
    }
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
    
    // 3. Calculate and Sync Summary/Money (Web Homepage Summary Hub)
    const targetYear = (typeof curYear !== 'undefined' && curYear) ? curYear : new Date().getFullYear();
    const targetMonth = (typeof curMonth !== 'undefined' && curMonth !== null) ? curMonth : new Date().getMonth();
    const txs = typeof txForMonth === 'function' ? txForMonth(targetYear, targetMonth) : [];
    
    // Monthly calculations (based on active selected month, matching the dashboard)
    const currentMonthMasuk = txs.filter(t => t.type === 'pemasukan').reduce((a, t) => a + t.amount, 0);
    const totalExpense = txs.filter(t => t.type === 'pengeluaran').reduce((a, t) => a + t.amount, 0);
    const netBalance = currentMonthMasuk - totalExpense;
    
    // Average Daily Expense (using actual recorded expense days)
    const hariKeluar = new Set(txs.filter(t => t.type === 'pengeluaran').map(t => t.date));
    const jmlHari = hariKeluar.size;
    const avgExpenseDay = jmlHari > 0 ? Math.round(totalExpense / jmlHari) : 0;
    
    // Sisa Limit Bulanan
    const lb = (typeof st !== 'undefined' && st && st.settings && st.settings.limitBulan) || 0;
    const remainingMonthlyLimit = lb > 0 ? (lb - totalExpense) : 0;
    
    const payload = {
      netBalance: netBalance,
      totalExpense: totalExpense,
      avgExpenseDay: avgExpenseDay,
      remainingMonthlyLimit: remainingMonthlyLimit,
      lastUpdated: new Date().toISOString()
    };
    
    await setDoc(hubRef, payload, { merge: true });
    
    console.log("[Firebase] Berhasil sinkronisasi transaksi, limit, dan data ringkasan ke Web Homepage:", payload);
  } catch (err) {
    console.error("[Firebase] Gagal sinkronisasi ke Web Homepage:", err);
  }
};

// ── STATE MONITOR & AUTHENTICATION OVERLAY ──

document.addEventListener('DOMContentLoaded', () => {
  // Setup overlay HTML element if not present
  let loginOverlay = document.getElementById('loginOverlay');
  if (!loginOverlay) {
    loginOverlay = document.createElement('div');
    loginOverlay.id = 'loginOverlay';
    loginOverlay.className = 'login-overlay';
    loginOverlay.innerHTML = `
      <div class="login-card">
        <div class="login-logo">GB</div>
        <h2 class="login-title">GB - Money Management</h2>
        <p class="login-subtitle">Aplikasi pengelolaan keuangan pribadi yang terintegrasi penuh secara real-time.</p>
        
        ${!hasFirebaseCredentials ? `
          <div class="firebase-config-warning" style="background:#fff2e8; border:1px solid #ffbb96; border-radius:8px; padding:12px; margin-bottom:20px; text-align:left; font-size:12px; color:#d4380d; line-height:1.5;">
            <strong>⚠️ Firebase Belum Dikonfigurasi:</strong><br>
            Project Firebase belum terhubung. Silakan masukkan kredensial Firebase Anda melalui tab <strong>Settings</strong> di AI Studio (sesuai kunci <code>VITE_FIREBASE_*</code> di file <code>.env.example</code>).
          </div>
        ` : ''}

        <div id="loginErrorContainer"></div>

        <button class="btn btn-google-login" onclick="handleLogin()">
          <svg style="width:18px; height:18px;" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Masuk dengan Google
        </button>
      </div>
    `;
    document.body.appendChild(loginOverlay);
  }

  // Monitor auth state changes
  if (auth) {
    onAuthStateChanged(auth, async (user) => {
      const authUserEl = document.getElementById('authUser');
      const syncStatusEl = document.getElementById('syncStatus');
      const loginOverlayEl = document.getElementById('loginOverlay');
      
      if (user) {
        console.log("[Firebase] Pengguna login:", user.email);
        isLoggedIn = true;
        
        // Hide login overlay with soft fade
        if (loginOverlayEl) {
          loginOverlayEl.classList.add('logged-in');
        }
        
        // Render Google User Profile in Settings Tab
        if (authUserEl) {
          authUserEl.style.display = 'block';
          authUserEl.innerHTML = `
            <div class="settings-group">
              <div class="sg-title">Akun Terhubung (Cloud Sync)</div>
              <div class="user-profile-card">
                <div class="user-profile-info">
                  <img src="${user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}" class="user-avatar" alt="${user.displayName}" referrerpolicy="no-referrer">
                  <div class="user-meta">
                    <span class="user-name">${user.displayName}</span>
                    <span class="user-email">${user.email}</span>
                  </div>
                </div>
                <button class="user-logout-btn" onclick="handleLogout()" title="Keluar dari akun">
                  <svg viewBox="0 0 24 24" style="width:16px; height:16px;">
                    <path fill="currentColor" d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/>
                  </svg>
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          `;
        }
        
        if (syncStatusEl) syncStatusEl.style.display = 'flex';
        
        // Sync and initialize app
        await window.syncFromFirebase();
        
      } else {
        console.log("[Firebase] Tidak ada pengguna terautentikasi.");
        isLoggedIn = false;
        
        if (loginOverlayEl) {
          loginOverlayEl.classList.remove('logged-in');
        }
        
        if (authUserEl) {
          authUserEl.style.display = 'none';
          authUserEl.innerHTML = '';
        }
        if (syncStatusEl) syncStatusEl.style.display = 'none';
      }
    });
  } else {
    // If Firebase isn't initialized, we leave the overlay up so they can read the warning about configuration.
    console.warn("[Firebase] Firebase Auth tidak siap.");
  }
});
