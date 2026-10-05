const modal = document.getElementById('contact-modal');
const formCol = document.querySelector('.vb-footer__form-col');

if (modal && formCol && typeof modal.showModal === 'function') {
  const body = modal.querySelector('.vb-modal__body');
  let opener = null;

  // Un sol formulari (ids únics, js/form.js els busca per id): el modal el
  // "pren prestat" del peu mentre és obert i el torna al tancar-se.
  function open(trigger) {
    opener = trigger;
    body.append(...formCol.childNodes);
    modal.showModal();
    document.documentElement.classList.add('is-modal-open');
  }

  function restore() {
    if (modal.open || !opener) return;
    formCol.append(...body.childNodes);
    document.documentElement.classList.remove('is-modal-open');
    opener?.focus({ preventScroll: true });
    opener = null;
  }

  // Captura: ha d'anar abans del listener d'àncores de js/main.js.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="#contacte"]');
    if (!link || modal.open) return;
    e.preventDefault();
    e.stopPropagation();
    open(link);
  }, true);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let closing = false;

  // La sortida s'anima abans de tancar de debò: si es tanqués de cop, el
  // formulari tornaria al peu a mig fosa.
  function close() {
    if (closing || !modal.open) return;
    if (reduceMotion.matches) {
      modal.close();
      restore();
      return;
    }
    closing = true;
    modal.classList.add('is-closing');
    const finish = () => {
      clearTimeout(fallback);
      modal.removeEventListener('animationend', onEnd);
      modal.classList.remove('is-closing');
      closing = false;
      modal.close();
      restore();
    };
    const onEnd = (e) => { if (e.target === modal) finish(); };
    const fallback = setTimeout(finish, 600);
    modal.addEventListener('animationend', onEnd);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-modal-close]')) close();
  });

  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });

  modal.addEventListener('close', restore);
}
