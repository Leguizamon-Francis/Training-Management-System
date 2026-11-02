// Pruebas del promedio semanal de asistencias.
import assert from "node:assert/strict";
import { test } from "node:test";
import { destacadosDeHoy, promedioSemanal } from "./asistencias.service";

test("mes terminado: usa todos los días del mes", () => {
  assert.equal(promedioSemanal(12, "2026-09", "2026-11-02"), 2.8); // 12 / 30 días × 7
});

test("mes en curso: solo cuentan los días que pasaron", () => {
  assert.equal(promedioSemanal(4, "2026-11", "2026-11-14"), 2); // 4 / 14 días × 7
});

test("febrero: respeta los días del mes", () => {
  assert.equal(promedioSemanal(8, "2026-02", "2026-11-02"), 2); // 8 / 28 días × 7
});

test("destacados: el del mes se anuncia solo el último día", () => {
  assert.deepEqual(destacadosDeHoy("2026-11-29"), { mes: false, anio: false });
  assert.deepEqual(destacadosDeHoy("2026-11-30"), { mes: true, anio: false });
  assert.deepEqual(destacadosDeHoy("2026-02-28"), { mes: true, anio: false });
  assert.deepEqual(destacadosDeHoy("2028-02-28"), { mes: false, anio: false }); // año bisiesto
  assert.deepEqual(destacadosDeHoy("2028-02-29"), { mes: true, anio: false });
});

test("destacados: el del año se anuncia los últimos 3 días", () => {
  assert.deepEqual(destacadosDeHoy("2026-12-28"), { mes: false, anio: false });
  assert.deepEqual(destacadosDeHoy("2026-12-29"), { mes: false, anio: true });
  assert.deepEqual(destacadosDeHoy("2026-12-30"), { mes: false, anio: true });
  assert.deepEqual(destacadosDeHoy("2026-12-31"), { mes: true, anio: true });
  assert.deepEqual(destacadosDeHoy("2027-01-01"), { mes: false, anio: false });
});

test("sin asistencias: cero", () => {
  assert.equal(promedioSemanal(0, "2026-09", "2026-11-02"), 0);
});
