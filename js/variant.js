const DEFAULT_VARIANT = 'default';
const VARIANT_STORAGE_KEY = 'uauu_variant';

let cachedData = null;

// El stub generat per build-variants.js declara la seva variant amb
// <meta name="uauu-variant"> al <head> (injectat pel generador). Sense
// aquesta meta, som a l'arrel -> variant per defecte.
function resolveVariant() {
  const meta = document.querySelector('meta[name="uauu-variant"]');
  return meta?.content || DEFAULT_VARIANT;
}

// gracies.html importa el mateix js/main.js que la landing però no té cap
// element data-variant*: sense aquest guard hi faríem un fetch inútil i,
// pitjor, hi sobreescriuríem sessionStorage.uauu_variant (desat més avall)
// amb 'default' abans que gracies.html hagi pogut llegir el valor real.
function hasVariantContent() {
  return !!document.querySelector('[data-variant], [data-variant-html], [data-variant-src]');
}

// Els fetch() de mòduls ES resolen contra la URL del propi mòdul
// (import.meta.url), no contra la del document que l'ha importat. js/variant.js
// viu sempre a <arrel>/js/variant.js tant si l'importa l'index.html de l'arrel
// com un index.html generat a <arrel>/<variant>/ -- pujar un nivell des d'aquí
// porta sempre a l'arrel real del lloc, sigui quina sigui la profunditat de la
// pàgina que l'ha carregat. Evita els 404 des de subcarpeta sense dependre
// d'un <base href> (que també rebasejaria els àncores #contacte del hero).
function variantUrl(name) {
  return new URL(`../variants/${name}.json`, import.meta.url);
}

async function loadVariant(name) {
  const res = await fetch(variantUrl(name));
  if (!res.ok) throw new Error(`Variant not found: ${name}`);
  return res.json();
}

// Mateix patró que applyStrings() a lang.js, però cada clau porta un valor
// per idioma ({ca, es, en}) en lloc d'un de sol -- per això cal saber `lang`.
// Si la variant no en porta valor per a aquest idioma, es deixa el que ja hi
// hagi (el text que acaba d'aplicar l'i18n, o el que ja hi hagués).
function applyForLang(lang) {
  if (!cachedData) return;

  document.querySelectorAll('[data-variant]').forEach((el) => {
    const value = cachedData[el.dataset.variant]?.[lang];
    if (value != null) el.textContent = value;
  });

  document.querySelectorAll('[data-variant-html]').forEach((el) => {
    const value = cachedData[el.dataset.variantHtml]?.[lang];
    if (value != null) el.innerHTML = value;
  });

  document.querySelectorAll('[data-variant-src]').forEach((el) => {
    const value = cachedData[el.dataset.variantSrc]?.[lang];
    if (value != null) el.src = value;
  });
}

// Crida'l just després d'aplicar l'i18n d'un idioma nou (switchLang() a
// js/lang.js): la variant ha de guanyar sempre per sobre del text genèric
// que acaba de carregar l'i18n. Sense això, tornar a CAT (que recarrega
// ca.json) esborraria el copy de campanya. No-op si encara no hi ha variant
// carregada (p.ex. si loadVariant() ha fallat).
export function reapplyVariant(lang) {
  applyForLang(lang);
}

// Dada de sessió a Umami (no un event nou ni una segona pageview): permet
// comparar visites i conversions per variant al dashboard sense tocar
// l'auto-track del script d'Umami. Vegeu _temp_variants-generator.md sobre
// per què s'ha triat identify() i no data-auto-track="false".
function tagUmamiSession(name) {
  try {
    if (typeof umami !== 'undefined' && typeof umami.identify === 'function') {
      umami.identify({ variant: name });
    }
  } catch (_) {
    // El tracking mai ha de trencar la pàgina
  }
}

export async function initVariant() {
  if (!hasVariantContent()) return;

  const name = resolveVariant();

  try {
    sessionStorage.setItem(VARIANT_STORAGE_KEY, name);
  } catch (_) {
    // sessionStorage pot fallar (navegació privada, etc.): gracies.html farà
    // servir el seu propi valor per defecte per a l'event de conversió
  }

  tagUmamiSession(name);

  try {
    cachedData = await loadVariant(name);
    // Les pàgines generades ja porten el copy de la variant "cuit" en cru a
    // l'HTML (idioma ca): aquesta crida hi torna a aplicar el mateix valor
    // (idempotent) per mantenir un únic camí de codi entre l'arrel i les
    // variants generades, i és qui de debò aplica la variant quan encara no
    // hi ha HTML generat (p.ex. en desenvolupament, servint des de l'arrel).
    applyForLang('ca');
  } catch (err) {
    console.error('[variant]', err);
  }
}
