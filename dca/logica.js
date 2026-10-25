// Reglas del juego, sin nada de pantalla.
// Todo el dinero está en euros. Una partida son 48 meses:
//   - al empezar cada mes, jugador y robot reciben 100 €;
//   - el robot invierte sus 100 € al momento;
//   - el jugador elige: invertir todo su efectivo, guardarlo o vender una parte.
// Al terminar el mes 48 se valora todo con el precio del mes siguiente.
(function (global) {
  "use strict";

  const MESES_PARTIDA = 48;
  const APORTACION = 100;
  const MESES_PREVIOS = 12; // meses que se ven en el gráfico antes de empezar

  const NOMBRES_MES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  // Mes de inicio al azar: deja 12 meses antes para el gráfico
  // y 48 meses después, más el precio final para valorar.
  function elegirInicio(numPrecios, azar) {
    const minimo = MESES_PREVIOS;
    const maximo = numPrecios - 1 - MESES_PARTIDA;
    if (maximo < minimo) throw new Error("No hay datos suficientes para una partida");
    return minimo + Math.floor(azar() * (maximo - minimo + 1));
  }

  function nuevaPartida(activo, misterio, azar) {
    azar = azar || Math.random;
    const partida = {
      activo,
      misterio: Boolean(misterio),
      inicio: elegirInicio(activo.precios.length, azar),
      mes: 0, // mes actual: de 0 a 47; 48 significa partida terminada
      jugador: { efectivo: 0, unidades: 0, comprado: 0, vendido: 0 },
      robot: { unidades: 0, comprado: 0 },
      operaciones: [], // { mes, tipo: "compra" | "venta" | "guardar", euros }
      historial: [], // valor de cada uno al empezar cada mes: { jugador, robot }
    };
    empezarMes(partida);
    return partida;
  }

  function precio(partida, mes) {
    return partida.activo.precios[partida.inicio + (mes === undefined ? partida.mes : mes)];
  }

  function empezarMes(partida) {
    const p = precio(partida);
    partida.jugador.efectivo += APORTACION;
    partida.robot.unidades += APORTACION / p;
    partida.robot.comprado += APORTACION;
    apuntarValores(partida);
  }

  function apuntarValores(partida) {
    partida.historial.push({
      jugador: valorJugador(partida),
      robot: valorRobot(partida),
    });
  }

  function valorJugador(partida) {
    return partida.jugador.unidades * precio(partida) + partida.jugador.efectivo;
  }

  function valorRobot(partida) {
    return partida.robot.unidades * precio(partida);
  }

  function terminada(partida) {
    return partida.mes >= MESES_PARTIDA;
  }

  // accion: "invertir", "guardar" o "vender". fraccion (solo para vender): 0.25, 0.5 o 1.
  // Devuelve la operación hecha y pasa al mes siguiente.
  function decidir(partida, accion, fraccion) {
    if (terminada(partida)) throw new Error("La partida ya ha terminado");
    const p = precio(partida);
    const jugador = partida.jugador;
    let operacion = { mes: partida.mes, tipo: "guardar", euros: 0 };

    if (accion === "invertir" && jugador.efectivo > 0) {
      const euros = jugador.efectivo;
      jugador.unidades += euros / p;
      jugador.comprado += euros;
      jugador.efectivo = 0;
      operacion = { mes: partida.mes, tipo: "compra", euros };
    } else if (accion === "vender" && jugador.unidades > 0) {
      const unidades = fraccion >= 1 ? jugador.unidades : jugador.unidades * fraccion;
      const euros = unidades * p;
      jugador.unidades -= unidades;
      jugador.efectivo += euros;
      jugador.vendido += euros;
      operacion = { mes: partida.mes, tipo: "venta", euros };
    }

    partida.operaciones.push(operacion);
    partida.mes += 1;
    if (terminada(partida)) apuntarValores(partida);
    else empezarMes(partida);
    return operacion;
  }

  function resultado(partida) {
    const aportado = APORTACION * MESES_PARTIDA;
    const valorFinalJugador = valorJugador(partida);
    const valorFinalRobot = valorRobot(partida);
    return {
      aportado,
      jugador: {
        // Lo comprado menos lo vendido: si vendes y vuelves a comprar,
        // el mismo dinero no cuenta dos veces.
        invertido: Math.max(0, partida.jugador.comprado - partida.jugador.vendido),
        vendido: partida.jugador.vendido,
        efectivo: partida.jugador.efectivo,
        valorFinal: valorFinalJugador,
        rentabilidad: (valorFinalJugador - aportado) / aportado,
      },
      robot: {
        invertido: partida.robot.comprado,
        valorFinal: valorFinalRobot,
        rentabilidad: (valorFinalRobot - aportado) / aportado,
      },
      diferencia: valorFinalJugador - valorFinalRobot,
      mesInicio: mesDelIndice(partida.activo, partida.inicio),
      mesFin: mesDelIndice(partida.activo, partida.inicio + MESES_PARTIDA),
    };
  }

  // "2015-08" + 5 meses -> "2016-01"
  function mesDelIndice(activo, indice) {
    const año = Number(activo.desde.slice(0, 4));
    const mes = Number(activo.desde.slice(5, 7)) - 1 + indice;
    return `${año + Math.floor(mes / 12)}-${String((mes % 12) + 1).padStart(2, "0")}`;
  }

  // "2016-01" -> "enero de 2016"
  function nombreMes(aaaamm) {
    return `${NOMBRES_MES[Number(aaaamm.slice(5, 7)) - 1]} de ${aaaamm.slice(0, 4)}`;
  }

  global.LogicaDCA = {
    MESES_PARTIDA,
    APORTACION,
    MESES_PREVIOS,
    nuevaPartida,
    decidir,
    precio,
    valorJugador,
    valorRobot,
    terminada,
    resultado,
    mesDelIndice,
    nombreMes,
  };
})(typeof window !== "undefined" ? window : globalThis);
