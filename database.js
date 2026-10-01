/**
 * PlanPilot – Gelişmiş Kalıcı Depolama Modülü (In-Memory Caching & Bozulma Korumalı)
 * 
 * Özellikler:
 * - Bellek içi önbellekleme (In-memory cache) ile ultra-hızlı okuma
 * - fs.writeFileSync ile diske senkron kalıcı yazma (çökme güvenliği)
 * - Otomatik zaman damgalı bozulma yedekleme (.corrupt snapshot)
 * - Hizmet kategorilerine göre istatistiksel özetleme
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'requests.json');

// Veri dizinini güvenli şekilde oluştur
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Dosya yoksa başlangıç şemasını yaz
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ lastId: 0, requests: [] }, null, 2), 'utf-8');
}

// In-Memory Önbellek
let cache = null;

/**
 * Veritabanını oku (varsa bellekten, yoksa diskten)
 */
function readDB() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cache = JSON.parse(raw);
    return cache;
  } catch (err) {
    console.error('❌ DB okuma hatası:', err.message);
    // Bozuk veri kütüğünü emniyet amacıyla yedekle
    try {
      const backupPath = DB_FILE + '.corrupt.' + Date.now();
      if (fs.existsSync(DB_FILE)) {
        fs.copyFileSync(DB_FILE, backupPath);
        console.warn('⚠️ Bozuk veritabanı kopyalandı:', backupPath);
      }
    } catch (backupErr) {
      console.error('Snapshot yedekleme başarısız:', backupErr.message);
    }
    // Temiz durumla ayağa kalk
    cache = { lastId: 0, requests: [] };
    writeDB(cache);
    return cache;
  }
}

/**
 * Veritabanına yaz ve önbelleği güncelle
 */
function writeDB(data) {
  cache = data;
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Yeni bir talep ekle ve oluşturulan kaydı döndür
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
    status: 'yeni', // 'yeni', 'incelendi', 'tamamlandi'
    created_at: new Date().toISOString()
  };

  db.requests.push(entry);
  writeDB(db);

  return entry;
}

/**
 * Toplam kayıt sayısını döndür
 */
function getCount() {
  const db = readDB();
  return db.requests.length;
}

/**
 * Hizmet türlerine göre dağılım ve sistem istatistiklerini döndür
 */
function getStats() {
  const db = readDB();
  const distribution = {
    danismanlik: 0,
    teklif: 0,
    'teknik-destek': 0,
    'genel-bilgi': 0
  };

  db.requests.forEach(r => {
    if (distribution[r.service_type] !== undefined) {
      distribution[r.service_type]++;
    }
  });

  return {
    total: db.requests.length,
    distribution,
    lastId: db.lastId,
    uptime_seconds: Math.floor(process.uptime())
  };
}

module.exports = { insertRequest, getCount, getStats };
