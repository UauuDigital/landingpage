const INTERVAL = 7000;

function initReviews() {
  const root = document.querySelector('.vb-reviews');
  if (!root) return;

  const slides = [...root.querySelectorAll('.vb-reviews__slide')];
  const nav = root.querySelector('.vb-reviews__nav');
  const dots = [...root.querySelectorAll('.vb-reviews__dot')];
  if (slides.length < 2) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;
  let hovering = false;
  let visible = false;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, k) => {
      const on = k === index;
      slide.classList.toggle('is-active', on);
      slide.toggleAttribute('inert', !on);
      slide.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    dots.forEach((dot, k) => {
      const on = k === index;
      dot.classList.toggle('is-active', on);
      if (on) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  // Sense autoavanç si l'usuari prefereix menys moviment: només navegació manual.
  function start() {
    if (reduceMotion || timer || hovering || !visible || document.hidden) return;
    timer = setInterval(() => show(index + 1), INTERVAL);
  }

  function restart() {
    stop();
    start();
  }

  nav.addEventListener('click', (e) => {
    const dot = e.target.closest('.vb-reviews__dot');
    if (!dot) return;
    show(Number(dot.dataset.index));
    restart();
  });

  const stage = root.querySelector('.vb-reviews__stage');
  stage.addEventListener('mouseenter', () => { hovering = true; stop(); });
  stage.addEventListener('mouseleave', () => { hovering = false; start(); });
  root.addEventListener('focusin', () => { hovering = true; stop(); });
  root.addEventListener('focusout', () => { hovering = false; start(); });

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }).observe(root);

  show(0);
}

initReviews();
