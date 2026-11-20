import assert from "node:assert/strict";
import { test } from "node:test";
import { calcular, CAMPOS_CALCULADOS, MARCADO } from "./modelo-rutina-3";

test("volumen por fila solo con series, repeticiones y peso numéricos", () => {
  const { campos } = calcular({ C8: "Sentadilla", D8: "4", E8: "6", F8: "80", C9: "Plancha", D9: "3", E9: "8-10", F9: "", C10: "Peso muerto", D10: "3", E10: "8", F10: "60,5" });
  assert.equal(campos.G8, "1.920");
  assert.equal(campos.G9, "");
  assert.equal(campos.G10, "1.452");
});

test("totales, progreso y resumen por bloque", () => {
  const { campos, progreso, volumenPorBloque } = calcular({
    B8: "Entrada en calor", C8: "Movilidad", D8: "2", E8: "10", J8: MARCADO,
    B15: "Bloque principal", C15: "Sentadilla", D15: "4", E15: "6", F15: "1.000", J15: MARCADO,
    B16: "Bloque principal", C16: "Remo", D16: "3", E16: "10", F16: "22",
    B20: "Bloque principal", // fila sin ejercicio: no cuenta como ejercicio
  });
  assert.equal(campos.B5, "3");
  assert.equal(campos.D5, "9");
  assert.equal(campos.F5, "24.660");
  assert.equal(campos.H5, "67 %");
  assert.equal(Math.round(progreso * 100), 67);
  assert.equal(campos.C25, "2"); // Bloque principal
  assert.equal(campos.E25, "24.660");
  assert.deepEqual(volumenPorBloque, [0, 0, 24660, 0]);
});

test("planilla vacía: todo en cero y los campos calculados son los esperados", () => {
  const { campos, progreso } = calcular({});
  assert.equal(campos.B5, "0");
  assert.equal(campos.H5, "0 %");
  assert.equal(progreso, 0);
  assert.equal(CAMPOS_CALCULADOS.size, 13 + 4 + 12);
});
