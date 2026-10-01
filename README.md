# PlanPilot

KOBİ'ler için akıllı randevu ve talep yönetim sistemi.  
Müşterileriniz tek bir form üzerinden hizmet talebinde bulunur; talepler sunucuda güvenle ve kalıcı olarak saklanır.

## Canlı Demo

> **URL:** _deploy sonrası eklenecek_

## Teknoloji Yığını

| Katman      | Teknoloji                        |
|-------------|----------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript  |
| Backend     | Node.js (v18+) + Express 4       |
| Veritabanı  | JSON dosya tabanlı kalıcı depolama |
| Güvenlik    | Helmet, express-rate-limit       |

### Neden Bu Stack?

- **Framework yok (React/Vue):** Tek sayfalık landing page için aşırı. Daha hızlı yüklenir, daha az karmaşıklık.
- **JSON depolama (SQLite/Postgres değil):** Sıfır native bağımlılık, her platformda çalışır, deploy sorunsuz. MVP için yeterli; ölçeklenince PostgreSQL'e geçmek kolay.
- **Vanilla CSS (Tailwind değil):** Build adımı yok, dış CDN bağımlılığı yok, CSP uyumlu.

## Kurulum

### Gereksinimler

- **Node.js** ≥ 18
- **npm** (Node ile birlikte gelir)

### Adımlar

```bash
# 1. Depoyu klonla
git clone <repo-url>
cd planpilot

# 2. Bağımlılıkları kur
npm install

# 3. Sunucuyu başlat
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır.

> **Not:** `data/requests.json` dosyası ilk çalıştırmada otomatik oluşturulur.

### Ortam Değişkenleri (İsteğe Bağlı)

| Değişken | Varsayılan | Açıklama            |
|----------|-----------|----------------------|
| `PORT`   | `3000`    | Sunucu port numarası |

## Proje Yapısı

```
planpilot/
├── server.js          # Express sunucusu, API rotaları, doğrulama, güvenlik
├── database.js        # JSON dosya tabanlı kalıcı depolama modülü
├── package.json       # Proje bağımlılıkları ve scriptler
├── public/
│   ├── index.html     # Responsive landing page (mobil + masaüstü)
│   └── script.js      # İstemci tarafı doğrulama ve form gönderimi
├── data/              # Veritabanı dosyaları (otomatik oluşturulur, .gitignore'da)
│   └── requests.json  # Kalıcı form kayıtları
├── README.md          # Bu dosya
├── AI_LOG.md          # AI kullanım ve karar günlüğü
└── .gitignore
```

## API Referansı

### `POST /api/requests`

Yeni bir hizmet talebi oluşturur.

**İstek Gövdesi (JSON):**

```json
{
  "full_name": "Ayşe Yılmaz",
  "email": "ayse@firma.com",
  "service_type": "danismanlik",
  "description": "Dijital dönüşüm danışmanlığı almak istiyorum."
}
```

**Geçerli `service_type` değerleri:** `danismanlik` · `teklif` · `teknik-destek` · `genel-bilgi`

**Başarılı Yanıt (201):**

```json
{
  "success": true,
  "message": "Talebiniz başarıyla kaydedildi!",
  "data": { "id": 1, "created_at": "2026-10-01T15:30:00.000Z" }
}
```

**Doğrulama Hatası (400):**

```json
{
  "success": false,
  "errors": ["Ad soyad en az 2 karakter olmalıdır."]
}
```

### `GET /api/health`

Sunucu sağlık kontrolü. Toplam kayıt sayısını döndürür.

```json
{ "status": "ok", "total_requests": 5 }
```

## Doğrulama Kuralları

| Alan          | Kural                              | İstemci | Sunucu |
|---------------|-------------------------------------|---------|--------|
| `full_name`   | Zorunlu, 2–100 karakter            | ✅       | ✅      |
| `email`       | Zorunlu, geçerli e-posta formatı   | ✅       | ✅      |
| `service_type`| İzin listesinde olmalı (whitelist) | ✅       | ✅      |
| `description` | Zorunlu, 10–1000 karakter          | ✅       | ✅      |

Doğrulama hem istemci (JavaScript, blur + submit) hem sunucu (Express middleware) tarafında aynı kurallarla yapılır.

## Güvenlik Önlemleri

| Önlem                  | Detay                                       |
|------------------------|----------------------------------------------|
| **Helmet**             | CSP, XSS koruması, MIME sniffing engelleme   |
| **Rate Limiting**      | 15 dakikada en fazla 50 istek                |
| **Girdi Temizleme**    | `<` ve `>` karakterleri escape edilir        |
| **Boyut Sınırı**       | İstek gövdesi maks. 10 KB                   |
| **Whitelist**          | service_type sadece izin verilen değerlerden |

## Bilinen Eksikler / Gelecek İyileştirmeler

- E-posta bildirimi henüz entegre değil (kurgusal hizmet)
- Admin paneli mevcut değil (MVP kapsam dışı)
- Eşzamanlı yazma yoğunluğunda dosya kilidi eklenebilir
- Üretim ortamında JSON yerine PostgreSQL önerilir

## Lisans

Bu proje bir iş başvurusu değerlendirmesi kapsamında oluşturulmuş kurgusal bir üründür.  
Yalnızca kurgusal test verisi içerir. Ticari amaçla kullanılması hedeflenmemektedir.
