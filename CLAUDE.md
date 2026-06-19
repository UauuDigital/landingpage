# UAUU Landing Page — Context per Claude Code

## Projecte
Landing page de UAUU Weddings & Events.
Estàtica, sense frameworks, desplegada a Plesk/Servàtica via FTP.

## Stack
- HTML5 semàntic, CSS custom (sense Tailwind ni Bootstrap), JS vanilla (ES modules)
- Sense npm, sense bundler, sense dependències externes
- Fitxers servits directament, compatible amb qualsevol navegador modern

## Estructura de fitxers
```
index.html           # Entrada única. Totes les seccions aquí.
css/tokens.css       # Variables: colors, fonts, spacing. RES es defineix fora d'aquí.
css/base.css         # Reset + estils globals (inclou .sr-only i .skip-link)
css/layout.css       # Estructura de seccions, grid, responsive
css/components.css   # Nav, botons, cards, formulari, hero-card
css/animations.css   # Reveal en scroll, parallax, prefers-reduced-motion
js/main.js           # Init: smooth scroll, nav pill, reveal, services carousel, CTA parallax
js/form.js           # Validació + reCAPTCHA invisible + submit natiu al CRM
js/lang.js           # Switch CA / ES / EN, càrrega de locales/, aria-pressed
js/phone.js          # Selector de prefix telefònic (cerca + navegació amb teclat)
locales/ca.json      # Tots els textos en català (idioma per defecte i font de veritat)
locales/es.json      # Castellà
locales/en.json      # Anglès
logos/               # Logos UAUU.png, CA.png, CT.png, CM.png, MV.png
fonts/               # Ogg-Medium.woff2 + Inter-Variable.woff2 (variable)
assets/              # Buit al repo (assets a https://uauu.cat/media/)
favicon.ico
```

## Estructura CSS (ordre d'importació)
tokens → base → layout → components → animations

## Marca UAUU
- To: premium, càlid, modern. Mai genèric.
- Paleta: `--color-text` #1a1714 | `--color-bg` #ffffff | `--color-surface` #f5f2ee | `--color-accent` #c8b89a
- Tipografia: **Ogg** (serif custom, `--font-serif`) per a titulars · **Inter** (variable, `--font-sans`) per a cos
- Les 4 finques: Ca n'Alzina · Can Macià · Castell de Tous · Mas Vivens

## Seccions (ordre al DOM)
1. **Hero** (#inici) — full-viewport, imatge de fons, headline, hero-card flotant (foto + CTA → #contacte)
2. **Manifesto** — headline gran + 10 fotos escampades (posicions a `layout.css`, rotació via `--rot`). Sense drift JS; amaga't amb `prefers-reduced-motion`.
3. **Services** (#serveis) — carrusel horitzontal de 6 cards (drag + prev/next), no grid fix
4. **CTA / Form** (#contacte) — imatge de fons amb parallax, logos de les 4 finques, formulari de contacte

No hi ha footer.

## Scroll suau (desktop)
`initSmoothScroll()` a `js/main.js`: en desktop (no touch), posa `#smooth-content` en `position: fixed` i anima `translateY` via rAF (EASE = 0.06). Pausat en mòbil/touch. Tot el contingut visible és dins `#smooth-content`; els àncors interns es gestionen via JS.

## Multiidioma
- Textos externalitzats a `locales/{ca,es,en}.json`
- Cada element visible amb `data-i18n="clau"` (o `data-i18n-html` per HTML ric)
- Idioma per defecte: català. Detecció automàtica per `navigator.language`. Es guarda a `localStorage('uauu-lang')`
- Lang buttons: `aria-pressed="true/false"` (no `aria-current`)
- Quan s'afegeix una clau nova: actualitzar els **tres** fitxers JSON simultàniament

## Imatges
- Tots els assets a CDN extern: `https://uauu.cat/media/` (alguns `https://www.uauu.cat/media/`)
- Cap imatge al repo. Format WebP preferit.
- `loading="lazy"` en totes excepte la imatge hero (que porta `loading="eager"` + `fetchpriority="high"`)
- Estructura real del CDN: `finques/{nom-finca}/{galeria-dimatges|cerimonia|allotjament}/{n}.webp` | `general/{gastronomia|dj}/{n}.webp`

## Formulari
- Camps visibles: first_name, last_name, email1, phone_mobile (+ country selector prefix), data del casament, num_diners_c, privacy (checkbox)
- La data del casament és un input de display (`id="date_display"`, **sense `name`**, no s'envia sol). El seu valor es concatena dins el camp `description` a `js/form.js` (`Data del casament: …`). No existeix cap camp `event_date_c`; la data viatja dins `description` de forma intencionada.
- Camps hidden: campaign_id, redirect_url, assigned_user_id, moduleDir, event_type_c, lead_source, idioma_contacto_c (sincronitzat amb l'idioma actiu), description
- Honeypot antispam: `name="hp_website"` visible·ment ocult. `js/form.js` aborta el submit (silenciosament) si el camp ve omplert.
- Validació client-side a `js/form.js`: classe `.is-error` sobre l'input o `.form-footer`
- Submissió: reCAPTCHA invisible (Google) → callback `window.enviarAlCRM` → submit natiu POST a `https://crm.espaigastronomia.cat/index.php?entryPoint=WebToPersonCapture`
- **No** és un fetch; és submit natiu del formulari

## Accessibilitat
- Skip link: `<a href="#inici" class="sr-only skip-link">` (visible en focus)
- `.sr-only` definit a `css/base.css`
- Tots els camps del formulari tenen `<label class="sr-only" for="...">` (sincronitzat amb i18n)
- Nav lang: `role="group"` + `aria-label` + `aria-pressed` per botó
- Fotos decoratives: `alt=""` + `aria-hidden="true"` al contenidor

## Convencions de codi
- IDs de seccions: #inici, #serveis, #contacte
- Classes BEM simplificat: `.hero__title`, `.card--active`, etc.
- Cap JS inline al HTML (ni onclick, ni oninput)
- Cap comentari tret que el PER QUÈ no sigui obvi
- CSS custom properties per a tots els valors — mai hardcoded
- Paths relatius a tot arreu (logos/, fonts/, locales/) — mai root-relative (/logos/) perquè el site pot estar en subdirectori
