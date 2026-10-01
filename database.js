/**
 * PlanPilot – Dosya Tabanlı Kalıcı Depolama (In-Memory Cache ile)
 * 
 * JSON dosyasında veri saklanır, bellek içi cache ile okunur.
 * writeFileSync ile diske yazılır – sunucu çökse bile veri korunur.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'requests.json');

// Data klasörünü oluştur
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Dosya yoksa boş yapı oluştur
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ lastId: 0, requests: [] }, null, 2), 'utf-8');
}

// ── In-Memory Cache ──
let cache = null;

/**
 * Veritabanını oku (cache varsa diskten okumaz)
 */
function readDB() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cache = JSON.parse(raw);
    return cache;
  } catch (err) {
    console.error('DB okuma hatası:', err.message);
    // Bozuk dosyayı yedekle
    try {
      const backupPath = DB_FILE + '.corrupt.' + Date.now();
      if (fs.existsSync(DB_FILE)) {
        fs.copyFileSync(DB_FILE, backupPath);
        console.error('Bozuk veritabanı yedeklendi:', backupPath);
      }
    } catch (backupErr) {
      console.error('Yedekleme başarısız:', backupErr.message);
    }
    // Temiz başlangıç
    cache = { lastId: 0, requests: [] };
    writeDB(cache);
    return cache;
  }
}

/**
 * Veritabanına yaz (cache'i de güncelle)
 */
function writeDB(data) {
  cache = data;
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Yeni kayıt ekle ve eklenen kaydı döndür
 * Senkron – Node.js tek thread olduğu için basit senaryo güvenli
 */
function insertRequest(record) {
  const db = readDB();
  db.lastId += 1;

  const entry = {
    id: db.lastId,
    full_name: record.full_name,
    email: record.email,
    service_type: record.service_type,
    description: record.description,
    ip_address: record.ip_address || 'unknown',
    created_at: new Date().toISOString()
  };

  db.requests.push(entry);
  writeDB(db);

  // writeFileSync başarısız olursa zaten throw eder
  // Bu yüzden buraya geldiysek kayıt başarılıdır
  return entry;
}

/**
 * Toplam kayıt sayısını döndür
 */
function getCount() {
  const db = readDB();
  return db.requests.length;
}

module.exports = { insertRequest, getCount };
