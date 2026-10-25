# Comparador de comisiones de exchanges

Página estática (una sola URL) que compara las comisiones de los principales exchanges de
criptomonedas. Está pensada para vivir de forma permanente y captar tráfico orgánico: todo el
contenido va renderizado en el HTML, sin frameworks, sin dependencias y sin peticiones externas.

## Qué incluye

- Tabla comparativa de **12 exchanges**: comisiones spot (maker/taker), futuros, depósito y retiro fiat.
- Columna de **coste real** de una operación, recalculable con el importe que escriba el usuario.
- Buscador y ordenación por cualquier columna (mejora progresiva: la página funciona sin JavaScript).
- Guía editorial, metodología, aviso legal y FAQ.
- SEO: `title`/`description`, canonical, Open Graph, datos estructurados JSON-LD
  (`WebPage` + `FAQPage` + `ItemList`), `sitemap.xml` y `robots.txt`.
- Modo claro/oscuro automático y diseño responsive.

## Estructura

```
data/exchanges.json   ← fuente de verdad: comisiones de cada plataforma
data/faq.json         ← preguntas frecuentes (van al HTML y al JSON-LD)
data/site.json        ← dominio, títulos, fecha de última actualización
scripts/build.mjs     ← genera index.html, sitemap.xml y robots.txt
assets/styles.css     ← estilos
assets/app.js         ← filtro, orden y calculadora de coste
index.html            ← GENERADO, no editar a mano
```

## Actualizar las comisiones

1. Edita `data/exchanges.json` (y `data/faq.json` si hace falta).
2. Cambia `actualizado` en `data/site.json` a la fecha de la revisión.
3. Regenera y revisa:

```bash
npm run build      # node scripts/build.mjs
npm run serve      # http://localhost:8080
```

4. Commit del JSON **y** del `index.html` regenerado.

> El workflow de CI vuelve a ejecutar el build y falla si `index.html` no coincide con los datos,
> para que el HTML publicado nunca se quede desincronizado.

### Campos de cada exchange

| Campo | Significado |
|---|---|
| `spot_maker` / `spot_taker` | % spot en el nivel de entrada (VIP 0, < 10.000 USD a 30 días) |
| `futuros_maker` / `futuros_taker` | % en perpetuos USDT; `null` si la plataforma no ofrece futuros |
| `deposito_fiat` / `retiro_fiat` | texto libre: transferencia bancaria estándar, no tarjeta |
| `descuento` | descuentos por token propio o volumen |
| `fuente` | URL de la página oficial de tarifas (se enlaza en la tabla) |

## Publicar

`.github/workflows/pages.yml` despliega en **GitHub Pages** con cada push a `main`
(Settings → Pages → Source: *GitHub Actions*). Al ser HTML plano también sirve tal cual en
Netlify, Vercel, Cloudflare Pages o cualquier hosting estático: la raíz del repo es la raíz del sitio.

### Antes de publicar

- Cambia `url` en `data/site.json` por tu dominio real y vuelve a ejecutar el build: de ahí salen
  el canonical, el sitemap y el JSON-LD.
- Si usas dominio propio en GitHub Pages, añade un fichero `CNAME` en la raíz con el dominio.
- Da de alta el sitio en Google Search Console y envía `sitemap.xml`.

## Juego de ahorro con DCA

La carpeta [`dca/`](dca/LEEME.md) contiene un juego independiente en 3D («La mesa del ahorro»)
que se publica en `/dca/`. No usa el build de esta página; sus instrucciones están en
`dca/LEEME.md`. Sus precios los actualiza cada noche `.github/workflows/precios-diarios.yml`.

## Aviso

Las comisiones son orientativas y cambian sin previo aviso; cada exchange aplica además
condiciones distintas según el país del usuario. La página enlaza la tarifa oficial de cada
plataforma y muestra la fecha de la última revisión. Contenido informativo, no asesoramiento
financiero.
