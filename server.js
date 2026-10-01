const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Güvenlik ──
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

// ── Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, errors: ['Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.'] },
  standardHeaders: true,
  legacyHeaders: false
});

// ── Middleware ──
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// ── Doğrulama Yardımcıları ──
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed.toLowerCase());
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const VALID_SERVICES = [
  'danismanlik',
  'teklif',
  'teknik-destek',
  'genel-bilgi'
];

function validateRequest(body) {
  const errors = [];

  // Ham değer üzerinde uzunluk kontrolü (sanitize öncesi)
  const rawName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  const rawService = typeof body.service_type === 'string' ? body.service_type.trim() : '';
  const rawDesc = typeof body.description === 'string' ? body.description.trim() : '';

  if (!rawName || rawName.length < 2) {
    errors.push('Ad soyad en az 2 karakter olmalıdır.');
  } else if (rawName.length > 100) {
    errors.push('Ad soyad en fazla 100 karakter olabilir.');
  }

  if (!rawEmail || !validateEmail(rawEmail)) {
    errors.push('Geçerli bir e-posta adresi giriniz.');
  }

  if (!rawService || !VALID_SERVICES.includes(rawService)) {
    errors.push('Geçerli bir hizmet türü seçiniz.');
  }

  if (!rawDesc || rawDesc.length < 10) {
    errors.push('Açıklama en az 10 karakter olmalıdır.');
  } else if (rawDesc.length > 1000) {
    errors.push('Açıklama en fazla 1000 karakter olabilir.');
  }

  return { errors, rawName, rawEmail, rawService, rawDesc };
}

// ── API Rotaları ──

// POST /api/requests – Yeni talep oluştur
app.post('/api/requests', apiLimiter, (req, res) => {
  try {
    const { errors, rawName, rawEmail, rawService, rawDesc } = validateRequest(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    const saved = db.insertRequest({
      full_name: sanitize(rawName),
      email: rawEmail, // E-posta sanitize edilmez, doğrulama yeterli
      service_type: rawService, // Whitelist'te zaten kontrol edildi
      description: sanitize(rawDesc),
      ip_address: ip
    });

    if (!saved) {
      return res.status(500).json({
        success: false,
        errors: ['Kayıt doğrulanamadı. Lütfen tekrar deneyin.']
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Talebiniz başarıyla kaydedildi!',
      data: {
        id: saved.id,
        created_at: saved.created_at
      }
    });
  } catch (err) {
    console.error('POST /api/requests hatası:', err.message);
    return res.status(500).json({
      success: false,
      errors: ['Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.']
    });
  }
});

// GET /api/health – Sağlık kontrolü
app.get('/api/health', (req, res) => {
  try {
    const total = db.getCount();
    res.json({ status: 'ok', total_requests: total });
  } catch (err) {
    console.error('Health check hatası:', err.message);
    res.status(500).json({ status: 'error', message: 'Sunucu hatası' });
  }
});

// ── API 404 – Bilinmeyen API rotaları ──
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, errors: ['API endpoint bulunamadı.'] });
});

// ── SPA Fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Sunucuyu Başlat ──
app.listen(PORT, () => {
  console.log(`✅ PlanPilot sunucusu çalışıyor: http://localhost:${PORT}`);
});

module.exports = app;
