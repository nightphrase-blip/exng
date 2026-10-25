#!/usr/bin/env python3
"""
Descarga los precios de cierre DIARIOS más recientes de los 6 activos del juego
y los guarda en:

  dca/datos/diario.json  -> lo que el juego descarga por internet (siempre fresco)
  dca/datos/diario.js    -> copia que el juego carga aunque no haya internet

Lo ejecuta GitHub Actions cada noche (.github/workflows/precios-diarios.yml).
También se puede lanzar a mano, solo con Python 3:

    python3 dca/herramientas/actualizar_precios_diarios.py

Si una fuente falla se prueba la siguiente; si fallan todas, se conservan los
datos que ya había de ese activo.
"""

import csv
import io
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

CARPETA_DATOS = Path(__file__).resolve().parent.parent / "datos"
DIAS_GUARDADOS = 400  # unos 13 meses de historia para los gráficos
NAVEGADOR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

ACTIVOS = [
    {
        "id": "sp500",
        "nombre": "S&P 500",
        "simbolo": "S&P",
        "descripcion": "Las 500 mayores empresas de Estados Unidos.",
        "fuentes": [("yfinance", "^GSPC"), ("fred", "SP500"), ("stooq", "^spx")],
    },
    {
        "id": "nasdaq",
        "nombre": "Nasdaq",
        "simbolo": "NDQ",
        "descripcion": "La bolsa tecnológica de Estados Unidos (Nasdaq Composite).",
        "fuentes": [("yfinance", "^IXIC"), ("fred", "NASDAQCOM"), ("stooq", "^ndq")],
    },
    {
        "id": "ibex35",
        "nombre": "IBEX 35",
        "simbolo": "IBEX",
        "descripcion": "Las 35 mayores empresas de la bolsa española.",
        "fuentes": [("yfinance", "^IBEX"), ("yahoo", "^IBEX"), ("stooq", "^ibex")],
    },
    {
        "id": "oro",
        "nombre": "Oro",
        "simbolo": "Au",
        "descripcion": "El metal refugio de toda la vida (precio de una onza).",
        # Respaldo: PAXG, una criptomoneda que vale exactamente una onza de oro.
        "fuentes": [("yfinance", "GC=F"), ("stooq", "xauusd"), ("kraken", "PAXGUSD")],
    },
    {
        "id": "bitcoin",
        "nombre": "Bitcoin",
        "simbolo": "₿",
        "descripcion": "La primera y más famosa criptomoneda.",
        "fuentes": [("yfinance", "BTC-EUR"), ("kraken", "XBTEUR"), ("coinbase", "BTC-EUR")],
    },
    {
        "id": "ethereum",
        "nombre": "Ethereum",
        "simbolo": "Ξ",
        "descripcion": "La segunda criptomoneda más grande.",
        "fuentes": [("yfinance", "ETH-EUR"), ("kraken", "ETHEUR"), ("coinbase", "ETH-EUR")],
    },
]

NOMBRE_FUENTE = {
    "yfinance": "Yahoo Finance",
    "yahoo": "Yahoo Finance",
    "fred": "FRED (Reserva Federal de St. Louis)",
    "stooq": "Stooq",
    "kraken": "Kraken",
    "coinbase": "Coinbase",
}


def descargar(url):
    peticion = urllib.request.Request(url, headers={"User-Agent": NAVEGADOR, "Accept": "*/*"})
    with urllib.request.urlopen(peticion, timeout=30) as respuesta:
        return respuesta.read().decode("utf-8-sig")


# ---------------------------------------------------------------------------
# Fuentes. Cada una devuelve una lista [(AAAA-MM-DD, cierre), ...]
# ---------------------------------------------------------------------------

def leer_yahoo(texto):
    resultado = json.loads(texto)["chart"]["result"][0]
    desfase = resultado["meta"].get("gmtoffset", 0)
    cierres = resultado["indicators"]["quote"][0]["close"]
    pares = []
    for marca, cierre in zip(resultado["timestamp"], cierres):
        if cierre is None:
            continue
        dia = datetime.fromtimestamp(marca + desfase, tz=timezone.utc).date().isoformat()
        pares.append((dia, float(cierre)))
    return pares


def yahoo(simbolo):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           f"{urllib.parse.quote(simbolo)}?range=2y&interval=1d")
    return leer_yahoo(descargar(url))


def leer_stooq(texto):
    pares = []
    for fila in csv.DictReader(io.StringIO(texto)):
        if fila.get("Date") and fila.get("Close"):
            pares.append((fila["Date"], float(fila["Close"])))
    return pares


def stooq(simbolo):
    return leer_stooq(descargar(f"https://stooq.com/q/d/l/?s={urllib.parse.quote(simbolo)}&i=d"))


def yfinance(simbolo):
    # Librería que imita a un navegador para que Yahoo no bloquee la descarga.
    # En GitHub Actions se instala con "pip install yfinance"; si no está, se salta.
    import yfinance as yf

    tabla = yf.Ticker(simbolo).history(period="2y", interval="1d", auto_adjust=False)
    return [(indice.date().isoformat(), float(cierre))
            for indice, cierre in tabla["Close"].dropna().items()]


def leer_fred(texto):
    pares = []
    for fila in csv.reader(io.StringIO(texto)):
        if len(fila) == 2 and fila[0][:1].isdigit() and fila[1] not in ("", "."):
            pares.append((fila[0], float(fila[1])))
    return pares


def fred(serie):
    return leer_fred(descargar(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={serie}"))


def leer_kraken(texto):
    respuesta = json.loads(texto)
    if respuesta.get("error"):
        raise ValueError(respuesta["error"])
    velas = next(v for k, v in respuesta["result"].items() if k != "last")
    return [(datetime.fromtimestamp(v[0], tz=timezone.utc).date().isoformat(), float(v[4])) for v in velas]


def kraken(par):
    return leer_kraken(descargar(f"https://api.kraken.com/0/public/OHLC?pair={par}&interval=1440"))


def leer_coinbase(texto):
    # Cada vela: [hora, mínimo, máximo, apertura, cierre, volumen]
    return [(datetime.fromtimestamp(v[0], tz=timezone.utc).date().isoformat(), float(v[4]))
            for v in json.loads(texto)]


def coinbase(producto):
    return leer_coinbase(descargar(
        f"https://api.exchange.coinbase.com/products/{producto}/candles?granularity=86400"))


LECTORES = {"yfinance": yfinance, "yahoo": yahoo, "fred": fred, "stooq": stooq,
            "kraken": kraken, "coinbase": coinbase}


# ---------------------------------------------------------------------------

def limpiar(pares):
    """Un precio por día (el último), ordenado y solo los últimos DIAS_GUARDADOS días."""
    por_dia = {}
    for dia, precio in pares:
        if precio > 0:
            por_dia[dia] = precio
    limite = (datetime.now(timezone.utc).date() - timedelta(days=DIAS_GUARDADOS)).isoformat()
    return [(dia, por_dia[dia]) for dia in sorted(por_dia) if dia >= limite]


def es_valido(pares):
    if len(pares) < 60:
        return False
    ultimo = datetime.fromisoformat(pares[-1][0]).date()
    return (datetime.now(timezone.utc).date() - ultimo).days <= 10


def redondear(precio):
    return float(f"{precio:.6g}")


def datos_anteriores():
    ruta = CARPETA_DATOS / "diario.json"
    if not ruta.exists():
        return {}
    try:
        return {a["id"]: a for a in json.loads(ruta.read_text(encoding="utf-8"))["activos"]}
    except (ValueError, KeyError):
        return {}


def main():
    anteriores = datos_anteriores()
    salida = []
    actualizados = 0
    for activo in ACTIVOS:
        print(f"{activo['nombre']}:")
        conseguido = None
        for fuente, simbolo in activo["fuentes"]:
            try:
                pares = limpiar(LECTORES[fuente](simbolo))
            except Exception as error:  # una fuente caída no debe parar las demás
                print(f"  {fuente} ({simbolo}) falló: {error}")
                continue
            if es_valido(pares):
                conseguido = (fuente, pares)
                break
            ultimo = pares[-1][0] if pares else "ninguno"
            print(f"  {fuente} ({simbolo}) devolvió datos incompletos o viejos: {len(pares)} días, último {ultimo}")

        datos = {k: activo[k] for k in ("id", "nombre", "simbolo", "descripcion")}
        if conseguido:
            fuente, pares = conseguido
            datos["fuente"] = NOMBRE_FUENTE[fuente]
            datos["fechas"] = [dia for dia, _ in pares]
            datos["precios"] = [redondear(precio) for _, precio in pares]
            actualizados += 1
            print(f"  OK con {fuente}: {len(pares)} días, último {pares[-1][0]} = {pares[-1][1]:.2f}")
        elif activo["id"] in anteriores:
            datos = anteriores[activo["id"]]
            print(f"  AVISO: se conservan los datos anteriores (último día {datos['fechas'][-1]})")
        else:
            print("  AVISO: sin datos para este activo")
            continue
        salida.append(datos)

    if actualizados == 0:
        sys.exit("ERROR: no se ha podido actualizar ningún activo")

    contenido = {
        "actualizado": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "activos": salida,
    }
    texto = json.dumps(contenido, ensure_ascii=False, separators=(",", ":"))
    CARPETA_DATOS.mkdir(parents=True, exist_ok=True)
    (CARPETA_DATOS / "diario.json").write_text(texto + "\n", encoding="utf-8")
    (CARPETA_DATOS / "diario.js").write_text(
        "// Archivo GENERADO por dca/herramientas/actualizar_precios_diarios.py. No editar a mano.\n"
        f"window.DATOS_DIARIOS = {texto};\n",
        encoding="utf-8",
    )
    print(f"Listo: {actualizados} de {len(ACTIVOS)} activos actualizados.")


if __name__ == "__main__":
    main()
