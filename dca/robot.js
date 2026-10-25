// El robot rival: un crupier metálico de mirada inquietante, con ambiente de
// mesa de juego clandestina (inspirado en Buckshot Roulette, con diseño propio).
// Aquí está su dibujo, cómo habla (letra a letra) y qué dice en cada momento.
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Dibujo (SVG). Los dientes se colocan a lo largo de la curva de la sonrisa.
  // ---------------------------------------------------------------------------
  function puntoCurva(a, control, b, t) {
    const u = 1 - t;
    return [
      u * u * a[0] + 2 * u * t * control[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * control[1] + t * t * b[1],
    ];
  }

  // Una fila de dientes triangulares: la base sobre la curva y la punta a "largo" px.
  function filaDientes(a, control, b, cuantos, largo) {
    const p = (punto) => `${punto[0].toFixed(1)} ${punto[1].toFixed(1)}`;
    let ruta = "";
    for (let k = 0; k < cuantos; k++) {
      const izquierda = puntoCurva(a, control, b, k / cuantos);
      const derecha = puntoCurva(a, control, b, (k + 1) / cuantos);
      const medio = puntoCurva(a, control, b, (k + 0.5) / cuantos);
      ruta += `M${p(izquierda)}L${p([medio[0], medio[1] + largo])}L${p(derecha)}Z`;
    }
    return ruta;
  }

  const BOCA = "M29 66 Q60 80 91 66 Q60 102 29 66 Z";
  const DIENTES_ARRIBA = filaDientes([29, 66], [60, 80], [91, 66], 12, 5.5);
  const DIENTES_ABAJO = filaDientes([31, 68], [60, 98], [89, 68], 11, -6);

  // Degradados y filtros compartidos. Van en un SVG aparte (no oculto con display:none),
  // porque si estuvieran dentro de una pantalla oculta el navegador no los pintaría.
  const DEFINICIONES = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rb-metal" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stop-color="#6c726d"/>
          <stop offset="0.5" stop-color="#2f3431"/>
          <stop offset="1" stop-color="#111312"/>
        </linearGradient>
        <radialGradient id="rb-cuenca" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0.55" stop-color="#000"/>
          <stop offset="1" stop-color="#1d211e"/>
        </radialGradient>
        <filter id="rb-brillo" x="-2" y="-2" width="5" height="5">
          <feGaussianBlur stdDeviation="2.2" result="halo"/>
          <feMerge><feMergeNode in="halo"/><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="rb-recorte-boca"><path d="${BOCA}"/></clipPath>
      </defs>
    </svg>`;

  const DIBUJO = `
    <svg class="robot-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path d="M8 120 C12 104 30 99 60 99 C90 99 108 104 112 120 Z" fill="#141715" stroke="#000" stroke-width="1.5"/>
      <rect x="49" y="88" width="22" height="14" fill="#1c1f1d" stroke="#000"/>
      <path d="M49 103 L60 108 L49 113 Z M71 103 L60 108 L71 113 Z" fill="#7d1c1c" stroke="#2a0606"/>
      <circle cx="60" cy="108" r="2.6" fill="#5a1212"/>
      <g class="rb-inclinacion">
        <g class="rb-cabeza">
          <path d="M60 7 C88 7 99 22 99 46 C99 64 95 77 86 86 C79 92 70 94 60 94 C50 94 41 92 34 86 C25 77 21 64 21 46 C21 22 32 7 60 7 Z"
                fill="url(#rb-metal)" stroke="#050505" stroke-width="2"/>
          <path d="M29 30 Q60 21 91 30" fill="none" stroke="#0b0c0b" stroke-width="1" opacity="0.7"/>
          <path d="M74 9 L70 18 L75 22 L71 31" fill="none" stroke="#050505" stroke-width="1.3"/>
          <path d="M33 54 l7 -2 M83 59 l6 3 M40 19 l5 2 M86 24 l-4 3" stroke="#a3a9a3" stroke-width="0.6" opacity="0.35"/>
          <g fill="#8d928c" stroke="#111" stroke-width="0.6">
            <circle cx="26" cy="40" r="1.8"/><circle cx="94" cy="40" r="1.8"/>
            <circle cx="30" cy="76" r="1.8"/><circle cx="90" cy="76" r="1.8"/>
          </g>
          <path d="M31 33 Q44 28 57 35 M64 36 Q76 30 88 34" fill="none" stroke="#070707" stroke-width="2.4" stroke-linecap="round"/>
          <ellipse cx="45" cy="46" rx="12.5" ry="13.5" fill="url(#rb-cuenca)"/>
          <ellipse cx="76" cy="47" rx="10" ry="11" fill="url(#rb-cuenca)"/>
          <g class="rb-ojos" filter="url(#rb-brillo)">
            <circle class="rb-pupila" cx="45" cy="47" r="4.4"/>
            <circle class="rb-pupila" cx="76" cy="48" r="3.3"/>
          </g>
          <path d="${BOCA}" fill="#040404"/>
          <g clip-path="url(#rb-recorte-boca)" fill="#d8d2b6" stroke="#3b382c" stroke-width="0.5">
            <path d="${DIENTES_ARRIBA}"/>
            <g class="rb-mandibula"><path d="${DIENTES_ABAJO}"/></g>
          </g>
        </g>
      </g>
    </svg>`;

  let definicionesPuestas = false;
  function prepararDibujo(escena) {
    if (!definicionesPuestas) {
      document.body.insertAdjacentHTML("afterbegin", DEFINICIONES);
      definicionesPuestas = true;
    }
    const hueco = escena.querySelector(".robot");
    if (!hueco.firstElementChild) hueco.innerHTML = DIBUJO;
  }

  // ---------------------------------------------------------------------------
  // Hablar: el texto aparece letra a letra. El resto del texto ya ocupa su sitio
  // (invisible) para que la caja no cambie de tamaño mientras escribe.
  // ---------------------------------------------------------------------------
  const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // animo: "neutral", "burla", "nervioso", "victoria" o "glitch"
  function decir(escena, texto, animo) {
    prepararDibujo(escena);
    escena.dataset.animo = animo || "neutral";
    escena.querySelector(".dialogo-lector").textContent = texto;

    const caja = escena.querySelector(".dialogo-texto");
    if (!caja.firstElementChild) caja.innerHTML = '<span class="escrito"></span><span class="resto"></span>';
    const escrito = caja.querySelector(".escrito");
    const resto = caja.querySelector(".resto");

    clearInterval(escena._escribiendo);
    if (sinMovimiento()) {
      escrito.textContent = texto;
      resto.textContent = "";
      return;
    }
    let letras = 0;
    escena.classList.add("hablando");
    const paso = () => {
      escrito.textContent = texto.slice(0, letras);
      resto.textContent = texto.slice(letras);
      if (letras++ >= texto.length) {
        clearInterval(escena._escribiendo);
        escena.classList.remove("hablando");
      }
    };
    paso();
    escena._escribiendo = setInterval(paso, 26);
  }

  // ---------------------------------------------------------------------------
  // Frases
  // ---------------------------------------------------------------------------
  const FRASES = {
    portada: ["Cada mes meto 100 €. Pase lo que pase. Sin miedo. Sin dudas. ¿Te sientas a jugar?"],
    vuelta: ["¿Otra ronda? Yo no me canso nunca.", "Siéntate. La mesa sigue abierta."],
    empezar: ["48 meses. Tú y yo. Mis 100 € ya están dentro. Tu turno.", "Empieza la partida. Yo ya he invertido. ¿Y tú?"],
    empezarMisterio: ["Ni tú sabes qué hay sobre la mesa. Yo no necesito saberlo."],
    ultimoMes: ["Último mes. Piénsalo bien… o no.", "Última ronda. Que no te tiemble el pulso."],
    ventaConMiedo: ["Vendes cuando cae. El miedo sale caro.", "Vendes con miedo. Eso me gusta."],
    venta: ["¿Vendes? Yo nunca vendo.", "Sacas dinero de la mesa. Interesante…"],
    guardasYSube: ["Guardaste el dinero… y ha subido un {cambio}. Qué pena.", "Tu efectivo ve subir el precio. Desde fuera."],
    comprasEnCaida: ["Compras en la caída. No está mal… para un humano."],
    caidaFuerte: ["Baja un {cambio}. Este mes compro más barato. Gracias.", "Caída del {cambio}. Yo no tiemblo: compro."],
    subidaFuerte: ["Sube un {cambio}. Mis 100 € ya estaban dentro.", "Sube un {cambio}. Yo estaba dentro. ¿Y tú?"],
    jugadorDelante: ["…Vas por delante. Recalculando.", "Me sacas {ventaja}. De momento."],
    robotDelante: ["Te saco {ventaja}. Sigue intentándolo.", "Tic, tac. Voy {ventaja} por delante."],
    relleno: [
      "Otro mes. Otros 100 €. Dentro.",
      "Yo no pienso. Solo invierto.",
      "Invertir. Esperar. Repetir.",
      "¿Nervioso? Yo no tengo nervios.",
      "Tic, tac. El tiempo juega a mi favor.",
    ],
    ganaRobot: ["Constancia. Ni miedo ni prisas. Por eso gano.", "La mesa siempre gana… cuando no se mueve."],
    ganaJugador: ["E-ERROR… esto no… estaba en mis cál-cu-los… Bien jugado, humano."],
    empate: ["Empate. Piensas casi como una máquina."],
  };

  let ultimaFrase = "";
  function elegir(grupo, valores) {
    const opciones = FRASES[grupo].filter((f) => f !== ultimaFrase);
    const lista = opciones.length ? opciones : FRASES[grupo];
    let frase = lista[Math.floor(Math.random() * lista.length)];
    for (const [clave, valor] of Object.entries(valores || {})) frase = frase.replaceAll(`{${clave}}`, valor);
    ultimaFrase = frase;
    return frase;
  }

  /**
   * Comentario del robot al empezar un mes nuevo.
   * c: { mes, ultimoMes, operacion, cambioMes, cambioAlDecidir, ventaja, aportado,
   *      formatoPorcentaje, formatoEuros }
   *   cambioMes: cuánto ha cambiado el precio al pasar al mes nuevo
   *   cambioAlDecidir: cuánto había cambiado el mes en que decidiste
   *   ventaja: tu dinero menos el del robot
   */
  function comentarMes(c) {
    const umbral = c.aportado * 0.03;
    const animo = c.ventaja > umbral ? "nervioso" : c.ventaja < -umbral ? "burla" : "neutral";
    const valores = {
      cambio: c.formatoPorcentaje(Math.abs(c.cambioMes)),
      ventaja: c.formatoEuros(Math.abs(c.ventaja)),
    };
    const tipo = c.operacion.tipo;

    if (c.ultimoMes) return { texto: elegir("ultimoMes"), animo };
    if (tipo === "venta") return { texto: elegir(c.cambioAlDecidir < 0 ? "ventaConMiedo" : "venta"), animo: "burla" };
    if (tipo === "guardar" && c.cambioMes > 0.03) return { texto: elegir("guardasYSube", valores), animo: "burla" };
    if (tipo === "compra" && c.cambioAlDecidir < -0.05) return { texto: elegir("comprasEnCaida"), animo };
    if (c.cambioMes < -0.08) return { texto: elegir("caidaFuerte", valores), animo };
    if (c.cambioMes > 0.08) return { texto: elegir("subidaFuerte", valores), animo };
    if (animo !== "neutral" && Math.random() < 0.6) {
      return { texto: elegir(animo === "nervioso" ? "jugadorDelante" : "robotDelante", valores), animo };
    }
    return { texto: elegir("relleno"), animo };
  }

  global.RobotDCA = {
    decir,
    comentarMes,
    frase: elegir,
  };
})(window);
