/**
 * PlanPilot – Dosya Tabanlı Kalıcı Depolama
 * JSON dosyasında veri saklıyoruz. Sıfır bağımlılık, her ortamda çalışır.
 * 
 * Neden SQLite yerine JSON?
 * - Native C++ derleme gerektirmez → deploy sorunsuz
 * - Tek dosya, okunabilir, denetlenebilir
 * - KOBİ MVP'si için yeterli performans
 * - Üretimde PostgreSQL'e geçiş kolay (aynı API arayüzü)
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

/**
 * Veritabanını oku
 */
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('DB okuma hatası:', err.message);
    return { lastId: 0, requests: [] };
  }
}

/**
 * Veritabanına yaz
 */
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Yeni kayıt ekle ve eklenen kaydı döndür
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

  // Doğrulama: gerçekten yazıldı mı?
  const verification = readDB();
  const saved = verification.requests.find(r => r.id === entry.id);
  return saved || null;
}

/**
 * Toplam kayıt sayısını döndür
 */
function getCount() {
  const db = readDB();
  return db.requests.length;
}

module.exports = { insertRequest, getCount };
