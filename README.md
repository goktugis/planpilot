# PlanPilot – KOBİ Talep & Randevu Yönetimi

KOBİ'lerin (hukuk büroları, klinikler, mali müşavirler, ajanslar vb.) müşteri taleplerini, randevularını ve teklif isteklerini tek bir sayfadan düzenli şekilde toplamasını sağlayan sade bir web uygulaması.

Müşteri formu doldurur, bilgiler sunucuda doğrulanıp kalıcı olarak kaydedilir ve kullanıcıya bir takip numarası verilir.

## 🔗 Canlı Adres & Kaynak Kod

- **Canlı Demo:** [https://planpilot-xcun.onrender.com/](https://planpilot-xcun.onrender.com/)
- **Kaynak Kod (GitHub):** [https://github.com/goktugis/planpilot](https://github.com/goktugis/planpilot)
- **AI Karar Günlüğü:** [AI_LOG.md](AI_LOG.md)

---

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** HTML5, CSS3 (saf CSS, harici framework yok), Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Veri Saklama:** JSON dosya tabanlı kalıcı depolama (`data/requests.json` + bellek içi önbellek)
- **Güvenlik:** Helmet (CSP başlıkları), Express Rate Limit (15 dk / 50 istek sınırı), XSS sanitizasyonu

### Neden Bu Yapı?
- Büyük framework'ler (React/Vue vb.) veya harici CSS kütüphaneleri (Tailwind CDN) olmadan, tek komutla hemen çalışan sade ve hızlı bir yapı tercih ettim.
- Veritabanı olarak native C++ derlemesi gerektirmeyen dosya tabanlı JSON depolama kullandım; böylece hem yerel ortamda hem de Render üzerinde sıfır kurulum sorunuyla çalışıyor.

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- **Node.js** (v18 veya üzeri)
- **npm**

### Adımlar

```bash
# 1. Projeyi klonlayın
git clone https://github.com/goktugis/planpilot.git
cd planpilot

# 2. Bağımlılıkları kurun
npm install

# 3. Sunucuyu başlatın
npm start
```

Tarayıcınızda `http://localhost:3000` adresine giderek sayfayı görebilirsiniz.  
*(İlk çalıştırmada `data/requests.json` dosyası otomatik olarak oluşturulur).*

---

## 📡 API Uç Noktaları

### `POST /api/requests`
Formdan gelen talep verisini doğrular ve sunucuya kaydeder.

**Örnek İstek (JSON):**
```json
{
  "full_name": "Ahmet Yılmaz",
  "email": "ahmet@ornek.com",
  "service_type": "danismanlik",
  "description": "Yeni proje için danışmanlık randevusu almak istiyorum."
}
```

**Geçerli Hizmet Türleri:** `danismanlik`, `teklif`, `teknik-destek`, `genel-bilgi`

**Başarılı Yanıt (201 Created):**
```json
{
  "success": true,
  "message": "Talebiniz başarıyla kaydedildi!",
  "data": {
    "id": 1,
    "created_at": "2026-10-01T13:30:00.000Z",
    "service_type": "danismanlik"
  }
}
```

**Hatalı Yanıt (400 Bad Request):**
```json
{
  "success": false,
  "errors": ["Ad soyad en az 2 karakter olmalıdır.", "Geçerli bir e-posta adresi giriniz."]
}
```

### `GET /api/health`
Sunucu durumunu ve kayıtlı toplam talep sayısını döner:
```json
{ "status": "ok", "total_requests": 5 }
```

### `GET /api/stats`
Kategorilere göre talep dağılımını gösterir:
```json
{
  "success": true,
  "stats": {
    "total_requests": 5,
    "distribution": { "danismanlik": 2, "teklif": 2, "teknik-destek": 1, "genel-bilgi": 0 },
    "uptime_seconds": 120
  }
}
```

---

## 🧪 Yapılan Testler

1. **Form Doğrulama Testi (İstemci):** Alanları boş bırakıp gönderdiğimde ilgili alanların kırmızı çerçeve alıp hata mesajı verdiğini ve ilk hatalı alana odaklandığını (focus) test ettim.
2. **Sunucu Doğrulama Testi:** API'ye doğrudan hatalı verilerle POST isteği atıp sunucunun `400 Bad Request` ve açıklayıcı hata listesi döndüğünü doğruladım.
3. **Başarılı Kayıt ve Takip ID:** Doğru bilgiler girildiğinde sunucudan 201 döndüğünü, ekranda yeşil kutuda `#1`, `#2` gibi talep ID'sinin çıktığını ve formun temizlendiğini gördüm.
4. **Veri Kalıcılığı:** Sunucuyu kapatıp (`Ctrl+C`) tekrar başlattım; `data/requests.json` dosyasındaki eski kayıtların silinmediğini `/api/health` üzerinden teyit ettim.
5. **Güvenlik Testleri:** Form alanlarına `<script>` etiketi yazarak XSS denedim, HTML etiketlerinin zararsız hale getirildiğini gördüm. Kısa sürede art arda 50+ istek atarak rate limiter'ın devreye girdiğini doğruladım.
6. **Mobil Uyumluluk:** Chrome DevTools ile 375px mobil, 768px tablet ve masaüstü ekran boyutlarında sayfa düzenini kontrol ettim.

---

## 📌 Bilinen Eksikler ve İleride Yapılabilecekler

- **E-posta Gönderimi:** Talep geldiğinde hem işletmeye hem müşteriye teyit maili atılması gerçek hayatta SendGrid / Resend veya Nodemailer ile bağlanabilir (şu an arayüzde simüle edilmiştir).
- **Yönetici Paneli:** Gelen talepleri listeleyip durumunu (Yeni, İncelendi, Tamamlandı) güncelleyecek bir giriş ekranı eklenebilir.
- **Veritabanı:** Proje büyüyüp aynı anda binlerce istek almaya başlarsa JSON dosyası yerine PostgreSQL'e geçiş yapılabilir.

---

## 📄 Lisans
Bu proje, iş başvurusu değerlendirme süreci kapsamında hazırlanmış kurgusal bir çalışmadır.
