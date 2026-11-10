import assert from "node:assert/strict";
import { test } from "node:test";
import { esquemaFechaHastaHoy, hoyComoTexto, sumarMeses } from "./fechas";
import { esquemaEvaluacion } from "../modulos/evaluaciones/evaluaciones.schemas";

const valor = (v: unknown) => esquemaEvaluacion.safeParse({ fecha: hoyComoTexto(), resultados: [{ pruebaId: 1, valor: v }] });

test("resultados de evaluaciones: formatos argentinos", () => {
  const casos: [unknown, number][] = [["1.800", 1800], ["32,5", 32.5], ["1.800,5", 1800.5], ["12", 12], [0, 0], ["7.5", 7.5]];
  for (const [entrada, esperado] of casos) {
    const resultado = valor(entrada);
    assert.ok(resultado.success, `debería aceptar ${JSON.stringify(entrada)}`);
    assert.equal(resultado.data.resultados[0].valor, esperado);
  }
});

test("resultados de evaluaciones: rechaza negativos, texto, vacíos y más de 2 decimales", () => {
  for (const entrada of ["-3", -1, "abc", "", "32,555"]) {
    assert.equal(valor(entrada).success, false, `debería rechazar ${JSON.stringify(entrada)}`);
  }
});

test("fechas de cosas que ya pasaron: ni futuras, ni inexistentes, ni con el año mal tipeado", () => {
  assert.ok(esquemaFechaHastaHoy.safeParse(hoyComoTexto()).success);
  for (const fecha of [sumarMeses(hoyComoTexto(), 1), "2026-02-30", "1926-05-10", "0202-01-01", "10-11-2026"]) {
    assert.equal(esquemaFechaHastaHoy.safeParse(fecha).success, false, `debería rechazar ${fecha}`);
  }
});
