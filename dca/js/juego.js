// El juego: une las reglas (temporada.js), la mesa 3D (escena.js) y los paneles.
(async function () {
  "use strict";

  const T = window.TemporadaDCA;
  const F = window.Formato;
  const X = window.Texturas;
  const R = window.FrasesRobi;
  const $ = (selector) => document.querySelector(selector);

  const COLORES = { sp500: "#2563eb", nasdaq: "#7c3aed", ibex35: "#dc2626", oro: "#ca8a04", bitcoin: "#f7931a", ethereum: "#627eea" };
  const tactil = window.matchMedia("(pointer: coarse)").matches;
  const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esperar = (ms) => new Promise((r) => setTimeout(r, sinMovimiento() ? 0 : ms));
  const dias = (n) => (n === 1 ? "1 día" : `${n} días`);
  const escapar = (texto) =>
    String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------------------------------------------------------------------------
  // Hoy. Con ?dia=3 en la dirección se juega como si fuera dentro de 3 días (para probar).
  // ---------------------------------------------------------------------------
  const desfase = Number(new URLSearchParams(location.search).get("dia")) || 0;
  const hoy = () => T.sumarDias(T.textoFecha(new Date()), desfase);
  if (desfase) {
    $("#aviso-prueba").hidden = false;
    $("#aviso-prueba").textContent = `Modo prueba: ${desfase > 0 ? "+" : ""}${desfase} días`;
  }

  // ---------------------------------------------------------------------------
  // Partida guardada en este navegador
  // ---------------------------------------------------------------------------
  const CLAVE = "mesa-dca-v1";
  const perfilVacio = () => ({ ahorroMensual: null, racha: 0, mejorRacha: 0, ultimoDiaJugado: null, temporada: null, temporadas: [] });
  let perfil = perfilVacio();
  try {
    perfil = Object.assign(perfilVacio(), JSON.parse(localStorage.getItem(CLAVE)) || {});
  } catch (error) {
    // sin partida guardada
  }
  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(perfil));
    } catch (error) {
      // almacenamiento bloqueado: se juega igual, pero no se recordará
    }
  }

  // ---------------------------------------------------------------------------
  // Mesa 3D (o, si el navegador no puede, una versión plana)
  // ---------------------------------------------------------------------------
  let escena;
  try {
    escena = window.Escena3D.crear($("#lienzo-3d"), {
      efectivo: $("#etiqueta-efectivo"),
      invertido: $("#etiqueta-invertido"),
      robot: $("#etiqueta-robot"),
    });
  } catch (error) {
    console.warn("Sin 3D:", error);
    escena = escenaPlana();
  }

  function escenaPlana() {
    document.body.classList.add("sin-3d");
    const lienzo = $("#grafico-plano");
    lienzo.hidden = false;
    const nada = () => Promise.resolve();
    return {
      ponerMano: nada,
      quitarMano() {},
      jugarCartaDeLaMano: nada,
      robotJuega: nada,
      limpiarMesa() {},
      colocarCarta() {},
      ponerFichas: nada,
      pintarTablet: (d) => X.dibujarTablet(lienzo.getContext("2d"), 1024, 640, d),
      expresion() {},
      hablar() {},
      alJugar() {},
      alTocarTablet() {},
      alMoverMano() {},
    };
  }

  // ---------------------------------------------------------------------------
  // Precios
  // ---------------------------------------------------------------------------
  const datos = await window.DatosDCA.cargar(2500);
  if (!datos || !datos.activos || !datos.activos.length) {
    mostrarPanel("panel-error");
    return;
  }
  const serieDe = (id) => datos.activos.find((a) => a.id === id);

  function resumen(serie) {
    const actual = T.precioDelDia(serie, hoy());
    const anterior = serie.precios[actual.indice - 1] || actual.precio;
    const hace30 = T.cierreHasta(serie, T.sumarDias(actual.fecha, -30)).precio;
    return { ...actual, cambioDia: actual.precio / anterior - 1, cambio30: actual.precio / hace30 - 1 };
  }

  // Lo que se ve en la tablet: los últimos 90 cierres, con tus compras y ventas.
  function datosParaTablet(serie, t) {
    const actual = T.precioDelDia(serie, hoy());
    const desde = Math.max(0, actual.indice - 89);
    const valores = serie.precios.slice(desde, actual.indice + 1);
    const anterior = serie.precios[actual.indice - 1] || actual.precio;
    let inicio = null;
    let marcadores = [];
    if (t && t.activoId === serie.id && t.dias.length) {
      inicio = serie.fechas.indexOf(t.dias[0].fechaPrecio) - desde;
      marcadores = t.dias
        .filter((d) => d.carta === "invertir" || (d.carta || "").startsWith("vender"))
        .map((d) => ({ indice: serie.fechas.indexOf(d.fechaPrecio) - desde, tipo: d.carta === "invertir" ? "compra" : "venta" }));
    }
    return {
      nombre: serie.nombre,
      precio: actual.precio,
      cambio: actual.precio / anterior - 1,
      fechaPrecio: actual.fecha,
      valores,
      inicio,
      marcadores,
      pie: "Toca la tablet para ver todos los activos",
    };
  }

  // ---------------------------------------------------------------------------
  // Paneles
  // ---------------------------------------------------------------------------
  const CERRABLES = ["panel-mercado", "panel-ajustes"];

  function mostrarPanel(id) {
    cerrarPaneles();
    $("#fondo-panel").hidden = false;
    const panel = $(`#${id}`);
    panel.hidden = false;
    const enfocable = panel.querySelector("input, button:not(.cerrar)");
    if (enfocable && !tactil) enfocable.focus();
  }

  function cerrarPaneles() {
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = true));
    $("#fondo-panel").hidden = true;
  }

  const panelAbierto = () => [...document.querySelectorAll(".panel")].find((p) => !p.hidden);
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-cerrar]")) cerrarPaneles();
  });
  $("#fondo-panel").addEventListener("click", () => {
    const abierto = panelAbierto();
    if (abierto && CERRABLES.includes(abierto.id)) cerrarPaneles();
  });
  document.addEventListener("keydown", (e) => {
    const abierto = panelAbierto();
    if (e.key === "Escape" && abierto && CERRABLES.includes(abierto.id)) cerrarPaneles();
  });
  $("#boton-reintentar").addEventListener("click", () => location.reload());

  // --- Bienvenida: tu ahorro mensual real ------------------------------------
  const leerAhorro = (entrada) => {
    const valor = Math.round(Number(String(entrada.value).replace(",", ".")) * 100) / 100;
    return valor >= 5 && valor <= 100000 ? valor : null;
  };

  function mostrarBienvenida() {
    const entrada = $("#ahorro-mensual");
    entrada.value = perfil.ahorroMensual || 100;
    const actualizar = () => {
      const valor = leerAhorro(entrada);
      $("#nota-diaria").textContent = valor
        ? `Eso son ${F.euros(valor / 30)} al día. Robi recibirá lo mismo que tú.`
        : "Escribe una cantidad entre 5 € y 100.000 € al mes.";
      document.querySelectorAll("#atajos-ahorro button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.valor) === valor)));
    };
    entrada.oninput = actualizar;
    $("#atajos-ahorro").onclick = (e) => {
      const boton = e.target.closest("[data-valor]");
      if (!boton) return;
      entrada.value = boton.dataset.valor;
      actualizar();
    };
    $("#boton-bienvenida").onclick = () => {
      const valor = leerAhorro(entrada);
      if (!valor) {
        entrada.focus();
        return;
      }
      perfil.ahorroMensual = valor;
      guardar();
      mostrarElegirActivo();
    };
    actualizar();
    mostrarPanel("panel-bienvenida");
  }

  // --- Lista de activos (para elegir y para el mercado) ----------------------
  function opcionActivo(serie, pulsado) {
    const r = resumen(serie);
    const clase = (v) => (v >= 0 ? "sube" : "baja");
    return `
      <button class="opcion-activo" type="button" data-id="${escapar(serie.id)}" aria-pressed="${pulsado ? "true" : "false"}">
        <span class="insignia" style="background:${COLORES[serie.id] || "#888"}">${escapar(serie.simbolo)}</span>
        <span>
          <span class="opcion-nombre">${escapar(serie.nombre)}</span>
          <span class="opcion-desc">${escapar(serie.descripcion)}</span>
        </span>
        <span class="opcion-precio">
          ${F.precio(r.precio)}
          <small class="${clase(r.cambioDia)}">${F.porcentaje(r.cambioDia)} hoy</small>
          <small class="${clase(r.cambio30)}">${F.porcentaje(r.cambio30)} en 30 días</small>
          <canvas class="mini-grafico" width="180" height="60" data-mini="${escapar(serie.id)}"></canvas>
        </span>
      </button>`;
  }

  function pintarMinis(contenedor) {
    contenedor.querySelectorAll("canvas[data-mini]").forEach((lienzo) => {
      const serie = serieDe(lienzo.dataset.mini);
      const actual = T.precioDelDia(serie, hoy());
      const valores = serie.precios.slice(Math.max(0, actual.indice - 89), actual.indice + 1);
      const ctx = lienzo.getContext("2d");
      const min = Math.min(...valores);
      const max = Math.max(...valores) || 1;
      ctx.clearRect(0, 0, 180, 60);
      ctx.beginPath();
      valores.forEach((v, i) => {
        const x = (i / (valores.length - 1)) * 176 + 2;
        const y = 56 - ((v - min) / (max - min || 1)) * 52;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.strokeStyle = valores[valores.length - 1] >= valores[0] ? "#1f9d61" : "#d9534f";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.stroke();
    });
  }

  function mostrarElegirActivo() {
    const lista = $("#lista-elegir");
    lista.innerHTML = datos.activos.map((s) => opcionActivo(s, false)).join("");
    pintarMinis(lista);
    lista.onclick = (e) => {
      const opcion = e.target.closest("[data-id]");
      if (!opcion) return;
      perfil.temporada = T.nuevaTemporada(opcion.dataset.id, perfil.ahorroMensual, hoy());
      guardar();
      cerrarPaneles();
      empezarDia(true);
    };
    mostrarPanel("panel-activo");
  }

  // --- Mercado: revisar todos los activos ------------------------------------
  function mostrarMercado(idInicial) {
    const t = perfil.temporada;
    let elegido = idInicial || (t && t.activoId) || datos.activos[0].id;
    const pintar = () => {
      const lista = $("#lista-mercado");
      lista.innerHTML = datos.activos.map((s) => opcionActivo(s, s.id === elegido)).join("");
      pintarMinis(lista);
      const datosGrafico = datosParaTablet(serieDe(elegido), t);
      datosGrafico.pie = "Últimos 90 cierres";
      X.dibujarTablet($("#grafico-mercado").getContext("2d"), 1024, 640, datosGrafico);
      $("#grafico-mercado").setAttribute("aria-label", `Gráfica de ${serieDe(elegido).nombre}: ${F.precio(datosGrafico.precio)}`);
    };
    $("#lista-mercado").onclick = (e) => {
      const opcion = e.target.closest("[data-id]");
      if (!opcion) return;
      elegido = opcion.dataset.id;
      pintar();
    };
    const fecha = new Date(datos.actualizado);
    $("#mercado-actualizado").textContent = `Precios reales de cierre. Actualizados el ${fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long" })} a las ${fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`;
    pintar();
    mostrarPanel("panel-mercado");
  }

  $("#boton-mercado").addEventListener("click", () => mostrarMercado());
  escena.alTocarTablet(() => {
    if (!panelAbierto()) mostrarMercado();
  });

  // --- Ajustes ---------------------------------------------------------------
  $("#boton-ajustes").addEventListener("click", () => {
    const t = perfil.temporada;
    $("#ajuste-ahorro").value = perfil.ahorroMensual;
    $("#ajustes-info").textContent = t
      ? `Temporada actual: ${serieDe(t.activoId).nombre}, desde el ${F.fechaCorta(t.inicio)}. Ahorro diario: ${F.euros(t.ahorroDiario)}. Mejor racha: ${dias(perfil.mejorRacha)}.`
      : "";
    reiniciarAbandonar();
    mostrarPanel("panel-ajustes");
  });
  $("#boton-guardar-ajustes").addEventListener("click", () => {
    const valor = leerAhorro($("#ajuste-ahorro"));
    if (!valor) return $("#ajuste-ahorro").focus();
    perfil.ahorroMensual = valor;
    guardar();
    cerrarPaneles();
  });
  // Abandonar pide un segundo toque (los avisos del navegador no funcionan en todas partes).
  function reiniciarAbandonar() {
    const boton = $("#boton-abandonar");
    boton.dataset.confirmar = "";
    boton.textContent = "Abandonar esta temporada";
    boton.hidden = !perfil.temporada;
  }
  $("#boton-abandonar").addEventListener("click", () => {
    const boton = $("#boton-abandonar");
    if (!boton.dataset.confirmar) {
      boton.dataset.confirmar = "1";
      boton.textContent = "Toca otra vez para perder la temporada";
      return;
    }
    reiniciarAbandonar();
    cerrarPaneles();
    perfil.temporada = null;
    guardar();
    escena.quitarMano();
    escena.limpiarMesa();
    escena.ponerFichas({ efectivo: 0, invertido: 0, robot: 0 }, false);
    ocultarJuego();
    mostrarElegirActivo();
  });

  // ---------------------------------------------------------------------------
  // Robi habla (letra a letra) y el marcador
  // ---------------------------------------------------------------------------
  let escribiendo = null;
  function decir(texto, expresion) {
    const caja = $("#bocadillo");
    caja.hidden = false;
    $("#bocadillo-lector").textContent = texto;
    escena.expresion(expresion || "normal");
    const escrito = caja.querySelector(".escrito");
    const resto = caja.querySelector(".resto");
    clearInterval(escribiendo);
    if (sinMovimiento()) {
      escrito.textContent = texto;
      resto.textContent = "";
      return;
    }
    let letras = 0;
    escena.hablar(true);
    const paso = () => {
      escrito.textContent = texto.slice(0, letras);
      resto.textContent = texto.slice(letras);
      if (letras++ >= texto.length) {
        clearInterval(escribiendo);
        escena.hablar(false);
      }
    };
    paso();
    escribiendo = setInterval(paso, 24);
  }

  escena.alMoverMano((px) => $("#pista").style.setProperty("--alto-mano", `${Math.round(px)}px`));

  function pista(texto, sobreCartas) {
    const elemento = $("#pista");
    elemento.hidden = !texto;
    elemento.textContent = texto || "";
    elemento.classList.toggle("sobre-cartas", Boolean(sobreCartas));
  }

  function mostrarJuego() {
    $("#hud").hidden = false;
    const conEtiquetas = !document.body.classList.contains("sin-3d");
    ["#etiqueta-efectivo", "#etiqueta-invertido", "#etiqueta-robot"].forEach((s) => ($(s).hidden = !conEtiquetas));
  }

  function ocultarJuego() {
    ["#hud", "#bocadillo", "#pista", "#etiqueta-efectivo", "#etiqueta-invertido", "#etiqueta-robot"].forEach((s) => ($(s).hidden = true));
    $("#mano-accesible").innerHTML = "";
  }

  function actualizarHud() {
    const t = perfil.temporada;
    const dia = hoy();
    const serie = serieDe(t.activoId);
    const precio = T.precioActual(t, serie, dia);
    const n = T.numeroDeDia(t, dia);
    $("#texto-dia").textContent = `Día ${n} de ${T.DIAS_TEMPORADA} · ${serie.nombre}`;
    $("#barra-dia").style.width = `${(n / T.DIAS_TEMPORADA) * 100}%`;
    const racha = T.rachaActual(perfil, dia);
    $("#texto-racha").textContent = String(racha);
    $("#racha").classList.toggle("apagada", racha === 0);
    $("#racha").title = `${dias(racha)} seguidos jugando (mejor racha: ${dias(perfil.mejorRacha)})`;
    const tu = T.valorJugador(t, precio);
    const robi = T.valorRobot(t, precio);
    $("#valor-tu").textContent = F.euros(tu);
    $("#valor-robi").textContent = F.euros(robi);
    $("#marcador-tu").classList.toggle("gana", tu - robi > 0.005);
    $("#marcador-robi").classList.toggle("gana", robi - tu > 0.005);
    $("#etiqueta-efectivo").textContent = `Hucha ${F.euros(t.jugador.efectivo)}`;
    $("#etiqueta-invertido").textContent = `Invertido ${F.euros(t.jugador.unidades * precio)}`;
    $("#etiqueta-robot").textContent = `Robi ${F.euros(robi)}`;
  }

  // Número de fichas de cada montón (1 ficha = 1 día de ahorro)
  function cuentas(t, precio) {
    const unidad = t.ahorroDiario || 1;
    return {
      efectivo: t.jugador.efectivo / unidad,
      invertido: (t.jugador.unidades * precio) / unidad,
      robot: (t.robot.unidades * precio) / unidad,
    };
  }

  // ---------------------------------------------------------------------------
  // Cartas
  // ---------------------------------------------------------------------------
  function definicionCarta(id, t, precio) {
    const efectivo = t.jugador.efectivo;
    const invertido = t.jugador.unidades * precio;
    const venta = (fraccion, titulo) => ({
      id: `vender${fraccion * 100}`,
      titulo,
      subtitulo: "De lo invertido",
      importe: F.euros(invertido * fraccion),
      color: "#d9534f",
      icono: "baja",
      esquina: "▼",
      activa: invertido > 0.004,
    });
    const cartas = {
      vender: { id: "vender", titulo: "VENDER", subtitulo: "Elige cuánto vender", importe: `Tienes ${F.euros(invertido)}`, color: "#d9534f", icono: "baja", esquina: "▼", activa: invertido > 0.004, directa: true },
      volver: { id: "volver", titulo: "VOLVER", subtitulo: "Mejor no vendo", importe: "", color: "#6b7280", icono: "volver", esquina: "«", activa: true, directa: true },
      invertir: { id: "invertir", titulo: "INVERTIR", subtitulo: "Todo tu efectivo", importe: F.euros(efectivo), color: "#1f9d61", icono: "sube", esquina: "▲", activa: efectivo > 0.004 },
      guardar: { id: "guardar", titulo: "GUARDAR", subtitulo: "Se queda en la hucha", importe: F.euros(efectivo), color: "#d99a1e", icono: "monedas", esquina: "●", activa: true },
      vender25: venta(0.25, "VENDER 25 %"),
      vender50: venta(0.5, "VENDER 50 %"),
      vender100: venta(1, "VENDER TODO"),
    };
    return cartas[id];
  }

  // Tu mano: tres cartas. "Vender" abre otra mano con cuánto vender.
  const MANOS = {
    principal: ["invertir", "guardar", "vender"],
    venta: ["vender25", "vender50", "vender100", "volver"],
  };
  const CARTAS_ACCESIBLES = ["invertir", "guardar", "vender25", "vender50", "vender100"];

  function cartaDeRobi(t) {
    return X.dibujarCarta({ titulo: "DCA", subtitulo: "Robi invierte siempre", importe: `+${F.euros(t.ahorroDiario)}`, color: "#2f6fd6", icono: "robot", esquina: "R" });
  }

  function pintarManoAccesible(cartas) {
    const contenedor = $("#mano-accesible");
    contenedor.innerHTML = cartas
      .map((c) => `<button type="button" data-carta="${c.id}" style="background:${c.color}" ${c.activa ? "" : "disabled"}>${escapar(c.titulo)} · ${escapar(c.importe)}</button>`)
      .join("");
  }
  $("#mano-accesible").addEventListener("click", (e) => {
    const boton = e.target.closest("[data-carta]");
    if (boton && !boton.disabled) jugar(boton.dataset.carta);
  });

  async function repartir(t, precio, cual) {
    const cartas = MANOS[cual || "principal"].map((id) => definicionCarta(id, t, precio));
    pintarManoAccesible(CARTAS_ACCESIBLES.map((id) => definicionCarta(id, t, precio)));
    if (tactil) pista(cual === "venta" ? "¿Cuánto vendes? Toca dos veces" : "Toca dos veces una carta", true);
    else pista(cual === "venta" ? "¿Cuánto quieres vender?" : "Elige una carta", true);
    await escena.ponerMano(
      cartas.map((c) => ({ id: c.id, lienzo: X.dibujarCarta({ ...c, desactivada: !c.activa }), activa: c.activa, directa: c.directa })),
    );
  }

  // ---------------------------------------------------------------------------
  // El día
  // ---------------------------------------------------------------------------
  let ocupado = false;
  let diaEnPantalla = null;

  function saludo(t, serie, perdidos, primeraVez) {
    const valores = { ahorro: F.euros(t.ahorroDiario), activo: serie.nombre, perdidos: dias(perdidos) };
    if (primeraVez) return [R.frase("bienvenida", valores), "feliz"];
    if (perdidos > 0) return [R.frase("volviste", valores), "triste"];
    if (T.numeroDeDia(t, hoy()) === T.DIAS_TEMPORADA) return [R.frase("ultimoDia"), "sorpresa"];
    const hoyD = t.dias[t.dias.length - 1];
    const ayer = t.dias[t.dias.length - 2];
    if (ayer && hoyD.fechaPrecio === ayer.fechaPrecio) return [R.frase("cerrado"), "normal"];
    if (ayer) {
      const cambio = hoyD.precio / ayer.precio - 1;
      const c = { ...valores, cambio: F.porcentaje(cambio, false).replace("-", "") };
      if (cambio > 0.015) return [R.frase("subida", c), "feliz"];
      if (cambio < -0.015) return [R.frase("bajada", c), "sorpresa"];
    }
    return [R.frase("nuevoDia", valores), "feliz"];
  }

  function reaccion(t, carta, precio) {
    const ventaja = T.valorJugador(t, precio) - T.valorRobot(t, precio);
    if (Math.abs(ventaja) > t.ahorroDiario * 0.5 && Math.random() < 0.5) {
      const v = { ventaja: F.euros(Math.abs(ventaja)) };
      return ventaja > 0 ? [R.frase("vasGanando", v), "nervioso"] : [R.frase("voyGanando", v), "burla"];
    }
    if (carta === "invertir") return [R.frase("invertir"), "feliz"];
    if (carta === "guardar") return [R.frase("guardar"), "burla"];
    return [R.frase("vender"), "sorpresa"];
  }

  async function empezarDia(primeraVez) {
    const t = perfil.temporada;
    const serie = serieDe(t.activoId);
    const dia = hoy();
    if (!serie) {
      $("#texto-error").textContent = "Hoy no hay precios del activo de tu temporada. Vuelve a intentarlo más tarde.";
      mostrarPanel("panel-error");
      return;
    }
    ocupado = true;
    diaEnPantalla = dia;
    escena.quitarMano();
    escena.limpiarMesa();
    $("#mano-accesible").innerHTML = "";
    pista(null);

    const antes = JSON.parse(JSON.stringify(t));
    const perdidos = T.ponerAlDia(t, serie, dia);
    guardar();
    mostrarJuego();
    escena.pintarTablet(datosParaTablet(serie, t));
    const precio = T.precioActual(t, serie, dia);

    if (T.terminada(t, dia)) {
      await escena.ponerFichas(cuentas(t, precio), false);
      actualizarHud();
      ocupado = false;
      mostrarFinal();
      return;
    }

    const pendiente = T.diaPendiente(t, dia);
    const diaNuevo = t.dias.length > antes.dias.length;

    if (pendiente && diaNuevo) {
      // Las fichas como estaban, y entonces llega el ahorro de hoy
      await escena.ponerFichas(cuentas(antes, precio), false);
      actualizarHud();
      const [texto, cara] = saludo(t, serie, perdidos, primeraVez);
      decir(texto, cara);
      await esperar(700);
      await Promise.all([escena.robotJuega(cartaDeRobi(t)), escena.ponerFichas(cuentas(t, precio), true)]);
      actualizarHud();
      await repartir(t, precio);
    } else if (pendiente) {
      // Ya habías entrado hoy, pero aún no has jugado
      await escena.ponerFichas(cuentas(t, precio), false);
      escena.colocarCarta(cartaDeRobi(t), "cartaRobot", 0.08);
      actualizarHud();
      decir(R.frase("nuevoDia", { ahorro: F.euros(t.ahorroDiario) }), "feliz");
      await repartir(t, precio);
    } else {
      // Hoy ya has jugado: la mesa tal como quedó
      await escena.ponerFichas(cuentas(t, precio), false);
      escena.colocarCarta(cartaDeRobi(t), "cartaRobot", 0.08);
      const ultimo = t.dias[t.dias.length - 1];
      const jugada = definicionCarta(ultimo.carta, t, precio);
      if (jugada) escena.colocarCarta(X.dibujarCarta({ ...jugada, importe: F.euros(ultimo.euros), activa: true }), "cartaJugador", 0);
      actualizarHud();
      const ultimoDia = T.numeroDeDia(t, dia) === T.DIAS_TEMPORADA;
      decir(R.frase(ultimoDia ? "ultimoDia" : "yaJugaste"), "feliz");
      mostrarCuentaAtras();
    }
    ocupado = false;
  }

  async function jugar(id) {
    const t = perfil.temporada;
    const dia = hoy();
    if (ocupado || !t || !T.diaPendiente(t, dia)) return;
    const serie = serieDe(t.activoId);
    const precio = T.precioActual(t, serie, dia);
    const carta = definicionCarta(id, t, precio);
    if (!carta || !carta.activa) return;
    if (id === "vender" || id === "volver") {
      ocupado = true;
      await repartir(t, precio, id === "vender" ? "venta" : "principal");
      ocupado = false;
      return;
    }
    ocupado = true;

    const jugada = T.jugarCarta(t, dia, id);
    T.apuntarDiaJugado(perfil, dia);
    guardar();
    $("#mano-accesible").innerHTML = "";
    pista(null);

    await escena.jugarCartaDeLaMano(id);
    await escena.ponerFichas(cuentas(t, precio), true);
    escena.pintarTablet(datosParaTablet(serie, t));
    actualizarHud();
    const [texto, cara] = reaccion(t, jugada.carta, precio);
    decir(texto, cara);
    ocupado = false;
    await esperar(3500);
    if (T.numeroDeDia(t, dia) === T.DIAS_TEMPORADA) decir(R.frase("ultimoDia"), "sorpresa");
    mostrarCuentaAtras();
  }
  escena.alJugar(jugar);

  // ---------------------------------------------------------------------------
  // Cuenta atrás hasta mañana (y empezar solo cuando cambie el día)
  // ---------------------------------------------------------------------------
  let reloj = null;
  function mostrarCuentaAtras() {
    clearInterval(reloj);
    const actualizar = () => {
      if (hoy() !== diaEnPantalla) return empezarDia(false);
      const t = perfil.temporada;
      if (!t) return;
      const ultimo = T.numeroDeDia(t, hoy()) === T.DIAS_TEMPORADA;
      if (desfase) return pista(`Ya has jugado hoy. ${ultimo ? "Mañana, el resultado final" : "Vuelve mañana"}.`);
      const ahora = new Date();
      const manana = new Date(ahora);
      manana.setHours(24, 0, 0, 0);
      const minutos = Math.max(1, Math.ceil((manana - ahora) / 60000));
      pista(`${ultimo ? "Resultado final" : "Próxima ronda"} en ${Math.floor(minutos / 60)} h ${minutos % 60} min`);
    };
    actualizar();
    reloj = setInterval(actualizar, 30000);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && perfil.temporada && !ocupado && diaEnPantalla && hoy() !== diaEnPantalla) empezarDia(false);
  });

  // ---------------------------------------------------------------------------
  // Fin de temporada
  // ---------------------------------------------------------------------------
  function mostrarFinal() {
    const t = perfil.temporada;
    const serie = serieDe(t.activoId);
    const r = T.resultado(t, serie);
    const empate = Math.abs(r.diferencia) < r.aportado * 0.005;
    const ganas = !empate && r.diferencia > 0;

    $("#final-emoji").textContent = empate ? "🤝" : ganas ? "🏆" : "🤖";
    $("#titulo-final").textContent = empate ? "¡Empate con Robi!" : ganas ? "¡Has ganado a Robi!" : "Robi gana esta temporada";
    const cambio = r.precioFinal / r.precioInicio - 1;
    $("#final-subtitulo").textContent =
      `${serie.nombre}, del ${F.fechaCorta(t.inicio)} al ${F.fechaCorta(T.ultimoDia(t))}. ` +
      `El precio ${cambio >= 0 ? "subió" : "bajó"} un ${F.porcentaje(Math.abs(cambio), false)}.`;

    const marca = (a, b) => (empate ? ["", ""] : a > b ? ["gana", ""] : ["", "gana"]);
    const filas = [
      ["Ahorro recibido", F.euros(r.aportado), F.euros(r.aportado), ["", ""]],
      ["Dinero invertido", F.euros(r.jugador.invertido), F.euros(r.robot.invertido), ["", ""]],
      ["Valor final", F.euros(r.jugador.valorFinal), F.euros(r.robot.valorFinal), marca(r.jugador.valorFinal, r.robot.valorFinal)],
      ["Rentabilidad", F.porcentaje(r.jugador.rentabilidad), F.porcentaje(r.robot.rentabilidad), marca(r.jugador.rentabilidad, r.robot.rentabilidad)],
    ];
    $("#tabla-final").innerHTML = filas
      .map(([nombre, tu, robi, [a, b]]) => `<tr><th scope="row">${nombre}</th><td class="${a}">${tu}</td><td class="${b}">${robi}</td></tr>`)
      .join("");
    $("#final-nota").textContent =
      `Jugaste ${r.diasJugados} de ${T.DIAS_TEMPORADA} días. Tu mejor racha: ${dias(perfil.mejorRacha)} seguidos.` +
      (r.jugador.efectivo >= 0.01 ? ` Terminaste con ${F.euros(r.jugador.efectivo)} sin invertir en la hucha.` : "");
    $("#final-vida-real").innerHTML =
      `<strong>En la vida real:</strong> en esta temporada has apartado ${F.euros(r.aportado)} ` +
      `(${F.euros(t.ahorroMensual)} al mes). Si lo haces de verdad durante un año serían ` +
      `<strong>${F.euros(t.ahorroMensual * 12)}</strong> ahorrados, antes de invertir. La clave es la constancia, como la de Robi.`;

    $("#boton-nueva-temporada").onclick = () => {
      perfil.temporadas = [
        { activoId: t.activoId, inicio: t.inicio, tu: r.jugador.valorFinal, robi: r.robot.valorFinal, aportado: r.aportado },
        ...(perfil.temporadas || []),
      ].slice(0, 20);
      perfil.temporada = null;
      guardar();
      escena.limpiarMesa();
      escena.ponerFichas({ efectivo: 0, invertido: 0, robot: 0 }, false);
      ocultarJuego();
      mostrarElegirActivo();
    };
    decir(R.frase(empate ? "empate" : ganas ? "ganasTu" : "ganaRobi"), empate ? "normal" : ganas ? "triste" : "feliz");
    mostrarPanel("panel-final");
  }

  // ---------------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------------
  escena.pintarTablet(datosParaTablet(serieDe((perfil.temporada && perfil.temporada.activoId) || datos.activos[0].id), perfil.temporada));
  if (!perfil.ahorroMensual) mostrarBienvenida();
  else if (!perfil.temporada) mostrarElegirActivo();
  else empezarDia(false);
})();
