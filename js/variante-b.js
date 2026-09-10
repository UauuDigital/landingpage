// ── JS específic d'index-b.html (Variant B) ───────────────────────────────
// Es carrega NOMÉS des d'aquesta plantilla, mai des de js/main.js: el JS
// compartit no ha de conèixer seccions que només existeixen en una variant
// concreta (vegeu CLAUDE.md ## Variants). Amb més plantilles pròpies, cada
// una hi tindria el seu propi mòdul equivalent.

// ── Fitxa: mapa interactiu de les finques ─────────────────────────────────
// Leaflet + OpenStreetMap, vendoritzat a js/vendor/leaflet/ (sense CDN, vegeu
// CLAUDE.md ## Stack).
//
// Diferit fins que la secció entra en viewport, mateix criteri que
// initReveal() a main.js: ni el JS de Leaflet ni els tiles han de competir
// amb el LCP del hero. Es carrega amb <link>/<script> injectats en diferit i
// resolts amb import.meta.url -- mateix mecanisme que loadVariant()/
// loadLocale() a variant.js/lang.js -- així funciona igual des de l'arrel
// que des de <arrel>/variante-b/ sense que build-variants.js hagi de
// reescriure cap ruta: no hi ha cap href/src estàtic a l'HTML, només aquesta
// crida JS.
const FITXA_VENUES = [
  { name: "Can Macià",       town: 'Òdena',                 lat: 41.5980211, lng: 1.6563518 },
  { name: "Ca n'Alzina",     town: 'Rubió',                 lat: 41.640489,  lng: 1.5645722 },
  { name: 'Mas Vivencs',     town: 'La Pobla de Claramunt', lat: 41.5548048, lng: 1.6830515 },
  { name: 'Castell de Tous', town: 'Sant Martí de Tous',    lat: 41.5594685, lng: 1.5252126 },
];

// Els noms de finca no es tradueixen (fet de marca, vegeu CLAUDE.md ##
// Variants), però l'enllaç del popup sí -- bindPopup() accepta una funció que
// Leaflet crida cada vegada que s'obre el popup, no només un cop en bind-time,
// així que llegir document.documentElement.lang (que js/lang.js ja manté
// sincronitzat) hi basta: no cal cap fil entre aquest mòdul i switchLang().
const FITXA_MAP_CTA = {
  ca: 'Demana informació',
  es: 'Pide información',
  en: 'Ask for information',
};

let leafletPromise = null;

function loadLeaflet() {
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('vendor/leaflet/leaflet.css', import.meta.url);
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = new URL('vendor/leaflet/leaflet.js', import.meta.url);
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

async function buildFitxaMap(container) {
  let L;
  try {
    L = await loadLeaflet();
  } catch (err) {
    console.error('[fitxa-map]', err);
    return; // l'estat neutre de .fitxa__map-canvas es queda tal qual
  }

  const isCoarsePointer = matchMedia('(pointer: coarse)').matches;

  const map = L.map(container, {
    scrollWheelZoom: false, // no "roba" el scroll de la roda al passar-hi per sobre
    dragging: !isCoarsePointer,
    keyboard: false, // el mapa és aria-hidden (vegeu index-b.html): fora del tab order
    zoomControl: false, // sense botons +/- (_ref_fitxa.png no en porta); pinch i dobleclic segueixen actius
  });

  // Mòbil: un dit fa scroll de la pàgina (dragging queda desactivat i Leaflet
  // no intercepta el touchmove); només dos dits arrosseguen el mapa. Sense
  // això, un mapa a amplada completa atraparia el gest de baixar la pàgina.
  if (isCoarsePointer) {
    const setDragging = (e) => {
      map.dragging[e.touches.length > 1 ? 'enable' : 'disable']();
    };
    container.addEventListener('touchstart', setDragging, { passive: true });
    container.addEventListener('touchend', setDragging, { passive: true });
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // Treu el crèdit "Leaflet" que Leaflet afegeix per defecte al control
  // d'atribució (leafletjs.com): zero fugues, només queda l'atribució
  // d'OSM, que sí és requisit de llicència (vegeu CLAUDE.md ## Variants).
  map.attributionControl.setPrefix(false);

  const icon = L.divIcon({
    className: 'map-marker-wrap',
    html: '<span class="map-marker"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });

  const bounds = [];
  FITXA_VENUES.forEach((venue) => {
    L.marker([venue.lat, venue.lng], { icon, keyboard: false }).addTo(map).bindPopup(() => {
      const lang = document.documentElement.lang;
      const cta  = FITXA_MAP_CTA[lang] || FITXA_MAP_CTA.ca;
      const el   = document.createElement('div');
      el.className = 'map-popup';
      // L'enllaç és un <a href="#contacte"> normal: el listener delegat
      // d'initSmoothScroll() a main.js (document.addEventListener('click', ...))
      // ja el recull encara que Leaflet el creï després de l'arrencada --
      // no cal cap handler propi aquí.
      el.innerHTML = `
        <p class="map-popup__name">${venue.name}</p>
        <p class="map-popup__town">${venue.town}</p>
        <a href="#contacte" class="map-popup__cta">${cta}</a>
      `;
      return el;
    });
    bounds.push([venue.lat, venue.lng]);
  });

  map.fitBounds(bounds, { padding: [28, 28] });

  // .fitxa__map ja no té una alçada fixa a desktop: s'estira per igualar
  // la de .fitxa__content (vegeu variante-b.css). Leaflet només mesura el
  // contenidor un cop, a L.map(); si l'alçada canvia després -- finestra
  // redimensionada, o un canvi d'idioma que allarga/escurça el text i
  // altera l'alçada de les targetes -- els tiles es quedarien mal
  // retallats fins que l'usuari interactués amb el mapa. invalidateSize()
  // el torna a mesurar.
  new ResizeObserver(() => map.invalidateSize()).observe(container);
}

function initFitxaMap() {
  const container = document.querySelector('.fitxa__map-canvas');
  if (!container) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      buildFitxaMap(container);
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' } // mateixos valors que initReveal() a main.js
  );

  observer.observe(container);
}

// ── Finques: no navegar en acabar un arrossegament ────────────────────────
// A index.html les cards del carrusel son <article>; aquí cada card és un
// <a href="#contacte"> sencer, i sense això qualsevol arrossegament acabaria
// obrint l'enllaç en deixar anar el botó. La distància es mesura aquí i no
// es reaprofita la d'initServicesCarousel() (js/main.js) perquè viu dins del
// seu closure -- i el JS compartit no s'ha de tocar per una particularitat
// d'aquesta variant. El listener va en fase de captura: ha d'arribar abans
// que l'<a>.
const FINQUES_DRAG_THRESHOLD = 5; // px; per sota, és un clic amb pols tremolós

function initFinquesDragGuard() {
  const grid = document.querySelector('.finques .services__grid');
  if (!grid) return;

  let downX = null;
  let dragged = false;

  grid.addEventListener('mousedown', (e) => {
    downX = e.clientX;
    dragged = false;
  });

  grid.addEventListener('mousemove', (e) => {
    if (downX !== null && Math.abs(e.clientX - downX) > FINQUES_DRAG_THRESHOLD) {
      dragged = true;
    }
  });

  document.addEventListener('mouseup', () => {
    downX = null;
  });

  grid.addEventListener(
    'click',
    (e) => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    },
    true
  );
}

document.addEventListener('DOMContentLoaded', () => {
  initFitxaMap();
  initFinquesDragGuard();
});
