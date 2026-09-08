import { reapplyVariant } from './variant.js';

const SUPPORTED = ['ca', 'es', 'en'];
const DEFAULT_LANG = 'ca';
const LANG_CRM    = { ca: 'catala', es: 'castellano', en: 'ingles' };

let currentStrings = {};

// Mateix raonament que a variant.js: import.meta.url ancora la ruta a la
// ubicació real de js/lang.js, no a la del document que l'ha carregat -- així
// el fetch funciona igual des de l'arrel que des d'una pàgina de variant
// generada un nivell més avall (<arrel>/<variant>/index.html).
function localeUrl(lang) {
  return new URL(`../locales/${lang}.json`, import.meta.url);
}

async function loadLocale(lang) {
  const res = await fetch(localeUrl(lang));
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

    // La variant (si n'hi ha) torna a aplicar-se per SOBRE de l'idioma que
    // acabem de carregar: sense això, el seu copy no sobreviuria al canvi
    // d'idioma (tornar a CAT tornaria a descarregar ca.json i esborraria el
    // que hi hagués). Vegeu el comentari a reapplyVariant() a js/variant.js.
    reapplyVariant(lang);

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

  // L'HTML ja porta els textos de l'idioma per defecte: no cal baixar el JSON
  // ni reescriure el DOM per tornar a posar el mateix.
  if (initial !== document.documentElement.lang) switchLang(initial);

  document.querySelectorAll('.site-nav__lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });
}
