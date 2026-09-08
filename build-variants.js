#!/usr/bin/env node
'use strict';

// build-variants.js — Generador estàtic de pàgines de variant.
//
// Sense dependències externes, sense npm, sense build step per a la resta del
// lloc: aquest script és pur Node (fs/path del core) i només es fa servir a
// mà, abans de pujar per FTP. index.html és la ÚNICA font de veritat del DOM;
// aquest generador el pren com a plantilla i, per cada variants/<nom>.json
// (excepte default.json, que és la que ja aplica js/variant.js en temps real
// sobre l'index.html de l'arrel, i excepte els que comencen per "_" —
// convenció per a fitxers de referència/exemple que no s'han de desplegar,
// p.ex. variants/_ejemplo.json), escriu una còpia COMPLETA i ja resolta a
// <arrel>/<nom>/index.html:
//
//   - el copy de la variant, en català (idioma per defecte), cuit dins el DOM
//   - <link rel="preload" as="image">, og:image i twitter:image apuntant a
//     la imatge real del hero d'aquesta variant
//   - <title>, meta description, og:title/description, twitter:title/description
//   - totes les rutes relatives (css/, js/, logos/, fonts/, favicon.ico)
//     reescrites amb un "../" perquè la pàgina generada viu un nivell per
//     sota de l'arrel
//
// El que NO es toca aquí: els fetch() en temps real de js/lang.js i
// js/variant.js (locales/*.json, variants/*.json). Aquests es resolen sols
// via import.meta.url (ancorat a la ubicació real dels mòduls, no a la de la
// pàgina que els importa), així que funcionen igual des de l'arrel que des
// d'una pàgina de variant generada. És el mecanisme que permet que, un cop
// carregada, la pàgina generada segueixi responent al canvi d'idioma
// (CAT/ESP/ENG) reaplicant el mateix JSON de variant que aquest script ha
// fet servir per cuinar l'HTML.
//
// Reproduïble: executar-ho dues vegades sense tocar variants/*.json produeix
// exactament el mateix HTML. Les carpetes generades no s'editen mai a mà.
//
// `node build-variants.js --check`: comprovació de frescor sense regenerar
// res. Cada pàgina generada porta encastat un hash (comentari HTML) de
// l'index.html + el JSON amb què es va cuinar; --check el recalcula amb els
// fitxers ACTUALS i el compara amb el que hi ha escrit. Detecta tant un
// variants/<nom>.json editat com un canvi a index.html (la plantilla) sense
// haver tornat a executar el generador -- exit code 1 si alguna cosa està
// desactualitzada, 0 si tot hi és. Pensat per anar abans de cada pujada per
// FTP, sense el cost de regenerar-ho tot per comprovar-ho.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const TEMPLATE_PATH = path.join(ROOT, 'index.html');
const VARIANTS_DIR = path.join(ROOT, 'variants');
const SITE_BASE_URL = 'https://www.uauu.cat/welcome/';
const LOCALES = ['ca', 'es', 'en'];
const META_KEYS = new Set(['meta.title', 'meta.description']);
const HASH_COMMENT_RE = /<!-- build-variants:hash sha256:([0-9a-f]{64}) -->/;

// ── Utilitats ────────────────────────────────────────────────────────────

// Hash dels INPUTS bruts (bytes tal qual al disc, sense parsejar): detecta
// qualsevol canvi, incloent-hi un espai en blanc, tant a la plantilla com al
// JSON de la variant. El separador \0 evita que "AB"+"C" i "A"+"BC" (canvis
// de mida a banda i banda de la unió) donin el mateix hash per casualitat.
function computeInputHash(templateHtml, rawJson) {
  return crypto.createHash('sha256').update(templateHtml).update('\0').update(rawJson).digest('hex');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Una carpeta és "nostra" (generada en una execució anterior, reescrivible)
// si porta el marcador .gitignore que aquest mateix script hi deixa. Si el
// nom ja existeix al repo i NO és nostra, és una col·lisió real (css/, js/,
// gracies.html...) i s'atura tota l'execució: cap variant es genera a
// mitges.
function isForeignExistingPath(name) {
  const target = path.join(ROOT, name);
  if (!fs.existsSync(target)) return false;
  const marker = path.join(target, '.gitignore');
  return !fs.existsSync(marker);
}

// ── Validació del JSON de variant ───────────────────────────────────────
// Falla sorollosament si l'estructura no és la que espera el motor en temps
// real (js/variant.js): un objecte {ca, es, en} per clau de contingut, string
// pla per a les claus meta.*. Sense això, una clau mal formada quedaria
// simplement ignorada en aplicar-se (mateix aspecte que "no hi ha variant per
// a aquesta clau"), i l'error passaria desapercebut tant aquí com en runtime.
function validateVariantData(name, data) {
  const errors = [];

  for (const [key, value] of Object.entries(data)) {
    if (META_KEYS.has(key)) {
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`"${key}" ha de ser un string no buit`);
      }
      continue;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`"${key}" ha de ser un objecte {ca, es, en}, no ${JSON.stringify(value)}`);
      continue;
    }

    for (const locale of LOCALES) {
      if (!(locale in value)) {
        errors.push(`"${key}" no porta la clau "${locale}"`);
      }
    }
  }

  if (errors.length) {
    throw new Error(`variants/${name}.json té errors:\n  - ${errors.join('\n  - ')}`);
  }
}

// ── Reescriptura de rutes relatives compartides ─────────────────────────
// css/, js/, logos/, fonts/, favicon.ico: la pàgina generada viu a
// <arrel>/<variant>/index.html, un nivell per sota d'on viuen aquests
// fitxers, així que cada referència necessita un "../" davant. Els assets ja
// absoluts (https://www.uauu.cat/media/...) i els àncores (#contacte) no es
// toquen: resolen igual des de qualsevol profunditat.
const REWRITE_PREFIXES = ['css/', 'js/', 'logos/', 'fonts/'];

function rewriteRelativePaths(html) {
  let out = html;
  for (const prefix of REWRITE_PREFIXES) {
    out = out.replace(new RegExp(`(href|src)="${prefix}`, 'g'), `$1="../${prefix}`);
  }
  out = out.replace(/href="favicon\.ico"/g, 'href="../favicon.ico"');
  return out;
}

// ── Bake del copy de la variant (idioma ca) dins el DOM ─────────────────

// data-variant-src (imatges, p.ex. <img ... src="..." data-variant-src="hero.bg">):
// reescriu només l'atribut src="" del mateix tag. \s davant de "src=" (no \b)
// perquè \b també faria "match" dins de "data-variant-src=" (hi ha un canvi
// no-paraula→paraula entre "-" i "s").
function bakeSrcAttrs(html, data) {
  return html.replace(
    /<[a-zA-Z][a-zA-Z0-9]*\b[^>]*?\bdata-variant-src="([^"]+)"[^>]*>/g,
    (tag, key) => {
      const value = data[key]?.ca;
      if (value == null) return tag;
      return tag.replace(/(\s)src="[^"]*"/, (_m, ws) => `${ws}src="${escapeAttr(value)}"`);
    }
  );
}

// data-variant / data-variant-html: contingut intern de l'element (text pla
// o HTML). Backreference amb el nom del tag perquè aquest mateix tag pot
// aparèixer repetit al document (p.ex. <p>, <span>) sense que es confonguin
// obertura i tancament d'elements diferents.
function bakeVariantContent(html, data) {
  let out = bakeSrcAttrs(html, data);

  for (const [attr, transform] of [
    ['data-variant-html', (v) => v],
    ['data-variant', (v) => escapeHtml(v)],
  ]) {
    const re = new RegExp(
      `(?<openTag><(?<tag>[a-zA-Z][a-zA-Z0-9]*)\\b[^>]*?\\b${attr}="(?<key>[^"]+)"[^>]*>)` +
        `(?<inner>[\\s\\S]*?)(?<closeTag><\\/\\k<tag>>)`,
      'g'
    );
    out = out.replace(re, (full, ...rest) => {
      const groups = rest[rest.length - 1];
      const value = data[groups.key]?.ca;
      if (value == null) return full;
      return `${groups.openTag}${transform(value)}${groups.closeTag}`;
    });
  }

  return out;
}

// ── Meta tags (<head>) ──────────────────────────────────────────────────
// Estàtics i coherents amb la variant: els crawlers de xarxes socials i
// cercadors no executen JS, així que og:image/title/description han
// d'existir ja resolts a l'HTML servit, no dependre de js/variant.js.

function rewriteMeta(html, data, name) {
  let out = html;
  const title = data['meta.title'];
  const description = data['meta.description'];
  const heroImage = data['hero.bg']?.ca;
  const pageUrl = `${SITE_BASE_URL}${name}/`;

  if (title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
    out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(title)}$2`);
    out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeAttr(title)}$2`);
  }

  if (description) {
    out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(description)}$2`);
    out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeAttr(description)}$2`);
    out = out.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeAttr(description)}$2`);
  }

  if (heroImage) {
    out = out.replace(/(<link rel="preload" as="image" href=")[^"]*("[^>]*>)/, `$1${escapeAttr(heroImage)}$2`);
    out = out.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${escapeAttr(heroImage)}$2`);
    out = out.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${escapeAttr(heroImage)}$2`);
  }

  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escapeAttr(pageUrl)}$2`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escapeAttr(pageUrl)}$2`);

  return out;
}

// <meta name="uauu-variant"> és qui, en temps real, diu a js/variant.js quin
// variants/<nom>.json ha de tornar a carregar per reaplicar-se en cada canvi
// d'idioma (vegeu js/variant.js i js/lang.js). El comentari de hash just a
// sota és la marca de frescor que llegeix --check (vegeu computeInputHash).
function injectVariantMeta(html, name, hash) {
  return html.replace(
    '<meta charset="UTF-8" />',
    `<meta charset="UTF-8" />\n  <meta name="uauu-variant" content="${escapeAttr(name)}" />\n  <!-- build-variants:hash sha256:${hash} -->`
  );
}

function buildVariantHtml(name, data, rawJson, templateHtml) {
  const hash = computeInputHash(templateHtml, rawJson);
  let html = templateHtml;
  html = injectVariantMeta(html, name, hash);
  html = rewriteMeta(html, data, name);
  html = bakeVariantContent(html, data);
  html = rewriteRelativePaths(html);
  return html;
}

// ── Recollida i validació de les variants a processar ───────────────────
// Comuna a generar i a --check: llegeix cada variants/<nom>.json (excepte
// default.json, i excepte els que comencen per "_", vegeu més avall) i en
// valida l'estructura abans de fer-hi res més. Una variant amb errors no ha
// de deixar mig repo generat ni informar "al dia" per accident.
function collectJobs() {
  const files = fs
    .readdirSync(VARIANTS_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'default.json' && !f.startsWith('_'));

  return files.map((file) => {
    const name = path.basename(file, '.json');
    const rawJson = fs.readFileSync(path.join(VARIANTS_DIR, file), 'utf8');
    const data = JSON.parse(rawJson);

    validateVariantData(name, data);

    return { name, file, data, rawJson };
  });
}

function runGenerate() {
  const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const jobs = collectJobs();

  if (!jobs.length) {
    console.log('[build-variants] Cap variant a generar (variants/ només té default.json i/o fitxers "_*" d\'exemple).');
    return;
  }

  // Els noms reservats només importen quan s'escriu de veritat: es
  // comproven tots abans de tocar cap fitxer, perquè una col·lisió no
  // deixi mig repo generat.
  jobs.forEach(({ name, file }) => {
    if (isForeignExistingPath(name)) {
      throw new Error(
        `variants/${file}: el nom de variant "${name}" col·lideix amb un fitxer o carpeta ja existent al repo. Tria un altre nom.`
      );
    }
  });

  jobs.forEach(({ name, data, rawJson }) => {
    const html = buildVariantHtml(name, data, rawJson, templateHtml);
    const outDir = path.join(ROOT, name);

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    // Marca la carpeta com a generada (i, de retruc, l'exclou de git — les
    // carpetes generades no es versionen, vegeu CLAUDE.md ## Variants).
    fs.writeFileSync(path.join(outDir, '.gitignore'), '*\n', 'utf8');

    console.log(`[build-variants] Generat ${name}/index.html`);
  });
}

function runCheck() {
  const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const jobs = collectJobs();

  if (!jobs.length) {
    console.log('[build-variants --check] Cap variant a comprovar (variants/ només té default.json i/o fitxers "_*" d\'exemple).');
    return;
  }

  const stale = [];

  jobs.forEach(({ name, rawJson }) => {
    const outFile = path.join(ROOT, name, 'index.html');

    if (!fs.existsSync(outFile)) {
      stale.push(`${name}/: no generada (falta ${name}/index.html) -- executa node build-variants.js`);
      return;
    }

    const html = fs.readFileSync(outFile, 'utf8');
    const match = html.match(HASH_COMMENT_RE);

    if (!match) {
      stale.push(`${name}/index.html: no porta la marca de generació (editada a mà, o generada amb una versió antiga del script) -- torna a executar node build-variants.js`);
      return;
    }

    const expected = computeInputHash(templateHtml, rawJson);
    if (match[1] !== expected) {
      stale.push(`${name}/index.html: desactualitzada respecte a index.html o variants/${name}.json -- executa node build-variants.js`);
    }
  });

  if (stale.length) {
    console.error('[build-variants --check] Variants desactualitzades:');
    stale.forEach((line) => console.error(`  - ${line}`));
    process.exit(1);
  }

  console.log('[build-variants --check] Totes les variants generades estan al dia.');
}

try {
  if (process.argv.includes('--check')) {
    runCheck();
  } else {
    runGenerate();
  }
} catch (err) {
  console.error(`[build-variants] ${err.message}`);
  process.exit(1);
}
