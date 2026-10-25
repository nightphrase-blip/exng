// Números y fechas en español.
(function (global) {
  "use strict";

  // Usamos "de-DE" porque, con los mismos signos que en España, separa también
  // los miles en números de 4 cifras (4.800 €), que en "es-ES" saldrían como 4800.
  const formato = (opciones) => new Intl.NumberFormat("de-DE", opciones);
  const dosDecimales = formato({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sinDecimales = formato({ maximumFractionDigits: 0 });
  const hastaDos = formato({ maximumFractionDigits: 2 });
  const unDecimal = formato({ minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const NBSP = " ";
  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  function euros(v) {
    return `${dosDecimales.format(Math.round(v * 100) / 100 || 0)}${NBSP}€`;
  }

  function precio(v) {
    if (v >= 1000) return `${sinDecimales.format(v)}${NBSP}€`;
    return `${hastaDos.format(v)}${NBSP}€`;
  }

  function porcentaje(v, conSigno = true) {
    const redondeado = Math.round(v * 1000) / 10 || 0;
    const signo = conSigno && redondeado > 0 ? "+" : "";
    return `${signo}${unDecimal.format(redondeado)}${NBSP}%`;
  }

  // "2026-10-23" -> "vie 23 oct"
  function fechaCorta(texto) {
    const fecha = new Date(`${texto}T12:00:00`);
    return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
  }

  global.Formato = { euros, precio, porcentaje, fechaCorta };
})(typeof window !== "undefined" ? window : globalThis);
