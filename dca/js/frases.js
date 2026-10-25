// Lo que dice Robi, el robot rival (amable y un poco chulito).
(function (global) {
  "use strict";

  const FRASES = {
    bienvenida: ["¡Hola! Soy Robi. Cada día meto mis {ahorro} en {activo}, pase lo que pase. ¿Te sientas?"],
    nuevoDia: [
      "¡Buenos días! Ya he metido mis {ahorro}. Mira la tablet y juega tu carta.",
      "Nuevo día, nueva ficha. Yo ya he invertido. ¿Y tú?",
      "¡Otro día en la mesa! Mis {ahorro} ya están dentro.",
    ],
    volviste: ["¡Te eché de menos! Faltaste {perdidos} y yo seguí invirtiendo. Tu ahorro te espera en la hucha."],
    subida: ["¡Ayer subió un {cambio}! Me alegro de estar dentro.", "Subida del {cambio}. ¡Qué bien sienta estar invertido!"],
    bajada: ["Ayer bajó un {cambio}. ¡Rebajas! Hoy mis {ahorro} compran más.", "Caída del {cambio}. Yo no me asusto: compro igual."],
    cerrado: ["Hoy no hay precio nuevo (fin de semana o festivo): jugamos con el último cierre."],
    invertir: ["¡Buena! Todo a trabajar.", "¡Al bote! Así me gusta.", "Invertido. Ahora, paciencia."],
    guardar: ["A la hucha… ¿esperando una bajada?", "Guardas. Yo nunca espero, ¡ja!", "Prudente. Veremos mañana si acertaste."],
    vender: ["¿Vendes? Yo prefiero aguantar.", "Sacas fichas de la mesa… interesante.", "Vender es fácil. Volver a entrar, no tanto."],
    vasGanando: ["Vas ganando por {ventaja}. ¡Mañana te alcanzo!", "Hmm, me sacas {ventaja}. Estoy recalculando…"],
    voyGanando: ["Te saco {ventaja}. La constancia es mi superpoder.", "Voy {ventaja} por delante. ¡Tic, tac!"],
    yaJugaste: ["Por hoy ya está. ¡Vuelve mañana para ver qué pasa!", "Mañana más. ¡No faltes, que yo no fallo ni un día!"],
    ultimoDia: ["¡Última ronda de la temporada! Mañana vemos quién gana."],
    ganaRobi: ["¡Gané! Invertir siempre lo mismo funciona. ¿Revancha?"],
    ganasTu: ["¡Me has ganado! Bien jugado. Nueva temporada, nueva oportunidad."],
    empate: ["¡Empate! Piensas casi como un robot."],
  };

  let ultima = "";
  function frase(grupo, valores) {
    const opciones = FRASES[grupo].filter((f) => f !== ultima);
    const lista = opciones.length ? opciones : FRASES[grupo];
    let texto = lista[Math.floor(Math.random() * lista.length)];
    for (const [clave, valor] of Object.entries(valores || {})) texto = texto.split(`{${clave}}`).join(valor);
    ultima = texto;
    return texto;
  }

  global.FrasesRobi = { frase };
})(window);
