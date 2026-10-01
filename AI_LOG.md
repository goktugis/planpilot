# AI_LOG.md – Proje Geliştirme ve Yapay Zeka Kullanım Günlüğü

Bu belgede, PlanPilot projesini geliştirirken yapay zekayı hangi aşamalarda nasıl kullandığımı, neleri kabul edip neleri değiştirdiğimi ve karşılaştığım sorunları nasıl çözdüğümü anlattım.

---

## 1. Fikir ve Kapsam Seçimi

**Düşüncem:** Değerlendirme için hem herkesin anlayabileceği hem de form alanlarının (ad, e-posta, hizmet seçimi, açıklama) mantıklı oturacağı bir senaryo gerekiyordu.

- **AI ile etkileşim:** Yapay zekaya *"KOBİ'lerin dijitalde en çok zorlandığı, basit ama gerçekçi web hizmeti fikirleri öner"* dedim.
- **Gelen öneriler:** Fatura takip aracı, basit envanter ve randevu/talep yönetim formu.
- **Kararım:** Randevu ve talep yönetimini seçtim. Çünkü bir berber, diş hekimi, avukat veya yazılım ajansı için müşteriden talep toplamak çok yaygın bir ihtiyaç. İsmini de sade ve akılda kalıcı olsun diye **"PlanPilot"** koydum.

---

## 2. Teknoloji Seçimi ve Karşılaşılan İlk Sorun

- **İlk Plan (SQLite):** Yapay zekadan Node.js + Express + SQLite ile basit bir başlangıç istedim. `better-sqlite3` paketini önerdi ve projeye ekledik.
- **Karşılaştığım Sorun:** Projeyi kurarken bilgisayardaki Node.js v24 sürümü yüzünden `better-sqlite3` paketi C++ derleme hatası (node-gyp / MSBuild) verdi.
- **Nasıl Çözdüm?** AI'a derleme hatasını gösterdim, alternatif olarak pure JavaScript ile çalışan dosya tabanlı bir JSON depolama sistemi (`data/requests.json`) kurmaya karar verdim. Böylece hem yerel ortamda hem de Render'a deploy ederken hiçbir derleme bağımlılığı kalmadı, sistem sorunsuz ayağa kalktı.
- **Frontend Tercihi:** AI ilk başta React veya Tailwind CDN önerdi. Ama tek sayfalık bir landing page için React'ın gereksiz karmaşıklık olacağını, Tailwind CDN'in de harici ağ bağımlılığı yaratacağını düşünerek **saf HTML, modern CSS ve Vanilla JavaScript** ile devam ettim.

---

## 3. Sayfa Tasarımı ve İçerik Geliştirme

- **AI Katkısı:** Sayfa yapısı için hero, özellikler, nasıl çalışır ve form alanlarından oluşan temel HTML/CSS iskeletini oluşturmasını istedim.
- **Değiştirdiklerim:**
  - AI'ın ilk verdiği tasarım çok boş duruyordu (sadece 3 kart ve form vardı). Gerçek bir KOBİ ürününün güven vermesi gerektiğini düşünerek; hero alanına bir işletme paneli önizlemesi (mockup), sektörel etiketler (hukuk, sağlık, ajans vb.), gerçekçi müşteri yorumları ve sıkça sorulan sorular ekletip düzenledim.
  - Harici ikon veya görsel linkleri (Unsplash vb.) kırılabilir diye görselleri inline SVG ve emojilerle çözdüm.
  - SSS kısmını JavaScript ile yapmak yerine tarayıcının kendi `<details>` ve `<summary>` etiketleriyle yaptım; hem daha hızlı hem de JavaScript kapalı olsa bile çalışıyor.

---

## 4. Form Doğrulama ve Kullanıcı Deneyimi

Formun hem kullanıcı dostu olması hem de hatalı veri almaması için iki taraflı doğrulama kurduk:

- **İstemci Tarafı (script.js):**
  - AI ilk başta sadece 'Gönder' butonuna basıldığında hata gösteren bir kod yazmıştı. Ben kullanıcı bir alanı doldurup diğerine geçtiğinde (blur anında) kontrol edilmesini ve kullanıcı doğru yazmaya başlayınca kırmızı uyarının kaybolmasını istedim.
  - Açıklama alanına `0 / 1000` şeklinde canlı karakter sayacı eklettim. 900 karakteri geçince sayacın rengi uyarı için kırmızıya dönüyor.
  - Seçilen hizmet türüne göre (Danışmanlık, Teklif vb.) formun hemen altında tahmini geri dönüş süresini gösteren dinamik bir bilgi kutusu ekledim.
- **Sunucu Tarafı (server.js):**
  - İstemcideki kontroller sunucu tarafında da birebir tekrarlandı (`validateRequest` fonksiyonu). İsim (2-100 karakter), e-posta formatı, geçerli hizmet türü (whitelist) ve açıklama (10-1000 karakter) kontrol ediliyor.
  - Gelen metinlerdeki `<` ve `>` karakterleri escape edilerek veritabanına kaydediliyor (XSS koruması).

---

## 5. Güvenlik ve Sunucu Ayarları

- **Helmet & CSP:** Express'e Helmet ekledik. Content Security Policy (CSP) kurallarını harici zararlı script çalıştırılamayacak şekilde sıkılaştırdık.
- **Rate Limit:** Kötü niyetli kişilerin formu botla spamlamasını engellemek için aynı IP'den 15 dakikada en fazla 50 talep gönderilebilmesini sağlayan `express-rate-limit` kuralı koyduk.
- **Kalıcı Kayıt Kontrolü:** Form gönderildiğinde sunucu kaydı `requests.json` dosyasına yazıyor. Kayıt başarılı olmadan asla istemciye 201 ve takip numarası dönmüyor.

---

## 6. Neleri Nasıl Test Ettim?

Testleri hem kendi bilgisayarımda hem de canlı Render linkinde bizzat denedim:

1. **Boş Form Gönderimi:** Hiçbir şey yazmadan gönder butonuna bastım; bütün zorunlu alanların altında kırmızı hata mesajı çıktı ve sayfa otomatik olarak ilk hatalı alana odaklandı.
2. **Hatalı E-posta ve Kısa İsim:** İsim kısmına tek harf, e-postaya "ahmet@" yazdım; istemci göndermedi. curl ile sunucuya doğrudan hatalı JSON attım; sunucu `400 Bad Request` döndü.
3. **Başarılı Form Gönderimi:** Bütün alanları doğru doldurup gönderdim; buton 'Gönderiliyor...' durumuna geçti, ardından yeşil kutuda `#1` takip numarası çıktı ve form temizlendi.
4. **Veri Kalıcılığı Testi:** Sunucuyu terminalden durdurdum (`Ctrl+C`), tekrar başlattım (`npm start`). `/api/health` adresine istek attığımda kayıtlı taleplerin silinmediğini gördüm.
5. **Canlı Ortam (Render) Testi:** Canlı adres olan `https://planpilot-xcun.onrender.com/` linkini hem masaüstü tarayıcısından hem de cep telefonumdan açtım; mobil menünün, butonların ve formun düzgün çalıştığını doğruladım.

---

## 7. Harcanan Süre ve Görev Dağılımı

- **Fikir, Kapsam ve İskelet:** ~30 dakika
- **Backend, JSON Depolama ve SQLite Sorununu Çözme:** ~45 dakika
- **Frontend, Sayfa Tasarımı ve Responsive Düzenlemeler:** ~1 saat 15 dakika
- **Form Doğrulama (İstemci + Sunucu) ve Güvenlik:** ~45 dakika
- **Testler, Render Deploy ve Dokümantasyon:** ~45 dakika
- **Toplam Süre:** Yaklaşık **4 saat**

---

## Özet

Yapay zeka hızlıca kod iskeleti çıkarmak ve hata mesajlarını toparlamak için büyük kolaylık sağladı. Ancak mimari kararları, kütüphane sadeleştirmelerini (better-sqlite3 yerine JSON dosya sistemi, Tailwind yerine saf CSS tercihi) ve kullanıcı deneyimi detaylarını kendi kararlarımla şekillendirdim.
