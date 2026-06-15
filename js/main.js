import { initLang } from './lang.js';
import { initForm } from './form.js';

// ── Smooth scroll with inertia ────────────────────────────────────────────────

function initSmoothScroll() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(pointer: coarse)').matches) return; // native inertia on touch

  const el = document.getElementById('smooth-content');
  if (!el) return;

  Object.assign(el.style, { position: 'fixed', top: '0', left: '0', width: '100%' });

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
      window.scrollTo(0, target.offsetTop);
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
  }
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

  let rafId   = null;

  function tick() {
    const rect     = section.getBoundingClientRect();
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    const clamped  = Math.max(0, Math.min(1, progress));
    const offset   = (clamped - 0.5) * 110; // ±55px, within the 70px inset buffer
    img.style.transform = `scale(1.04) translateY(${offset}px)`;
    rafId = requestAnimationFrame(tick);
  }

  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !rafId)  { rafId = requestAnimationFrame(tick); }
    if (!entries[0].isIntersecting && rafId)  { cancelAnimationFrame(rafId); rafId = null; }
  }, { threshold: 0 }).observe(section);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initNav();
  initReveal();
  initServicesCarousel();
  initCtaParallax();
  initLang();
  initForm();
});
