// Precios diarios: primero la copia local (datos/diario.js, funciona sin internet)
// y, si hay internet, la versión más reciente publicada en GitHub.
// Se guarda una copia en el navegador por si mañana no hay conexión.
(function (global) {
  "use strict";

  // HEAD = rama principal del repositorio. Lo actualiza cada noche GitHub Actions.
  const URL_EN_LINEA = "https://raw.githubusercontent.com/nightphrase-blip/exng/HEAD/dca/datos/diario.json";
  const CLAVE_COPIA = "mesa-dca-precios";

  const masReciente = (a, b) => (!a ? b : !b ? a : b.actualizado > a.actualizado ? b : a);

  async function descargar(espera) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), espera);
    try {
      const respuesta = await fetch(URL_EN_LINEA, { cache: "no-store", signal: controlador.signal });
      return respuesta.ok ? await respuesta.json() : null;
    } catch (error) {
      return null;
    } finally {
      clearTimeout(temporizador);
    }
  }

  async function cargar(espera) {
    let datos = global.DATOS_DIARIOS || null;
    try {
      datos = masReciente(datos, JSON.parse(localStorage.getItem(CLAVE_COPIA)));
    } catch (error) {
      // sin copia guardada
    }
    datos = masReciente(datos, await descargar(espera));
    if (datos) {
      try {
        localStorage.setItem(CLAVE_COPIA, JSON.stringify(datos));
      } catch (error) {
        // sin espacio o almacenamiento bloqueado: no pasa nada
      }
    }
    return datos;
  }

  global.DatosDCA = { cargar };
})(window);
