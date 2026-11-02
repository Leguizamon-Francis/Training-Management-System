// Pruebas automáticas: npm test (usa node:test, que viene con Node).
import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularEdad, diasEntre, formatearFechaTexto, sumarMeses } from "./fechas";

test("calcularEdad: cuenta el año recién el día del cumpleaños", () => {
  assert.equal(calcularEdad("2000-06-15", "2026-06-14"), 25);
  assert.equal(calcularEdad("2000-06-15", "2026-06-15"), 26);
  assert.equal(calcularEdad("2000-06-15", "2026-12-31"), 26);
});

test("sumarMeses: mismo día del mes siguiente", () => {
  assert.equal(sumarMeses("2026-10-14", 1), "2026-11-14");
  assert.equal(sumarMeses("2026-10-14", 2), "2026-12-14");
});

test("sumarMeses: cambia de año", () => {
  assert.equal(sumarMeses("2026-12-15", 1), "2027-01-15");
  assert.equal(sumarMeses("2026-11-30", 14), "2028-01-30");
});

test("sumarMeses: respeta el fin de mes", () => {
  assert.equal(sumarMeses("2026-01-31", 1), "2026-02-28");
  assert.equal(sumarMeses("2028-01-31", 1), "2028-02-29"); // bisiesto
  assert.equal(sumarMeses("2026-03-31", 1), "2026-04-30");
  // Desde el inicio (no encadenando) no se pierde el 31: así calcula las cuotas adeudadas.
  assert.equal(sumarMeses("2026-01-31", 2), "2026-03-31");
});

test("diasEntre: positivo hacia adelante, negativo hacia atrás", () => {
  assert.equal(diasEntre("2026-10-19", "2026-10-26"), 7);
  assert.equal(diasEntre("2026-10-19", "2026-10-19"), 0);
  assert.equal(diasEntre("2026-10-19", "2026-09-30"), -19);
  assert.equal(diasEntre("2026-12-31", "2027-01-01"), 1);
});

test("formatearFechaTexto: aaaa-mm-dd → dd-mm-aaaa", () => {
  assert.equal(formatearFechaTexto("2026-10-05"), "05-10-2026");
});
