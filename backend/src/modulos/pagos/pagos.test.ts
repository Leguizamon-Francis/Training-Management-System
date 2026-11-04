// Pruebas del cálculo de estado y deuda (calcularSituacion), con la fecha de hoy fija.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, mock } from "node:test";
import { Prisma, type Cuota } from "@prisma/client";
import { calcularSituacion, describirPago, repartirImporte } from "./pagos.service";

const HOY = "2026-10-19";
const precio = new Prisma.Decimal(25000);
const activo = { activo: true, reactivadoEl: null, precioPlan: precio };

// Mediodía en Argentina: así "hoy" no depende de la zona horaria de la máquina.
beforeEach(() => mock.timers.enable({ apis: ["Date"], now: new Date(`${HOY}T15:00:00Z`) }));
afterEach(() => mock.timers.reset());

function cuota(desde: string, vence: string): Cuota {
  return {
    id: 1,
    alumnoId: 1,
    planId: 1,
    desde: new Date(`${desde}T00:00:00Z`),
    vence: new Date(`${vence}T00:00:00Z`),
    importe: precio,
    anulada: false,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

test("describirPago: texto para el historial", () => {
  const texto = describirPago({ fecha: new Date("2026-10-07T00:00:00Z"), importe: precio, medio: "TRANSFERENCIA", concepto: "Cuota mensual" });
  assert.match(texto, /^Cuota mensual: .*25\.000,00, Transferencia, 07-10-2026$/);
});

test("sin cuotas: sin pagos y sin deuda", () => {
  const s = calcularSituacion(null, activo);
  assert.equal(s.estado, "SIN_PAGOS");
  assert.equal(s.cuotasAdeudadas.length, 0);
  assert.equal(s.inicioProximaCuota, null);
  assert.equal(s.deudaTotal.toNumber(), 0);
});

test("cuota vigente: al día", () => {
  const s = calcularSituacion(cuota("2026-10-10", "2026-11-10"), activo);
  assert.equal(s.estado, "AL_DIA");
  assert.equal(s.diasRestantes, 22);
  assert.equal(s.cuotasAdeudadas.length, 0);
  assert.equal(s.inicioProximaCuota, "2026-11-10");
});

test("vence en 7 días o menos: por vencer", () => {
  assert.equal(calcularSituacion(cuota("2026-09-26", "2026-10-26"), activo).estado, "POR_VENCER");
  assert.equal(calcularSituacion(cuota("2026-09-27", "2026-10-27"), activo).estado, "AL_DIA");
});

test("vence hoy: por vencer y todavía no debe", () => {
  const s = calcularSituacion(cuota("2026-09-19", HOY), activo);
  assert.equal(s.estado, "POR_VENCER");
  assert.equal(s.diasRestantes, 0);
  assert.equal(s.cuotasAdeudadas.length, 0);
});

test("vencida hace más de un mes: debe dos cuotas al precio actual", () => {
  const s = calcularSituacion(cuota("2026-08-09", "2026-09-09"), activo);
  assert.equal(s.estado, "VENCIDA");
  assert.deepEqual(s.cuotasAdeudadas, [
    { desde: "2026-09-09", vence: "2026-10-09" },
    { desde: "2026-10-09", vence: "2026-11-09" },
  ]);
  assert.equal(s.deudaTotal.toNumber(), 50000);
});

test("membresía sin precio: cuenta las cuotas pero no el monto", () => {
  const s = calcularSituacion(cuota("2026-08-09", "2026-09-09"), { ...activo, precioPlan: new Prisma.Decimal(0) });
  assert.equal(s.cuotasAdeudadas.length, 2);
  assert.equal(s.precioCuotaAdeudada, null);
  assert.equal(s.deudaTotal.toNumber(), 0);
});

test("alumno inactivo: no acumula deuda", () => {
  const s = calcularSituacion(cuota("2026-05-01", "2026-06-01"), { ...activo, activo: false });
  assert.equal(s.estado, "VENCIDA");
  assert.equal(s.cuotasAdeudadas.length, 0);
  assert.equal(s.inicioProximaCuota, null);
});

test("reactivado después del vencimiento: la deuda se cuenta desde la reactivación", () => {
  const s = calcularSituacion(cuota("2026-04-01", "2026-05-01"), { ...activo, reactivadoEl: "2026-10-01" });
  assert.equal(s.inicioProximaCuota, "2026-10-01");
  assert.deepEqual(s.cuotasAdeudadas, [{ desde: "2026-10-01", vence: "2026-11-01" }]);
});

test("fin de mes: las cuotas adeudadas no pierden el día 31", () => {
  mock.timers.setTime(new Date("2026-04-15T15:00:00Z").getTime());
  const s = calcularSituacion(cuota("2025-12-31", "2026-01-31"), activo);
  assert.deepEqual(
    s.cuotasAdeudadas.map((periodo) => periodo.vence),
    ["2026-02-28", "2026-03-31", "2026-04-30"],
  );
});

test("varias cuotas juntas: el total se reparte en partes iguales", () => {
  assert.deepEqual(repartirImporte(new Prisma.Decimal(135000), 3).map(String), ["45000", "45000", "45000"]);
});

test("varias cuotas juntas: los centavos que sobran van a la última y la suma es el total", () => {
  const partes = repartirImporte(new Prisma.Decimal(100000), 3);
  assert.deepEqual(partes.map(String), ["33333.33", "33333.33", "33333.34"]);
  assert.equal(partes.reduce((suma, parte) => suma.plus(parte), new Prisma.Decimal(0)).toString(), "100000");
});

test("una sola cuota vale el total", () => {
  assert.deepEqual(repartirImporte(new Prisma.Decimal("25000.5"), 1).map(String), ["25000.5"]);
});
