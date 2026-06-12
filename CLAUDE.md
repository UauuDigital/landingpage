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
css/base.css         # Reset + estils globals
css/layout.css       # Estructura de seccions, grid, responsive
css/components.css   # Nav, botons, cards, formulari, hero-card
css/animations.css   # Reveal en scroll, parallax, prefers-reduced-motion
js/main.js           # Init: nav scroll, IntersectionObserver reveal, scatter parallax, venue tabs
js/form.js           # Validació + enviament formulari (fetch POST a /api/contact)
js/lang.js           # Switch CAT / ESP / ENG, càrrega de locales/
locales/ca.json      # Tots els textos en català (idioma per defecte i font de veritat)
locales/es.json      # Castellà
locales/en.json      # Anglès
assets/images/       # Buit al repo (assets a https://uauu.cat/media/)
```

## Estructura CSS (ordre d'importació)
tokens → base → layout → components → animations

## Marca UAUU
- To: premium, càlid, modern. Mai genèric.
- Paleta: `--color-text` #1a1714 | `--color-bg` #ffffff | `--color-surface` #f5f2ee | `--color-accent` #c8b89a
- Tipografia: Playfair Display (serif) per a titulars · Inter per a cos
- Les 4 finques: Ca n'Alzina · Can Macià · Castell de Tous · Mas Vivens

## Seccions (ordre al DOM)
1. **Hero** (#inici) — full-viewport, headline, floating card
2. **Manifesto** — "Casaments únics en espais únics." + fotos escampades amb parallax
3. **Services** (#serveis) — grid 4 col
4. **CTA / Form** (#contacte) — tabs de finques + formulari de contacte
5. **Footer** — fons fosc, logo, drets, links legals

## Multiidioma
- Textos externalitzats a `locales/{ca,es,en}.json`
- Cada element visible amb `data-i18n="clau"` (o `data-i18n-html` per HTML ric)
- Idioma per defecte: català. Es guarda a `localStorage('uauu-lang')`
- Quan s'afegeix una clau nova: actualitzar els **tres** fitxers JSON simultàniament

## Imatges
- Tots els assets a CDN extern: `https://uauu.cat/media/`
- Cap imatge al repo. Format WebP preferit.
- `loading="lazy"` en totes excepte hero (que porta `fetchpriority="high"`)
- Convenció de noms: `[seccio]-[descripcio]-[amplada].webp` (ex: `hero-canalizna-1920.webp`)

## Formulari
- Camps: nom, cognoms, correu, telèfon, data prevista, convidats, finca (hidden), privacitat
- Validació client-side a `js/form.js`. Endpoint: constant `ENDPOINT` a l'inici del fitxer.
- Estat d'error: classe `.is-error` sobre l'input

## Convencions de codi
- IDs de seccions: #inici, #serveis, #contacte
- Classes BEM simplificat: `.hero__title`, `.card--active`, etc.
- Cap JS inline al HTML (ni onclick, ni oninput)
- Cap comentari tret que el PER QUÈ no sigui obvi
- CSS custom properties per a tots els valors — mai hardcoded