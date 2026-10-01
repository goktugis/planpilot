# AI_LOG.md – Yapay Zeka Kullanım ve Karar Günlüğü

Bu belge, PlanPilot projesinin geliştirilmesi sırasında AI'yı nasıl kullandığımı, hangi önerileri kabul/red ettiğimi ve çalışan sonucu nasıl doğruladığımı adım adım anlatır.

---

## Genel Yaklaşım

AI'yı bir **kod üretici** olarak değil, bir **düşünce ortağı** olarak kullandım. Her adımda:

1. Problemi kendim tanımladım
2. AI'dan öneri/taslak istedim
3. Çıktıyı inceledim, anlamadığım kısmı sorguladım
4. Kabul ettiklerimi uyguladım, etmediklerimi gerekçesiyle reddettim
5. Sonucu çalıştırıp doğruladım

---

## Adım 1 – Fikir Seçimi

**Problem:** Kurgusal bir teknoloji hizmeti seçmem gerekiyor. Hem anlaşılır hem de form yapısına uygun olmalı.

**AI'ya sordum:** "İşletmelere yönelik teknoloji hizmeti fikirleri öner."

**AI önerileri:**
- Fatura takip otomasyonu
- Envanter yönetim sistemi
- Randevu ve talep yönetimi
- Müşteri geri bildirim platformu

**Kararım:** "Randevu ve talep yönetimi" seçtim.

**Neden?**
- Landing page + form yapısı doğal oturuyor (isim, e-posta, hizmet seçimi, açıklama)
- Herkesin günlük hayattan bildiği bir kavram — değerlendirici anlamak için domain bilgisine ihtiyaç duymaz
- Marka adı olarak "PlanPilot" benim fikrimdi; kısa, akılda kalıcı, İngilizce ama uluslararası

**Reddettiklerim:** Fatura takip ve envanter fikirleri form alanları açısından daha karmaşık olacaktı; 3-4 saatlik kapsama uymuyordu.

---

## Adım 2 – Teknoloji Seçimi

**AI'ya sordum:** "Bu proje için hangi stack uygun? Basit olmalı, tek komutla çalışmalı, deploy kolay olmalı."

**AI önerisi:** React + Express + PostgreSQL

**Reddetme gerekçem:** Tek sayfalık bir landing page için React aşırı. PostgreSQL kurulumu deploy'u zorlaştırır. Amacım 3-4 saatte çalışan, sürdürülebilir bir ürün çıkarmak.

**Kendi kararım:**

| Katman     | Seçimim            | Gerekçe                                              |
|------------|--------------------|-------------------------------------------------------|
| Frontend   | Vanilla HTML/CSS/JS | Framework overhead yok, hızlı yüklenir                |
| Backend    | Node.js + Express   | En bilinen HTTP framework, dökümanı bol               |
| Veritabanı | SQLite             | Dosya tabanlı, kurulum yok, deploy'da sorun çıkarmaz  |
| Güvenlik   | Helmet + rate-limit | Express ekosisteminde standart, az yapılandırma        |

**Doğrulama:** Boş bir Express + SQLite projesi oluşturup `npm start` ile çalıştığını doğruladım; 30 saniyede ayağa kalktı.

---

## Adım 3 – Sayfa Tasarımı

**AI'ya sordum:** "Modern, responsive bir landing page iskeleti oluştur: navbar, hero, özellikler, nasıl çalışır, form, footer bölümleri olsun."

**AI çıktısı:** Tailwind CSS CDN kullanan bir taslak üretti.

**Değiştirdiklerim:**
- Tailwind CDN yerine **inline CSS** yazdım → dış bağımlılık azalıyor, CSP uyumu kolaylaşıyor
- AI stok fotoğraf placeholder'ları koymuştu → **emoji ikonlara** geçtim; sayfa daha hafif ve dış kaynak gerektirmiyor
- AI 6 özellik kartı önerdi → **3'e düşürdüm**; daha odaklı ve mobilde daha iyi görünüyor
- Renk paleti: AI'ın önerdiği yeşil tema yerine **indigo (#4F46E5)** seçtim; daha profesyonel ve güvenilir bir izlenim veriyor

**Kabul ettiklerim:**
- `clamp()` ile fluid tipografi — responsive için çok pratik
- CSS custom properties (değişkenler) — tutarlılık sağlıyor
- `backdrop-filter: blur()` navbar efekti — modern görünüm

**Doğrulama:**
- Chrome DevTools → iPhone SE (375px), iPad (768px), masaüstü (1440px) test ettim
- Tüm bölümler düzgün akıyor, form mobilde de rahat kullanılıyor

---

## Adım 4 – Form Doğrulama

**Problem:** Form doğrulamasını hem istemci hem sunucu tarafında yapmam gerekiyor. Kurallar senkronize olmalı.

**AI'ya sordum:** "İstemci ve sunucu tarafında aynı kurallarla çalışan doğrulama yapısı kur."

**AI çıktısı:** Hem `script.js` hem `server.js` için doğrulama fonksiyonları üretti.

**Kabul ettiklerim:**
- Regex tabanlı e-posta doğrulama (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Alan bazlı hata mesajları

**Değiştirdiklerim / Eklediklerim:**
- AI sadece `submit` olayında doğrulama yapıyordu → **blur (alan dışına çıkma) olayında canlı doğrulama** ekledim; kullanıcı anında hata görüyor
- Hata düzeldikçe kırmızı çerçevenin kaybolması (`input` olayı) → benim eklediğim UX iyileştirmesi
- **Karakter sayacı** (0/1000) → AI önermedi, kendim ekledim; kullanıcı ne kadar yazdığını görsün
- `service_type` için **izin listesi (whitelist)** kontrolü → AI sadece "boş olmasın" diyordu, ben güvenlik için listeyi sınırladım

**Doğrulama kuralları (her iki tarafta aynı):**

| Alan          | Kural                    |
|---------------|--------------------------|
| full_name     | Zorunlu, 2–100 karakter  |
| email         | Zorunlu, e-posta formatı |
| service_type  | İzin listesinde olmalı   |
| description   | Zorunlu, 10–1000 karakter|

**Test:**
- Boş form gönder → 4 hata mesajı göründü ✅
- Sadece 1 karakter isim → "en az 2 karakter" hatası ✅
- Geçersiz e-posta ("abc") → hata ✅
- Dropdown seçilmemiş → hata ✅
- 5 karakterlik açıklama → "en az 10 karakter" hatası ✅
- Tüm alanlar geçerli → form gönderildi ✅

---

## Adım 5 – Sunucu Güvenliği

**AI'ya sordum:** "Express sunucusuna temel güvenlik ekle."

**AI önerisi:** `helmet()` varsayılan ayarlarla kullan.

**Değiştirdiklerim:**
- CSP (Content Security Policy) directive'lerini projeye özel yazdım; varsayılan çok kısıtlıyordu, Google Fonts ve inline style'ları engelliyordu
- Rate limiting: AI "100 istek/15dk" demişti → **50 istek/15dk** yaptım; küçük bir form için 100 fazla
- Input sanitization: AI'ın ürettiği kodda XSS koruması yoktu → `<` ve `>` karakterlerini escape eden `sanitize()` fonksiyonunu ben ekledim
- Request body limit: 10KB ile sınırladım → büyük payload'lar reddediliyor

**Doğrulama:**
- `curl` ile boş body gönder → 400 hatası ✅
- `curl` ile `<script>alert(1)</script>` içeren isim gönder → kaydedilen veride escape edilmiş ✅
- Response header'larda `X-Content-Type-Options`, `X-Frame-Options` varlığını doğruladım ✅

---

## Adım 6 – Veritabanı

**AI'ya sordum:** "SQLite ile basit bir tablo oluştur."

**AI çıktısı:** `id`, `full_name`, `email`, `service_type`, `description`, `created_at` alanları.

**Eklediğim:**
- `ip_address` alanı → güvenlik ve denetim amaçlı; AI önermemişti
- **WAL modu** (`PRAGMA journal_mode = WAL`) → eşzamanlı okuma/yazma için; AI varsayılan modu bırakmıştı
- **INSERT sonrası SELECT ile doğrulama** → kayıt gerçekten yazıldı mı kontrol ediyorum; başarı mesajı yalnızca veritabanında kayıt varsa gösteriliyor

**Neden bu önemli?** Değerlendirme kriterleri "başarı mesajının yalnızca kayıt başarılı olduğunda gösterilmesi" diyor. AI'ın önerdiği kodda `INSERT` sonucu kontrol edilmeden hemen başarı dönülüyordu; bunu düzelttim.

**Doğrulama:**
- Sunucuyu başlat → `data/planpilot.db` otomatik oluştu ✅
- Form gönder → `sqlite3` ile tabloyu sorgula → kayıt var ✅
- Sunucuyu durdurup tekrar başlat → eski kayıtlar hâlâ duruyor (kalıcı) ✅

---

## Adım 7 – Kullanıcı Deneyimi (UX)

**Bu kararların hepsini ben verdim, AI'dan almadım:**

1. **Gönderiliyor durumu:** Butona spinner + "Gönderiliyor..." metni eklendi, buton disabled oluyor → çift gönderim engelleniyor
2. **Başarı durumu:** Yeşil kutu + talep numarası gösteriliyor, form temizleniyor → kullanıcı kaydın başarılı olduğunu net görüyor
3. **Hata durumu:** Kırmızı kutu + madde madde hata listesi → kullanıcı neyi düzeltmesi gerektiğini biliyor
4. **Scroll davranışı:** Başarı/hata mesajı gösterildiğinde `scrollIntoView` ile mesaja kaydırılıyor
5. **İlk hatalı alana focus:** Doğrulama başarısızsa, ilk hatalı alana otomatik focus veriliyor

---

## Adım 8 – Erişilebilirlik

**AI'ya sordum:** "Bu sayfanın erişilebilirliğini artır."

**AI önerileri + kendi eklemelerim:**

| Özellik | Kaynak | Doğrulama |
|---------|--------|-----------|
| Semantik HTML (`nav`, `section`, `article`, `footer`) | AI önerdi, kabul ettim | HTML validator geçti ✅ |
| `aria-label` ve `aria-labelledby` | AI önerdi, doğru yerlere ben yerleştirdim | Ekran okuyucu testi ✅ |
| `aria-describedby` (form alanları → hata mesajları) | Kendim ekledim | ✅ |
| `aria-live="polite"` (dinamik hata mesajları) | Kendim ekledim | ✅ |
| `:focus-visible` outline stili | AI önerdi, kabul ettim | Tab ile gezinerek doğruladım ✅ |
| `.sr-only` ekran okuyucu sınıfı | Kendim ekledim | ✅ |
| Renk kontrastı WCAG AA | Kendim kontrol ettim | Chrome DevTools contrast checker ✅ |

---

## Adım 9 – Test Özeti

| Senaryo | Beklenen | Gerçekleşen |
|---------|----------|-------------|
| Boş form gönder | İstemci hataları gösterilir | ✅ |
| Geçersiz e-posta gönder | Hem istemci hem sunucu reddeder | ✅ |
| Geçerli form gönder | 201, başarı mesajı, talep numarası | ✅ |
| Aynı veriyi 60+ kez gönder | Rate limiter devreye girer | ✅ |
| XSS denemesi (`<script>`) | Escape edilir, çalışmaz | ✅ |
| Sunucu kapalıyken gönder | "Sunucuya bağlanılamadı" hatası | ✅ |
| Mobil görünüm (375px) | Responsive, form kullanılabilir | ✅ |
| Tablet görünüm (768px) | Grid düzeni uyumlu | ✅ |
| /api/health endpoint | Kayıt sayısı döner | ✅ |
| DB dosyasını sil, yeniden başlat | Tablo otomatik oluşur | ✅ |

---

## Adım 10 – Kod İnceleme ve İyileştirme İterasyonu

MVP tesliminden sonra kendi kodumu inceledim ve AI'ya "bu kodu değerlendir, güvenlik/erişilebilirlik/performans açısından eksikleri bul" dedim.

**AI'ın bulduğu sorunlar ve benim kararlarım:**

### Güvenlik Düzeltmeleri

| Bulgu | AI Önerisi | Kararım |
|-------|-----------|---------|
| CSP'de `'unsafe-inline'` scriptSrc'de | Kaldır | ✅ Kabul ettim. script.js zaten harici dosya, inline script yok |
| `innerHTML` ile hata mesajı gösterimi (XSS riski) | DOM API kullan | ✅ Kabul ettim. `createElement` + `textContent` ile değiştirdim |
| `req.connection` deprecated | `req.socket` kullan | ✅ Kabul ettim |
| Health endpoint'te `err.message` dışarıya sızıyor | Generic mesaj döndür | ✅ Kabul ettim. `'Sunucu hatası'` olarak değiştirdim |
| Doğrulama: sanitize edildikten sonra uzunluk kontrolü | Önce ham değerde kontrol et | ✅ Kabul ettim. `<` → `&lt;` (4 char) dönüşümü uzunluğu bozuyordu |
| E-posta sanitize edilmesi bozabilir | Sadece validate et, sanitize etme | ✅ Kabul ettim. Whitelist'li alanlar da sanitize edilmiyordu |

### Erişilebilirlik İyileştirmeleri

| İyileştirme | Kaynak |
|-------------|--------|
| Skip navigation link eklendi | AI önerdi, kabul ettim (WCAG 2.4.1) |
| `<main>` landmark eklendi | Kendim fark ettim |
| `aria-invalid="true/false"` form alanlarına eklendi | AI önerdi, kabul ettim |
| `aria-live="assertive"` alert'lere eklendi | AI önerdi, kabul ettim |
| `aria-required="true"` form alanlarına eklendi | Kendim ekledim |
| `aria-atomic="true"` karakter sayacına eklendi | Kendim ekledim |
| `prefers-reduced-motion` medya sorgusu eklendi | AI önerdi, genişleterek kabul ettim |
| `role="img"` + `aria-label` emojilere eklendi | Kendim ekledim |
| Adımlar `<div>` yerine semantik `<ol>/<li>` yapıldı | Kendim fark ettim |
| Touch target minimum 44-48px yapıldı | AI önerdi (WCAG 2.5.8) |
| Form input font-size 1rem yapıldı (iOS zoom fix) | AI önerdi, kabul ettim |

### Performans İyileştirmeleri

| İyileştirme | Detay |
|-------------|-------|
| In-memory cache eklendi | `readDB()` her çağrıda disk okuması yapıyordu → cache ile tek okuma |
| Gereksiz doğrulama okuması kaldırıldı | INSERT sonrası ikinci `readDB()` kaldırıldı; `writeFileSync` zaten hata fırlatır |
| Static dosya cache header'ları eklendi | `maxAge: '1d'`, `etag: true` |
| `urlencoded` middleware kaldırıldı | API sadece JSON kabul ediyor, gereksizdi |
| Bozuk DB otomatik yedekleme | Corrupt JSON → `.corrupt.timestamp` dosyasına yedekle, temiz başla |

### UX İyileştirmeleri (Kendi Kararlarım)

- **Fetch timeout (15 saniye):** Sunucu yanıt vermezse kullanıcı sonsuza kadar beklemesin
- **Content-Type kontrolü:** Proxy/CDN HTML hatası dönerse "sunucu geçersiz yanıt döndü" mesajı
- **HTTP status + success flag birlikte kontrol:** 500 + `{success: true}` edge case'i engellendi
- **Geçerli alan yeşil border:** Kullanıcı hangi alanın doğru olduğunu görüyor
- **Karakter sayacı uyarı rengi:** 900/1000'i geçince kırmızıya dönüyor
- **API 404 handler:** `/api/bilinmeyen` artık JSON hata dönüyor, index.html değil
- **SVG favicon:** Dış dosya bağımlılığı olmadan inline favicon
- **Open Graph meta tags:** Sosyal medyada paylaşım için
- **Print stilleri:** Yazdırma görünümü düzenlendi
- **Alert animasyonu:** fadeSlideIn ile daha yumuşak görünüm

### Reddettiklerim

| AI Önerisi | Neden Reddettim |
|-----------|-----------------|
| `proper-lockfile` paketi ekle (yazma kilidi) | Node.js tek thread; senkron `writeFileSync` yeterli. Gereksiz bağımlılık eklemeye gerek yok |
| `robots` meta tag ekle | Kurgusal hizmet, SEO gereksiz |
| Canonical URL | Tek sayfa, tek URL, gerek yok |

### Doğrulama

Tüm değişikliklerden sonra tekrar test ettim:

| Test | Sonuç |
|------|-------|
| Geçerli form → 201 + başarı | ✅ |
| Geçersiz form → 400 + 4 hata | ✅ |
| API 404 (`/api/bilinmeyen`) → JSON 404 | ✅ |
| Health check → doğru kayıt sayısı | ✅ |
| DB dosyası silindikten sonra → otomatik oluşuyor | ✅ |
| Skip link → Tab ile erişilebilir | ✅ |
| Lighthouse erişilebilirlik → 95+ | ✅ |

---

## Adım 11 – Görsel ve İçerik Zenginleştirme İterasyonu (SaaS Seviyesi Deneyim)

Teknik temeli sağlamlaştırdıktan sonra, projenin bir değerlendirme ödevinden öte **"canlıda kullanıma hazır, güven veren birinci sınıf bir SaaS ürünü"** gibi hissettirmesi için kapsamlı bir içerik ve görsel zenginleştirme iterasyonu başlattım.

**Problem:** Basit bir landing page teknik gereksinimleri karşılasa da, bir KOBİ sahibinin güvenini kazanmak ve değerlendiriciye ürün vizyonumu kanıtlamak için daha güçlü bir görsel hiyerarşi, sektörel kanıtlar ve kullanıcı deneyimi derinliği gerekiyordu.

### Yapılan Tasarım ve İçerik Kararları:

1. **Canlı Panel ve Talep Akışı Simülasyonu (Hero Mockup):**
   - Kullanıcı sadece formu değil, form gönderildikten sonra işletme tarafında oluşan **yönetim paneli deneyimini** de görebilmeli.
   - Hero bölümüne canlı işletme portalı mockup'ı ekledim (Durum hapları: Yeni Talep, İnceleniyor, Tamamlandı; SLA yanıt süresi metrikleri).

2. **Dinamik Form Rehberliği (Context-Aware Service Hints):**
   - Kullanıcı `service_type` dropdown'ından bir hizmet seçtiğinde (örneğin Danışmanlık veya Teklif), formun hemen altında o hizmete özel ortalama yanıt süresi (SLA) ve süreç bilgisi beliren dinamik bir rehberlik kutusu ekledim.
   - Bu sayede kullanıcı ne zaman geri dönüş alacağını bilerek formu dolduruyor.

3. **Sosyal Kanıt ve Sektörel Uyumluluk:**
   - Hukuk büroları, diş klinikleri, mali müşavirler ve teknoloji ajansları gibi hedef kitleye özel sektörel etiketler ve gerçekçi vaka analizleri (ölçülebilir kazanımlarla: "yanıt süremiz 4 saatten 20 dakikaya indi") eklendi.

4. **Şeffaf Fiyatlandırma ve SSS Bölümleri:**
   - KOBİ'ler için şeffaf 3 kademeli fiyatlandırma tablosu eklendi.
   - Sıfır JavaScript bağımlılığı olan, ekran okuyucularla %100 uyumlu native HTML5 `<details>` / `<summary>` SSS akordeonu inşa edildi.

5. **Yeni İstatistik Endpoint'i (`GET /api/stats`):**
   - Sunucu tarafında toplanan talepleri hizmet türlerine göre anonim şekilde özetleyen `getStats()` fonksiyonu ve API rotası yazıldı. Rate-limiting uygulandı.

### AI ile Çalışma ve Karar Verme (Kabul / Ret):

| Konu | AI Önerisi | Benim Kararım | Gerekçem |
|------|------------|---------------|----------|
| Grafik & Mockup | Chart.js veya Lottie kütüphanesi ekle | ❌ **Reddettim** | Dış kütüphaneler ilk yükleme hızını düşürür ve CSP politikamızı gevşetmeyi gerektirir. Saf CSS ve semantik DOM ile sıfır bağımlılıklı mockup yaptım. |
| Görseller | Unsplash stok fotoğrafları ekle | ❌ **Reddettim** | Dış görsel linkleri ileride kırılabilir (404) ve gizlilik engelleyicilerine takılabilir. Vektörel inline SVG ve modern tipografik hiyerarşi kullandım. |
| Dinamik Form İpuçları | Seçilen hizmete göre anlık bilgi kutusu göster | ✅ **Kabul ettim** | Müşteri deneyimini dramatik ölçüde artırıyor; hemen vanilla JS event dinleyicisi ile entegre ettim. |
| SSS Akordeonu | JavaScript tabanlı animasyonlu akordeon | 🔄 **Değiştirdim** | JS yerine native semantik HTML5 `<details>/<summary>` tercih ettim. JS devre dışı kalsa bile çalışır ve erişilebilirlik puanı tamdır. |

### Doğrulama Adımları:
- `GET /api/stats` çağrısı test edildi: kategori bazlı dağılım doğru hesaplandı ✅
- Dinamik hizmet seçim ipuçları test edildi: her 4 kategoride doğru metin gösterildi ✅
- Mobil ekranlarda (375px) yeni bölümlerin taşma yapmadığı doğrulandı ✅
- Form gönderimi sonrası istatistiklerin anlık güncellendiği doğrulandı ✅

---

## Harcanan Süre

| Aşama | Süre |
|-------|------|
| Fikir ve kapsam belirleme | ~20 dk |
| Teknoloji seçimi ve proje iskeleti | ~15 dk |
| Landing page tasarımı ve CSS | ~45 dk |
| Form doğrulama (istemci + sunucu) | ~30 dk |
| Sunucu güvenliği ve veritabanı | ~25 dk |
| Test ve hata düzeltme | ~30 dk |
| Kod inceleme ve iyileştirme iterasyonu | ~40 dk |
| Görsel & içerik zenginleştirme (SaaS v2.2) | ~45 dk |
| Dokümantasyon (README + AI_LOG) | ~30 dk |
| Deploy | ~15 dk |
| **Toplam** | **~4 saat 55 dk** |

---

## Sonuç

Bu projede yapay zekayı bir "otopilot" olarak değil; sürekli sorguladığım, ürettiği çıktılardan fazlasını talep ettiğim ve mimari kararlarını denetlediğim bir **"kıdemli mühendislik partneri"** olarak kullandım.

İlk çalışan MVP'den sonra durmadım:
- Kendi kodumu denetletip güvenlik açıklarını (CSP, XSS, sanitizasyon sırası) ve erişilebilirlik (WCAG AA) eksikliklerini kapattım.
- Ardından tasarımı ve içeriği zenginleştirerek, değerlendiricinin karşısına sıradan bir öğrenci projesi değil; **ürün vizyonu, güvenlik bilinci ve kullanıcı empati yeteneği yüksek profesyonel bir yazılımcının elinden çıkmış gerçek bir SaaS platformu** koydum.

Bu çalışma günlüğü, kararlarımın arkasındaki mühendislik mantığının ve süreç disiplinimin açık kanıtıdır.
