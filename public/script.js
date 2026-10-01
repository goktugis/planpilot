/**
 * PlanPilot – İstemci Tarafı Form Doğrulama ve Etkileşim Yönetimi (v2.2)
 * 
 * Özellikler:
 * - Çift katmanlı doğrulama (Sunucu kurallarıyla %100 senkronize)
 * - Dinamik hizmet bilgilendirme kutusu (Seçilen hizmete göre anlık SLA ve detay)
 * - Güvenli DOM API tabanlı hata renderi (XSS açığı önleme)
 * - 15 saniye zaman aşımı (Timeout) korumalı Fetch API
 * - WCAG AA ve ARIA ekran okuyucu bildirimleri
 */

(function () {
  'use strict';

  var form = document.getElementById('request-form');
  var btnSubmit = document.getElementById('btn-submit');
  var alertSuccess = document.getElementById('alert-success');
  var alertError = document.getElementById('alert-error');
  var errorMessage = document.getElementById('error-message');
  var successDetail = document.getElementById('success-detail');
  var descriptionField = document.getElementById('description');
  var charCount = document.getElementById('description-charcount');
  var serviceSelect = document.getElementById('service_type');
  var serviceHintBox = document.getElementById('service-hint-box');

  var VALID_SERVICES = ['danismanlik', 'teklif', 'teknik-destek', 'genel-bilgi'];
  var FETCH_TIMEOUT_MS = 15000;

  // Hizmet türlerine özel anlık rehberlik metinleri
  var SERVICE_HINTS = {
    danismanlik: '📅 <strong>Danışmanlık Randevusu:</strong> Talebiniz ön değerlendirmeden geçirilerek müsaitlik takvimimiz e-posta adresinize iletilecektir. (Ortalama yanıt: 1 iş günü)',
    teklif: '💼 <strong>Teklif Talebi:</strong> İhtiyaç kapsamınız analiz edilip 24 saat içinde detaylı maliyet ve takvim özeti sunulacaktır.',
    'teknik-destek': '⚡ <strong>Teknik Destek:</strong> Öncelikli teknik ekibimiz sorununuzu inceleyerek 2-4 saat içinde çözüm önerisiyle dönecektir.',
    'genel-bilgi': 'ℹ️ <strong>Genel Bilgi:</strong> Müşteri temsilcimiz merak ettiğiniz tüm soruları yanıtlamak için aynı gün içinde dönüş yapacaktır.'
  };

  // ── Doğrulama Kuralları ──
  var validators = {
    full_name: function (value) {
      var v = value ? value.trim() : '';
      if (!v) return 'Ad soyad alanı zorunludur.';
      if (v.length < 2) return 'Ad soyad en az 2 karakter olmalıdır.';
      if (v.length > 100) return 'Ad soyad en fazla 100 karakter olabilir.';
      return '';
    },
    email: function (value) {
      var v = value ? value.trim() : '';
      if (!v) return 'E-posta adresi zorunludur.';
      if (v.length > 254) return 'E-posta adresi en fazla 254 karakter olabilir.';
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(v)) return 'Lütfen geçerli bir e-posta formatı giriniz (örn: ad@firma.com).';
      return '';
    },
    service_type: function (value) {
      if (!value || VALID_SERVICES.indexOf(value) === -1) {
        return 'Lütfen geçerli bir hizmet türü seçiniz.';
      }
      return '';
    },
    description: function (value) {
      var v = value ? value.trim() : '';
      if (!v) return 'Açıklama alanı zorunludur.';
      if (v.length < 10) return 'Açıklama en az 10 karakter olmalıdır.';
      if (v.length > 1000) return 'Açıklama en fazla 1000 karakter olabilir.';
      return '';
    }
  };

  // ── Alan Görsel Durum Yardımcıları ──
  function showFieldError(fieldName, message) {
    var input = document.getElementById(fieldName);
    var errorEl = document.getElementById(fieldName + '-error');
    if (!input || !errorEl) return;

    if (message) {
      input.classList.add('input-error');
      input.classList.remove('input-valid');
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    } else {
      input.classList.remove('input-error');
      input.setAttribute('aria-invalid', 'false');
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }

  function showFieldValid(fieldName) {
    var input = document.getElementById(fieldName);
    var errorEl = document.getElementById(fieldName + '-error');
    if (!input || !errorEl) return;

    input.classList.remove('input-error');
    input.classList.add('input-valid');
    input.setAttribute('aria-invalid', 'false');
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }

  function clearAllErrors() {
    var fields = Object.keys(validators);
    for (var i = 0; i < fields.length; i++) {
      showFieldError(fields[i], '');
      var el = document.getElementById(fields[i]);
      if (el) el.classList.remove('input-valid');
    }
    hideAlerts();
  }

  function hideAlerts() {
    if (alertSuccess) alertSuccess.classList.remove('visible');
    if (alertError) alertError.classList.remove('visible');
  }

  function showSuccess(data) {
    hideAlerts();
    if (successDetail) {
      successDetail.textContent = 'Takip Numaranız: #' + data.id + ' — Hizmet talebiniz kalıcı olarak veritabanımıza işlenmiştir.';
    }
    if (alertSuccess) {
      alertSuccess.classList.add('visible');
      alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      alertSuccess.focus();
    }
  }

  function showError(messages) {
    hideAlerts();
    if (errorMessage) {
      errorMessage.textContent = '';
      if (Array.isArray(messages)) {
        for (var i = 0; i < messages.length; i++) {
          var item = document.createElement('div');
          item.textContent = '• ' + messages[i];
          errorMessage.appendChild(item);
        }
      } else {
        errorMessage.textContent = messages;
      }
    }
    if (alertError) {
      alertError.classList.add('visible');
      alertError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      alertError.focus();
    }
  }

  function setLoading(isLoading) {
    if (!btnSubmit) return;
    if (isLoading) {
      btnSubmit.classList.add('loading');
      btnSubmit.disabled = true;
      btnSubmit.setAttribute('aria-busy', 'true');
    } else {
      btnSubmit.classList.remove('loading');
      btnSubmit.disabled = false;
      btnSubmit.setAttribute('aria-busy', 'false');
    }
  }

  // ── Hizmet Seçimi Değiştiğinde Dinamik Rehberlik ──
  if (serviceSelect && serviceHintBox) {
    serviceSelect.addEventListener('change', function () {
      var selected = serviceSelect.value;
      if (SERVICE_HINTS[selected]) {
        serviceHintBox.innerHTML = SERVICE_HINTS[selected];
        serviceHintBox.classList.add('visible');
      } else {
        serviceHintBox.classList.remove('visible');
        serviceHintBox.innerHTML = '';
      }
    });
  }

  // ── Karakter Sayacı & Dinamik Uyarı ──
  if (descriptionField && charCount) {
    descriptionField.addEventListener('input', function () {
      var len = descriptionField.value.length;
      charCount.textContent = len + ' / 1000';
      if (len > 900) {
        charCount.classList.add('warning');
      } else {
        charCount.classList.remove('warning');
      }
    });
  }

  // ── Canlı Odaklanma & Doğrulama ──
  var fieldNames = Object.keys(validators);
  for (var i = 0; i < fieldNames.length; i++) {
    (function (name) {
      var input = document.getElementById(name);
      if (!input) return;

      input.addEventListener('blur', function () {
        var err = validators[name](input.value);
        if (err) {
          showFieldError(name, err);
        } else if (input.value.trim()) {
          showFieldValid(name);
        }
      });

      input.addEventListener('input', function () {
        if (input.classList.contains('input-error')) {
          var err = validators[name](input.value);
          if (!err) showFieldValid(name);
        }
      });
    })(fieldNames[i]);
  }

  // ── Zaman Aşımlı Fetch ──
  function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var didTimeout = false;
      var timer = setTimeout(function () {
        didTimeout = true;
        reject(new Error('İstek zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyiniz.'));
      }, timeoutMs);

      fetch(url, options)
        .then(function (res) {
          if (!didTimeout) {
            clearTimeout(timer);
            resolve(res);
          }
        })
        .catch(function (err) {
          if (!didTimeout) {
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  // ── Form Gönderimi ──
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAllErrors();

      var hasError = false;
      var firstInvalid = null;

      for (var j = 0; j < fieldNames.length; j++) {
        var fName = fieldNames[j];
        var el = document.getElementById(fName);
        var errorMsg = validators[fName](el ? el.value : '');
        if (errorMsg) {
          showFieldError(fName, errorMsg);
          hasError = true;
          if (!firstInvalid && el) firstInvalid = el;
        }
      }

      if (hasError) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      if (btnSubmit && btnSubmit.disabled) return;

      var payload = {
        full_name: document.getElementById('full_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        service_type: document.getElementById('service_type').value,
        description: document.getElementById('description').value.trim()
      };

      setLoading(true);

      fetchWithTimeout('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, FETCH_TIMEOUT_MS)
        .then(function (res) {
          var contentType = res.headers.get('content-type');
          if (!contentType || contentType.indexOf('application/json') === -1) {
            throw new Error('Sunucudan beklenmeyen bir formatta yanıt alındı (HTTP ' + res.status + ').');
          }
          return res.json().then(function (data) {
            return { status: res.status, body: data };
          });
        })
        .then(function (result) {
          setLoading(false);

          if (result.status >= 200 && result.status < 300 && result.body.success) {
            showSuccess(result.body.data);
            form.reset();
            if (charCount) charCount.textContent = '0 / 1000';
            if (serviceHintBox) {
              serviceHintBox.classList.remove('visible');
              serviceHintBox.innerHTML = '';
            }
            for (var k = 0; k < fieldNames.length; k++) {
              var fieldEl = document.getElementById(fieldNames[k]);
              if (fieldEl) fieldEl.classList.remove('input-valid');
            }
          } else {
            showError(result.body.errors || ['İşlem sırasında bir hata oluştu.']);
          }
        })
        .catch(function (err) {
          setLoading(false);
          console.error('İletişim hatası:', err);
          showError(err.message || 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol ediniz.');
        });
    });
  }
})();
