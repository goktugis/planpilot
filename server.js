/**
 * PlanPilot – Express Sunucusu & Güvenli API Ağ Geçidi
 * 
 * Güvenlik Katmanı:
 * - Helmet ile özelleştirilmiş CSP, HSTS, X-Content-Type-Options
 * - express-rate-limit ile kaba kuvvet ve DDoS önleme
 * - XSS temizleme ve sıkı girdi doğrulaması
 * - JSON istek gövdesi boyut kısıtlaması (10 KB)
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 1. Güvenlik Başlıkları (Helmet CSP) ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// ── 2. Hız Sınırlayıcılar (Rate Limiting) ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 50,
  message: {
    success: false,
    errors: ['Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.']
  },
  standardHeaders: true,
  legacyHeaders: false
});

// İstatistikler için daha gevşek hız sınırı
const statsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: { success: false, errors: ['İstek sınırı aşıldı.'] }
});

// ── 3. Temel Ara Yazılımlar ──
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// ── 4. Doğrulama & Temizleme Yardımcıları ──
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // RFC 5322 genel geçer doğrulaması
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed.toLowerCase());
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const VALID_SERVICES = [
  'danismanlik',
  'teklif',
  'teknik-destek',
  'genel-bilgi'
];

function validateRequest(body) {
  const errors = [];

  const rawName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  const rawService = typeof body.service_type === 'string' ? body.service_type.trim() : '';
  const rawDesc = typeof body.description === 'string' ? body.description.trim() : '';

  // İsim kontrolü
  if (!rawName || rawName.length < 2) {
    errors.push('Ad soyad en az 2 karakter olmalıdır.');
  } else if (rawName.length > 100) {
    errors.push('Ad soyad en fazla 100 karakter olabilir.');
  }

  // E-posta kontrolü
  if (!rawEmail || !validateEmail(rawEmail)) {
    errors.push('Geçerli bir e-posta adresi giriniz.');
  }

  // Hizmet türü kontrolü
  if (!rawService || !VALID_SERVICES.includes(rawService)) {
    errors.push('Geçerli bir hizmet türü seçiniz.');
  }

  // Açıklama kontrolü
  if (!rawDesc || rawDesc.length < 10) {
    errors.push('Açıklama en az 10 karakter olmalıdır.');
  } else if (rawDesc.length > 1000) {
    errors.push('Açıklama en fazla 1000 karakter olabilir.');
  }

  return { errors, rawName, rawEmail, rawService, rawDesc };
}

// ── 5. API Uç Noktaları ──

// POST /api/requests – Yeni talep kaydet
app.post('/api/requests', apiLimiter, (req, res) => {
  try {
    const { errors, rawName, rawEmail, rawService, rawDesc } = validateRequest(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    const saved = db.insertRequest({
      full_name: sanitize(rawName),
      email: rawEmail,
      service_type: rawService,
      description: sanitize(rawDesc),
      ip_address: clientIp
    });

    if (!saved || !saved.id) {
      return res.status(500).json({
        success: false,
        errors: ['Kayıt işlemi doğrulanamadı. Lütfen tekrar deneyin.']
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Talebiniz başarıyla kaydedildi!',
      data: {
        id: saved.id,
        created_at: saved.created_at,
        service_type: saved.service_type
      }
    });
  } catch (err) {
    console.error('❌ POST /api/requests hatası:', err.message);
    return res.status(500).json({
      success: false,
      errors: ['Sunucu tarafında bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.']
    });
  }
});

// GET /api/stats – Canlı sistem istatistikleri
app.get('/api/stats', statsLimiter, (req, res) => {
  try {
    const stats = db.getStats();
    res.json({
      success: true,
      stats: {
        total_requests: stats.total,
        distribution: stats.distribution,
        uptime_seconds: stats.uptime_seconds
      }
    });
  } catch (err) {
    console.error('❌ GET /api/stats hatası:', err.message);
    res.status(500).json({ success: false, message: 'İstatistikler alınamadı.' });
  }
});

// GET /api/health – Canlılık kontrolü
app.get('/api/health', (req, res) => {
  try {
    const total = db.getCount();
    res.json({ status: 'ok', total_requests: total });
  } catch (err) {
    console.error('❌ Health check hatası:', err.message);
    res.status(500).json({ status: 'error', message: 'Sunucu hatası' });
  }
});

// ── 6. API 404 Koruması ──
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, errors: ['İstenen API uç noktası bulunamadı.'] });
});

// ── 7. SPA HTML Geri Dönüşü ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── 8. Sunucuyu Başlat ──
app.listen(PORT, () => {
  console.log(`✅ PlanPilot sunucusu hazır: http://localhost:${PORT}`);
});

module.exports = app;
