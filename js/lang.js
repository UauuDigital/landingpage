import { reapplyVariant } from './variant.js';

const SUPPORTED = ['ca', 'es', 'en'];
const DEFAULT_LANG = 'ca';
const LANG_CRM    = { ca: 'catala', es: 'castellano', en: 'ingles' };

const URL_LANG_PARAM = 'lang';

let currentStrings = {};

// ?lang=xx a la URL guanya sobre l'idioma desat: permet enllaços (i campanyes)
// que forcin un idioma. Un valor que no sigui ca/es/en s'ignora.
function langFromUrl() {
  const raw = new URLSearchParams(window.location.search).get(URL_LANG_PARAM);
  const lang = raw?.trim().toLowerCase();
  return SUPPORTED.includes(lang) ? lang : null;
}

// Conserva la resta de paràmetres (utm_*...) i el hash. replaceState: no
// afegeix entrades a l'historial ni recarrega.
function writeLangToUrl(lang) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(URL_LANG_PARAM, lang);
    window.history.replaceState(window.history.state, '', url);
  } catch (_) {
    // Sense History API: la pàgina funciona igual, només no es reflecteix a la URL
  }
}

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

async function switchLang(lang, { updateUrl = false } = {}) {
  if (!SUPPORTED.includes(lang)) return;

  try {
    currentStrings = await loadLocale(lang);
    applyStrings(currentStrings);
    document.documentElement.lang = lang;
    localStorage.setItem('uauu-lang', lang);
    if (updateUrl) writeLangToUrl(lang);

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
  const fromUrl = langFromUrl();
  const saved = localStorage.getItem('uauu-lang');
  const initial = fromUrl ?? (SUPPORTED.includes(saved) ? saved : DEFAULT_LANG);

  // Un ?lang= explícit també es desa encara que no calgui canviar res (p. ex.
  // ?lang=ca amb 'es' desat): gracies.html llegeix l'idioma d'aquí.
  if (fromUrl) {
    try {
      localStorage.setItem('uauu-lang', fromUrl);
    } catch (_) {
      // emmagatzematge bloquejat: l'idioma de la URL s'aplica igualment a aquesta visita
    }
  }

  // L'HTML ja porta els textos de l'idioma per defecte: no cal baixar el JSON
  // ni reescriure el DOM per tornar a posar el mateix.
  if (initial !== document.documentElement.lang) switchLang(initial);

  // Només el clic de l'usuari reescriu la URL; la càrrega inicial la deixa tal qual.
  document.querySelectorAll('.site-nav__lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchLang(btn.dataset.lang, { updateUrl: true }));
  });
}
