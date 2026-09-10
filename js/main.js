import { initVariant } from './variant.js';
import { initLang } from './lang.js';
import { initForm } from './form.js';
import { initCountrySelector } from './phone.js';

// ── Scroll frame bus ──────────────────────────────────────────────────────────
// Efectes lligats a l'scroll (parallax) s'hi subscriuen en lloc de tenir cada un
// el seu rAF permanent: només s'executen quan el contingut realment es mou.

const scrollFrameListeners = new Set();

function onScrollFrame(fn) {
  scrollFrameListeners.add(fn);
}

function emitScrollFrame() {
  scrollFrameListeners.forEach((fn) => fn());
}

// ── Smooth scroll with inertia ────────────────────────────────────────────────

function initSmoothScroll() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (matchMedia('(pointer: coarse)').matches) return false; // native inertia on touch

  const el = document.getElementById('smooth-content');
  if (!el) return false;

  // El lerp de JS ja fa d'easing: amb scroll-behavior:smooth del CSS actiu, un
  // clic a un àncora s'animaria dues vegades (navegador + lerp) i quedaria lent.
  document.documentElement.style.scrollBehavior = 'auto';

  Object.assign(el.style, { position: 'fixed', top: '0', left: '0', width: '100%', willChange: 'transform' });

  const syncHeight = () => { document.body.style.height = el.scrollHeight + 'px'; };
  syncHeight();
  new ResizeObserver(syncHeight).observe(el);

  let currentY = window.scrollY;
  let targetY  = currentY;
  let rafId    = null;
  const EASE   = 0.06; // lower = heavier feel

  el.style.transform = `translateY(${-currentY}px)`;

  window.addEventListener('scroll', () => {
    targetY = window.scrollY;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }, { passive: true });

  // Anchor navigation: with position:fixed content, browser can't resolve #hash scrolls
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop, behavior: 'instant' });
    });
  });

  function tick() {
    currentY += (targetY - currentY) * EASE;
    el.style.transform = `translateY(${-currentY}px)`;
    if (Math.abs(targetY - currentY) > 0.2) {
      rafId = requestAnimationFrame(tick);
    } else {
      currentY = targetY;
      el.style.transform = `translateY(${-targetY}px)`;
      rafId = null;
    }
    emitScrollFrame();
  }

  return true;
}

// Sense smooth scroll (mòbil, reduced motion): el bus s'alimenta de l'scroll natiu
function initNativeScrollFrames() {
  let pending = false;
  window.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; emitScrollFrame(); });
  }, { passive: true });
}

// ── Nav: pill + scroll-linked slide ──────────────────────────────────────────

function initNav() {
  const nav  = document.querySelector('.site-nav');
  const hero = document.querySelector('.hero');
  if (!nav) return;

  const logo = nav.querySelector('.site-nav__logo');
  const lang = nav.querySelector('.site-nav__lang');
  let isScrolled  = false;
  let rafPending  = false;
  let lastScrollY = window.scrollY;

  function applyPill() {
    if (matchMedia('(max-width: 640px)').matches) return;
    logo.style.transform = '';
    lang.style.transform = '';

    const navRect  = nav.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const langRect = lang.getBoundingClientRect();

    const gap   = 32;
    const padH  = 24;
    const pillW = logoRect.width + gap + langRect.width + padH * 2;
    const pillLeft   = (navRect.width - pillW) / 2;
    const logoTarget = pillLeft + padH;
    const langTarget = pillLeft + padH + logoRect.width + gap;

    logo.style.transform = `translateX(${logoTarget - (logoRect.left - navRect.left)}px)`;
    lang.style.transform = `translateX(${langTarget - (langRect.left - navRect.left)}px)`;
    nav.style.setProperty('--pill-width', `${pillW}px`);
  }

  function resetPill() {
    logo.style.transform = '';
    lang.style.transform = '';
    nav.style.removeProperty('--pill-width');
  }

  function updateNav() {
    rafPending = false;

    const currentY    = window.scrollY;
    const scrollingDown = currentY > lastScrollY;
    lastScrollY = currentY;

    // Pill: appears after 20px scroll
    const nowScrolled = currentY > 20;
    if (nowScrolled !== isScrolled) {
      isScrolled = nowScrolled;
      nav.classList.toggle('is-scrolled', isScrolled);
      isScrolled ? applyPill() : resetPill();
    }

    // Hide on scroll-down once hero is gone; show again on scroll-up
    if (hero) {
      const heroBottom = hero.getBoundingClientRect().bottom;
      if (heroBottom > 0) {
        nav.classList.remove('is-hidden');
      } else if (scrollingDown) {
        nav.classList.add('is-hidden');
      } else {
        nav.classList.remove('is-hidden');
      }
    }
  }

  function onScroll() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateNav);
    }
  }

  updateNav();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (!rafPending) { rafPending = true; requestAnimationFrame(updateNav); }
  });
}

// ── Scroll reveal via IntersectionObserver ────────────────────────────────────

function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

// ── Services: drag-to-scroll + prev/next carousel ─────────────────────────────

function initServicesCarousel() {
  const grid = document.querySelector('.services__grid');
  if (!grid) return;

  let startX, scrollStart, velX, prevX, prevT, rafId;

  function coast() {
    velX *= 0.92;
    grid.scrollLeft -= velX;
    if (Math.abs(velX) > 0.5) {
      rafId = requestAnimationFrame(coast);
    } else {
      rafId = null;
    }
  }

  function onMove(e) {
    e.preventDefault();
    grid.scrollLeft = scrollStart - (e.pageX - startX);
    const now = performance.now();
    const dt  = now - prevT;
    if (dt > 0) velX = (e.pageX - prevX) / dt * 16;
    prevX = e.pageX;
    prevT = now;
  }

  function onUp() {
    grid.classList.remove('is-dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(coast);
  }

  grid.addEventListener('mousedown', (e) => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    grid.classList.add('is-dragging');
    startX = e.pageX;
    scrollStart = grid.scrollLeft;
    prevX = e.pageX;
    prevT = performance.now();
    velX = 0;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  grid.addEventListener('dragstart', (e) => e.preventDefault());

  // Prev / Next buttons
  function cardStep() {
    const card = grid.querySelector('.service-card');
    if (!card) return 320;
    return card.offsetWidth + parseFloat(getComputedStyle(grid).gap || '0');
  }

  document.getElementById('services-prev')?.addEventListener('click', () => {
    grid.scrollBy({ left: -cardStep(), behavior: 'smooth' });
  });

  document.getElementById('services-next')?.addEventListener('click', () => {
    grid.scrollBy({ left: cardStep(), behavior: 'smooth' });
  });
}

// ── CTA background parallax ───────────────────────────────────────────────────

function initCtaParallax() {
  const section = document.querySelector('.cta-section');
  const img     = section?.querySelector('.cta-section__bg');
  if (!section || !img) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let visible = false;

  function update() {
    if (!visible) return;
    const rect     = section.getBoundingClientRect();
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    const clamped  = Math.max(0, Math.min(1, progress));
    const offset   = (clamped - 0.5) * 110; // ±55px, within the 70px inset buffer
    img.style.transform = `scale(1.04) translateY(${offset}px)`;
  }

  onScrollFrame(update);

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    update();
  }, { threshold: 0 }).observe(section);
}

// ── Fitxa (Variant B): mapa interactiu de les finques ─────────────────────────
// Leaflet + OpenStreetMap, vendoritzat a js/vendor/leaflet/ (sense CDN, vegeu
// CLAUDE.md ## Stack). No-op silenciós a index.html (sense .fitxa__map).
//
// Diferit fins que la secció entra en viewport, mateix criteri que
// initReveal(): ni el JS de Leaflet ni els tiles han de competir amb el LCP
// del hero. Es carrega amb <link>/<script> injectats en diferit i resolts amb
// import.meta.url -- mateix mecanisme que loadVariant()/loadLocale() a
// variant.js/lang.js -- així funciona igual des de l'arrel que des de
// <arrel>/variante-b/ sense que build-variants.js hagi de reescriure cap
// ruta: no hi ha cap href/src estàtic a l'HTML, només aquesta crida JS.
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
      el.innerHTML = `
        <p class="map-popup__name">${venue.name}</p>
        <p class="map-popup__town">${venue.town}</p>
        <a href="#contacte" class="map-popup__cta">${cta}</a>
      `;
      // initSmoothScroll() només vincula els àncores presents al DOM en
      // arrencar: aquest enllaç neix més tard (Leaflet el crea en obrir el
      // popup), així que sense això el navegador feia el seu propi salt
      // natiu -- canviava location.hash però mai movia #smooth-content
      // (position:fixed), l'usuari es quedava mirant el mateix mapa.
      el.querySelector('.map-popup__cta').addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById('contacte');
        if (target) window.scrollTo({ top: target.offsetTop, behavior: 'instant' });
      });
      return el;
    });
    bounds.push([venue.lat, venue.lng]);
  });

  map.fitBounds(bounds, { padding: [28, 28] });
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
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' } // mateixos valors que initReveal()
  );

  observer.observe(container);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!initSmoothScroll()) initNativeScrollFrames();
  initNav();
  initReveal();
  initServicesCarousel();
  initCtaParallax();
  initFitxaMap();
  initForm();
  initCountrySelector();
  // Només variant → i18n depenen d'aquest ordre (la variant fixa el contingut
  // base abans que l'i18n hi apliqui la traducció per sobre, vegeu el comentari
  // a initVariant() a js/variant.js); la resta d'init no en depenen, per això
  // van abans de l'await i no queden endarrerides per la petició de xarxa.
  await initVariant();
  initLang();
});
