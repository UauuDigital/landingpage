const LANG_MAP = { ca: 'catala', es: 'castellano', en: 'ingles' };
const LEAD_EVENT_ID_KEY = 'uauu_lead_event_id';
const LEAD_EVENT_FIRED_KEY = 'uauu_lead_event_fired';

// ── UTM → lead_source ──────────────────────────────────────────────────────
// lead_source a SugarCRM és un desplegable de llista tancada: MAI s'hi envia
// l'utm_source en cru (un valor no reconegut pel CRM pot deixar el lead sense
// origen o inservible per filtrar). Només valors d'aquesta llista blanca.
// Per afegir un canal nou (nova campanya): afegiu-hi una entrada aquí.
const UTM_SOURCE_MAP = {
  chatgpt: 'chatgpt_ads',
  openai: 'chatgpt_ads',
  instagram: 'bio_instagram',
  ig: 'bio_instagram',
  facebook: 'meta_ads',
  meta: 'meta_ads',
  google: 'google_ads',
  tiktok: 'tiktok',
  instagram_stories: 'instagram_stories',
  ig_stories: 'instagram_stories',
  stories: 'instagram_stories',
};
// Valor quan no hi ha utm_source, o quan no és cap dels canals reconeguts.
const DEFAULT_LEAD_SOURCE = 'web_directe';
const UTM_SOURCE_STORAGE_KEY = 'uauu_utm_source';

function makeEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Captura l'utm_source de la URL actual i el desa a sessionStorage perquè
// sobrevisqui a recàrregues i a la navegació interna de la landing. Si la URL
// no en porta, es manté el que ja hi hagués guardat; si en porta un de nou,
// substitueix l'anterior (una visita nova sempre guanya). S'executa en
// carregar el mòdul (no cal esperar cap event: només toca URL/sessionStorage,
// no el DOM), així queda capturat abans que calgui omplir el formulari.
function captureUtmSource() {
  try {
    const raw = new URLSearchParams(window.location.search).get('utm_source');
    if (raw) {
      sessionStorage.setItem(UTM_SOURCE_STORAGE_KEY, raw.trim().toLowerCase());
    }
  } catch (_) {
    // Sense utm capturable: es farà servir el valor per defecte
  }
}
captureUtmSource();

// Resol el lead_source final a partir de l'utm_source desat, o el valor per
// defecte si no n'hi ha cap o no és un canal reconegut al mapa.
function resolveLeadSource() {
  try {
    const utm = sessionStorage.getItem(UTM_SOURCE_STORAGE_KEY);
    if (utm && UTM_SOURCE_MAP[utm]) return UTM_SOURCE_MAP[utm];
  } catch (_) {
    // sessionStorage no disponible
  }
  return DEFAULT_LEAD_SOURCE;
}

// Genera i desa l'event_id del lead abans d'enviar el formulari, perquè gracies.html
// el pugui recollir i disparar-hi l'esdeveniment de conversió del pixel (no aquí:
// aquí encara no sabem si el CRM acceptarà el lead). Mai bloqueja l'enviament.
// Esborra també el flag "ja disparat": un submit nou és, per definició, una
// conversió nova, encara que la pestanya ja n'hagués enviat una altra abans.
// Aprofita el mateix punt per omplir lead_source des de l'utm capturat.
function storeLeadEventId() {
  try {
    sessionStorage.setItem(LEAD_EVENT_ID_KEY, makeEventId());
    sessionStorage.removeItem(LEAD_EVENT_FIRED_KEY);
  } catch (_) {
    // sessionStorage pot fallar (navegació privada, etc.)
  }

  try {
    const leadSourceField = document.getElementById('lead_source');
    if (leadSourceField) leadSourceField.value = resolveLeadSource();
  } catch (_) {
    // Si falla, el formulari s'envia igualment amb el valor per defecte de l'HTML
  }
}

// reCAPTCHA callback — must be global
window.enviarAlCRM = function () {
  storeLeadEventId();
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

    // Antispam honeypot: bots fill hidden fields. Abort silently.
    const honeypot = form.querySelector('[name="hp_website"]');
    if (honeypot && honeypot.value.trim()) return;

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
      storeLeadEventId();
      form.submit();
    }
  });
}
