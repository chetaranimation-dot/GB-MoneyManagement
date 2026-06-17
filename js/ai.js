// ══════════════════════════════════════════════════════
// FITUR EVALUASI AI (ANTHROPIC API INTEGRATION)
// ══════════════════════════════════════════════════════

// Ambil Key dari Local Storage
function getApiKey(){
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

// Simpan API Key Baru dengan Validasi Dasar
function saveApiKey(){
  const apiKeyInput = document.getElementById('apiKeyInput');
  const val = apiKeyInput ? apiKeyInput.value.trim() : '';
  if(!val){
    showToast('API Key tidak boleh kosong.', 'error');
    return;
  }
  if(!val.startsWith('sk-ant-')){
    showToast('Format API Key tidak valid. Harus diawali "sk-ant-".', 'error');
    return;
  }
  localStorage.setItem(API_KEY_STORAGE, val);
  updateApiKeyStatus();
  showToast('API Key berhasil disimpan!', 'success');
}

// Hapus API Key Tersimpan
function clearApiKey(){
  if(!confirm('Hapus API Key yang tersimpan?')) return;
  localStorage.removeItem(API_KEY_STORAGE);
  const apiKeyInput = document.getElementById('apiKeyInput');
  if(apiKeyInput) apiKeyInput.value = '';
  updateApiKeyStatus();
  showToast('API Key dihapus.', '');
}

// Toggle Sembunyikan/Tampilkan Key
function toggleApiKeyVisibility(){
  const inp = document.getElementById('apiKeyInput');
  const btn = document.getElementById('apiKeyToggle');
  if(!inp || !btn) return;
  if(inp.type === 'password'){
    inp.type = 'text';
    btn.textContent = '🙈';
    btn.title = 'Sembunyikan key';
  } else {
    inp.type = 'password';
    btn.textContent = '👁';
    btn.title = 'Tampilkan key';
  }
}

// Event Handler saat Mengetik API Key
function onApiKeyInput(){
  const statusEl = document.getElementById('apiKeyStatus');
  if(statusEl) {
    statusEl.textContent = 'Belum disimpan';
    statusEl.style.color = 'var(--amber)';
  }
}

// Update UI Status Indikator API Key
function updateApiKeyStatus(){
  const key = getApiKey();
  const statusEl = document.getElementById('apiKeyStatus');
  const clearBtn = document.getElementById('apiKeyClearBtn');
  const inp = document.getElementById('apiKeyInput');
  if(!statusEl) return;

  if(key){
    // Tampilkan label preview aman (4 karakter terakhir)
    const preview = key.slice(0, 10) + '•••••••••••' + key.slice(-4);
    statusEl.textContent = '✓ Tersimpan: ' + preview;
    statusEl.style.color = 'var(--green)';
    if(clearBtn) clearBtn.style.display = '';
    if(inp) inp.value = key;
  } else {
    statusEl.textContent = 'Belum ada API Key';
    statusEl.style.color = 'var(--text-mute)';
    if(clearBtn) clearBtn.style.display = 'none';
    if(inp) inp.value = '';
  }
}

// Hydrate Form dengan Data Key Tersimpan
function loadApiKeyToForm(){
  const key = getApiKey();
  const statusEl = document.getElementById('apiKeyStatus');
  const inp = document.getElementById('apiKeyInput');
  const clearBtn = document.getElementById('apiKeyClearBtn');

  if(inp && key) {
    inp.value = key;
  }
  updateApiKeyStatus();
}

// ── EVALUASI AI ENGINE ──

// Persiapkan Ringkasan Data & Buka Modal Konfirmasi
function requestEvaluation(){
  const apiKey = getApiKey();
  if(!apiKey){
    showToast('API Key belum diisi. Buka tab Pengaturan → Konfigurasi AI.', 'error');
    return;
  }
  const txsBulan = txForMonth(curYear, curMonth);
  if(txsBulan.length === 0){
    showToast('Tidak ada transaksi di bulan ini untuk dievaluasi.', 'error');
    return;
  }

  // Hitung data ringkasan agregat
  const keluar  = txsBulan.filter(t => t.type === 'pengeluaran');
  const masuk   = txsBulan.filter(t => t.type === 'pemasukan');
  const totK    = keluar.reduce((a, t) => a + t.amount, 0);
  const totM    = masuk.reduce((a, t) => a + t.amount, 0);
  const saldo   = totM - totK;
  const hariSet = new Set(keluar.map(t => t.date));
  const jmlHari = hariSet.size;
  const rataHari = jmlHari > 0 ? Math.round(totK / jmlHari) : 0;

  // Akumulasi Per kategori
  const katMap = {};
  keluar.forEach(t => { katMap[t.category] = (katMap[t.category] || 0) + t.amount; });

  // Akumulasi Per tag
  const tagMap = {};
  keluar.forEach(t => {
    (t.tags || []).forEach(tag => { tagMap[tag] = (tagMap[tag] || 0) + t.amount; });
  });

  // Limit Budgets
  const limitBulan = st.settings.limitBulan;
  const limitKat   = st.settings.limitKategori || {};

  // Hari paling boros
  const hariMap = {};
  keluar.forEach(t => { hariMap[t.date] = (hariMap[t.date] || 0) + t.amount; });
  const hariBoros = Object.entries(hariMap).sort((a, b) => b[1] - a[1])[0];

  // Simpan ke state sementara
  _evalConfirmData = {
    bulanStr: MONTHS[curMonth] + ' ' + curYear,
    keluar, masuk, totK, totM, saldo,
    jmlHari, rataHari, katMap, tagMap,
    limitBulan, limitKat, hariBoros
  };

  // Isi data ringkasan ke modal konfirmasi
  const d = _evalConfirmData;

  const ecPeriode = document.getElementById('ecPeriode');
  if(ecPeriode) {
    ecPeriode.innerHTML = [
      { k: 'Periode',           v: d.bulanStr },
      { k: 'Total Pemasukan',   v: rp(d.totM) + ' (' + d.masuk.length + ' transaksi)' },
      { k: 'Total Pengeluaran', v: rp(d.totK) + ' (' + d.keluar.length + ' transaksi)' },
      { k: 'Saldo Bersih',      v: rp(d.saldo) },
      { k: 'Rata-rata/Hari',    v: rp(d.rataHari) + ' (' + d.jmlHari + ' hari aktual)' },
    ].map(r => `<div class="eval-confirm-row">
      <span class="eval-confirm-key">${r.k}</span>
      <span class="eval-confirm-val">${r.v}</span>
    </div>`).join('');
  }

  // Pengeluaran per kategori
  const ecKategori = document.getElementById('ecKategori');
  if(ecKategori) {
    const katEntries = Object.entries(d.katMap).sort((a, b) => b[1] - a[1]);
    ecKategori.innerHTML = katEntries.length === 0
      ? '<span style="font-size:11px;color:var(--text-mute);">—</span>'
      : katEntries.map(([k, v]) => {
          const pct = d.totK > 0 ? ((v / d.totK) * 100).toFixed(1) : '0';
          return `<div class="eval-confirm-row">
            <span class="eval-confirm-key">${escH(k)}</span>
            <span class="eval-confirm-val">${rp(v)} · ${pct}%</span>
          </div>`;
        }).join('');
  }

  // Pengeluaran per tag
  const tagEntries = Object.entries(d.tagMap).sort((a, b) => b[1] - a[1]);
  const tagSection = document.getElementById('ecTagSection');
  const ecTag = document.getElementById('ecTag');
  if(tagSection) {
    if(tagEntries.length === 0){
      tagSection.style.display = 'none';
    } else {
      tagSection.style.display = '';
      if(ecTag) {
        ecTag.innerHTML = tagEntries.map(([k, v]) =>
          `<div class="eval-confirm-row">
            <span class="eval-confirm-key">${escH(k)}</span>
            <span class="eval-confirm-val">${rp(v)}</span>
          </div>`).join('');
      }
    }
  }

  // Status Limit Budgets
  const limitSection = document.getElementById('ecLimitSection');
  const ecLimit = document.getElementById('ecLimit');
  const limitLines = [];
  if(d.limitBulan > 0){
    const over = d.totK > d.limitBulan;
    limitLines.push(`<div class="eval-confirm-row">
      <span class="eval-confirm-key">Limit Bulanan</span>
      <span class="eval-confirm-val" style="color:${over ? 'var(--red)' : 'var(--green)'};">
        ${rp(d.totK)} / ${rp(d.limitBulan)} ${over ? '⚠ MELEBIHI' : '✓ Aman'}
      </span>
    </div>`);
  }
  Object.entries(d.limitKat).forEach(([cat, lim]) => {
    if(!lim) return;
    const spent = d.katMap[cat] || 0;
    const over  = spent > lim;
    limitLines.push(`<div class="eval-confirm-row">
      <span class="eval-confirm-key">${escH(cat)}</span>
      <span class="eval-confirm-val" style="color:${over ? 'var(--red)' : 'var(--green)'};">
        ${rp(spent)} / ${rp(lim)} ${over ? '⚠ MELEBIHI' : '✓ Aman'}
      </span>
    </div>`);
  });
  
  if(limitSection) {
    if(limitLines.length === 0){
      limitSection.style.display = 'none';
    } else {
      limitSection.style.display = '';
      if(ecLimit) ecLimit.innerHTML = limitLines.join('');
    }
  }

  // Peringatan Limit
  const warnEl = document.getElementById('ecWarn');
  if(warnEl) {
    const overBulan = d.limitBulan > 0 && d.totK > d.limitBulan;
    const overKats  = Object.entries(d.limitKat).filter(([c, l]) => l > 0 && (d.katMap[c] || 0) > l).map(([c]) => c);
    if(overBulan || overKats.length > 0){
      const msgs = [];
      if(overBulan) msgs.push('limit bulanan terlampaui');
      if(overKats.length > 0) msgs.push('limit kategori ' + overKats.join(', ') + ' terlampaui');
      warnEl.innerHTML = `<div class="eval-confirm-warn">⚠ Perhatian: ${msgs.join(' dan ')}. AI akan menyoroti ini dalam evaluasinya.</div>`;
    } else if(d.keluar.length > 0) {
      warnEl.innerHTML = `<div class="eval-confirm-ok">✓ Semua pengeluaran dalam batas limit yang ditetapkan.</div>`;
    } else {
      warnEl.innerHTML = '';
    }
  }

  // Tampilkan Modal
  const modal = document.getElementById('evalConfirmModal');
  if(modal) modal.classList.add('open');
}

function closeEvalConfirm(){
  const modal = document.getElementById('evalConfirmModal');
  if(modal) modal.classList.remove('open');
  _evalConfirmData = null;
}

// Kirim data langsung ke Claude/Anthropic API
async function confirmAndEvaluate(){
  const d = _evalConfirmData;
  if(!d){ 
    showToast('Data tidak ditemukan, coba lagi.', 'error'); 
    return; 
  }
  closeEvalConfirm();

  const evalBtn = document.getElementById('evalBtn');
  const evalLoading = document.getElementById('evalLoading');
  const evalPanel = document.getElementById('evalPanel');
  const loadingText = document.getElementById('evalLoadingText');
  const evalBody = document.getElementById('evalBody');
  const evalMeta = document.getElementById('evalMeta');

  if(evalBtn) evalBtn.disabled = true;
  if(evalLoading) evalLoading.style.display = 'flex';
  if(evalPanel) evalPanel.classList.remove('visible');
  if(loadingText) loadingText.textContent = 'AI sedang menganalisis data keuanganmu...';

  try {
    // Susun baris kategori
    const katLines = Object.entries(d.katMap)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => {
        const pct = d.totK > 0 ? ((v / d.totK) * 100).toFixed(1) : '0';
        const lim = d.limitKat[k] || 0;
        const limStr = lim > 0
          ? ` | limit: ${rp(lim)} — ${(d.katMap[k] || 0) > lim ? 'MELEBIHI LIMIT' : 'dalam batas'}`
          : '';
        return `  - ${k}: ${rp(v)} (${pct}%)${limStr}`;
      }).join('\n') || '  (tidak ada)';

    const tagLines = Object.entries(d.tagMap).length > 0
      ? Object.entries(d.tagMap).sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `  - ${k}: ${rp(v)}`).join('\n')
      : '  (tidak ada tag yang dipakai)';

    const limitInfo = d.limitBulan > 0
      ? `${rp(d.limitBulan)} — sisa ${rp(d.limitBulan - d.totK)} (${d.totK > d.limitBulan ? 'MELEBIHI LIMIT' : 'dalam batas'})`
      : 'tidak diatur';

    const hariBorosaStr = d.hariBoros
      ? `${new Date(d.hariBoros[0] + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} — ${rp(d.hariBoros[1])}`
      : 'tidak ada data';

    const prompt =
`Kamu adalah analis keuangan pribadi yang membantu pengguna memahami pola pengeluaran mereka. Berikan evaluasi yang jujur, insightful, dan actionable dalam Bahasa Indonesia yang hangat namun profesional. Gunakan angka dari data yang diberikan — jangan mengarang data yang tidak ada.

═══════════════════════════════════════
DATA KEUANGAN — ${d.bulanStr}
═══════════════════════════════════════

RINGKASAN UMUM:
  Pemasukan total : ${rp(d.totM)} (${d.masuk.length} transaksi)
  Pengeluaran total: ${rp(d.totK)} (${d.keluar.length} transaksi)
  Saldo bersih    : ${rp(d.saldo)} (${d.saldo >= 0 ? 'SURPLUS' : 'DEFISIT'})
  Rata-rata/hari  : ${rp(d.rataHari)} (dihitung dari ${d.jmlHari} hari aktual tercatat, bukan 30 hari)
  Hari paling boros: ${hariBorosaStr}

LIMIT PENGELUARAN:
  Limit bulanan   : ${limitInfo}

PENGELUARAN PER KATEGORI (diurutkan terbesar):
${katLines}

PENGELUARAN PER TAG:
${tagLines}

═══════════════════════════════════════
FORMAT EVALUASI YANG DIHARAPKAN:
═══════════════════════════════════════
Tulis dengan heading yang jelas menggunakan tanda ▸ dan baris kosong antar seksi:

▸ RINGKASAN BULAN
[Kondisi keuangan bulan ini secara keseluruhan. Sebutkan apakah surplus atau defisit dan berapa selisihnya. 2-3 kalimat.]

▸ ANALISIS KATEGORI
[Bahas 2-3 kategori terbesar. Apakah wajar? Apakah ada yang perlu dikurangi? Bandingkan dengan proporsinya.]

▸ PERINGATAN
[Jika ada limit yang terlampaui atau pengeluaran yang sangat tidak proporsional, sebutkan secara spesifik. Jika tidak ada, tulis "Tidak ada peringatan khusus bulan ini."]

▸ POLA MENARIK
[Insight dari data: hari paling boros, distribusi pengeluaran, dll. Minimal 1 poin.]

▸ SARAN BULAN DEPAN
[2-3 saran konkret dan spesifik berdasarkan data di atas. Gunakan angka nyata dari data.]`;

    if(loadingText) loadingText.textContent = 'Menghubungi Anthropic AI...';
    lastEvalMonth = d.bulanStr;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if(!response.ok){
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || 'HTTP ' + response.status;
      if(response.status === 401)      throw new Error('API Key tidak valid atau kadaluarsa. Periksa di Pengaturan.');
      else if(response.status === 429) throw new Error('Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.');
      else if(msg.includes('credit'))throw new Error('Saldo API habis. Isi ulang di console.anthropic.com.');
      else                           throw new Error('Gagal menghubungi AI: ' + msg);
    }

    const resData = await response.json();
    const result = resData.content?.[0]?.text || '(Tidak ada respons dari AI)';
    lastEvalText = result;
    _lastEvaluasiText = result;

    const formatted = result
      .replace(/▸ ([A-Z ]+)/g, '<strong style="color:var(--gold-lt);letter-spacing:0.08em;">▸ $1</strong>');
      
    if(evalBody) evalBody.innerHTML = formatted;
    if(evalMeta) {
      evalMeta.textContent = d.bulanStr + ' · ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    if(evalPanel) {
      evalPanel.classList.add('visible');
      evalPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

  } catch(err) {
    showToast(err.message, 'error');
    console.error('AI Evaluation error:', err);
  } finally {
    if(evalBtn) evalBtn.disabled = false;
    if(evalLoading) evalLoading.style.display = 'none';
  }
}

function closeEvalPanel(){
  const panel = document.getElementById('evalPanel');
  if(panel) panel.classList.remove('visible');
}

function saveEvalAsNote(){
  if(!lastEvalText){ 
    showToast('Tidak ada evaluasi untuk disimpan.', 'error'); 
    return; 
  }
  const note = {
    id: Date.now(),
    title: 'Evaluasi AI — ' + lastEvalMonth,
    content: lastEvalText,
    date: new Date().toISOString()
  };
  
  if(!st.notes) st.notes = [];
  st.notes.unshift(note);
  save();
  showToast('Evaluasi disimpan ke tab Catatan!', 'success');
}

function tutupEvaluasi(){
  const res = document.getElementById('aiResult');
  if(res) res.classList.remove('visible');
}

function simpanEvaluasiSebagaiCatatan(){
  if(!_lastEvaluasiText){ 
    showToast('Tidak ada evaluasi untuk disimpan.', 'error'); 
    return; 
  }
  const judul = `Evaluasi AI — ${MONTHS[curMonth]} ${curYear}`;
  if(!st.notes) st.notes = [];
  
  const existing = st.notes.findIndex(n => n.title === judul);
  const note = {
    id: existing !== -1 ? st.notes[existing].id : Date.now(),
    title: judul,
    content: _lastEvaluasiText,
    date: new Date().toISOString()
  };
  
  if(existing !== -1) st.notes[existing] = note;
  else st.notes.unshift(note);
  
  save();
  showToast('Evaluasi disimpan ke Catatan!', 'success');
}
