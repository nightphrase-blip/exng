#!/usr/bin/env node
/**
 * Genera index.html, sitemap.xml y robots.txt a partir de los datos de /data.
 * Sin dependencias: node scripts/build.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const site = read("data/site.json");
const exchanges = read("data/exchanges.json");
const faq = read("data/faq.json");

const IMPORTE_BASE = 1000;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const pct = (v) =>
  v === null || v === undefined
    ? '<span class="na">n/d</span>'
    : `${v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} %`;

const money = (v) =>
  v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

const attr = (v) => (v === null || v === undefined ? "" : String(v));

const fechaLarga = new Date(site.actualizado + "T00:00:00Z").toLocaleDateString("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/* --- filas de la tabla (renderizadas en el HTML, no por JS: son el contenido indexable) --- */
const cheapestTaker = Math.min(...exchanges.map((e) => e.spot_taker));

const filas = exchanges
  .slice()
  .sort((a, b) => a.spot_taker - b.spot_taker || a.nombre.localeCompare(b.nombre, "es"))
  .map((e) => {
    const coste = (IMPORTE_BASE * e.spot_taker) / 100;
    const buscar = [e.nombre, e.region, e.notas, e.descuento].join(" ").toLowerCase();
    return `        <tr
          data-nombre="${esc(e.nombre)}"
          data-buscar="${esc(buscar)}"
          data-spot_taker="${attr(e.spot_taker)}"
          data-spot_maker="${attr(e.spot_maker)}"
          data-futuros_taker="${attr(e.futuros_taker)}"
          data-futuros_maker="${attr(e.futuros_maker)}">
          <td class="ex-name">
            <a href="${esc(e.web)}" rel="nofollow noopener" target="_blank">${esc(e.nombre)}</a>
            <span class="ex-region">${esc(e.region)}</span>
            <span class="ex-note">${esc(e.notas)}</span>
            <span class="ex-note"><a href="${esc(e.fuente)}" rel="nofollow noopener" target="_blank">Tarifas oficiales</a> · ${esc(e.descuento)}</span>
          </td>
          <td class="num" data-label="Spot maker">${pct(e.spot_maker)}</td>
          <td class="num" data-label="Spot taker">${pct(e.spot_taker)}</td>
          <td class="num" data-label="Futuros maker">${pct(e.futuros_maker)}</td>
          <td class="num" data-label="Futuros taker">${pct(e.futuros_taker)}</td>
          <td class="num cost${e.spot_taker === cheapestTaker ? " cheap" : ""}" data-label="Coste de la operación">€ ${money(coste)}</td>
          <td class="fiat" data-label="Depósito fiat">${esc(e.deposito_fiat)}</td>
          <td class="fiat" data-label="Retiro fiat">${esc(e.retiro_fiat)}</td>
        </tr>`;
  })
  .join("\n");

const faqHtml = faq
  .map(
    (f) => `      <details class="faq">
        <summary>${esc(f.p)}</summary>
        <p>${esc(f.r)}</p>
      </details>`
  )
  .join("\n");

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": site.url + "/#webpage",
      url: site.url + "/",
      name: site.titulo,
      description: site.descripcion,
      inLanguage: "es",
      dateModified: site.actualizado,
      isPartOf: { "@type": "WebSite", url: site.url + "/", name: site.nombre },
    },
    {
      "@type": "FAQPage",
      "@id": site.url + "/#faq",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.p,
        acceptedAnswer: { "@type": "Answer", text: f.r },
      })),
    },
    {
      "@type": "ItemList",
      "@id": site.url + "/#lista",
      name: "Exchanges comparados",
      numberOfItems: exchanges.length,
      itemListElement: exchanges.map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: e.nombre,
        url: e.web,
      })),
    },
  ],
};

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.titulo)}</title>
<meta name="description" content="${esc(site.descripcion)}">
<link rel="canonical" href="${esc(site.url)}/">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(site.titulo)}">
<meta property="og:description" content="${esc(site.descripcion)}">
<meta property="og:url" content="${esc(site.url)}/">
<meta property="og:site_name" content="${esc(site.nombre)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1f6feb">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%92%B1%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="/assets/styles.css">
<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/">Comisiones<span>.</span>exchange</a>
    <nav class="site-nav">
      <a href="#tabla">Tabla</a>
      <a href="#guia">Guía</a>
      <a href="#metodologia">Metodología</a>
      <a href="#faq">FAQ</a>
    </nav>
  </div>
</header>

<main class="wrap">

  <div class="hero">
    <p><span class="badge">Actualizado: ${esc(fechaLarga)}</span></p>
    <h1>Comparativa de comisiones de exchanges de criptomonedas</h1>
    <p class="lead">${esc(site.descripcion)} Datos del nivel básico (sin descuentos VIP) de ${exchanges.length} plataformas, con el coste real de una operación para que compares en euros y no en porcentajes.</p>
    <p class="meta-line">Comisiones spot y de futuros, depósitos y retiros en fiat, y las letras pequeñas de cada plataforma.</p>
  </div>

  <section id="tabla" class="block">
    <h2>Tabla comparativa de comisiones</h2>

    <div class="controls">
      <div class="field">
        <label for="buscador">Buscar exchange</label>
        <input id="buscador" type="search" placeholder="Binance, Kraken, LatAm…" autocomplete="off">
      </div>
      <div class="field">
        <label for="importe">Importe de la operación</label>
        <input id="importe" type="number" min="0" step="100" value="${IMPORTE_BASE}" inputmode="decimal">
      </div>
      <div class="field">
        <label for="tipo-operacion">Tipo de operación</label>
        <select id="tipo-operacion">
          <option value="spot_taker">Spot · taker (orden a mercado)</option>
          <option value="spot_maker">Spot · maker (orden limitada)</option>
          <option value="futuros_taker">Futuros · taker</option>
          <option value="futuros_maker">Futuros · maker</option>
        </select>
      </div>
      <div class="field">
        <label for="moneda">Moneda</label>
        <select id="moneda">
          <option value="€">EUR (€)</option>
          <option value="$">USD ($)</option>
          <option value="MXN">MXN</option>
          <option value="ARS">ARS</option>
        </select>
      </div>
    </div>
    <p class="hint">Pulsa en las cabeceras para ordenar. La columna de coste se recalcula con el importe que escribas; la moneda es solo la etiqueta, el porcentaje es el mismo en cualquier divisa.</p>

    <div class="table-scroll">
      <table class="fees" id="tabla-comisiones">
        <caption class="sr-only">Comisiones de los principales exchanges de criptomonedas, nivel básico</caption>
        <thead>
          <tr>
            <th class="sortable" data-key="nombre" scope="col">Exchange</th>
            <th class="sortable" data-key="spot_maker" scope="col">Spot maker</th>
            <th class="sortable" data-key="spot_taker" scope="col">Spot taker</th>
            <th class="sortable" data-key="futuros_maker" scope="col">Fut. maker</th>
            <th class="sortable" data-key="futuros_taker" scope="col">Fut. taker</th>
            <th id="col-coste" scope="col">Coste de € ${money(IMPORTE_BASE)}</th>
            <th scope="col">Depósito fiat</th>
            <th scope="col">Retiro fiat</th>
          </tr>
        </thead>
        <tbody>
${filas}
        </tbody>
      </table>
    </div>
    <p id="sin-resultados" class="hint" hidden>Ningún exchange coincide con esa búsqueda.</p>

    <div class="callout">
      <strong>Antes de fiarte de un porcentaje:</strong> las cifras corresponden al nivel de entrada del mercado avanzado de cada plataforma. Si compras desde el botón rápido de la app, el coste real suele ser varias veces mayor por el margen incluido en el precio.
    </div>
  </section>

  <section id="guia" class="block">
    <h2>Cómo comparar comisiones sin equivocarte</h2>
    <p>El porcentaje de trading es solo una de las cuatro partidas que determinan lo que pagas de verdad. Estas son todas:</p>

    <div class="cards">
      <div class="card">
        <h3>1. Comisión de trading</h3>
        <p>Maker (aportas liquidez con una orden limitada) o taker (ejecutas a mercado). Es lo que aparece en la tabla y baja con el volumen operado en 30 días.</p>
      </div>
      <div class="card">
        <h3>2. Spread y compra rápida</h3>
        <p>El coste invisible: la diferencia entre el precio que ves y el del libro de órdenes. En los botones de compra instantánea puede superar el 1%–2%, muy por encima de cualquier comisión.</p>
      </div>
      <div class="card">
        <h3>3. Depósito y retiro fiat</h3>
        <p>SEPA suele ser gratis o casi; tarjeta puede costar entre un 1% y un 3%. En LatAm, la conexión con banca local (SPEI, PIX, CBU) marca la diferencia.</p>
      </div>
      <div class="card">
        <h3>4. Retiro de criptomonedas</h3>
        <p>Cada plataforma fija su propio importe por red, a veces por encima del coste real de la blockchain. Si retiras a menudo o en importes pequeños, esta partida puede pesar más que el trading.</p>
      </div>
    </div>

    <h3>Cuándo compensa cambiar de exchange</h3>
    <p>La diferencia entre un 0,10% y un 0,60% son 5 € por cada 1.000 € operados. Si haces una compra al mes y la mantienes, esa diferencia es pequeña frente a la seguridad, la regulación o la facilidad para meter y sacar dinero. Si operas semanalmente, se convierte en la partida principal de tus costes y merece la pena optimizarla.</p>

    <h3>Trucos que sí bajan la factura</h3>
    <ul>
      <li><strong>Órdenes limitadas:</strong> pagar tarifa maker en lugar de taker ahorra entre un 20% y un 40% del coste en casi todas las plataformas.</li>
      <li><strong>Token propio del exchange:</strong> BNB, KCS o CRO dan descuentos, a cambio de exponerte al precio de ese token.</li>
      <li><strong>Agrupa retiros:</strong> un solo retiro grande en lugar de cinco pequeños, cuando la comisión es un importe fijo.</li>
      <li><strong>Elige bien la red:</strong> retirar stablecoins por una red de bajo coste en lugar de la principal cambia el coste por completo.</li>
    </ul>
  </section>

  <section id="metodologia" class="block">
    <h2>Metodología y fuentes</h2>
    <p>Los datos se toman de las páginas oficiales de tarifas de cada plataforma, enlazadas en la columna de notas. Criterios aplicados:</p>
    <ul>
      <li>Se usa el <strong>nivel de entrada</strong> (VIP 0, volumen a 30 días inferior a 10.000 USD) y sin descuentos por token, salvo que se indique.</li>
      <li>Las comisiones de futuros corresponden a perpetuos liquidados en USDT.</li>
      <li>Los importes de depósito y retiro fiat se refieren a transferencia bancaria estándar (SEPA en Europa, transferencia local en LatAm), no a tarjeta.</li>
      <li>«n/d» significa que la plataforma no ofrece ese producto de forma general, no que sea gratuito.</li>
      <li>Última revisión: ${esc(fechaLarga)}.</li>
    </ul>
    <div class="callout">
      Los exchanges cambian sus tarifas sin previo aviso y aplican condiciones distintas según el país del usuario. Esta tabla es orientativa: <strong>confirma siempre el importe en la página oficial de tarifas</strong> antes de operar.
    </div>
  </section>

  <section id="faq" class="block">
    <h2>Preguntas frecuentes</h2>
${faqHtml}
  </section>

</main>

<footer class="site-footer">
  <div class="wrap">
    <p>${esc(site.nombre)} · Última actualización: ${esc(fechaLarga)}.</p>
    <p>Contenido informativo. No es asesoramiento financiero ni una recomendación de inversión. Operar con criptomonedas conlleva riesgo de pérdida del capital. Verifica las comisiones en la web oficial de cada plataforma antes de operar.</p>
  </div>
</footer>

<script src="/assets/app.js" defer></script>
</body>
</html>
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.url}/</loc>
    <lastmod>${site.actualizado}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;

writeFileSync(join(root, "index.html"), html);
writeFileSync(join(root, "sitemap.xml"), sitemap);
writeFileSync(join(root, "robots.txt"), robots);

console.log(`index.html generado con ${exchanges.length} exchanges y ${faq.length} preguntas.`);
console.log(`Sitemap y robots.txt apuntando a ${site.url}`);
