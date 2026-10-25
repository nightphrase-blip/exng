// Reglas de la temporada diaria, sin nada de pantalla (se pueden probar por separado).
//
// Una temporada dura 48 días reales. Cada día:
//   - tú y el robot recibís vuestro ahorro diario (tu ahorro mensual ÷ 30);
//   - el robot lo invierte al momento (eso es el DCA);
//   - tú juegas una carta: invertir todo tu efectivo, guardarlo o vender una parte.
// Si un día no entras, tu ahorro se queda en efectivo y el robot invierte igual.
// Se juega con el precio de cierre del día anterior (el último publicado).
// Al día siguiente del día 48 se valora todo y se ve quién ha ganado.
(function (global) {
  "use strict";

  const DIAS_TEMPORADA = 48;
  const VENTAS = { vender25: 0.25, vender50: 0.5, vender100: 1 };

  // --- Fechas como texto "AAAA-MM-DD" (hora local) ---------------------------
  function textoFecha(fecha) {
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  // Usamos las 12:00 para que los cambios de hora no muevan el día.
  const aFecha = (texto) => new Date(`${texto}T12:00:00`);

  function sumarDias(texto, dias) {
    const fecha = aFecha(texto);
    fecha.setDate(fecha.getDate() + dias);
    return textoFecha(fecha);
  }

  function diasEntre(desde, hasta) {
    return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000);
  }

  // --- Precios ---------------------------------------------------------------
  // Último cierre publicado en esa fecha o antes (los fines de semana la bolsa no abre).
  function cierreHasta(serie, fecha) {
    let bajo = 0;
    let alto = serie.fechas.length - 1;
    let encontrado = -1;
    while (bajo <= alto) {
      const medio = (bajo + alto) >> 1;
      if (serie.fechas[medio] <= fecha) {
        encontrado = medio;
        bajo = medio + 1;
      } else {
        alto = medio - 1;
      }
    }
    if (encontrado < 0) encontrado = 0; // la temporada empezó antes de los datos: el más antiguo
    return { fecha: serie.fechas[encontrado], precio: serie.precios[encontrado], indice: encontrado };
  }

  // Precio con el que se juega un día: el cierre del día anterior.
  const precioDelDia = (serie, fecha) => cierreHasta(serie, sumarDias(fecha, -1));

  // --- Temporada -------------------------------------------------------------
  function nuevaTemporada(activoId, ahorroMensual, hoy) {
    return {
      activoId,
      ahorroMensual,
      ahorroDiario: Math.round((ahorroMensual / 30) * 100) / 100,
      inicio: hoy,
      dias: [], // { fecha, precio, fechaPrecio, carta, euros }; carta null = falta jugar hoy
      jugador: { efectivo: 0, unidades: 0, comprado: 0, vendido: 0 },
      robot: { unidades: 0, comprado: 0 },
    };
  }

  const ultimoDia = (t) => sumarDias(t.inicio, DIAS_TEMPORADA - 1);
  const numeroDeDia = (t, hoy) => Math.min(diasEntre(t.inicio, hoy) + 1, DIAS_TEMPORADA);
  const terminada = (t, hoy) => diasEntre(t.inicio, hoy) >= DIAS_TEMPORADA;

  // Crea los días que faltan hasta hoy. Los días pasados sin jugar quedan como "ausente".
  // Devuelve cuántos días te has perdido desde la última vez.
  function ponerAlDia(t, serie, hoy) {
    let perdidos = 0;
    for (const dia of t.dias) {
      if (dia.carta === null && dia.fecha < hoy) {
        dia.carta = "ausente";
        perdidos++;
      }
    }
    const hasta = hoy < ultimoDia(t) ? hoy : ultimoDia(t);
    let fecha = t.dias.length ? sumarDias(t.dias[t.dias.length - 1].fecha, 1) : t.inicio;
    while (fecha <= hasta) {
      const cierre = precioDelDia(serie, fecha);
      t.jugador.efectivo += t.ahorroDiario;
      t.robot.unidades += t.ahorroDiario / cierre.precio;
      t.robot.comprado += t.ahorroDiario;
      const ausente = fecha < hoy;
      if (ausente) perdidos++;
      t.dias.push({ fecha, precio: cierre.precio, fechaPrecio: cierre.fecha, carta: ausente ? "ausente" : null, euros: 0 });
      fecha = sumarDias(fecha, 1);
    }
    return perdidos;
  }

  // El día de hoy si todavía no has jugado tu carta.
  function diaPendiente(t, hoy) {
    const dia = t.dias[t.dias.length - 1];
    return dia && dia.fecha === hoy && dia.carta === null ? dia : null;
  }

  // carta: "invertir", "guardar", "vender25", "vender50" o "vender100"
  function jugarCarta(t, hoy, carta) {
    const dia = diaPendiente(t, hoy);
    if (!dia) throw new Error("Hoy ya has jugado tu carta");
    const jugador = t.jugador;
    let euros = 0;
    if (carta === "invertir") {
      euros = jugador.efectivo;
      jugador.unidades += euros / dia.precio;
      jugador.comprado += euros;
      jugador.efectivo = 0;
    } else if (carta in VENTAS) {
      const unidades = VENTAS[carta] === 1 ? jugador.unidades : jugador.unidades * VENTAS[carta];
      euros = unidades * dia.precio;
      jugador.unidades -= unidades;
      jugador.efectivo += euros;
      jugador.vendido += euros;
    }
    dia.carta = carta;
    dia.euros = euros;
    return dia;
  }

  // Precio para valorar hoy: el del día en curso, o el final si la temporada acabó.
  function precioActual(t, serie, hoy) {
    if (terminada(t, hoy)) return cierreHasta(serie, ultimoDia(t)).precio;
    const dia = t.dias[t.dias.length - 1];
    return dia ? dia.precio : precioDelDia(serie, hoy).precio;
  }

  const valorJugador = (t, precio) => t.jugador.unidades * precio + t.jugador.efectivo;
  const valorRobot = (t, precio) => t.robot.unidades * precio;

  function resultado(t, serie) {
    const precioFinal = cierreHasta(serie, ultimoDia(t)).precio;
    const aportado = t.ahorroDiario * DIAS_TEMPORADA;
    const jugador = valorJugador(t, precioFinal);
    const robot = valorRobot(t, precioFinal);
    return {
      aportado,
      precioInicio: t.dias.length ? t.dias[0].precio : precioFinal,
      precioFinal,
      jugador: {
        // Lo comprado menos lo vendido, para no contar dos veces el mismo dinero.
        invertido: Math.max(0, t.jugador.comprado - t.jugador.vendido),
        efectivo: t.jugador.efectivo,
        valorFinal: jugador,
        rentabilidad: (jugador - aportado) / aportado,
      },
      robot: {
        invertido: t.robot.comprado,
        valorFinal: robot,
        rentabilidad: (robot - aportado) / aportado,
      },
      diferencia: jugador - robot,
      diasJugados: t.dias.filter((d) => d.carta && d.carta !== "ausente").length,
    };
  }

  // --- Racha de días seguidos jugando ----------------------------------------
  // perfil: { racha, mejorRacha, ultimoDiaJugado }
  function apuntarDiaJugado(perfil, hoy) {
    if (perfil.ultimoDiaJugado === hoy) return;
    perfil.racha = perfil.ultimoDiaJugado === sumarDias(hoy, -1) ? perfil.racha + 1 : 1;
    perfil.mejorRacha = Math.max(perfil.mejorRacha || 0, perfil.racha);
    perfil.ultimoDiaJugado = hoy;
  }

  function rachaActual(perfil, hoy) {
    const vigente = perfil.ultimoDiaJugado === hoy || perfil.ultimoDiaJugado === sumarDias(hoy, -1);
    return vigente ? perfil.racha : 0;
  }

  global.TemporadaDCA = {
    DIAS_TEMPORADA,
    textoFecha,
    sumarDias,
    diasEntre,
    cierreHasta,
    precioDelDia,
    nuevaTemporada,
    ultimoDia,
    numeroDeDia,
    terminada,
    ponerAlDia,
    diaPendiente,
    jugarCarta,
    precioActual,
    valorJugador,
    valorRobot,
    resultado,
    apuntarDiaJugado,
    rachaActual,
  };
})(typeof window !== "undefined" ? window : globalThis);
