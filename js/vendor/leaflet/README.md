# Leaflet (vendoritzat)

Versió **1.9.4** (última estable, maig 2023), descarregada de `https://unpkg.com/leaflet@1.9.4/dist/` i servida en local — sense CDN, seguint la convenció "cap dependència externa" del projecte (vegeu CLAUDE.md).

Fitxers: `leaflet.js`, `leaflet.css`. **Sense** la carpeta `images/` del paquet oficial (marker-icon.png, layers.png...): el mapa de la Variant B fa servir marcadors propis (`L.divIcon`, CSS pur) i no cap control que en necessiti (sense `L.control.layers`), així que aquestes imatges no arriben a demanar-se mai — no calia vendoritzar-les.

Per actualitzar: baixar `leaflet.js` i `leaflet.css` de la mateixa font amb la nova versió, substituir aquí, i tornar a comprovar que cap control/icona nova requereixi `images/`.
