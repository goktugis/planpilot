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

## Harcanan Süre

| Aşama | Süre |
|-------|------|
| Fikir ve kapsam belirleme | ~20 dk |
| Teknoloji seçimi ve proje iskeleti | ~15 dk |
| Landing page tasarımı ve CSS | ~45 dk |
| Form doğrulama (istemci + sunucu) | ~30 dk |
| Sunucu güvenliği ve veritabanı | ~25 dk |
| Test ve hata düzeltme | ~30 dk |
| Dokümantasyon (README + AI_LOG) | ~25 dk |
| Deploy | ~15 dk |
| **Toplam** | **~3 saat 25 dk** |

---

## Sonuç

AI'yı kullanmak süreci hızlandırdı ama **her kararı ben verdim**. AI'ın ürettiği kodu kör kopyala-yapıştır yapmak yerine; anladım, sorguladım, değiştirdim ve doğruladım. Bu kayıt, o sürecin kanıtıdır.
