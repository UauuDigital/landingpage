const LANG_MAP = { ca: 'catala', es: 'castellano', en: 'ingles' };

// reCAPTCHA callback — must be global
window.enviarAlCRM = function () {
  document.getElementById('contact-form').submit();
};

function getDialCode() {
  return document.querySelector('#country-selector .cs-dial')?.textContent.trim() ?? '+34';
}

function isValidPhone(value, dialCode) {
  // Strip common formatting characters
  const cleaned = value.replace(/[\s\-().]/g, '');
  // Must be only digits with optional leading +
  if (!/^\+?\d+$/.test(cleaned)) return false;
  // Build full E.164 number
  const full = cleaned.startsWith('+') ? cleaned : (dialCode + cleaned);
  // E.164: + followed by 7–15 digits
  return /^\+\d{7,15}$/.test(full);
}

function validate(form) {
  let valid = true;
  const dialCode = getDialCode();

  form.querySelectorAll('input[required]').forEach((field) => {
    if (field.type === 'checkbox') return;

    const empty    = !field.value.trim();
    const badEmail = field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
    const badPhone = field.type === 'tel'   && !isValidPhone(field.value.trim(), dialCode);

    if (field.type === 'tel') {
      // Error state goes on the wrap container, not the input
      const hasError = empty || badPhone;
      field.closest('.contact-form__phone-wrap')?.classList.toggle('is-error', hasError);
      if (hasError) valid = false;
    } else {
      field.classList.toggle('is-error', empty || badEmail);
      if (empty || badEmail) valid = false;
    }
  });

  const privacy = form.querySelector('#privacy');
  if (privacy && !privacy.checked) {
    privacy.closest('.form-footer')?.classList.add('is-error');
    valid = false;
  } else {
    privacy?.closest('.form-footer')?.classList.remove('is-error');
  }

  return valid;
}

function syncLang() {
  const field = document.getElementById('idioma_contacto_c');
  if (field) field.value = LANG_MAP[document.documentElement.lang] ?? 'catala';
}

export function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('input', (e) => {
    e.target.classList.remove('is-error');
    e.target.closest('.contact-form__phone-wrap')?.classList.remove('is-error');
    e.target.closest('.form-footer')?.classList.remove('is-error');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    syncLang();

    const dateDisplay = document.getElementById('date_display');
    const descField   = document.getElementById('description');
    if (dateDisplay && descField) {
      const val = dateDisplay.value.trim();
      descField.value = val ? `Data del casament: ${val}` : '';
    }

    if (!validate(form)) return;

    const phoneInput = form.querySelector('#phone_mobile');
    const dialCode   = getDialCode();
    if (phoneInput && phoneInput.value.trim()) {
      const raw = phoneInput.value.trim().replace(/[\s\-().]/g, '');
      phoneInput.value = raw.startsWith('+') ? raw : dialCode + raw;
    }

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.execute();
    } else {
      form.submit();
    }
  });
}
