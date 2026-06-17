const COUNTRIES = [
  { flag: '🇪🇸', dial: '+34',  name: 'España / Spain' },
  { flag: '🇫🇷', dial: '+33',  name: 'France / França' },
  { flag: '🇩🇪', dial: '+49',  name: 'Germany / Alemania' },
  { flag: '🇬🇧', dial: '+44',  name: 'United Kingdom' },
  { flag: '🇮🇹', dial: '+39',  name: 'Italy / Italia' },
  { flag: '🇵🇹', dial: '+351', name: 'Portugal' },
  { flag: '🇺🇸', dial: '+1',   name: 'United States' },
  { flag: '🇲🇽', dial: '+52',  name: 'México' },
  { flag: '🇦🇷', dial: '+54',  name: 'Argentina' },
  { flag: '🇨🇱', dial: '+56',  name: 'Chile' },
  { flag: '🇨🇴', dial: '+57',  name: 'Colombia' },
  { flag: '🇧🇷', dial: '+55',  name: 'Brasil / Brazil' },
  { flag: '🇦🇺', dial: '+61',  name: 'Australia' },
  { flag: '🇨🇦', dial: '+1',   name: 'Canada' },
  { flag: '🇳🇱', dial: '+31',  name: 'Netherlands / Holanda' },
  { flag: '🇧🇪', dial: '+32',  name: 'Belgium / Bèlgica' },
  { flag: '🇨🇭', dial: '+41',  name: 'Switzerland / Suïssa' },
  { flag: '🇦🇹', dial: '+43',  name: 'Austria' },
  { flag: '🇸🇪', dial: '+46',  name: 'Sweden / Suècia' },
  { flag: '🇳🇴', dial: '+47',  name: 'Norway / Noruega' },
  { flag: '🇩🇰', dial: '+45',  name: 'Denmark / Dinamarca' },
  { flag: '🇫🇮', dial: '+358', name: 'Finland / Finlàndia' },
  { flag: '🇮🇪', dial: '+353', name: 'Ireland / Irlanda' },
  { flag: '🇳🇿', dial: '+64',  name: 'New Zealand' },
  { flag: '🇯🇵', dial: '+81',  name: 'Japan / Japó' },
  { flag: '🇨🇳', dial: '+86',  name: 'China' },
  { flag: '🇮🇳', dial: '+91',  name: 'India' },
  { flag: '🇷🇺', dial: '+7',   name: 'Russia / Rússia' },
  { flag: '🇸🇦', dial: '+966', name: 'Saudi Arabia / Aràbia Saudita' },
  { flag: '🇦🇪', dial: '+971', name: 'UAE / Emirats Àrabs' },
  { flag: '🇲🇦', dial: '+212', name: 'Morocco / Marroc' },
  { flag: '🇵🇱', dial: '+48',  name: 'Poland / Polònia' },
  { flag: '🇨🇿', dial: '+420', name: 'Czech Republic / Txèquia' },
  { flag: '🇭🇺', dial: '+36',  name: 'Hungary / Hongria' },
  { flag: '🇷🇴', dial: '+40',  name: 'Romania' },
  { flag: '🇬🇷', dial: '+30',  name: 'Greece / Grècia' },
  { flag: '🇹🇷', dial: '+90',  name: 'Turkey / Turquia' },
  { flag: '🇰🇷', dial: '+82',  name: 'South Korea / Corea' },
  { flag: '🇸🇬', dial: '+65',  name: 'Singapore / Singapur' },
];

export function initCountrySelector() {
  const btn = document.getElementById('country-selector');
  const dropdown = document.getElementById('country-dropdown');
  if (!btn || !dropdown) return;

  const searchInput = dropdown.querySelector('.country-search');
  const list = dropdown.querySelector('.country-list');
  let selectedFlag = '🇪🇸';
  let selectedDial = '+34';

  function renderList(filter = '') {
    const q = filter.toLowerCase().trim();
    const items = q
      ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q))
      : COUNTRIES;

    list.innerHTML = items.map(c => {
      const sel = (c.dial === selectedDial && c.flag === selectedFlag) ? ' is-selected' : '';
      return `<li role="option" class="country-item${sel}" data-dial="${c.dial}" data-flag="${c.flag}">` +
        `<span class="ci-flag">${c.flag}</span>` +
        `<span class="ci-dial">${c.dial}</span>` +
        `<span class="ci-name">${c.name}</span>` +
        `</li>`;
    }).join('');
  }

  function selectCountry(flag, dial) {
    selectedFlag = flag;
    selectedDial = dial;
    btn.querySelector('.cs-flag').textContent = flag;
    btn.querySelector('.cs-dial').textContent = dial;
    closeDropdown();
  }

  function openDropdown() {
    const lang = document.documentElement.lang || 'ca';
    if (searchInput) {
      searchInput.placeholder = { ca: 'Cercar...', es: 'Buscar...', en: 'Search...' }[lang] ?? 'Buscar...';
      searchInput.value = '';
    }
    renderList();
    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    searchInput?.focus();
  }

  function closeDropdown() {
    dropdown.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', () => {
    dropdown.hidden ? openDropdown() : closeDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!btn.closest('.country-selector-wrap').contains(e.target)) closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      closeDropdown();
      btn.focus();
    }
  });

  searchInput?.addEventListener('input', () => renderList(searchInput.value));

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.country-item');
    if (item) selectCountry(item.dataset.flag, item.dataset.dial);
  });
}
