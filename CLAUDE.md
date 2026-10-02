# UAUU Landing Page — Context per Claude Code

## Projecte
Landing page de UAUU Weddings & Events.
Estàtica, sense frameworks, desplegada a Plesk/Servàtica via FTP.
URL de producció: `https://www.uauu.cat/welcome/` (el site NO viu a l'arrel del domini — per això tots els paths són relatius, mai root-relative).

## Stack
- HTML5 semàntic, CSS custom (sense Tailwind ni Bootstrap), JS vanilla (ES modules)
- Sense npm, sense bundler, sense dependències externes
- Fitxers servits directament, compatible amb qualsevol navegador modern

## Estructura de fitxers
```
index.html           # La home (calc de palette.eco, vegeu ### Home): entrada única i plantilla per defecte.
index-b.html         # Plantilla de la Variant B = la landing anterior (hero + serveis + CTA/form, vegeu ## Seccions i ## Variants)
gracies.html         # Pàgina de gràcies. Destí del redirect_url del CRM tras enviar el formulari.
css/tokens.css       # Variables: colors, fonts, spacing. RES es defineix fora d'aquí.
css/base.css         # Reset + estils globals (inclou .sr-only i .skip-link)
css/layout.css       # Estructura de seccions, grid, responsive
css/components.css   # Nav, botons, cards, formulari, hero-card
css/animations.css   # Reveal en scroll, parallax, prefers-reduced-motion
css/gracies.css      # Estils propis de gracies.html, aïllats (no toca la resta del sistema)
css/home.css         # Estils propis d'index.html (la home), aïllats igual que gracies.css (prefix de classes .vb-: històric, de quan era la Variant B)
js/main.js           # Init: smooth scroll, bus de frames d'scroll, nav pill, reveal, services carousel, CTA parallax
js/form.js           # Validació + reCAPTCHA invisible (carregat en diferit) + submit natiu al CRM
js/lang.js           # Switch CA / ES / EN, càrrega de locales/, aria-pressed
js/variant.js        # Motor de variants de campanya (vegeu ## Variants)
js/phone.js          # Selector de prefix telefònic (cerca + navegació amb teclat)
js/home-resenyes.js  # Fundit de ressenyes de la home (només l'hi carrega index.html)
locales/ca.json      # Tots els textos en català (idioma per defecte i font de veritat)
locales/es.json      # Castellà
locales/en.json      # Anglès
variants/default.json    # Contingut variable de l'arrel (mateixos valors que index.html, la home)
variants/variante-b.json # Variant B = landing anterior (template: index-b.html) → /welcome/variante-b/
variants/_ejemplo.json   # Referència del format d'una variant — el "_" fa que el generador l'ignori
build-variants.js    # Generador estàtic de pàgines de variant (vegeu ## Variants)
logos/               # Logos UAUU.png, CA.png, CT.png, CM.png, MV.png
                     # Peu de la home: UAUU_logotip_negre.svg (només UAUU); UAUU_lletra_negra_estret.svg és el lockup complet amb tagline, ambdós extrets de UAUU.svg (logo vectorial original)
fonts/               # Ogg-Medium.woff2 + Inter-Variable-latin.woff2 (variable, subset llatí)
assets/              # Buit al repo (assets a https://uauu.cat/media/)
favicon.ico
```

## Estructura CSS (ordre d'importació)
tokens → base → layout → components → animations

## Marca UAUU
- To: premium, càlid, modern. Mai genèric.
- Paleta: `--color-text` #1a1714 | `--color-bg` #ffffff | `--color-surface` #f5f5f5 | `--color-accent` #c8b89a
- Tipografia: **Ogg** (serif custom, `--font-serif`) per a titulars · **Inter** (variable, `--font-sans`) per a cos
- Les 4 finques: Ca n'Alzina · Can Macià · Castell de Tous · Mas Vivencs

## Seccions de la Variant B (ordre al DOM; plantilla `index-b.html`, la landing anterior)
1. **Hero** (#inici) — full-viewport, imatge de fons, headline, hero-card flotant (foto + CTA → #contacte)
2. **Services** (#serveis) — carrusel horitzontal de 6 cards (drag + prev/next), no grid fix
3. **CTA / Form** (#contacte) — imatge de fons amb parallax, logos de les 4 finques, formulari de contacte

No hi ha footer.

## Scroll suau (desktop)
`initSmoothScroll()` a `js/main.js`: en desktop (no touch), posa `#smooth-content` en `position: fixed` i anima `translateY` via rAF (EASE = 0.06). Pausat en mòbil/touch. Tot el contingut visible és dins `#smooth-content`; els àncors interns es gestionen via JS.
- Quan el smooth scroll JS és actiu, es força `scroll-behavior: auto` a `<html>` (el `smooth` de `base.css` només serveix per a mòbil/reduced-motion): si no, els àncors s'animarien dues vegades.
- **Bus de frames d'scroll** (`onScrollFrame` a `js/main.js`): els efectes lligats a l'scroll (parallax del CTA) s'hi subscriuen i només s'executen quan el contingut es mou (cada tick del lerp, o cada event `scroll` natiu en mòbil). No crear rAF permanents per a efectes nous: subscriure'ls al bus.

## Multiidioma
- Textos externalitzats a `locales/{ca,es,en}.json`
- Cada element visible amb `data-i18n="clau"` (o `data-i18n-html` per HTML ric)
- Idioma per defecte: català. Detecció automàtica per `navigator.language`. Es guarda a `localStorage('uauu-lang')`
- **Idioma a la URL (`?lang=ca|es|en`, a `js/lang.js`)**: té prioritat sobre l'idioma desat; un valor no vàlid s'ignora. Un `?lang=` explícit també es desa a `localStorage`, perquè `gracies.html` (que neteja la URL) llegeix l'idioma d'allà. Només el clic d'un botó d'idioma reescriu la URL (`replaceState`, conservant `utm_*` i el hash, sense afegir entrades a l'historial); la càrrega inicial mai la toca. Ordre: URL > `localStorage` > català. Nota: el codi NO fa cap detecció per `navigator.language` malgrat el que diu la línia anterior: sense res desat i sense `?lang=`, és català.
- Si l'idioma inicial coincideix amb el `lang` de `<html>` (català), `initLang()` no baixa el JSON ni toca el DOM: l'HTML ja porta aquests textos. Per això l'HTML i `ca.json` han d'estar sempre sincronitzats.
- Lang buttons: `aria-pressed="true/false"` (no `aria-current`)
- Quan s'afegeix una clau nova: actualitzar els **tres** fitxers JSON simultàniament

## Variants
Sistema de variants de contingut per campanya (Meta/Google Ads, promos estacionals), sense duplicar mai CSS/JS — només el contingut (i, si cal, el DOM) canvia.

- `index.html` és la plantilla de DOM per defecte. `variants/<nom>.json` conté el contingut que substitueix la campanya per defecte; `variants/default.json` són els valors actuals de `index.html` (no genera cap pàgina, l'aplica en temps real `js/variant.js` a l'arrel).
- Format de cada JSON: una clau plana per string de campanya, valor `{ "ca": "...", "es": "...", "en": "..." }` (una entrada per idioma, com `locales/`). Claus especials, planes (no per idioma): `meta.title` i `meta.description` (per al `<title>`/`og:title`/`twitter:title` i `meta description`/`og:description`/`twitter:description` de la pàgina generada), i `template` (vegeu més avall).
- `"template": "<fitxer>.html"` (opcional): plantilla que fa servir aquesta variant, en lloc d'`index.html`. El fitxer ha d'existir a l'arrel del repo (mateix nivell que `index.html`) i tenir extensió `.html`; si no, `build-variants.js` para amb error abans d'escriure res. Sense aquesta clau: `index.html`, tal com sempre. Una plantilla nova pot tenir seccions/DOM diferents, però ha de reutilitzar sempre `css/`, `js/` i les fonts compartides — mai el seu propi CSS/JS — i seguir servint-se dels mateixos atributs `data-variant`/`data-variant-html`/`data-variant-src` per al contingut que hagi de variar. `variants/_ejemplo.json` mostra el format exacte (JSON no admet comentaris).
- **Requisit, no recomanació**: qualsevol plantilla (`index.html` o una pròpia) ha de portar, literalment i amb el mateix ordre d'atributs, el bloc `<head>` d'`index.html` que `build-variants.js` sap reescriure: `<meta charset="UTF-8" />` exacte, `<title>`, `<meta name="description">`, `og:title`/`og:description`/`og:image`/`og:url`, `twitter:title`/`twitter:description`/`twitter:image`, `<link rel="canonical">` i `<link rel="preload" as="image">` del hero. `build-variants.js` ho valida abans d'escriure res (i també amb `--check`, sense regenerar): si no troba algun d'aquests tags exactament, para amb `exit 1` i diu quin tag falta i a quina plantilla — mai degrada en silenci.
- El JS propi d'una plantilla de variant (si en necessita) viu en el seu propi mòdul, carregat només des d'aquesta plantilla — mai a `js/main.js`, que és compartit amb `index.html`.
- Claus de contingut variables a `index-b.html` (la landing anterior; les úniques que hi porten `data-variant`/`data-variant-html`/`data-variant-src`): `hero.headline`, `hero.bg`, `hero.card.image`, `hero.card.label`, `hero.card.cta`, `cta.headline`, `cta.bg`. La resta (nav, logos de finques, secció de serveis, estructura del formulari) és estructural i mai varia per campanya. Una plantilla pròpia pot declarar les seves pròpies claus variables amb els mateixos atributs; `index.html` (la home) en declara moltes més, vegeu `variants/default.json`.
- Fitxers `variants/_*.json` (p.ex. `_ejemplo.json`) són de referència, no desplegables: el generador els ignora.
- **En temps real** (`js/variant.js`): llegeix `<meta name="uauu-variant">` del `<head>` (el posa `build-variants.js` a les pàgines generades; sense meta, és la variant `default`), aplica el contingut en `ca` i es torna a aplicar (`reapplyVariant()`) just després de cada canvi d'idioma des de `js/lang.js` — la variant sempre guanya per sobre de l'i18n genèric, també en tornar a CAT. També desa `sessionStorage['uauu_variant']`, que `gracies.html` llegeix per etiquetar l'event `lead_created` d'Umami amb la variant d'origen (la pageview de la landing ja queda etiquetada sola: cada variant té la seva pròpia URL).
- **`node build-variants.js`**: per cada `variants/<nom>.json` (excepte `default.json` i els `_*`), genera `<nom>/index.html` a partir de la SEVA plantilla (`template`, o `index.html` per defecte) — plantilla + JSON ja resolts: copy en ca cuit al DOM, `<title>`/meta/OG/Twitter i el preload del hero coherents amb la variant, totes les rutes relatives reescrites amb `../`. Sense npm, sense dependències. Les carpetes generades no es versionen (porten el seu propi `.gitignore`) i no s'editen mai a mà.
- **Pas obligatori abans de cada pujada per FTP**: `node build-variants.js --check` (exit 0 si tot està al dia, 1 si la plantilla d'una variant — la seva pròpia, no necessàriament `index.html` — o el seu `variants/<nom>.json` ha canviat des de l'última generació — en aquest cas, `node build-variants.js` i tornar a comprovar).

### Home — calc de palette.eco (`index.html`)
Reconstruïda des de zero (oct. 2026) calcant l'estil de la home de https://www.palette.eco/ amb les tipografies de UAUU (Ogg per al seu serif, Inter per a la seva sans/mono). Plantilla `index.html` + `css/home.css`; JSON `variants/default.json`. **Fins al 2 oct. 2026 es deia Variant B**: aquell dia es va intercanviar amb la landing anterior, que ara és la Variant B (`index-b.html` + `variants/variante-b.json`, a `/welcome/variante-b/`). JS propi només per a les ressenyes: `js/home-resenyes.js` (mòdul carregat NOMÉS des d'`index.html`; la versió anterior de JS d'aquesta variant era per al mapa Leaflet i s'ha eliminat junt amb `js/vendor/`).

- **Sense menú**: només el logo UAUU dins el hero — centrat a desktop; per sota de 1024px passa a l'esquerra, alineat amb el titular, i el selector d'idioma (`.vb-header__lang`, també al peu) a la dreta, perquè centrat el logo quedava enganxat al selector (`.vb-header`, a propòsit sense `.site-nav` perquè `initNav()` no hi enganxi la pill de la landing anterior, `index-b.html`). El selector d'idioma viu a la fila inferior del peu (mateix lloc que el "Language" de la referència), amb les mateixes classes `.site-nav__lang-btn` que busca `js/lang.js`.
- **Unitat fluida `--u`**: la referència escala tot amb el font-size de `<html>` (1rem = 10px a 1440px en desktop i a 375px en mòbil, tall a 1024px). Aquí NO es toca `html { font-size }` (el formulari i el selector de prefix de `components.css` en depenen): `--u` (0.6944vw / 2.6667vw, a `.vb`) la replica, i cada mida N rem de la referència és `calc(N * var(--u))`. A 1920px coincideix al píxel (contingut 1745, cercles 267, meitats 866).
- Ordre de seccions (nom del component de la referència entre parèntesis): 1. Hero (`intro`) · 2. Valors 01–04 amb les dades de la fitxa (`brandValues`) · 3. Les finques: títol gegant + 4 cercles amb foto i segona foto en hover (`newDrops`/`dropsList`) · 4. Missió (`textWithTitle`) · 5. Foto + panell sorra (`leftRight`) · 6. "Sí, vull": titular gegant + 4 línies + CTA (`titleTextCTA`) · 7. Text sobre foto + foto (`textImageCTA`/`singleImage`) · 8. Logos de les 4 finques (`brandReferences`) · 9. Galeria 2×2 + panell accent (`fourImages`/`textColorLink`) · 10. Ressenyes (sense equivalent a la referència: 3 cites en serif centrades, amb miniatura rodona de la parella a la firma (avatar), que s'alternen amb fundit de 0.9s, autoavanç cada 7s amb pausa en hover/focus i sense autoavanç amb `prefers-reduced-motion`, navegació 01/02/03; 13 ressenyes reals intercalades entre finques, claus `resenyes.1..13.{text,autor}`; ES és l'original, CA/EN són traduccions pendents de revisió) · 11. Peu = `#contacte`: el mateix `<form>` d'`index.html` (restil a `variante-b.css`, js/form.js sense tocar) + columnes de text pla + marca gegant + fila inferior amb idioma.
- Desviacions conscients de la referència: CTA del hero fosc com la resta, amb versaletes més espaiades (0.16em) i una mica més gran, com a contrapunt del titular serif; vel suau al hero i al text sobre foto; títol "Sí, vull" a 13u en mòbil (no 25u: les paraules no hi caben); totes les sortides de la referència (Instagram, newsletter, columnes d'enllaços) són CTA a `#contacte` o text pla; sense el cercle de color en hover de la galeria 2×2 (allà és una mostra de pintura, aquí no té equivalent); la marca gegant del peu fa ~33u d'alt (la de la referència ~21u): és només el logotip UAUU (`logos/UAUU_logotip_negre.svg`, sense el "Weddings & Events") a tot l'ample del peu.

**Estat (2 oct. 2026)**: copy i traduccions ES/EN revisats per l'usuari, fotos de ressenyes validades; la home és la pàgina principal de `/welcome/`. Les marques `[PENDENT]`/`[PENDIENTE]`/`[PENDING]` s'han retirat a petició seva: no tornar-les a afegir a la home. Provisional encara: el `meta title/description` de la home reutilitza els de la landing anterior (no parlen del disseny nou) fins que se'n redactin de propis. `lead_source` de `chatgpt`/`openai` és `chatgpt_test` per decisió de l'usuari (tema del seu CRM): no tornar-ho a `chatgpt_ads`. Umami: la variant `default` és ara la home; abans de l'intercanvi era la landing anterior (que des d'ara és `variante-b`), així que l'històric de `default` barreja els dos dissenys.

## Fonts
- `Inter-Variable-latin.woff2` és un subset (Latin bàsic + Latin-1 + Latin Extended-A + puntuació general + €, fletxes) generat amb `pyftsubset` des de l'Inter Variable oficial, conservant els eixos `wght` i `opsz`. Si mai cal un caràcter fora d'aquests rangs, regenerar el subset (no tornar a la font completa, 349 KB).
- `'Inter Fallback'` a `tokens.css`: Arial amb `size-adjust`/`ascent-override`/`descent-override` calculats a partir de les mètriques reals d'Inter, per evitar salts de layout al swap.
- Les dues fonts es preloaden a `index.html`.

## Imatges
- Tots els assets a CDN extern: `https://uauu.cat/media/` (alguns `https://www.uauu.cat/media/`)
- Cap imatge al repo. Format WebP preferit.
- `loading="lazy"` en totes excepte la imatge hero (que porta `loading="eager"` + `fetchpriority="high"`)
- Estructura real del CDN: `finques/{nom-finca}/{galeria-dimatges|cerimonia|allotjament}/{n}.webp` | `general/{gastronomia|dj}/{n}.webp`
- **El nom de fitxer no sempre és només el número**: Ca n'Alzina segueix el patró `{nom-finca}_{n}.webp` (p. ex. `finques/ca-n-alzina/galeria-dimatges/ca-n-alzina_30.webp`), no `{n}.webp` com la resta. Assumir el patró numèric va fer concloure, erròniament, que aquesta finca no tenia carpeta al CDN. Davant d'un 404, provar les dues formes i **comprovar la URL amb `curl` abans de fer-la servir**, mai deduir-la del HTML.

## Formulari
- Camps visibles: first_name, last_name, email1, phone_mobile (+ country selector prefix), data del casament, num_diners_c, privacy (checkbox)
- La data del casament és un input de display (`id="date_display"`, **sense `name`**, no s'envia sol). El seu valor es concatena dins el camp `description` a `js/form.js` (`Data del casament: …`). No existeix cap camp `event_date_c`; la data viatja dins `description` de forma intencionada.
- Camps hidden: campaign_id, redirect_url, assigned_user_id, moduleDir, event_type_c, lead_source, idioma_contacto_c (sincronitzat amb l'idioma actiu), description
- Honeypot antispam: `name="hp_website"` visible·ment ocult. `js/form.js` aborta el submit (silenciosament) si el camp ve omplert.
- Validació client-side a `js/form.js`: classe `.is-error` sobre l'input o `.form-footer`
- Submissió: reCAPTCHA invisible (Google) → callback `window.enviarAlCRM` → submit natiu POST a `https://crm.espaigastronomia.cat/index.php?entryPoint=WebToPersonCapture`
- **reCAPTCHA es carrega en diferit** (`loadRecaptcha()` a `js/form.js`): no hi ha cap `<script>` de Google al `<head>`. S'injecta quan el formulari s'acosta al viewport (IntersectionObserver, 800px de marge) o al primer `focusin`/`pointerdown` sobre el formulari. Es renderitza en mode explícit (`render=explicit` + callback `uauuRecaptchaReady`) i el submit espera la promesa; si Google no respon en 8 s, s'envia sense captcha (mateix comportament que abans si `api.js` fallava).
- **No** és un fetch; és submit natiu del formulari
- `redirect_url` apunta a `https://www.uauu.cat/welcome/gracies.html` — el CRM hi redirigeix el navegador si accepta el lead. Vegeu ## Tracking per a què passa allà.
- Abans del submit, `js/form.js` genera un `event_id` (`crypto.randomUUID()`, amb fallback) i el desa a `sessionStorage['uauu_lead_event_id']` — el recull `gracies.html` per disparar la conversió del pixel
- `lead_source` es omple dinàmicament des de l'`utm_source` de la URL (mateix punt que l'`event_id`, a `storeLeadEventId()` a `js/form.js`), NO cal editar-lo a mà per campanya. `lead_source` a SugarCRM és un desplegable de llista tancada, per això es mapeja contra una llista blanca (`UTM_SOURCE_MAP`, a dalt de `js/form.js`) en lloc d'enviar l'utm en cru — un valor no reconegut pel CRM podria deixar el lead sense origen. Per donar d'alta un canal nou (nova campanya): afegir-hi una entrada al mapa. Sense `utm_source` o amb un que no hi consta: `DEFAULT_LEAD_SOURCE` (`web_directe`), el mateix valor que porta com a `value` per defecte a l'HTML (xarxa de seguretat si el JS falla). L'utm es persisteix a `sessionStorage['uauu_utm_source']` per sobreviure a recàrregues i navegació interna; un `utm_source` nou sempre substitueix l'anterior.

## Tracking
- Pixel de conversió: **OpenAI Ads Measurement Pixel** (`oaiq`, pixelId `QByt2ai5bMmJ4QseTuTBuH`). S'inicialitza (`oaiq("init", ...)`) a `index.html` i a `gracies.html` — snippet oficial idèntic a les dues pàgines, el més amunt possible del `<head>`.
- L'esdeveniment de conversió (`lead_created`, data shape `customer_action`) es dispara **NOMÉS a `gracies.html`**, mai a `index.html` ni en el submit del formulari — es vol una conversió confirmada (el CRM ha acceptat el lead i hi ha redirigit), no assumida.
- `event_id`: generat a `js/form.js` abans del submit i desat a `sessionStorage['uauu_lead_event_id']`; `gracies.html` el recull i l'esborra tot seguit. Aquest mateix `event_id` és el que caldria reutilitzar si en el futur s'implementa la Conversions API (server-to-server) d'OpenAI Ads, per deduplicar l'esdeveniment de navegador amb el de servidor.
- Pla B a `gracies.html`: si `sessionStorage` no està disponible (navegació privada, etc.) però `document.referrer` és `crm.espaigastronomia.cat`, es genera un `event_id` nou i es dispara igualment — es prefereix comptar de més que perdre conversions en silenci.
- **Guard `uauu_lead_event_fired`**: abans de res, `gracies.html` comprova aquest flag a `sessionStorage`; si ja hi és, no dispara res més. Sense això, una simple recàrrega de `gracies.html` tornaria a entrar pel pla B (el `document.referrer` sobreviu a un F5) i duplicaria la conversió amb un `event_id` diferent, impossible de deduplicar per OpenAI. El flag es marca just després de disparar, tant si l'`event_id` ve de `sessionStorage` com del pla B. `js/form.js` l'esborra a `storeLeadEventId()` cada cop que es prepara un submit nou — un segon enviament real (mateixa pestanya, sense recarregar) no queda bloquejat pel flag de l'enviament anterior. Únic residu acceptable: emmagatzematge bloquejat A MÉS de recàrrega (no es pot ni llegir ni marcar el flag) — cas rar, no es complica més.
- **Neteja d'URL a `gracies.html`**: SugarCRM no fa una redirecció neta — reenvia TOTS els camps del formulari (nom, email, telèfon, etc.) com a query string a `redirect_url`. `gracies.html` neteja la URL amb `history.replaceState` com a primera cosa del `<head>`, **abans** del `oaiq("init", ...)`, perquè cap dada personal del lead quedi al `source_url` que capturaria el pixel, ni a la barra d'adreces ni a l'historial del navegador. Ordre no negociable: neteja d'URL → init del pixel → script de measure.
- El Meta Pixel que hi va haver a `index.html` s'ha eliminat definitivament (no reviure'l).
- `debug` ja s'ha retirat dels dos `init` (`index.html` i `gracies.html`) — la integració es va validar en producció: SugarCRM accepta el `redirect_url`, l'esdeveniment `lead_created` arriba a OpenAI amb `202` i és visible al seu flux d'esdeveniments, i el guard antiduplicats funciona (una recàrrega no en dispara un segon).

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

## Procés de treball (Claude Code)
Les regles i la verificació d'aquesta secció **s'apliquen per defecte, sense que calgui demanar-les a cada prompt**.

### Regles permanents del projecte
- **Escala en lloc de decidir**: si una instrucció xoca amb una altra, si complir-la obligaria a tocar un fitxer compartit fora de l'abast del prompt, o si dues opcions de disseny són defensables i l'elecció té conseqüències, para i explica-ho abans d'actuar. Les decisions mecàniques o reversibles (renombrar una variable, triar un valor dins d'un rang ja acceptat, un fix que no canvia comportament) es prenen sense preguntar.
- Media queries pròpies d'una variant: només al CSS d'aquella variant (`home.css`, `gracies.css`...), mai a `layout.css` ni `components.css`.
- Res puja a `components.css`/`tokens.css` fins que hi ha un segon consumidor **real**. Amb un sol ús, queda al CSS de la variant encara que s'assembli a algun component compartit.
- Token nou (a `tokens.css`) només quan dos fitxers reals necessiten literalment el mateix valor. Repetir un valor que ja és "en cru" en algun altre lloc del sistema no obliga a tokenitzar-lo.
- Tot contingut que no sigui definitiu porta la marca `[PENDENT]`/`[PENDIENTE]`/`[PENDING]` als tres idiomes — mai buit, mai un text plausible sense marcar (excepte la home, vegeu-ne la secció).
- Zero fugues: cap CTA surt de la landing, tot ancora a `#contacte`. Única excepció: l'atribució obligatòria d'OpenStreetMap (requisit de llicència, quan n'hi hagi) i l'enllaç a la política de privacitat del formulari.
- El JS propi d'una plantilla de variant viu en el seu propi mòdul, carregat només des d'aquesta plantilla — mai a `js/main.js`.
- `grid-template-columns: repeat(N, 1fr)` porta sempre `minmax(0, 1fr)`: el mínim implícit de `1fr` és `auto`, no `0`, i pot desbordar amb contingut llarg.
- Etiquetes/valors curts sense ús general (p. ex. "Aforament", "Preu" d'una targeta): dins el mateix `data-variant-html` que el valor, no una clau nova a `locales/*`.
- Els noms de finca no es tradueixen (fet de marca), a diferència de la resta del contingut.
- Contingut essencial dins d'un component visual/de tercers (mapa, widget): sempre disponible també fora, en text pla o `.sr-only`, independent de si el JS/tercer arriba a carregar.
- Contingut creat dinàmicament després de l'arrencada (popups, etc.): delegació d'esdeveniments (`document.addEventListener`), mai vincular-lo un a un en arrencar.

### Checklist de verificació estàndard
Dona-la per feta a cada canvi, sense que calgui que et la demanin:
- `node build-variants.js` i `node build-variants.js --check` (exit 0).
- Xarxa sense 404 (ignora el 503 conegut de `bzr.openai.com`, aliè i previ a qualsevol canvi teu).
- Consola sense errors propis (ignora el soroll conegut d'extensions de Chrome, vegeu més avall).
- Cicle CAT→ESP→ENG→CAT al contingut nou, `aria-pressed` correcte.
- `git diff --stat`: confirma que els fitxers compartits (`components.css`, `tokens.css`, `layout.css`, `index.html`, `js/main.js`) no han canviat si el prompt no ho demanava.
- Si toques CSS de layout: mesura la convivència real amb `getBoundingClientRect`/`Range.getClientRects()` al rang 320–1920px, no l'assumeixis.
- Recarrega dur (`cmd+shift+r`) abans de verificar visualment.

### Limitacions conegudes de l'entorn de proves
- **`resize_window` no canvia el viewport real de la pestanya de Claude in Chrome.** Símptoma: la mida "canvia" però `window.innerWidth` i les captures segueixen igual. Conclusió: fer servir un iframe del mateix origen per provar amples diferents.
- **rAF/temporitzadors es paren o s'alenteixen si la pestanya perd el focus durant l'automatització.** Verificat (no assumit): `document.hasFocus()` en `false` i `document.visibilityState` en `hidden` durant l'automatització, zero frames de `requestAnimationFrame` en 1,5s. Conclusió: no és un bug del codi — en una pestanya real amb focus no es reprodueix; comprova el focus de la pestanya abans de sospitar del codi.
- **Soroll d'extensions de Chrome a la consola.** Símptoma: `"A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"`. Conclusió: ve d'una extensió instal·lada al navegador, no del nostre codi — ignora-la.
- **El servidor local serveix contingut en caché després d'editar CSS/JS.** Símptoma: `getComputedStyle` o l'aspecte visual no reflecteix el canvi acabat de fer. Conclusió: recarrega dur (`cmd+shift+r`) abans de mesurar, no assumeixis que el canvi ha fallat.

### Informe final
No es genera cap `_temp_[tema].md` en acabar una tasca (retirat a petició de l'usuari, oct. 2026): el resum va directament a la resposta final. Només si l'usuari ho demana explícitament.

### Tècniques de mesura establertes
- **Amples diferents**: iframe del mateix origen amb `style.width` variable, no `resize_window`.
- **Convivència de text real**: `Range.getClientRects()` sobre el node de text, no `getBoundingClientRect()` del contenidor — un contenidor de bloc s'estira a l'amplada disponible encara que el text visible sigui més curt, i dona fals negatiu.
- **Abans de vendoritzar una llibreria**: provar la URL amb `curl` (i confirmar la versió estable real, p. ex. via l'API de GitHub) abans de baixar-la.
- **Confirmar que un bug existia abans del fix**: injectar temporalment el codi antic al DOM (`<style>` amb `!important`, sobreescriure una funció) i mesurar — mai fiar-se de la memòria de "com era abans".
- **Comportament tàctil sense dispositiu real**: sobrescriure `window.matchMedia` perquè `(pointer: coarse)` retorni `true` abans que el codi el consulti, i simular events `Touch`/`TouchEvent` per verificar la lògica de gestos.
