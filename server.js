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
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// ── Rate Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 50,
  message: { success: false, errors: ['Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.'] },
  standardHeaders: true,
  legacyHeaders: false
});

// ── Middleware ──
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Doğrulama Yardımcıları ──
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
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

  if (!body.full_name || sanitize(body.full_name).length < 2) {
    errors.push('Ad soyad en az 2 karakter olmalıdır.');
  }
  if (body.full_name && sanitize(body.full_name).length > 100) {
    errors.push('Ad soyad en fazla 100 karakter olabilir.');
  }
  if (!body.email || !validateEmail(body.email)) {
    errors.push('Geçerli bir e-posta adresi giriniz.');
  }
  if (!body.service_type || !VALID_SERVICES.includes(body.service_type)) {
    errors.push('Geçerli bir hizmet türü seçiniz.');
  }
  if (!body.description || sanitize(body.description).length < 10) {
    errors.push('Açıklama en az 10 karakter olmalıdır.');
  }
  if (body.description && sanitize(body.description).length > 1000) {
    errors.push('Açıklama en fazla 1000 karakter olabilir.');
  }

  return errors;
}

// ── API Rotaları ──

// POST /api/requests – Yeni talep oluştur
app.post('/api/requests', apiLimiter, (req, res) => {
  try {
    const errors = validateRequest(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const { full_name, email, service_type, description } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    const saved = db.insertRequest({
      full_name: sanitize(full_name),
      email: sanitize(email),
      service_type: sanitize(service_type),
      description: sanitize(description),
      ip_address: ip
    });

    // Kaydın gerçekten oluştuğunu doğrula
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
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── SPA Fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Sunucuyu Başlat ──
app.listen(PORT, () => {
  console.log(`✅ PlanPilot sunucusu çalışıyor: http://localhost:3000`);
});

module.exports = app;
