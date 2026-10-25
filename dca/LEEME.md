# La mesa del ahorro · Juego diario de DCA en 3D

Un juego de cartas en 3D, en español, para crear el hábito de ahorrar e invertir.
Estás sentado a una mesa frente a **Robi**, un robot que invierte siempre lo mismo cada día
(eso es el **DCA**). Cada día entras, miras la gráfica con **precios reales** y juegas una carta.
Tras 48 días, gana quien tenga más dinero.

## Cómo se juega

1. La primera vez dices **cuánto puedes ahorrar al mes en la vida real**. Cada día recibes
   esa cantidad ÷ 30 (tu ahorro diario). Robi recibe lo mismo.
2. Eliges el activo de la temporada: S&P 500, Nasdaq, IBEX 35, oro, Bitcoin o Ethereum.
3. **Una ronda al día.** Robi invierte su ahorro y juega su carta «DCA». Tú tienes tres cartas:
   - **Invertir**: todo tu efectivo pasa a estar invertido.
   - **Guardar**: tu ahorro se queda en la hucha.
   - **Vender**: abre otra mano para vender el 25 %, el 50 % o todo lo invertido.

   En el móvil se toca dos veces una carta para jugarla (así no se juega sin querer).
4. **Si un día no entras**, tu ahorro de ese día se queda en la hucha y Robi invierte igual.
   La 🔥 racha cuenta los días seguidos que juegas.
5. Al día siguiente del día 48 se ve el resultado: dinero invertido, valor final y rentabilidad.

Las fichas de la mesa representan tu dinero: **1 ficha = 1 día de ahorro**.
Toca la tablet (o el botón 📈) para ver **el mercado de hoy** con los 6 activos.

La partida se guarda en el navegador de cada dispositivo.

## Precios reales de cada día

- Se juega con el **precio de cierre del día anterior** (el último publicado). Los fines de
  semana y festivos la bolsa no abre: se usa el último cierre.
- Los precios se tratan como euros, sin conversión de moneda (Bitcoin y Ethereum ya están en euros).
- Cada noche, una tarea automática de GitHub (`.github/workflows/precios-diarios.yml`) ejecuta
  `herramientas/actualizar_precios_diarios.py`, que descarga los cierres y guarda
  `datos/diario.json` y `datos/diario.js`.
  - Fuente principal: Yahoo Finance (con la librería `yfinance`).
  - Respaldos: FRED (S&P 500 y Nasdaq), Stooq, Kraken y Coinbase (criptomonedas y oro).
- El juego carga primero `datos/diario.js` (funciona sin internet) y, si hay conexión, descarga
  la versión más reciente de la rama principal del repositorio en GitHub.

> **Importante:** GitHub solo ejecuta las tareas programadas en la **rama principal** del
> repositorio. Hasta que este código esté en esa rama, los precios no se actualizarán solos.
> También se pueden actualizar a mano desde la pestaña *Actions* → «Precios diarios del juego
> DCA» → *Run workflow*.

## Probar sin esperar días

Añade `?dia=N` a la dirección para jugar como si fuera dentro de N días, por ejemplo
`index.html?dia=3`. Aparece un aviso amarillo «Modo prueba». La partida de prueba se guarda
igual que la real: para empezar de cero, usa ⚙️ → *Abandonar esta temporada*.

## Archivos

```
dca/
├── index.html            ← la página: escena 3D, marcador y paneles
├── mesa.css              ← diseño de todo lo que va encima de la escena
├── js/
│   ├── temporada.js      ← reglas: días, ahorro, cartas, racha y resultado (sin pantalla)
│   ├── escena.js         ← la mesa en 3D: Robi, tablet, fichas y cartas
│   ├── texturas.js       ← dibujos de las cartas, la cara de Robi y la tablet
│   ├── juego.js          ← une las reglas, la escena y los paneles
│   ├── frases.js         ← lo que dice Robi
│   ├── datos.js          ← carga los precios (local + GitHub)
│   └── formato.js        ← euros, porcentajes y fechas en español
├── datos/diario.json|js  ← precios diarios (GENERADOS cada noche)
├── herramientas/actualizar_precios_diarios.py
└── vendor/three.min.js   ← Three.js r149 (librería 3D, licencia MIT)
```

No hay que instalar nada: abre `dca/index.html` en el navegador. Si el navegador no puede
mostrar 3D, el juego funciona igual con una gráfica plana y botones.

## Aviso

Juego educativo. No es una recomendación de inversión. Rentabilidades pasadas no garantizan
rentabilidades futuras.
