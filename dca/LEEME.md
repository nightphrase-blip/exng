# ¿Le ganas al robot? · Juego de ahorro con DCA

Juego web en español para aprender qué es el **DCA** (invertir la misma cantidad cada mes).
Durante 48 meses recibes 100 € al mes y decides si invertir, guardar o vender, mientras un
robot invierte 100 € cada mes pase lo que pase. Al final se comparan los resultados y se revelan
el activo y las fechas reales.

## Cómo jugar

- **En tu ordenador:** abre `dca/index.html` con doble clic. Funciona **sin internet**.
- **En el móvil o compartiéndolo:** cuando el repositorio se publica en GitHub Pages, el juego
  queda en `https://<tu-dominio>/dca/`.

No hay que instalar nada: es HTML, CSS y JavaScript puros, sin librerías.

## Archivos

```
dca/
├── index.html                  ← las 3 pantallas del juego
├── estilos.css                 ← diseño (modo claro/oscuro automático, móvil y PC)
├── logica.js                   ← reglas del juego (dinero, robot, resultado)
├── grafico.js                  ← dibuja los gráficos
├── juego.js                    ← conecta las reglas con la pantalla
├── datos/
│   ├── sp500.csv … ethereum.csv  ← un precio por mes (mes,precio)
│   └── precios.js              ← los mismos datos, en el formato que lee el juego (GENERADO)
└── herramientas/
    └── descargar_datos.py      ← descarga los precios y genera datos/
```

## Reglas exactas

- La partida empieza en un mes al azar que permita ver 12 meses previos en el gráfico y jugar 48.
- Cada mes, jugador y robot reciben 100 €. El robot los invierte al momento.
- **Invertir todo** invierte todo tu efectivo (también el que hayas ido guardando).
- **Guardar en efectivo** no hace nada: el dinero se queda quieto (sin intereses).
- **Vender una parte** vende el 25 %, el 50 % o todo lo invertido; el dinero pasa a efectivo.
- Sin comisiones. Al acabar el mes 48 se valora todo con el precio del mes siguiente.
- **Dinero invertido** = lo que compraste menos lo que vendiste.
  **Rentabilidad** = valor final comparado con los 4.800 € recibidos.
- En modo **misterio** el precio se muestra como índice (100 = primer mes) para que la cifra no
  delate el activo.

## Datos

Precios **mensuales reales**, tratados como si fueran euros (sin conversión de moneda).
Se descargaron **una sola vez** y están guardados en `datos/`.

| Activo | Periodo | Fuente | Notas |
|---|---|---|---|
| S&P 500 | 1871 – sep 2026 | Robert Shiller vía [datahub.io](https://github.com/datasets/s-and-p-500) | Media mensual |
| Nasdaq Composite | 1990 – may 2022 | Yahoo Finance vía [datos de ejemplo de matplotlib](https://github.com/matplotlib/matplotlib/blob/main/lib/matplotlib/mpl-data/sample_data/Stocks.csv) | Cierre mensual. No hay datos gratuitos más recientes accesibles |
| IBEX 35 | 2010 – may 2022 | Investing.com vía [VickykciV/Stock-Market-Network](https://github.com/VickykciV/Stock-Market-Network) | Cierre del último día de cada mes |
| Oro | 1970 – sep 2026 | Banco Mundial vía [datahub.io](https://github.com/datasets/gold-prices) | Media mensual. Antes de 1970 el precio estaba fijado por ley |
| Bitcoin | jul 2010 – abr 2026 | [Coin Metrics](https://github.com/coinmetrics/data) (datos comunitarios) | Cierre del último día de cada mes |
| Ethereum | ago 2015 – abr 2026 | [Coin Metrics](https://github.com/coinmetrics/data) (datos comunitarios) | Cierre del último día de cada mes |

Los meses incompletos al final de una serie se descartan.

### Volver a descargar los datos (opcional)

Solo si quieres actualizarlos. Necesitas Python 3 e internet:

```bash
python3 dca/herramientas/descargar_datos.py
```

Reescribe los CSV y `datos/precios.js`. Después haz commit de la carpeta `dca/datos/`.

## Aviso

Juego educativo. No es una recomendación de inversión. Rentabilidades pasadas no garantizan
rentabilidades futuras.
