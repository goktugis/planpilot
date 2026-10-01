/**
 * PlanPilot – İstemci Tarafı Form Doğrulama ve Gönderim
 * Tüm doğrulama kuralları sunucu tarafıyla senkronize.
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

  var VALID_SERVICES = ['danismanlik', 'teklif', 'teknik-destek', 'genel-bilgi'];
  var FETCH_TIMEOUT_MS = 15000; // 15 saniye timeout

  // ── Doğrulama Kuralları ──
  var validators = {
    full_name: function (value) {
      var v = value.trim();
      if (!v) return 'Ad soyad alanı zorunludur.';
      if (v.length < 2) return 'Ad soyad en az 2 karakter olmalıdır.';
      if (v.length > 100) return 'Ad soyad en fazla 100 karakter olabilir.';
      return '';
    },
    email: function (value) {
      var v = value.trim();
      if (!v) return 'E-posta alanı zorunludur.';
      if (v.length > 254) return 'E-posta adresi çok uzun.';
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(v)) return 'Geçerli bir e-posta adresi giriniz.';
      return '';
    },
    service_type: function (value) {
      if (!value || VALID_SERVICES.indexOf(value) === -1) return 'Lütfen bir hizmet türü seçiniz.';
      return '';
    },
    description: function (value) {
      var v = value.trim();
      if (!v) return 'Açıklama alanı zorunludur.';
      if (v.length < 10) return 'Açıklama en az 10 karakter olmalıdır.';
      if (v.length > 1000) return 'Açıklama en fazla 1000 karakter olabilir.';
      return '';
    }
  };

  // ── Yardımcı Fonksiyonlar ──
  function showFieldError(fieldName, message) {
    var input = document.getElementById(fieldName);
    var errorEl = document.getElementById(fieldName + '-error');
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
      document.getElementById(fields[i]).classList.remove('input-valid');
    }
    hideAlerts();
  }

  function hideAlerts() {
    alertSuccess.classList.remove('visible');
    alertError.classList.remove('visible');
  }

  function showSuccess(data) {
    alertError.classList.remove('visible');
    successDetail.textContent = 'Talep numaranız: #' + data.id + ' — En kısa sürede sizinle iletişime geçeceğiz.';
    alertSuccess.classList.add('visible');
    alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Ekran okuyucuları için focus
    alertSuccess.focus();
  }

  function showError(messages) {
    alertSuccess.classList.remove('visible');
    // XSS koruması: innerHTML yerine DOM API kullan
    errorMessage.textContent = '';
    if (Array.isArray(messages)) {
      for (var i = 0; i < messages.length; i++) {
        var line = document.createElement('div');
        line.textContent = '• ' + messages[i];
        errorMessage.appendChild(line);
      }
    } else {
      errorMessage.textContent = messages;
    }
    alertError.classList.add('visible');
    alertError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    alertError.focus();
  }

  function setLoading(isLoading) {
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

  // ── Timeout destekli fetch ──
  function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timedOut = false;
      var timer = setTimeout(function () {
        timedOut = true;
        reject(new Error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'));
      }, timeoutMs);

      fetch(url, options)
        .then(function (response) {
          if (!timedOut) {
            clearTimeout(timer);
            resolve(response);
          }
        })
        .catch(function (err) {
          if (!timedOut) {
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  // ── Karakter Sayacı ──
  descriptionField.addEventListener('input', function () {
    var len = descriptionField.value.length;
    charCount.textContent = len + ' / 1000';
    // 900'ü geçince uyarı rengi
    if (len > 900) {
      charCount.classList.add('warning');
    } else {
      charCount.classList.remove('warning');
    }
  });

  // ── Canlı Doğrulama (blur'da) ──
  var fieldNames = Object.keys(validators);
  for (var i = 0; i < fieldNames.length; i++) {
    (function (fieldName) {
      var input = document.getElementById(fieldName);

      input.addEventListener('blur', function () {
        var error = validators[fieldName](input.value);
        if (error) {
          showFieldError(fieldName, error);
        } else if (input.value.trim()) {
          showFieldValid(fieldName);
        }
      });

      // Hata temizleme (yazarken)
      input.addEventListener('input', function () {
        if (input.classList.contains('input-error')) {
          var error = validators[fieldName](input.value);
          if (!error) showFieldValid(fieldName);
        }
      });
    })(fieldNames[i]);
  }

  // ── Form Gönderimi ──
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearAllErrors();

    // İstemci tarafı doğrulama
    var hasError = false;
    var firstErrorField = null;
    var fields = Object.keys(validators);

    for (var i = 0; i < fields.length; i++) {
      var fieldName = fields[i];
      var input = document.getElementById(fieldName);
      var error = validators[fieldName](input.value);
      if (error) {
        showFieldError(fieldName, error);
        hasError = true;
        if (!firstErrorField) firstErrorField = input;
      }
    }

    if (hasError) {
      firstErrorField.focus();
      return;
    }

    // Çift gönderim koruması
    if (btnSubmit.disabled) return;

    // Veriyi hazırla
    var payload = {
      full_name: document.getElementById('full_name').value.trim(),
      email: document.getElementById('email').value.trim(),
      service_type: document.getElementById('service_type').value,
      description: document.getElementById('description').value.trim()
    };

    // Gönder
    setLoading(true);

    fetchWithTimeout('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, FETCH_TIMEOUT_MS)
      .then(function (res) {
        // Yanıt JSON mi kontrol et
        var contentType = res.headers.get('content-type');
        if (!contentType || contentType.indexOf('application/json') === -1) {
          throw new Error('Sunucu geçersiz yanıt döndü (HTTP ' + res.status + ').');
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
          charCount.textContent = '0 / 1000';
          charCount.classList.remove('warning');
          // Valid sınıflarını temizle
          for (var i = 0; i < fields.length; i++) {
            document.getElementById(fields[i]).classList.remove('input-valid');
          }
        } else {
          showError(result.body.errors || ['Bilinmeyen bir hata oluştu.']);
        }
      })
      .catch(function (err) {
        setLoading(false);
        console.error('İstek hatası:', err);
        if (err.message && err.message.indexOf('zaman aşımı') !== -1) {
          showError('İstek zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
        } else {
          showError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }
      });
  });
})();
