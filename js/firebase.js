// ══════════════════════════════════════════════════════
// FIREBASE AUTH & FIRESTORE INTEGRATION
// ══════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase configuration from environment or direct manual setup.
// If configuring via the AI Studio editor settings, use these exact VITE_ variables.
const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) || "YOUR_API_KEY",
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "",
  projectId: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID) || "",
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || "",
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "",
  appId: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_APP_ID) || ""
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
    showToast("Gagal login: " + err.message, "error");
    console.error("Auth error:", err);
  }
};

// Log Out
window.handleLogout = async function() {
  if (!auth) return;
  if (!confirm("Apakah Anda yakin ingin keluar?")) return;
  try {
    await signOut(auth);
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
  }
};

// Trigger manual sync button
window.manualSync = async function() {
  if (!auth || !auth.currentUser) {
    showToast("Belum login.", "error");
    return;
  }
  showSyncStatus('syncing', 'Sinkronisasi...');
  await window.syncFromFirebase();
  showToast("Sinkronisasi Firebase selesai!", "success");
};

// ── HUB SUMMARY EXPORTER (Web C Reflection) ──

// Calculates metrics and sends them to the parent homepage hub path: users/{USER_ID}/summary/money
window.kirimRingkasanKeHub = async function() {
  if (!auth || !db || !auth.currentUser) return;
  
  const userId = auth.currentUser.uid;
  const hubRef = doc(db, "users", userId, "summary", "money");
  
  try {
    // Determine active transactions for current month
    const targetYear = curYear || new Date().getFullYear();
    const targetMonth = (curMonth !== undefined && curMonth !== null) ? curMonth : new Date().getMonth();
    
    const txs = typeof txForMonth === 'function' ? txForMonth(targetYear, targetMonth) : [];
    
    // Overall calculations
    const overallMasuk = st.transactions.filter(t => t.type === 'pemasukan').reduce((a, t) => a + t.amount, 0);
    const overallKeluar = st.transactions.filter(t => t.type === 'pengeluaran').reduce((a, t) => a + t.amount, 0);
    const netBalance = overallMasuk - overallKeluar;
    
    // Monthly Expense
    const totalExpense = txs.filter(t => t.type === 'pengeluaran').reduce((a, t) => a + t.amount, 0);
    
    // Average Daily Expense (using actual recorded expense days)
    const hariKeluar = new Set(txs.filter(t => t.type === 'pengeluaran').map(t => t.date));
    const jmlHari = hariKeluar.size;
    const avgExpenseDay = jmlHari > 0 ? Math.round(totalExpense / jmlHari) : 0;
    
    // Sisa Limit Bulanan
    const lb = (st && st.settings && st.settings.limitBulan) || 0;
    const remainingMonthlyLimit = lb > 0 ? (lb - totalExpense) : 0;
    
    // Assemble the payload exactly as instructed by Web Induk specification
    const payload = {
      netBalance: netBalance,
      totalExpense: totalExpense,
      avgExpenseDay: avgExpenseDay,
      remainingMonthlyLimit: remainingMonthlyLimit
    };
    
    await setDoc(hubRef, payload, { merge: true });
    console.log("[Firebase] Berhasil memantulkan data ringkasan ke Web Induk:", payload);
  } catch (err) {
    console.error("[Firebase] Gagal mengirim ringkasan ke hub:", err);
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
        
        // Render Google User Profile in Header
        if (authUserEl) {
          authUserEl.style.display = 'flex';
          authUserEl.innerHTML = `
            <div class="user-profile-card">
              <img src="${user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}" class="user-avatar" alt="${user.displayName}" referrerpolicy="no-referrer">
              <div class="user-meta">
                <span class="user-name">${user.displayName}</span>
                <span class="user-email">${user.email}</span>
              </div>
              <button class="user-logout-btn" onclick="handleLogout()" title="Keluar dari akun">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/>
                </svg>
              </button>
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
