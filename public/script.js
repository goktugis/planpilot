/**
 * PlanPilot – İstemci Tarafı Form Doğrulama ve Gönderim
 * Tüm doğrulama kuralları sunucu tarafıyla senkronize.
 */
(function () {
  'use strict';

  const form = document.getElementById('request-form');
  const btnSubmit = document.getElementById('btn-submit');
  const alertSuccess = document.getElementById('alert-success');
  const alertError = document.getElementById('alert-error');
  const errorMessage = document.getElementById('error-message');
  const successDetail = document.getElementById('success-detail');
  const descriptionField = document.getElementById('description');
  const charCount = document.getElementById('description-charcount');

  const VALID_SERVICES = ['danismanlik', 'teklif', 'teknik-destek', 'genel-bilgi'];

  // ── Doğrulama Kuralları ──
  const validators = {
    full_name: (value) => {
      const v = value.trim();
      if (!v) return 'Ad soyad alanı zorunludur.';
      if (v.length < 2) return 'Ad soyad en az 2 karakter olmalıdır.';
      if (v.length > 100) return 'Ad soyad en fazla 100 karakter olabilir.';
      return '';
    },
    email: (value) => {
      const v = value.trim();
      if (!v) return 'E-posta alanı zorunludur.';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(v)) return 'Geçerli bir e-posta adresi giriniz.';
      return '';
    },
    service_type: (value) => {
      if (!value || !VALID_SERVICES.includes(value)) return 'Lütfen bir hizmet türü seçiniz.';
      return '';
    },
    description: (value) => {
      const v = value.trim();
      if (!v) return 'Açıklama alanı zorunludur.';
      if (v.length < 10) return 'Açıklama en az 10 karakter olmalıdır.';
      if (v.length > 1000) return 'Açıklama en fazla 1000 karakter olabilir.';
      return '';
    }
  };

  // ── Yardımcı Fonksiyonlar ──
  function showFieldError(fieldName, message) {
    const input = document.getElementById(fieldName);
    const errorEl = document.getElementById(fieldName + '-error');
    if (message) {
      input.classList.add('input-error');
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    } else {
      input.classList.remove('input-error');
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }

  function clearAllErrors() {
    Object.keys(validators).forEach((field) => showFieldError(field, ''));
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
    alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showError(messages) {
    alertSuccess.classList.remove('visible');
    if (Array.isArray(messages)) {
      errorMessage.innerHTML = messages.map(function (m) { return '• ' + m; }).join('<br>');
    } else {
      errorMessage.textContent = messages;
    }
    alertError.classList.add('visible');
    alertError.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // ── Karakter Sayacı ──
  descriptionField.addEventListener('input', function () {
    var len = descriptionField.value.length;
    charCount.textContent = len + ' / 1000';
  });

  // ── Canlı Doğrulama (blur'da) ──
  Object.keys(validators).forEach(function (fieldName) {
    var input = document.getElementById(fieldName);
    input.addEventListener('blur', function () {
      var error = validators[fieldName](input.value);
      showFieldError(fieldName, error);
    });
    // Hata temizleme (input'ta)
    input.addEventListener('input', function () {
      if (input.classList.contains('input-error')) {
        var error = validators[fieldName](input.value);
        if (!error) showFieldError(fieldName, '');
      }
    });
  });

  // ── Form Gönderimi ──
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearAllErrors();

    // İstemci tarafı doğrulama
    var hasError = false;
    var firstErrorField = null;

    Object.keys(validators).forEach(function (fieldName) {
      var input = document.getElementById(fieldName);
      var error = validators[fieldName](input.value);
      if (error) {
        showFieldError(fieldName, error);
        hasError = true;
        if (!firstErrorField) firstErrorField = input;
      }
    });

    if (hasError) {
      firstErrorField.focus();
      return;
    }

    // Veriyi hazırla
    var payload = {
      full_name: document.getElementById('full_name').value.trim(),
      email: document.getElementById('email').value.trim(),
      service_type: document.getElementById('service_type').value,
      description: document.getElementById('description').value.trim()
    };

    // Gönder
    setLoading(true);

    fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, body: data };
        });
      })
      .then(function (result) {
        setLoading(false);

        if (result.body.success) {
          showSuccess(result.body.data);
          form.reset();
          charCount.textContent = '0 / 1000';
        } else {
          showError(result.body.errors || 'Bilinmeyen bir hata oluştu.');
        }
      })
      .catch(function (err) {
        setLoading(false);
        console.error('Ağ hatası:', err);
        showError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      });
  });
})();
