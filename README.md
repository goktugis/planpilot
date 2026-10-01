# PlanPilot

KOBİ'ler için akıllı randevu ve talep yönetim sistemi.  
Müşterileriniz tek bir form üzerinden hizmet talebinde bulunur; talepler sunucuda güvenle ve kalıcı olarak saklanır.

## Canlı Demo

> **URL:** https://planpilot.onrender.com *(veya aktif deploy URL'si)*

## Teknoloji Yığını

| Katman      | Teknoloji                                         |
|-------------|---------------------------------------------------|
| Frontend    | HTML5 (Semantik & Erişilebilir), CSS3, Vanilla JS |
| Backend     | Node.js (v18+) + Express 4                        |
| Veritabanı  | In-Memory Cache destekli JSON kalıcı depolama     |
| Güvenlik    | Helmet (özel CSP), express-rate-limit, Input Sanitization |

### Neden Bu Stack?

- **Framework yükü yok (Vanilla):** Tek sayfalık landing page ve talep formu için React/Vue gibi büyük framework'lerin overhead'i engellendi. İlk yükleme süresi sıfıra yakın.
- **JSON + In-Memory Caching:** C++ derleyicisi gerektirmeyen (Node v24 uyumlu), taşınabilir ve anında ayağa kalkan kalıcı depolama. Disk I/O yükü azaltıldı, dosya bozulmasına karşı otomatik snapshot yedekleme eklendi.
- **Dış Bağımlılıksız CSS:** Tailwind derleme adımı ve dış CDN kesintisi riski ortadan kaldırıldı; saf CSS custom properties ve modern fluid tipografi kullanıldı.

## Kurulum ve Çalıştırma

### Gereksinimler

- **Node.js** ≥ 18
- **npm** (Node.js ile birlikte gelir)

### Adımlar

```bash
# 1. Depoyu klonlayın
git clone https://github.com/goktugis/planpilot.git
cd planpilot

# 2. Bağımlılıkları kurun
npm install

# 3. Sunucuyu başlatın
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde ayağa kalkacaktır.

> **Not:** `data/requests.json` dosyası ilk çalıştırmada otomatik oluşturulur.

### Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama            |
|----------|-----------|----------------------|
| `PORT`   | `3000`    | Sunucu port numarası |

## Proje Mimarisi

```
planpilot/
├── server.js          # Express sunucusu, API rotaları, doğrulama, rate limit, CSP
├── database.js        # In-memory cache ve bozulma korumalı JSON kalıcı depolama
├── package.json       # Bağımlılıklar ve npm betikleri
├── render.yaml        # Render.com tek tıkla canlıya alma bildirimi
├── public/
│   ├── index.html     # Responsive & WCAG uyumlu landing page ve talep formu
│   └── script.js      # İstemci tarafı dinamik doğrulama, timeout, UX yönetimi
├── data/              # Kalıcı veritabanı dizini (.gitignore'a dahildir)
│   └── requests.json  # Kalıcı taleplerin saklandığı JSON veri kütüğü
├── README.md          # Proje dokümantasyonu ve test rehberi
├── AI_LOG.md          # Karar günlüğü ve yapay zeka ile geliştirme süreci
└── .gitignore
```

## API Dokümantasyonu

### `POST /api/requests`

Yeni bir hizmet talebi oluşturur.

**İstek Gövdesi (JSON):**

```json
{
  "full_name": "Ayşe Yılmaz",
  "email": "ayse@firma.com",
  "service_type": "danismanlik",
  "description": "Dijital dönüşüm danışmanlığı hakkında bilgi almak istiyorum."
}
```

**Geçerli `service_type` Seçenekleri:**  
`danismanlik` · `teklif` · `teknik-destek` · `genel-bilgi`

**Başarılı Yanıt (`201 Created`):**

```json
{
  "success": true,
  "message": "Talebiniz başarıyla kaydedildi!",
  "data": {
    "id": 1,
    "created_at": "2026-10-01T13:13:56.105Z"
  }
}
```

**Doğrulama / Hata Yanıtı (`400 Bad Request`):**

```json
{
  "success": false,
  "errors": [
    "Ad soyad en az 2 karakter olmalıdır.",
    "Geçerli bir e-posta adresi giriniz."
  ]
}
```

### `GET /api/health`

Sunucunun canlılığını ve kayıtlı toplam talep adedini döner.

```json
{
  "status": "ok",
  "total_requests": 3
}
```

### `ALL /api/*`

Tanımlanmamış API uçları için standart `404 Not Found` JSON yanıtı verir.

## Doğrulama Kuralları

Tüm alanlar hem **istemci tarafında** (kullanıcıya anlık geri bildirim için) hem de **sunucu tarafında** (güvenlik için) çift katmanlı doğrulanır:

| Alan          | Kural                                           | İstemci | Sunucu |
|---------------|-------------------------------------------------|:-------:|:------:|
| `full_name`   | Zorunlu, 2 – 100 karakter                       |   ✅    |   ✅   |
| `email`       | Zorunlu, RFC uyumlu e-posta, maks 254 karakter  |   ✅    |   ✅   |
| `service_type`| Zorunlu, belirlenen izinli liste (whitelist)    |   ✅    |   ✅   |
| `description` | Zorunlu, 10 – 1000 karakter                     |   ✅    |   ✅   |

## Güvenlik ve Dayanıklılık Önlemleri

- **Sıkılaştırılmış CSP (Content Security Policy):** `scriptSrc` üzerinden `'unsafe-inline'` kaldırıldı; sadece yerel statik betiklere izin verilir.
- **Rate Limiting:** 15 dakikalık pencerede IP başına en fazla 50 istek sınırlandırıldı.
- **XSS Koruması & Sanitizasyon:** Serbest metin alanları (`full_name`, `description`) sanitize edilerek saklanır. İstemci tarafında `innerHTML` yerine güvenli DOM API'ları kullanılır.
- **İstek Boyutu Limiti:** JSON payload'ları en fazla 10 KB ile sınırlandırıldı.
- **Bozulma Güvenliği (Data Integrity):** Veritabanı dosyası hasar görürse otomatik olarak zaman damgalı yedek (`.corrupt.<timestamp>`) oluşturulur ve sistem çökmeden temiz bir durumla ayağa kalkar.
- **İstek Zaman Aşımı (Timeout):** Ağ kopukluklarında kullanıcının takılı kalmaması için istemcide 15 saniyelik zaman aşımı koruması bulunur.

## Erişilebilirlik (A11y) ve Kullanıcı Deneyimi (UX)

- **Klavye Gezinimi & Skip Link:** Ekran okuyucu ve klavye kullanıcıları için doğrudan forma atlama bağlantısı (`#talep-formu`).
- **ARIA Desteği:** `aria-live="assertive"` alert kutuları, `aria-invalid`, `aria-describedby` hata etiketleri ve ekran okuyucu uyarıları.
- **Touch Target (WCAG 2.5.8):** Butonlar ve form elemanları mobilde en az 44–48px temas alanına sahiptir.
- **iOS Zoom Önlemi:** Input alanlarında Safari otomatik yakınlaştırmasını önleyen 16px font boyutu standardı.
- **Prefeers-Reduced-Motion:** Hareket hassasiyeti olan kullanıcılar için animasyonları ve yumuşak kaydırmayı kapatan CSS kuralları.

## Doğrulama ve Test Senaryoları

Yapılan manuel ve uçtan uca testler:

1. **Boş / Eksik Form Gönderimi:** İstemci tarafında alan bazlı dinamik hata mesajları tetiklenir, ilk hatalı alana odaklanılır.
2. **Geçersiz Veri / Sunucu Doğrulaması:** İstemci atlanarak doğrudan API'ye yapılan hatalı POST çağrıları `400 Bad Request` ve detaylı hata dizisiyle yanıtlanır.
3. **Başarılı Akış:** Geçerli talep sunucuda saklanır, `201 Created` yanıtı alınır, kullanıcıya atanan talep ID'si yeşil bildirimle sunulur ve form sıfırlanır.
4. **Veri Kalıcılığı:** Sunucu yeniden başlatıldığında `/api/health` üzerinden önceki kayıtların korunduğu teyit edilmiştir.
5. **Erişilebilirlik Audit'i:** Lighthouse / WCAG kriterlerinde semantik yapı, kontrast oranları ve etiketlemeler denetlenmiştir.

## Bilinen Eksikler ve Gelecek İyileştirmeler

- **E-posta Bildirimi:** Gerçek dünyada talep oluştuğunda SendGrid/Resend benzeri servislerle işletmeye ve müşteriye e-posta gönderimi eklenebilir (kurgusal proje kapsamında simüle edilmiştir).
- **Yönetim Paneli:** Gelen taleplerin durumlarını (Beklemede, İncelendi, Tamamlandı) güncelleyecek yetkili bir gösterge paneli.
- **İlişkisel Veritabanı:** Çok yüksek trafik ve eşzamanlı yazma durumlarında PostgreSQL'e geçiş.

## Lisans

Bu proje, iş başvurusu teknik değerlendirmesi amacıyla hazırlanmış kurgusal bir projedir. Ticari amaç taşımamaktadır.
