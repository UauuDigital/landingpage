const LANG_MAP = { ca: 'catala', es: 'castellano', en: 'ingles' };

// reCAPTCHA callback — must be global
window.enviarAlCRM = function () {
  document.getElementById('contact-form').submit();
};

function validate(form) {
  let valid = true;

  form.querySelectorAll('input[required]').forEach((field) => {
    if (field.type === 'checkbox') return;
    const empty    = !field.value.trim();
    const badEmail = field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
    field.classList.toggle('is-error', empty || badEmail);
    if (empty || badEmail) valid = false;
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

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.execute();
    } else {
      form.submit();
    }
  });
}
