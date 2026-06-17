// ══════════════════════════════════════════════════════
// CONFIGURASI & GLOBAL STATE
// ══════════════════════════════════════════════════════

// Google Drive & Authentication Constants
const CLIENT_ID     = '1069695927163-80hq9ruvu5b6hj66c3f1hf5d14s03hft.apps.googleusercontent.com';
const HAD_LOGIN_KEY = 'buku_kas_had_login';
const TOKEN_KEY     = 'buku_kas_token';
const TOKEN_EXP_KEY = 'buku_kas_token_exp';
const FILE_ID_KEY  = 'buku_kas_drive_file_id';
const DRIVE_FILE   = 'buku_kas_data.json';

// Local Storage Keys
const KEY              = 'buku_kas_v1';
const API_KEY_STORAGE  = 'gb_mm_anthropic_key';

// Default Constants
const DEFAULT_CATS = ['Makan','Transport','Belanja','Hiburan','Kesehatan','Tagihan','Lainnya'];
const MONTHS       = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// Google Identity Services (GIS) State
var gisReady = false;
var tokenClient;
var _accessToken = null;
var driveFileId = localStorage.getItem(FILE_ID_KEY) || null;
var syncTimer;
var isLoggedIn = false;

// Helpers & Flags for connectivity
var _pendingSync = false;

// App State
function loadSt(){
  try {
    const r = localStorage.getItem(KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

// Initial St Setup
var st = loadSt() || { 
  transactions: [], 
  debts: [], 
  categories: [...DEFAULT_CATS], 
  tags: [], 
  settings: { limitBulan: 0, limitKategori: {} },
  notes: [] // Added default Notes array 
};

// State normalizer
if (!st.settings) st.settings = { limitBulan: 0, limitKategori: {} };
if (!st.debts) st.debts = [];
if (!st.categories) st.categories = [...DEFAULT_CATS];
if (!st.settings.limitKategori) st.settings.limitKategori = {};
if (!st.tags) st.tags = [];
if (!st.notes) st.notes = [];

// Filters, View Context & Interactions State
var curYear;
var curMonth;
var txFilter = 'semua';
var txType = 'pengeluaran';
var debtType = 'hutang';
var txSearch = '';
var activeTagFilters = new Set();
var selectedTxTags = new Set();
var selectedTxIds = new Set();
var visibleTxIds = [];

// Editing transaction modal temporary state
var _editTxId = null;
var _editTxTags = new Set();
var _editTagOld = null;

// AI Evaluation States
var lastEvalText = '';
var lastEvalMonth = '';
var _evalConfirmData = null; // Temporary confirmation modal data
var _lastEvaluasiText = '';

// Toast state timer helper
var _tt;
