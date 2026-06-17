const SUPPORTED = ['ca', 'es', 'en'];
const DEFAULT_LANG = 'ca';
const LANG_CRM    = { ca: 'catala', es: 'castellano', en: 'ingles' };

let currentStrings = {};

async function loadLocale(lang) {
  const res = await fetch(`locales/${lang}.json`);
  if (!res.ok) throw new Error(`Locale not found: ${lang}`);
  return res.json();
}

function applyStrings(strings) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key in strings) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = strings[key];
      } else {
        el.textContent = strings[key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key in strings) el.innerHTML = strings[key];
  });
}

async function switchLang(lang) {
  if (!SUPPORTED.includes(lang)) return;

  try {
    currentStrings = await loadLocale(lang);
    applyStrings(currentStrings);
    document.documentElement.lang = lang;
    localStorage.setItem('uauu-lang', lang);

    const crmField = document.getElementById('idioma_contacto_c');
    if (crmField) crmField.value = LANG_CRM[lang] ?? 'catala';

    document.querySelectorAll('.site-nav__lang-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lang === lang);
      btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
    });
  } catch (err) {
    console.error('[lang]', err);
  }
}

export function initLang() {
  const saved = localStorage.getItem('uauu-lang');
  const initial = SUPPORTED.includes(saved) ? saved : DEFAULT_LANG;

  switchLang(initial);

  document.querySelectorAll('.site-nav__lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });
}
