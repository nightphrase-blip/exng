#!/usr/bin/env python3
"""
Descarga UNA SOLA VEZ los precios históricos y los guarda en dca/datos/.

Uso (desde la raíz del repositorio, solo hace falta Python 3, sin instalar nada):

    python3 dca/herramientas/descargar_datos.py

Genera:
  dca/datos/<activo>.csv  -> un precio por mes (columnas: mes,precio)
  dca/datos/precios.js    -> los mismos datos en el formato que lee el juego

El juego solo lee precios.js, así que funciona sin internet y abriendo
dca/index.html con doble clic.
"""

import csv
import io
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

CARPETA_DATOS = Path(__file__).resolve().parent.parent / "datos"


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def descargar(url):
    print(f"  descargando {url}")
    peticion = urllib.request.Request(url, headers={"User-Agent": "juego-dca/1.0"})
    with urllib.request.urlopen(peticion, timeout=120) as respuesta:
        return respuesta.read().decode("utf-8-sig")


def filas_csv(texto):
    # Algunas fuentes ponen comentarios con "#" al principio del archivo.
    lineas = [l for l in texto.splitlines() if l.strip() and not l.startswith("#")]
    return list(csv.DictReader(lineas))


def numero(texto):
    """Convierte '8,747.20' o '4411.000' en número. Devuelve None si está vacío."""
    texto = (texto or "").replace(",", "").strip()
    return float(texto) if texto else None


def ultimo_de_cada_mes(diarios):
    """De una lista [(AAAA-MM-DD, precio)] se queda con el último precio de cada mes.

    Si el último mes no llega al día 25 está incompleto y se descarta.
    """
    mensual = {}
    ultimo_dia = {}
    for dia, precio in sorted(diarios):
        mes = dia[:7]
        mensual[mes] = precio
        ultimo_dia[mes] = int(dia[8:10])
    meses = sorted(mensual)
    if meses and ultimo_dia[meses[-1]] < 25:
        meses.pop()
    return [(m, mensual[m]) for m in meses]


def siguiente_mes(mes):
    año, m = int(mes[:4]), int(mes[5:7])
    return f"{año + m // 12}-{m % 12 + 1:02d}"


def comprobar_meses_seguidos(nombre, mensual):
    for (a, _), (b, _) in zip(mensual, mensual[1:]):
        if siguiente_mes(a) != b:
            sys.exit(f"ERROR en {nombre}: faltan meses entre {a} y {b}")


def redondear(precio):
    # 6 cifras significativas: suficiente para el juego y archivos más pequeños.
    return float(f"{precio:.6g}")


# ---------------------------------------------------------------------------
# Una función por fuente. Cada una devuelve [(AAAA-MM, precio), ...]
# ---------------------------------------------------------------------------

def sp500():
    # Datos de Robert Shiller (media mensual del índice), publicados por datahub.io.
    filas = filas_csv(descargar(
        "https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv"))
    return [(f["Date"][:7], numero(f["SP500"])) for f in filas if numero(f["SP500"])]


def nasdaq():
    # Cierres mensuales del Nasdaq Composite (^IXIC) de Yahoo Finance que
    # matplotlib incluye como datos de ejemplo. Llegan hasta junio de 2022.
    filas = filas_csv(descargar(
        "https://raw.githubusercontent.com/matplotlib/matplotlib/main/"
        "lib/matplotlib/mpl-data/sample_data/Stocks.csv"))
    # Solo las filas del día 1 son las mensuales; las demás están vacías o repetidas.
    mensual = [(f["Date"][:7], numero(f["^IXIC"])) for f in filas
               if f["Date"].endswith("-01") and numero(f["^IXIC"])]
    # El último mes (junio de 2022) está cortado el día 28: se descarta.
    return mensual[:-1]


def ibex35():
    # Cierres diarios del IBEX 35 exportados de Investing.com (2010-2022),
    # publicados en el repositorio VickykciV/Stock-Market-Network.
    filas = filas_csv(descargar(
        "https://raw.githubusercontent.com/VickykciV/Stock-Market-Network/main/"
        "IBEX%2035%20Historical%20Data.csv"))
    return ultimo_de_cada_mes([(f["Date"], numero(f["Price"])) for f in filas])


def oro():
    # Media mensual del precio del oro (Banco Mundial), publicada por datahub.io.
    # Antes de 1970 el precio estaba fijado por ley (patrón oro) y el gráfico
    # sería una línea plana, así que empezamos en 1970.
    filas = filas_csv(descargar(
        "https://raw.githubusercontent.com/datasets/gold-prices/main/data/monthly.csv"))
    return [(f["Date"][:7], numero(f["Price"])) for f in filas if f["Date"] >= "1970-01"]


def cripto(simbolo):
    # Precio diario de Coin Metrics (datos comunitarios gratuitos).
    texto = descargar(f"https://raw.githubusercontent.com/coinmetrics/data/master/csv/{simbolo}.csv")
    filas = csv.DictReader(io.StringIO(texto))
    return ultimo_de_cada_mes([(f["time"][:10], numero(f["PriceUSD"]))
                               for f in filas if numero(f.get("PriceUSD"))])


ACTIVOS = [
    {
        "id": "sp500",
        "nombre": "S&P 500",
        "simbolo": "S&P",
        "descripcion": "Las 500 mayores empresas de Estados Unidos.",
        "fuente": "Robert Shiller vía datahub.io (media mensual)",
        "url": "https://github.com/datasets/s-and-p-500",
        "cargar": sp500,
    },
    {
        "id": "nasdaq",
        "nombre": "Nasdaq",
        "simbolo": "NDQ",
        "descripcion": "La bolsa tecnológica de Estados Unidos (Nasdaq Composite).",
        "fuente": "Yahoo Finance vía datos de ejemplo de matplotlib (cierre mensual)",
        "url": "https://github.com/matplotlib/matplotlib/blob/main/lib/matplotlib/mpl-data/sample_data/Stocks.csv",
        "cargar": nasdaq,
    },
    {
        "id": "ibex35",
        "nombre": "IBEX 35",
        "simbolo": "IBEX",
        "descripcion": "Las 35 mayores empresas de la bolsa española.",
        "fuente": "Investing.com vía GitHub VickykciV/Stock-Market-Network (cierre mensual)",
        "url": "https://github.com/VickykciV/Stock-Market-Network",
        "cargar": ibex35,
    },
    {
        "id": "oro",
        "nombre": "Oro",
        "simbolo": "Au",
        "descripcion": "El metal refugio de toda la vida.",
        "fuente": "Banco Mundial vía datahub.io (media mensual)",
        "url": "https://github.com/datasets/gold-prices",
        "cargar": oro,
    },
    {
        "id": "bitcoin",
        "nombre": "Bitcoin",
        "simbolo": "₿",
        "descripcion": "La primera y más famosa criptomoneda.",
        "fuente": "Coin Metrics, datos comunitarios (cierre mensual)",
        "url": "https://github.com/coinmetrics/data",
        "cargar": lambda: cripto("btc"),
    },
    {
        "id": "ethereum",
        "nombre": "Ethereum",
        "simbolo": "Ξ",
        "descripcion": "La segunda criptomoneda más grande.",
        "fuente": "Coin Metrics, datos comunitarios (cierre mensual)",
        "url": "https://github.com/coinmetrics/data",
        "cargar": lambda: cripto("eth"),
    },
]


def main():
    CARPETA_DATOS.mkdir(parents=True, exist_ok=True)
    salida = []
    for activo in ACTIVOS:
        print(f"{activo['nombre']}:")
        mensual = activo["cargar"]()
        comprobar_meses_seguidos(activo["nombre"], mensual)
        mensual = [(mes, redondear(precio)) for mes, precio in mensual]

        ruta_csv = CARPETA_DATOS / f"{activo['id']}.csv"
        with open(ruta_csv, "w", newline="", encoding="utf-8") as f:
            escritor = csv.writer(f, lineterminator="\n")
            escritor.writerow(["mes", "precio"])
            escritor.writerows(mensual)
        print(f"  {len(mensual)} meses, de {mensual[0][0]} a {mensual[-1][0]} -> {ruta_csv.name}")

        datos = {k: v for k, v in activo.items() if k != "cargar"}
        datos["desde"] = mensual[0][0]
        datos["precios"] = [precio for _, precio in mensual]
        salida.append(datos)

    contenido = (
        "// Archivo GENERADO por dca/herramientas/descargar_datos.py. No editar a mano.\n"
        f"// Descargado el {date.today().isoformat()}. Precios mensuales, tratados como euros.\n"
        "window.DATOS_DCA = [\n"
        + ",\n".join(json.dumps(d, ensure_ascii=False, separators=(",", ":")) for d in salida)
        + "\n];\n"
    )
    (CARPETA_DATOS / "precios.js").write_text(contenido, encoding="utf-8")
    print("Listo: dca/datos/precios.js")


if __name__ == "__main__":
    main()
