// Gráficos de líneas dibujados en un <canvas>, sin librerías externas.
// Se redibujan solos al cambiar el tamaño de la ventana o el modo claro/oscuro.
(function (global) {
  "use strict";

  const opcionesPorCanvas = new Map();
  const FUENTE = '12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function token(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  }

  // "#4f46e5" + 0.3 -> "rgba(79, 70, 229, 0.3)"
  function conTransparencia(hex, alfa) {
    const n = parseInt(hex.replace("#", ""), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
  }

  // Marcas "redondas" para el eje vertical (múltiplos de 1, 2, 2,5 o 5).
  function marcasEje(min, max, cuantas) {
    if (min === max) {
      const margen = Math.abs(min) * 0.1 || 1;
      min -= margen;
      max += margen;
    }
    const bruto = (max - min) / cuantas;
    const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
    const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
    const desde = Math.floor(min / paso) * paso;
    const hasta = Math.ceil(max / paso) * paso;
    const marcas = [];
    for (let i = 0; desde + i * paso <= hasta + paso / 2; i++) {
      marcas.push(Number((desde + i * paso).toPrecision(12)));
    }
    return { min: desde, max: hasta, marcas };
  }

  // Puntos de una serie. Si progreso < 1, el último tramo se dibuja a medias (animación).
  function puntosVisibles(valores, progreso) {
    const puntos = valores.map((v, i) => ({ i, v }));
    const n = valores.length;
    if (progreso < 1 && n >= 2) {
      const a = valores[n - 2];
      const b = valores[n - 1];
      puntos[n - 1] = { i: n - 2 + progreso, v: a + (b - a) * progreso };
    }
    return puntos;
  }

  /**
   * opciones:
   *   series        [{ valores: [números], color: "--token-css", relleno: true }]
   *   totalPuntos   ancho del eje horizontal (en meses)
   *   inicioJuego   índice donde empieza la partida (sombrea lo anterior) o null
   *   marcadores    [{ indice, tipo: "compra" | "venta" }]
   *   etiquetasX    [{ indice, texto }] (opcional)
   *   formatoEje    función número -> texto para el eje vertical
   *   formatoValor  función número -> texto para la etiqueta del último punto (opcional)
   *   progreso      de 0 a 1, para animar el último tramo
   */
  function dibujar(canvas, opciones) {
    opcionesPorCanvas.set(canvas, opciones);
    vigilarTamaño(canvas);

    const ancho = canvas.clientWidth;
    const alto = canvas.clientHeight;
    if (!ancho || !alto) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(ancho * dpr) || canvas.height !== Math.round(alto * dpr)) {
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, ancho, alto);
    ctx.font = FUENTE;

    const progreso = opciones.progreso === undefined ? 1 : opciones.progreso;
    const marcadores = opciones.marcadores || [];
    const etiquetasX = opciones.etiquetasX || [];
    const colorTexto = token("--texto-suave");
    const colorRejilla = token("--grafico-rejilla");
    const colorFondo = token("--superficie");

    const series = opciones.series.map((s) => ({
      ...s,
      color: token(s.color),
      puntos: puntosVisibles(s.valores, progreso),
    }));
    const todos = series.flatMap((s) => s.puntos.map((p) => p.v));
    const eje = marcasEje(Math.min(...todos), Math.max(...todos), 4);

    // Márgenes: a la izquierda cabe la etiqueta más ancha del eje.
    const anchoEtiquetas = Math.max(...eje.marcas.map((m) => ctx.measureText(opciones.formatoEje(m)).width));
    const izq = Math.ceil(anchoEtiquetas) + 12;
    const der = 14;
    const arriba = 22;
    const abajo = etiquetasX.length ? 26 : 10;
    const anchoUtil = ancho - izq - der;
    const altoUtil = alto - arriba - abajo;
    const x = (i) => izq + (i / Math.max(1, opciones.totalPuntos - 1)) * anchoUtil;
    const y = (v) => arriba + (1 - (v - eje.min) / (eje.max - eje.min)) * altoUtil;

    // Rejilla horizontal y eje vertical.
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    for (const marca of eje.marcas) {
      const yy = Math.round(y(marca)) + 0.5;
      ctx.strokeStyle = colorRejilla;
      ctx.beginPath();
      ctx.moveTo(izq, yy);
      ctx.lineTo(ancho - der, yy);
      ctx.stroke();
      ctx.fillStyle = colorTexto;
      ctx.fillText(opciones.formatoEje(marca), izq - 8, yy);
    }

    // Zona "antes de empezar" sombreada y línea de inicio.
    if (opciones.inicioJuego) {
      const xi = x(opciones.inicioJuego);
      ctx.fillStyle = token("--grafico-previo");
      ctx.fillRect(izq, arriba - 14, xi - izq, altoUtil + 14);
      ctx.strokeStyle = colorTexto;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(Math.round(xi) + 0.5, arriba - 14);
      ctx.lineTo(Math.round(xi) + 0.5, arriba + altoUtil);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colorTexto;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      if (xi - izq > ctx.measureText("Antes").width + 12) ctx.fillText("Antes", izq + 6, arriba - 12);
      ctx.fillText("Inicio", xi + 6, arriba - 12);
    }

    // Etiquetas del eje horizontal (años), sin que se pisen.
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = colorTexto;
    let finAnterior = -Infinity;
    for (const etiqueta of etiquetasX) {
      const xx = x(etiqueta.indice);
      const medio = ctx.measureText(etiqueta.texto).width / 2;
      if (xx - medio < finAnterior + 8 || xx + medio > ancho) continue;
      ctx.fillText(etiqueta.texto, xx, arriba + altoUtil + 8);
      finAnterior = xx + medio;
    }

    // Líneas (con relleno degradado debajo si se pide).
    for (const s of series) {
      if (s.puntos.length < 2) continue;
      if (s.relleno) {
        const degradado = ctx.createLinearGradient(0, arriba, 0, arriba + altoUtil);
        degradado.addColorStop(0, conTransparencia(s.color, 0.28));
        degradado.addColorStop(1, conTransparencia(s.color, 0));
        ctx.beginPath();
        ctx.moveTo(x(s.puntos[0].i), arriba + altoUtil);
        for (const p of s.puntos) ctx.lineTo(x(p.i), y(p.v));
        ctx.lineTo(x(s.puntos[s.puntos.length - 1].i), arriba + altoUtil);
        ctx.closePath();
        ctx.fillStyle = degradado;
        ctx.fill();
      }
      ctx.beginPath();
      s.puntos.forEach((p, n) => (n ? ctx.lineTo(x(p.i), y(p.v)) : ctx.moveTo(x(p.i), y(p.v))));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Compras (verde) y ventas (rojo) del jugador sobre la primera serie.
    const principal = series[0];
    for (const m of marcadores) {
      const p = principal.puntos[m.indice];
      if (!p || m.indice >= principal.puntos.length - (progreso < 1 ? 1 : 0)) continue;
      ctx.beginPath();
      ctx.arc(x(p.i), y(p.v), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = token(m.tipo === "compra" ? "--verde" : "--rojo");
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colorFondo;
      ctx.stroke();
    }

    // Último punto de cada serie, resaltado.
    for (const s of series) {
      const p = s.puntos[s.puntos.length - 1];
      ctx.beginPath();
      ctx.arc(x(p.i), y(p.v), 10, 0, Math.PI * 2);
      ctx.fillStyle = conTransparencia(s.color, 0.18);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x(p.i), y(p.v), 5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colorFondo;
      ctx.stroke();
    }

    // Etiqueta con el valor actual junto al último punto.
    if (opciones.formatoValor) {
      const p = principal.puntos[principal.puntos.length - 1];
      const texto = opciones.formatoValor(p.v);
      ctx.font = `600 ${FUENTE}`;
      const w = ctx.measureText(texto).width + 14;
      const h = 22;
      let bx = x(p.i) - w / 2;
      bx = Math.max(izq, Math.min(bx, ancho - der - w));
      let by = y(p.v) - h - 12;
      if (by < 0) by = y(p.v) + 12;
      ctx.fillStyle = principal.color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, w, h, 11);
      else ctx.rect(bx, by, w, h);
      ctx.fill();
      ctx.fillStyle = token("--sobre-acento");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(texto, bx + w / 2, by + h / 2 + 0.5);
    }
  }

  function animar(canvas, opciones, duracion) {
    cancelAnimationFrame(canvas._animacion);
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sinMovimiento) return dibujar(canvas, { ...opciones, progreso: 1 });
    const t0 = performance.now();
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - t0) / (duracion || 420));
      dibujar(canvas, { ...opciones, progreso: 1 - Math.pow(1 - t, 3) });
      if (t < 1) canvas._animacion = requestAnimationFrame(paso);
    };
    canvas._animacion = requestAnimationFrame(paso);
  }

  function redibujar(canvas) {
    const opciones = opcionesPorCanvas.get(canvas);
    if (opciones && canvas.isConnected) dibujar(canvas, { ...opciones, progreso: 1 });
  }

  const observador = "ResizeObserver" in window
    ? new ResizeObserver((entradas) => entradas.forEach((e) => redibujar(e.target)))
    : null;
  const vigilados = new WeakSet();
  function vigilarTamaño(canvas) {
    if (!observador || vigilados.has(canvas)) return;
    vigilados.add(canvas);
    observador.observe(canvas);
  }

  // Al cambiar entre modo claro y oscuro los colores cambian: redibujar todo.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    opcionesPorCanvas.forEach((_, canvas) => redibujar(canvas));
  });

  global.GraficoDCA = { dibujar, animar };
})(window);
