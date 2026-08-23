/* Comparador de comisiones de exchanges — interacción de la tabla.
   La página funciona sin JavaScript: esto solo añade filtro, orden y calculadora. */
(function () {
  "use strict";

  var table = document.getElementById("tabla-comisiones");
  if (!table) return;

  var tbody = table.tBodies[0];
  var rows = Array.prototype.slice.call(tbody.rows);
  var search = document.getElementById("buscador");
  var amount = document.getElementById("importe");
  var mode = document.getElementById("tipo-operacion");
  var currency = document.getElementById("moneda");
  var costHead = document.getElementById("col-coste");
  var empty = document.getElementById("sin-resultados");

  var STORE_KEY = "comisiones-prefs";

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function savePrefs() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        importe: amount.value, tipo: mode.value, moneda: currency.value
      }));
    } catch (e) { /* modo privado o almacenamiento bloqueado */ }
  }

  function feeOf(row) {
    var v = row.getAttribute("data-" + mode.value);
    if (v === null || v === "" || v === "null") return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function fmt(n) {
    return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
  }

  function updateCosts() {
    var base = parseFloat(String(amount.value).replace(",", "."));
    if (!isFinite(base) || base < 0) base = 1000;
    var sym = currency.value;
    var visible = rows.filter(function (r) { return r.style.display !== "none"; });

    var min = Infinity;
    visible.forEach(function (r) {
      var f = feeOf(r);
      if (f !== null && f < min) min = f;
    });

    rows.forEach(function (row) {
      var cell = row.querySelector(".cost");
      if (!cell) return;
      var fee = feeOf(row);
      if (fee === null) {
        cell.textContent = "—";
        cell.classList.add("na");
        cell.classList.remove("cheap");
        return;
      }
      cell.classList.remove("na");
      cell.textContent = sym + " " + fmt(base * fee / 100);
      cell.classList.toggle("cheap", row.style.display !== "none" && fee === min);
    });

    if (costHead) {
      costHead.textContent = "Coste de " + sym + " " + fmt(base);
    }
  }

  function applyFilter() {
    var q = (search.value || "").trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (row) {
      var hit = !q || row.getAttribute("data-buscar").indexOf(q) !== -1;
      row.style.display = hit ? "" : "none";
      if (hit) shown++;
    });
    if (empty) empty.hidden = shown !== 0;
    updateCosts();
  }

  function sortBy(key, dir) {
    var sorted = rows.slice().sort(function (a, b) {
      var av, bv;
      if (key === "nombre") {
        av = a.getAttribute("data-nombre");
        bv = b.getAttribute("data-nombre");
        return dir * av.localeCompare(bv, "es");
      }
      av = parseFloat(a.getAttribute("data-" + key));
      bv = parseFloat(b.getAttribute("data-" + key));
      if (isNaN(av)) av = Infinity;   // los "no disponible" siempre al final
      if (isNaN(bv)) bv = Infinity;
      if (av === bv) return a.getAttribute("data-nombre").localeCompare(b.getAttribute("data-nombre"), "es");
      return dir * (av - bv);
    });
    sorted.forEach(function (r) { tbody.appendChild(r); });
  }

  Array.prototype.forEach.call(table.querySelectorAll("th.sortable"), function (th) {
    function activate() {
      var key = th.getAttribute("data-key");
      var current = th.getAttribute("aria-sort");
      var dir = current === "ascending" ? -1 : 1;
      Array.prototype.forEach.call(table.querySelectorAll("th.sortable"), function (o) {
        o.setAttribute("aria-sort", "none");
      });
      th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
      sortBy(key, dir);
    }
    th.setAttribute("tabindex", "0");
    th.setAttribute("aria-sort", "none");
    th.addEventListener("click", activate);
    th.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
    });
  });

  var prefs = readPrefs();
  if (prefs.importe) amount.value = prefs.importe;
  if (prefs.tipo) mode.value = prefs.tipo;
  if (prefs.moneda) currency.value = prefs.moneda;

  search.addEventListener("input", applyFilter);
  [amount, mode, currency].forEach(function (el) {
    el.addEventListener("input", function () { updateCosts(); savePrefs(); });
    el.addEventListener("change", function () { updateCosts(); savePrefs(); });
  });

  applyFilter();
})();
