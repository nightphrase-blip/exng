// Pantallas del juego: elegir activo, jugar los 48 meses y ver el resultado.
(function () {
  "use strict";

  const L = window.LogicaDCA;
  const G = window.GraficoDCA;
  const ACTIVOS = window.DATOS_DCA || [];

  const $ = (selector) => document.querySelector(selector);

  // ---------------------------------------------------------------------------
  // Formato de números en español.
  // Usamos "de-DE" porque, con los mismos signos que en España, separa también
  // los miles en números de 4 cifras (4.800 €), que en "es-ES" saldrían como 4800.
  // ---------------------------------------------------------------------------
  const formato = (opciones) => new Intl.NumberFormat("de-DE", opciones);
  const sinDecimales = formato({ maximumFractionDigits: 0 });
  const hastaDosDecimales = formato({ maximumFractionDigits: 2 });
  const tresCifras = formato({ maximumSignificantDigits: 3 });
  const unDecimal = formato({ minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const hastaUnDecimal = formato({ maximumFractionDigits: 1 });

  const euros = (v) => `${sinDecimales.format(Math.round(v) || 0)}\u00a0€`;

  function porcentaje(v) {
    const redondeado = Math.round(v * 1000) / 10 || 0;
    return `${redondeado > 0 ? "+" : ""}${unDecimal.format(redondeado)}\u00a0%`;
  }

  function precioEnEuros(v) {
    if (v >= 1000) return `${sinDecimales.format(v)}\u00a0€`;
    if (v >= 1) return `${hastaDosDecimales.format(v)}\u00a0€`;
    return `${tresCifras.format(v)}\u00a0€`;
  }

  const indice = (v) => hastaUnDecimal.format(v);

  const escapar = (texto) =>
    String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const año = (aaaamm) => aaaamm.slice(0, 4);

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  let partida = null;
  let eleccion = null; // id del activo elegido o "misterio", para "Jugar otra vez"

  function mostrarPantalla(id) {
    for (const pantalla of document.querySelectorAll(".pantalla")) pantalla.hidden = pantalla.id !== id;
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Pantalla 1: elegir activo
  // ---------------------------------------------------------------------------
  function pintarInicio() {
    if (!ACTIVOS.length) {
      $("#lista-activos").innerHTML =
        '<p class="aviso">Faltan los datos de precios. Ejecuta <code>python3 dca/herramientas/descargar_datos.py</code>.</p>';
      return;
    }

    const misterio = `
      <button class="tarjeta-activo tarjeta-misterio" type="button" data-id="misterio">
        <span class="insignia">?</span>
        <span class="tarjeta-texto">
          <span class="tarjeta-nombre">Misterio</span>
          <span class="tarjeta-desc">Un activo al azar con el nombre oculto. Lo descubrirás al final.</span>
        </span>
        <span class="tarjeta-flecha" aria-hidden="true">→</span>
      </button>`;

    const tarjetas = ACTIVOS.map((a) => {
      const hasta = L.mesDelIndice(a, a.precios.length - 1);
      return `
        <button class="tarjeta-activo activo-${escapar(a.id)}" type="button" data-id="${escapar(a.id)}">
          <span class="insignia">${escapar(a.simbolo)}</span>
          <span class="tarjeta-texto">
            <span class="tarjeta-nombre">${escapar(a.nombre)}</span>
            <span class="tarjeta-desc">${escapar(a.descripcion)}</span>
            <span class="tarjeta-datos">Datos de ${año(a.desde)} a ${año(hasta)}</span>
          </span>
        </button>`;
    });

    $("#lista-activos").innerHTML = misterio + tarjetas.join("");
    $("#lista-fuentes").innerHTML = ACTIVOS.map(
      (a) => `<li><strong>${escapar(a.nombre)}:</strong> <a href="${escapar(a.url)}" target="_blank" rel="noopener">${escapar(a.fuente)}</a></li>`,
    ).join("");
  }

  $("#lista-activos").addEventListener("click", (evento) => {
    const tarjeta = evento.target.closest("[data-id]");
    if (tarjeta) empezar(tarjeta.dataset.id);
  });

  function empezar(id) {
    eleccion = id;
    const misterio = id === "misterio";
    const activo = misterio
      ? ACTIVOS[Math.floor(Math.random() * ACTIVOS.length)]
      : ACTIVOS.find((a) => a.id === id);
    partida = L.nuevaPartida(activo, misterio);

    $("#nombre-activo-juego").textContent = misterio ? "❓ Misterio" : activo.nombre;
    $("#etiqueta-precio").textContent = misterio ? "Precio (100 = inicio)" : "Precio este mes";
    $("#mensaje").textContent = "Has recibido tus primeros 100 €. ¿Qué haces con ellos?";
    mostrarPantalla("pantalla-juego");
    pintarPartida(false);
  }

  // ---------------------------------------------------------------------------
  // Pantalla 2: la partida
  // ---------------------------------------------------------------------------

  // En modo misterio el precio real delataría el activo (60.000 € = Bitcoin),
  // así que lo mostramos como índice: 100 = precio del primer mes.
  function precioVisible(valor) {
    return partida.misterio ? (valor / L.precio(partida, 0)) * 100 : valor;
  }

  function formatoPrecioVisible(valor) {
    return partida.misterio ? indice(valor) : precioEnEuros(valor);
  }

  function pintarPartida(animar) {
    const { activo, inicio, mes, jugador } = partida;
    const precioHoy = L.precio(partida);
    const precioAntes = activo.precios[inicio + mes - 1];
    const cambioMes = precioHoy / precioAntes - 1;
    const cambioTotal = precioHoy / L.precio(partida, 0) - 1;

    $("#texto-mes").textContent = `Mes ${mes + 1} de ${L.MESES_PARTIDA}`;
    $("#barra-progreso").style.width = `${((mes + 1) / L.MESES_PARTIDA) * 100}%`;
    $(".progreso").setAttribute("aria-valuenow", String(mes + 1));

    $("#precio-actual").textContent = formatoPrecioVisible(precioVisible(precioHoy));
    const cambio = $("#cambio-mes");
    cambio.textContent = `${cambioMes >= 0 ? "▲" : "▼"} ${porcentaje(cambioMes)} este mes`;
    cambio.className = `cambio ${cambioMes >= 0 ? "sube" : "baja"}`;
    $("#cambio-total").textContent = mes === 0 ? "Empieza la partida" : `${porcentaje(cambioTotal)} desde el inicio`;

    // Marcadores
    const valorInvertido = jugador.unidades * precioHoy;
    $("#valor-jugador").textContent = euros(L.valorJugador(partida));
    $("#efectivo-jugador").textContent = euros(jugador.efectivo);
    $("#invertido-jugador").textContent = euros(valorInvertido);
    $("#valor-robot").textContent = euros(L.valorRobot(partida));
    $("#metido-robot").textContent = euros(partida.robot.comprado);
    const ventaja = L.valorJugador(partida) - L.valorRobot(partida);
    $(".marcador-jugador").classList.toggle("va-ganando", ventaja > 0.5);
    $(".marcador-robot").classList.toggle("va-ganando", ventaja < -0.5);

    // Botones
    $("#importe-invertir").textContent = `(${euros(jugador.efectivo)})`;
    $("#btn-invertir").disabled = jugador.efectivo <= 0;
    const puedeVender = jugador.unidades > 0;
    $("#btn-vender").disabled = !puedeVender;
    $("#pista-venta").hidden = puedeVender;
    for (const chip of document.querySelectorAll(".chip-venta")) {
      chip.querySelector("small").textContent = euros(valorInvertido * Number(chip.dataset.fraccion));
    }
    cerrarOpcionesVenta();

    // Gráfico: 12 meses antes de empezar + los meses jugados hasta hoy.
    const desde = inicio - L.MESES_PREVIOS;
    const valores = activo.precios.slice(desde, inicio + mes + 1).map(precioVisible);
    const opciones = {
      series: [{ valores, color: "--linea-precio", relleno: true }],
      totalPuntos: L.MESES_PREVIOS + L.MESES_PARTIDA + 1,
      inicioJuego: L.MESES_PREVIOS,
      marcadores: marcadoresDeOperaciones(),
      formatoEje: formatoPrecioVisible,
      formatoValor: formatoPrecioVisible,
    };
    const canvas = $("#grafico-juego");
    canvas.setAttribute("aria-label",
      `Gráfico del precio. Este mes: ${formatoPrecioVisible(precioVisible(precioHoy))}, ${porcentaje(cambioMes)} respecto al mes anterior.`);
    if (animar) G.animar(canvas, opciones);
    else G.dibujar(canvas, opciones);
  }

  function marcadoresDeOperaciones() {
    return partida.operaciones
      .filter((op) => op.tipo !== "guardar")
      .map((op) => ({ indice: L.MESES_PREVIOS + op.mes, tipo: op.tipo }));
  }

  function textoOperacion(op) {
    if (op.tipo === "compra") return `Has invertido ${euros(op.euros)}.`;
    if (op.tipo === "venta") return `Has vendido por ${euros(op.euros)}.`;
    return "Has guardado el dinero en efectivo.";
  }

  function jugar(accion, fraccion) {
    const operacion = L.decidir(partida, accion, fraccion);
    if (L.terminada(partida)) {
      mostrarFinal();
      return;
    }
    const mensaje = $("#mensaje");
    mensaje.textContent = `${textoOperacion(operacion)} Nuevo mes: recibes otros 100 €.`;
    mensaje.classList.remove("aparece");
    void mensaje.offsetWidth; // reinicia la animación del mensaje
    mensaje.classList.add("aparece");
    pintarPartida(true);
  }

  function cerrarOpcionesVenta() {
    $("#opciones-venta").hidden = true;
    $("#btn-vender").setAttribute("aria-expanded", "false");
  }

  $("#btn-invertir").addEventListener("click", () => jugar("invertir"));
  $("#btn-guardar").addEventListener("click", () => jugar("guardar"));
  $("#btn-vender").addEventListener("click", () => {
    const opciones = $("#opciones-venta");
    opciones.hidden = !opciones.hidden;
    $("#btn-vender").setAttribute("aria-expanded", String(!opciones.hidden));
  });
  $("#opciones-venta").addEventListener("click", (evento) => {
    const chip = evento.target.closest("[data-fraccion]");
    if (chip) jugar("vender", Number(chip.dataset.fraccion));
  });
  $("#btn-salir").addEventListener("click", () => {
    if (confirm("¿Seguro que quieres salir? Perderás esta partida.")) volverAlInicio();
  });

  // ---------------------------------------------------------------------------
  // Pantalla 3: resultado
  // ---------------------------------------------------------------------------
  function mostrarFinal() {
    const r = L.resultado(partida);
    const { activo, inicio } = partida;
    const empate = Math.abs(r.diferencia) < 1;
    const ganaJugador = !empate && r.diferencia > 0;

    $("#final-emoji").textContent = empate ? "🤝" : ganaJugador ? "🎉" : "🤖";
    $("#final-titulo").textContent = empate
      ? "¡Empate con el robot!"
      : ganaJugador ? "¡Has ganado al robot!" : "El robot gana esta vez";
    $("#final-subtitulo").textContent = empate
      ? "Habéis terminado con prácticamente el mismo dinero."
      : `${ganaJugador ? "Le sacas" : "Te saca"} ${euros(Math.abs(r.diferencia))} de diferencia.`;

    // Revelación del activo y las fechas.
    const precioInicio = L.precio(partida, 0);
    const precioFin = L.precio(partida, L.MESES_PARTIDA);
    $("#final-insignia").textContent = activo.simbolo;
    $("#final-insignia").className = `insignia activo-${activo.id}`;
    $("#final-activo").textContent = activo.nombre;
    $("#final-fechas").textContent =
      `De ${L.nombreMes(r.mesInicio)} a ${L.nombreMes(r.mesFin)} (48 meses).`;
    $("#final-evolucion").innerHTML =
      `En ese tiempo el precio pasó de <strong>${precioEnEuros(precioInicio)}</strong> a ` +
      `<strong>${precioEnEuros(precioFin)}</strong> ` +
      `<span class="${precioFin >= precioInicio ? "sube" : "baja"}">(${porcentaje(precioFin / precioInicio - 1)})</span>.`;

    // Tabla jugador contra robot.
    const mejor = (a, b, mayorEsMejor = true) =>
      Math.abs(a - b) < 0.5 ? ["", ""] : (a > b) === mayorEsMejor ? ["gana", ""] : ["", "gana"];
    const filas = [
      ["Dinero invertido", euros(r.jugador.invertido), euros(r.robot.invertido), ["", ""]],
      ["Valor final", euros(r.jugador.valorFinal), euros(r.robot.valorFinal), mejor(r.jugador.valorFinal, r.robot.valorFinal)],
      ["Rentabilidad", porcentaje(r.jugador.rentabilidad), porcentaje(r.robot.rentabilidad), mejor(r.jugador.rentabilidad, r.robot.rentabilidad)],
    ];
    $("#tabla-resultado").innerHTML = filas
      .map(([nombre, tu, robot, [claseTu, claseRobot]]) =>
        `<tr><th scope="row">${nombre}</th><td class="${claseTu}">${tu}</td><td class="${claseRobot}">${robot}</td></tr>`)
      .join("");

    const notas = [`Los dos recibisteis ${euros(r.aportado)} en total (100 € × 48 meses). La rentabilidad compara el valor final con esos ${euros(r.aportado)}.`];
    if (r.jugador.vendido > 0) {
      notas.push(`Tu dinero invertido es lo que compraste (${euros(partida.jugador.comprado)}) menos lo que vendiste (${euros(r.jugador.vendido)}).`);
    }
    if (r.jugador.efectivo >= 1) notas.push(`Terminaste con ${euros(r.jugador.efectivo)} en efectivo sin invertir (cuentan en tu valor final).`);
    $("#nota-final").textContent = notas.join(" ");

    $("#leccion").textContent = leccion(r, empate, ganaJugador, precioFin / precioInicio - 1);

    mostrarPantalla("pantalla-final");

    // Gráficos con fechas reales: una etiqueta por año (en enero).
    const etiquetasAños = (primerIndice, cuantos) => {
      const etiquetas = [];
      for (let i = 0; i < cuantos; i++) {
        const mes = L.mesDelIndice(activo, primerIndice + i);
        if (mes.endsWith("-01")) etiquetas.push({ indice: i, texto: año(mes) });
      }
      return etiquetas;
    };

    G.animar($("#grafico-final-valor"), {
      series: [
        { valores: partida.historial.map((h) => h.robot), color: "--linea-robot" },
        { valores: partida.historial.map((h) => h.jugador), color: "--linea-jugador" },
      ],
      totalPuntos: L.MESES_PARTIDA + 1,
      etiquetasX: etiquetasAños(inicio, L.MESES_PARTIDA + 1),
      formatoEje: euros,
    }, 900);

    const desde = inicio - L.MESES_PREVIOS;
    const total = L.MESES_PREVIOS + L.MESES_PARTIDA + 1;
    G.dibujar($("#grafico-final-precio"), {
      series: [{ valores: activo.precios.slice(desde, desde + total), color: "--linea-precio", relleno: true }],
      totalPuntos: total,
      inicioJuego: L.MESES_PREVIOS,
      marcadores: marcadoresDeOperaciones(),
      etiquetasX: etiquetasAños(desde, total),
      formatoEje: precioEnEuros,
      formatoValor: precioEnEuros,
    });
  }

  function leccion(r, empate, ganaJugador, cambioPrecio) {
    const textos = [];
    if (empate) {
      textos.push("Has hecho prácticamente lo mismo que el robot: invertir con constancia.");
    } else if (ganaJugador) {
      textos.push("¡Bien jugado! Esta vez acertaste mejor que el robot. Pero ojo: adivinar cuándo comprar y vender es muy difícil, y a veces es pura suerte. Juega otra partida y comprueba si lo repites.");
    } else {
      textos.push("El robot gana sin pensar: invierte siempre lo mismo y no intenta adivinar el mercado. Esa constancia es la gran ventaja del DCA.");
    }
    if (r.jugador.efectivo >= 1 && cambioPrecio > 0) {
      textos.push("Guardar dinero en efectivo mientras el precio sube hace que te pierdas parte de la subida.");
    }
    if (cambioPrecio < 0) {
      textos.push(`En esta época el precio bajó (${porcentaje(cambioPrecio)}). Invertir siempre tiene riesgo: puede salir mal incluso haciendo DCA.`);
    }
    return textos.join(" ");
  }

  function volverAlInicio() {
    partida = null;
    mostrarPantalla("pantalla-inicio");
  }

  $("#btn-otra").addEventListener("click", () => empezar(eleccion));
  $("#btn-cambiar").addEventListener("click", volverAlInicio);

  pintarInicio();
})();
