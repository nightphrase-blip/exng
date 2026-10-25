// Dibujos 2D que se pegan sobre los objetos 3D: cartas, cara del robot y tablet.
(function (global) {
  "use strict";

  const FUENTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function lienzo(ancho, alto) {
    const c = document.createElement("canvas");
    c.width = ancho;
    c.height = alto;
    return c;
  }

  function rectRedondo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------------------------------------------------------------------------
  // Iconos (dibujados a mano para no depender de emojis)
  // ---------------------------------------------------------------------------
  function flecha(ctx, x, y, s, sube) {
    const dir = sube ? -1 : 1;
    ctx.lineWidth = s * 0.12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - dir * s * 0.35);
    ctx.lineTo(x - s * 0.15, y - dir * s * 0.02);
    ctx.lineTo(x + s * 0.05, y - dir * s * 0.18);
    ctx.lineTo(x + s * 0.45, y + dir * s * 0.32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.45, y + dir * s * 0.32);
    ctx.lineTo(x + s * 0.12, y + dir * s * 0.3);
    ctx.moveTo(x + s * 0.45, y + dir * s * 0.32);
    ctx.lineTo(x + s * 0.42, y + dir * s * 0.02);
    ctx.stroke();
  }

  function monedas(ctx, x, y, s) {
    ctx.lineWidth = s * 0.07;
    for (let i = 0; i < 4; i++) {
      const yy = y + s * 0.3 - i * s * 0.2;
      ctx.beginPath();
      ctx.ellipse(x, yy, s * 0.38, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function caraRobotIcono(ctx, x, y, s) {
    ctx.lineWidth = s * 0.08;
    rectRedondo(ctx, x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.62, s * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.3);
    ctx.lineTo(x, y - s * 0.48);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - s * 0.52, s * 0.07, 0, Math.PI * 2);
    ctx.arc(x - s * 0.17, y - s * 0.02, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + s * 0.17, y - s * 0.02, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + s * 0.1, s * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  function volver(ctx, x, y, s) {
    ctx.lineWidth = s * 0.12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(x + s * 0.05, y + s * 0.05, s * 0.3, -Math.PI * 0.5, Math.PI * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.05, y - s * 0.25);
    ctx.lineTo(x - s * 0.35, y - s * 0.25);
    ctx.moveTo(x - s * 0.18, y - s * 0.42);
    ctx.lineTo(x - s * 0.35, y - s * 0.25);
    ctx.lineTo(x - s * 0.18, y - s * 0.08);
    ctx.stroke();
  }

  const ICONOS = {
    sube: (ctx, x, y, s) => flecha(ctx, x, y, s, true),
    baja: (ctx, x, y, s) => flecha(ctx, x, y, s, false),
    monedas,
    robot: caraRobotIcono,
    volver,
  };

  // ---------------------------------------------------------------------------
  // Cartas
  // carta: { titulo, subtitulo, importe, color, icono, desactivada }
  // ---------------------------------------------------------------------------
  const ANCHO_CARTA = 360;
  const ALTO_CARTA = 504;

  function dibujarCarta(carta) {
    const c = lienzo(ANCHO_CARTA, ALTO_CARTA);
    const ctx = c.getContext("2d");
    const w = ANCHO_CARTA;
    const h = ALTO_CARTA;

    // Marco crema y panel de color
    ctx.fillStyle = "#fff7e8";
    rectRedondo(ctx, 0, 0, w, h, 34);
    ctx.fill();
    const degradado = ctx.createLinearGradient(0, 0, 0, h);
    degradado.addColorStop(0, carta.color);
    degradado.addColorStop(1, oscurecer(carta.color, 0.25));
    ctx.fillStyle = degradado;
    rectRedondo(ctx, 16, 16, w - 32, h - 32, 24);
    ctx.fill();

    // Brillo diagonal
    ctx.save();
    rectRedondo(ctx, 16, 16, w - 32, h - 32, 24);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w, h * 0.25);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    // Círculo con el icono
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(w / 2, 176, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ICONOS[carta.icono](ctx, w / 2, 176, 104);

    // Esquinas como en las cartas de verdad
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `800 30px ${FUENTE}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(carta.esquina || "", 34, 30);
    ctx.save();
    ctx.translate(w - 34, h - 30);
    ctx.rotate(Math.PI);
    ctx.fillText(carta.esquina || "", 0, 0);
    ctx.restore();

    // Textos
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${carta.titulo.length > 9 ? 40 : 48}px ${FUENTE}`;
    ctx.fillText(carta.titulo, w / 2, 336);
    ctx.font = `600 26px ${FUENTE}`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(carta.subtitulo, w / 2, 376);
    if (carta.importe) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      rectRedondo(ctx, 52, 404, w - 104, 56, 28);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 32px ${FUENTE}`;
      ctx.fillText(carta.importe, w / 2, 443);
    }

    if (carta.desactivada) {
      ctx.fillStyle = "rgba(40,40,48,0.62)";
      rectRedondo(ctx, 0, 0, w, h, 34);
      ctx.fill();
    }
    return c;
  }

  function dibujarDorso() {
    const c = lienzo(ANCHO_CARTA, ALTO_CARTA);
    const ctx = c.getContext("2d");
    const w = ANCHO_CARTA;
    const h = ALTO_CARTA;
    ctx.fillStyle = "#fff7e8";
    rectRedondo(ctx, 0, 0, w, h, 34);
    ctx.fill();
    ctx.fillStyle = "#2b3a8c";
    rectRedondo(ctx, 16, 16, w - 32, h - 32, 24);
    ctx.fill();
    ctx.save();
    rectRedondo(ctx, 16, 16, w - 32, h - 32, 24);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 6;
    for (let i = -h; i < w + h; i += 36) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#ffcf5a";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b3a8c";
    ctx.font = `900 46px ${FUENTE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DCA", w / 2, h / 2 + 2);
    return c;
  }

  function oscurecer(hex, cantidad) {
    const n = parseInt(hex.slice(1), 16);
    const canal = (desplazamiento) => Math.round(((n >> desplazamiento) & 255) * (1 - cantidad));
    return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
  }

  // ---------------------------------------------------------------------------
  // Cara del robot (una pantalla con ojos y boca)
  // expresion: "normal", "feliz", "burla", "nervioso", "sorpresa", "triste"
  // ---------------------------------------------------------------------------
  function dibujarCara(ctx, w, h, expresion, tiempo, hablando) {
    const fondo = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h / 2, w * 0.7);
    fondo.addColorStop(0, "#173a5c");
    fondo.addColorStop(1, "#0a1828");
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, w, h);

    const color = expresion === "nervioso" ? "#ffd166" : "#7cf3ff";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.lineCap = "round";
    ctx.lineWidth = 12;

    // Parpadeo cada ~4 s
    const parpadea = tiempo % 4.2 > 4.05;
    const ojoY = h * 0.42;
    for (const lado of [-1, 1]) {
      const x = w / 2 + lado * w * 0.2;
      if (parpadea) {
        ctx.beginPath();
        ctx.moveTo(x - 20, ojoY);
        ctx.lineTo(x + 20, ojoY);
        ctx.stroke();
      } else if (expresion === "feliz") {
        ctx.beginPath();
        ctx.arc(x, ojoY + 10, 22, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (expresion === "burla") {
        rectRedondo(ctx, x - 22, ojoY - 6, 44, 20, 9);
        ctx.fill();
      } else if (expresion === "sorpresa") {
        ctx.beginPath();
        ctx.arc(x, ojoY, 24, 0, Math.PI * 2);
        ctx.stroke();
      } else if (expresion === "nervioso") {
        ctx.beginPath();
        ctx.arc(x + Math.sin(tiempo * 9) * 2, ojoY, 11, 0, Math.PI * 2);
        ctx.fill();
      } else if (expresion === "triste") {
        rectRedondo(ctx, x - 18, ojoY - 12, 36, 34, 14);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 22 * lado, ojoY - 30);
        ctx.lineTo(x + 20 * lado, ojoY - 22);
        ctx.stroke();
      } else {
        rectRedondo(ctx, x - 20, ojoY - 28, 40, 56, 18);
        ctx.fill();
      }
    }

    // Boca
    const bocaY = h * 0.74;
    ctx.lineWidth = 10;
    if (hablando && Math.sin(tiempo * 22) > -0.2) {
      ctx.beginPath();
      ctx.ellipse(w / 2, bocaY, 26, 10 + Math.abs(Math.sin(tiempo * 22)) * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expresion === "sorpresa") {
      ctx.beginPath();
      ctx.arc(w / 2, bocaY, 14, 0, Math.PI * 2);
      ctx.stroke();
    } else if (expresion === "triste") {
      ctx.beginPath();
      ctx.arc(w / 2, bocaY + 24, 30, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    } else if (expresion === "nervioso") {
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) ctx.lineTo(w / 2 - 36 + i * 12, bocaY + (i % 2 ? -6 : 6));
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#8fd3ff";
      ctx.beginPath();
      ctx.ellipse(w * 0.84, h * 0.3 + (tiempo * 20) % 20, 7, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expresion === "burla") {
      ctx.beginPath();
      ctx.moveTo(w / 2 - 34, bocaY + 2);
      ctx.quadraticCurveTo(w / 2 + 6, bocaY + 22, w / 2 + 38, bocaY - 12);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(w / 2, bocaY - 18, 34, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Líneas de pantalla
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  }

  // ---------------------------------------------------------------------------
  // Tablet con la gráfica del activo
  // d: { nombre, precio, cambio, fechaPrecio, valores, inicio, marcadores, pie }
  // ---------------------------------------------------------------------------
  function dibujarTablet(ctx, w, h, d) {
    const F = global.Formato;
    ctx.fillStyle = "#0e1726";
    ctx.fillRect(0, 0, w, h);

    if (!d) {
      ctx.fillStyle = "#93a3bd";
      ctx.font = `600 40px ${FUENTE}`;
      ctx.textAlign = "center";
      ctx.fillText("Cargando precios…", w / 2, h / 2);
      return;
    }

    // Cabecera
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "#93a3bd";
    ctx.font = `700 30px ${FUENTE}`;
    ctx.fillText(d.nombre.toUpperCase(), 48, 66);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 72px ${FUENTE}`;
    ctx.fillText(F.precio(d.precio), 48, 142);

    const sube = d.cambio >= 0;
    const etiqueta = `${sube ? "▲" : "▼"} ${F.porcentaje(d.cambio)}`;
    ctx.font = `800 34px ${FUENTE}`;
    const anchoEtiqueta = ctx.measureText(etiqueta).width + 36;
    ctx.fillStyle = sube ? "rgba(52, 211, 153, 0.18)" : "rgba(248, 113, 113, 0.18)";
    rectRedondo(ctx, w - 48 - anchoEtiqueta, 92, anchoEtiqueta, 56, 28);
    ctx.fill();
    ctx.fillStyle = sube ? "#34d399" : "#f87171";
    ctx.textAlign = "center";
    ctx.fillText(etiqueta, w - 48 - anchoEtiqueta / 2, 132);
    ctx.fillStyle = "#93a3bd";
    ctx.font = `600 24px ${FUENTE}`;
    ctx.textAlign = "right";
    ctx.fillText(`Cierre del ${F.fechaCorta(d.fechaPrecio)}`, w - 48, 66);

    // Gráfica
    const valores = d.valores;
    const x0 = 48;
    const x1 = w - 48;
    const y0 = 190;
    const y1 = h - 70;
    let min = Math.min(...valores);
    let max = Math.max(...valores);
    if (min === max) {
      min *= 0.98;
      max *= 1.02;
    }
    const margen = (max - min) * 0.1;
    min -= margen;
    max += margen;
    const x = (i) => x0 + (i / Math.max(1, valores.length - 1)) * (x1 - x0);
    const y = (v) => y1 - ((v - min) / (max - min)) * (y1 - y0);

    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 3; i++) {
      const yy = y0 + ((y1 - y0) * i) / 3;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x1, yy);
      ctx.stroke();
    }

    if (d.inicio !== undefined && d.inicio !== null && d.inicio >= 0) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(x0, y0, x(d.inicio) - x0, y1 - y0);
      ctx.strokeStyle = "rgba(255, 207, 90, 0.7)";
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(x(d.inicio), y0);
      ctx.lineTo(x(d.inicio), y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffcf5a";
      ctx.font = `700 22px ${FUENTE}`;
      ctx.textAlign = "left";
      ctx.fillText("Empieza la temporada", Math.min(x(d.inicio) + 10, x1 - 250), y0 + 26);
    }

    const color = sube ? "#34d399" : "#f87171";
    const relleno = ctx.createLinearGradient(0, y0, 0, y1);
    relleno.addColorStop(0, sube ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)");
    relleno.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(x(0), y1);
    valores.forEach((v, i) => ctx.lineTo(x(i), y(v)));
    ctx.lineTo(x(valores.length - 1), y1);
    ctx.closePath();
    ctx.fillStyle = relleno;
    ctx.fill();
    ctx.beginPath();
    valores.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.stroke();

    for (const m of d.marcadores || []) {
      if (m.indice < 0 || m.indice >= valores.length) continue;
      ctx.beginPath();
      ctx.arc(x(m.indice), y(valores[m.indice]), 11, 0, Math.PI * 2);
      ctx.fillStyle = m.tipo === "compra" ? "#34d399" : "#f87171";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#0e1726";
      ctx.stroke();
    }

    const ultimo = valores.length - 1;
    ctx.beginPath();
    ctx.arc(x(ultimo), y(valores[ultimo]), 22, 0, Math.PI * 2);
    ctx.fillStyle = sube ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x(ultimo), y(valores[ultimo]), 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = "#93a3bd";
    ctx.font = `600 24px ${FUENTE}`;
    ctx.textAlign = "center";
    ctx.fillText(d.pie || "", w / 2, h - 24);
  }

  global.Texturas = { lienzo, dibujarCarta, dibujarDorso, dibujarCara, dibujarTablet, rectRedondo, ANCHO_CARTA, ALTO_CARTA };
})(window);
