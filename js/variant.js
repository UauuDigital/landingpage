const DEFAULT_VARIANT = 'default';

// PAS 2: cada variant real viurà a variants/<nom>/ amb un stub index.html propi.
// Aquell stub és qui ha de dir a aquest mòdul compartit quina variant carregar
// (p.ex. amb <meta name="uauu-variant" content="nadal-2026"> al seu <head>,
// abans que main.js s'executi). Fins que el pas 2 existeixi, sempre és 'default'.
function resolveVariant() {
  const meta = document.querySelector('meta[name="uauu-variant"]');
  return meta?.content || DEFAULT_VARIANT;
}

async function loadVariant(name) {
  const res = await fetch(`variants/${name}.json`);
  if (!res.ok) throw new Error(`Variant not found: ${name}`);
  return res.json();
}

// Mateix patró que applyStrings() a lang.js, però amb tres atributs en lloc de
// dos: data-variant-src cobreix els assets (imatges), que l'i18n no gestiona.
function applyVariant(data) {
  document.querySelectorAll('[data-variant]').forEach((el) => {
    const key = el.dataset.variant;
    if (key in data) el.textContent = data[key];
  });

  document.querySelectorAll('[data-variant-html]').forEach((el) => {
    const key = el.dataset.variantHtml;
    if (key in data) el.innerHTML = data[key];
  });

  document.querySelectorAll('[data-variant-src]').forEach((el) => {
    const key = el.dataset.variantSrc;
    if (key in data) el.src = data[key];
  });
}

// S'ha d'esperar (await) abans d'initLang(): la variant fixa el contingut base
// (idioma per defecte, ca) i l'i18n hi aplica per sobre la traducció si cal.
// Si s'executessin en paral·lel, una resposta de xarxa endarrerida de l'una
// podria sobreescriure l'altra en qualsevol ordre. Vegeu _temp_variants-engine.md.
export async function initVariant() {
  const name = resolveVariant();
  try {
    const data = await loadVariant(name);
    applyVariant(data);
  } catch (err) {
    console.error('[variant]', err);
  }
}
