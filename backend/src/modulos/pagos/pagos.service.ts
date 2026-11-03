import { Prisma, type Cuota, type MedioPago } from "@prisma/client";
import { ErrorHttp } from "../../lib/errores";
import {
  diasEntre,
  fechaArgentina,
  fechaDesdeTexto,
  formatearFechaTexto,
  hoyComoTexto,
  sumarMeses,
  textoDesdeFecha,
} from "../../lib/fechas";
import { formatearMoneda } from "../../lib/montos";
import { prisma } from "../../lib/prisma";
import { obtenerAlumno } from "../alumnos/alumnos.service";
import type { CorreccionPago, DatosPago } from "./pagos.schemas";

// Con cuántos días de anticipación una cuota figura como "por vencer".
const DIAS_AVISO_VENCIMIENTO = 7;

// Tope de seguridad de cuotas adeudadas que se calculan (10 años).
const MAXIMO_CUOTAS_ADEUDADAS = 120;

type EstadoCuota = "SIN_PAGOS" | "AL_DIA" | "POR_VENCER" | "VENCIDA";

interface ContextoAlumno {
  activo: boolean;
  reactivadoEl: string | null; // "aaaa-mm-dd" de la última reactivación, si hubo
  precioPlan: Prisma.Decimal | null; // precio actual del plan (vale cada cuota adeudada)
}

// Para la situación alcanza con la última cuota: el estado sale de su vencimiento
// y la deuda, de los meses sin pagar desde entonces.
const ultimaCuota = {
  orderBy: [{ desde: "desc" }, { id: "desc" }],
  take: 1,
} satisfies Prisma.Alumno$cuotasArgs;

const ultimaReactivacion = {
  where: { campo: "activo", valorNuevo: "true" },
  select: { fecha: true },
  orderBy: { fecha: "desc" },
  take: 1,
} satisfies Prisma.Alumno$cambiosArgs;

function armarContexto(alumno: {
  activo: boolean;
  plan: { precioMensual: Prisma.Decimal } | null;
  cambios: { fecha: Date }[];
}): ContextoAlumno {
  return {
    activo: alumno.activo,
    reactivadoEl: alumno.cambios[0] ? fechaArgentina(alumno.cambios[0].fecha) : null,
    precioPlan: alumno.plan?.precioMensual ?? null,
  };
}

function resumirCuota(cuota: Cuota) {
  return {
    id: cuota.id,
    desde: textoDesdeFecha(cuota.desde),
    vence: textoDesdeFecha(cuota.vence),
    importe: cuota.importe,
    anulada: cuota.anulada,
  };
}

// Dónde empieza la próxima cuota: donde venció la última, o en la reactivación si fue posterior.
// null = el alumno nunca pagó (o está inactivo): la cuota empieza en la fecha de pago.
function inicioProximaCuota(ultimaVence: string | null, contexto: ContextoAlumno) {
  if (!ultimaVence || !contexto.activo) return null;
  return contexto.reactivadoEl && contexto.reactivadoEl > ultimaVence ? contexto.reactivadoEl : ultimaVence;
}

// Cuotas mensuales sin pagar desde el inicio de la próxima cuota hasta hoy.
// Solo para alumnos activos: por eso hay que dar de baja a quien deja de venir.
function calcularCuotasAdeudadas(inicio: string | null) {
  if (!inicio) return [];
  const hoy = hoyComoTexto();
  const adeudadas: { desde: string; vence: string }[] = [];
  // Cada período se calcula desde el inicio (inicio + k meses) para no "correr" los fines de mes.
  for (let k = 0; k < MAXIMO_CUOTAS_ADEUDADAS; k++) {
    const desde = sumarMeses(inicio, k);
    if (desde >= hoy) break; // el día del vencimiento todavía no se debe
    adeudadas.push({ desde, vence: sumarMeses(inicio, k + 1) });
  }
  return adeudadas;
}

// Situación de pagos de un alumno a partir de su última cuota (null si nunca pagó).
// - Estado: según la última cuota. Vencida si su vencimiento ya pasó; por vencer si faltan 7 días o menos.
// - Deuda: las cuotas mensuales sin pagar desde el vencimiento de la última cuota (solo alumnos activos),
//   cada una al precio actual del plan.
export function calcularSituacion(cuota: Cuota | null, contexto: ContextoAlumno) {
  const ultima = cuota ? resumirCuota(cuota) : null;

  let estado: EstadoCuota = "SIN_PAGOS";
  let diasRestantes: number | null = null;
  if (ultima) {
    diasRestantes = diasEntre(hoyComoTexto(), ultima.vence);
    if (diasRestantes < 0) estado = "VENCIDA";
    else if (diasRestantes <= DIAS_AVISO_VENCIMIENTO) estado = "POR_VENCER";
    else estado = "AL_DIA";
  }

  const inicio = inicioProximaCuota(ultima?.vence ?? null, contexto);
  const cuotasAdeudadas = calcularCuotasAdeudadas(inicio);
  const precio = contexto.precioPlan && contexto.precioPlan.gt(0) ? contexto.precioPlan : null;

  return {
    estado,
    vence: ultima?.vence ?? null,
    diasRestantes,
    ultimaCuota: ultima,
    inicioProximaCuota: inicio,
    cuotasAdeudadas,
    precioCuotaAdeudada: precio, // null si el plan no tiene precio: se sabe cuántas cuotas debe pero no el monto
    deudaTotal: precio ? precio.times(cuotasAdeudadas.length) : new Prisma.Decimal(0),
  };
}

async function cargarSituacion(alumnoId: number) {
  const alumno = await obtenerAlumno(alumnoId);
  const [cuotas, reactivaciones] = await Promise.all([
    prisma.cuota.findMany({ where: { alumnoId }, ...ultimaCuota }),
    prisma.cambioAlumno.findMany({ ...ultimaReactivacion, where: { ...ultimaReactivacion.where, alumnoId } }),
  ]);
  const situacion = calcularSituacion(cuotas[0] ?? null, armarContexto({ ...alumno, cambios: reactivaciones }));
  return { alumno, situacion };
}

// ---------- Pagos de un alumno ----------

export async function obtenerPagosAlumno(alumnoId: number) {
  const { alumno, situacion } = await cargarSituacion(alumnoId);
  const pagos = await prisma.pago.findMany({
    where: { alumnoId },
    include: { cuota: { select: { desde: true, vence: true } } },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
  });
  return { plan: alumno.plan, situacion, pagos };
}

export async function registrarPago(alumnoId: number, datos: DatosPago) {
  const { alumno, situacion } = await cargarSituacion(alumnoId);
  const fecha = fechaDesdeTexto(datos.fecha);

  if (datos.tipo === "CUOTA") {
    const planId = alumno.planId;
    if (!planId) {
      throw new ErrorHttp(400, "El alumno no tiene una membresía asignada. Asignale una antes de registrar la cuota.");
    }
    // La cuota cubre el período más viejo que debe (o el siguiente, si está al día).
    // Si nunca pagó, empieza en la fecha de pago.
    const desde = situacion.inicioProximaCuota ?? datos.fecha;
    return prisma.$transaction(async (tx) => {
      const cuota = await tx.cuota.create({
        data: {
          alumnoId,
          planId,
          desde: fechaDesdeTexto(desde),
          vence: fechaDesdeTexto(sumarMeses(desde, 1)),
          importe: datos.importe,
        },
      });
      return tx.pago.create({
        data: { alumnoId, cuotaId: cuota.id, fecha, importe: datos.importe, medio: datos.medio, concepto: "Cuota mensual" },
      });
    });
  }

  return prisma.pago.create({
    data: { alumnoId, fecha, importe: datos.importe, medio: datos.medio, concepto: datos.concepto },
  });
}

// "Anular deuda": el alumno avisa (con la cuota ya vencida) que no va a seguir entrenando.
// Las cuotas adeudadas se registran como anuladas (importe 0), así dejan de figurar como deuda,
// y queda constancia en el historial de cambios. Dar de baja al alumno es un paso aparte.
export async function anularDeuda(alumnoId: number) {
  const { alumno, situacion } = await cargarSituacion(alumnoId);
  const { cuotasAdeudadas, ultimaCuota, deudaTotal } = situacion;
  if (cuotasAdeudadas.length === 0) {
    throw new ErrorHttp(400, "El alumno no tiene cuotas adeudadas");
  }
  const planId = alumno.planId ?? (await prisma.cuota.findUnique({ where: { id: ultimaCuota!.id } }))!.planId;
  const primera = cuotasAdeudadas[0];
  const ultima = cuotasAdeudadas[cuotasAdeudadas.length - 1];
  const descripcion =
    `${cuotasAdeudadas.length} ${cuotasAdeudadas.length === 1 ? "cuota" : "cuotas"} ` +
    `(del ${formatearFechaTexto(primera.desde)} al ${formatearFechaTexto(ultima.vence)})` +
    (deudaTotal.gt(0) ? `: ${formatearMoneda(deudaTotal)}` : "");

  await prisma.$transaction(async (tx) => {
    await tx.cuota.createMany({
      data: cuotasAdeudadas.map((periodo) => ({
        alumnoId,
        planId,
        desde: fechaDesdeTexto(periodo.desde),
        vence: fechaDesdeTexto(periodo.vence),
        importe: 0,
        anulada: true,
      })),
    });
    await tx.cambioAlumno.create({
      data: { alumnoId, campo: "deuda", valorAnterior: descripcion, valorNuevo: "Anulada" },
    });
  });
}

// Para corregir un pago cargado por error. Cada cuota tiene un solo pago, así que se borra junto con él.
// Solo se puede borrar el pago de la última cuota: las cuotas se encadenan, y borrar una del medio
// dejaría un mes sin cuota que nunca figuraría como adeudado.
export async function eliminarPago(id: number) {
  const pago = await prisma.pago.findUnique({ where: { id } });
  if (!pago) {
    throw new ErrorHttp(404, "Pago no encontrado");
  }
  if (!pago.cuotaId) {
    await prisma.pago.delete({ where: { id } });
    return;
  }
  const [ultima] = await prisma.cuota.findMany({ where: { alumnoId: pago.alumnoId }, ...ultimaCuota });
  if (ultima.id !== pago.cuotaId) {
    throw new ErrorHttp(409, "Solo se puede eliminar el pago de la última cuota. Para corregir uno anterior, eliminá primero los más nuevos.");
  }
  await prisma.$transaction([prisma.pago.delete({ where: { id } }), prisma.cuota.delete({ where: { id: pago.cuotaId } })]);
}

const NOMBRES_MEDIO: Record<MedioPago, string> = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia" };

// Cómo queda un pago en el historial de cambios.
export function describirPago(pago: { fecha: Date; importe: Prisma.Decimal; medio: MedioPago; concepto: string }) {
  return `${pago.concepto}: ${formatearMoneda(pago.importe)}, ${NOMBRES_MEDIO[pago.medio]}, ${formatearFechaTexto(textoDesdeFecha(pago.fecha))}`;
}

// Corrige un pago de cualquier fecha. No cambia el período de la cuota, así que la cadena de cuotas y la
// deuda quedan igual. La cuota vale lo que se pagó: su importe se actualiza con el pago.
// Como es dinero, cada corrección queda en el historial de cambios del alumno.
export async function corregirPago(id: number, datos: CorreccionPago) {
  const pago = await prisma.pago.findUnique({ where: { id } });
  if (!pago) {
    throw new ErrorHttp(404, "Pago no encontrado");
  }
  const concepto = pago.cuotaId ? pago.concepto : datos.concepto;
  if (!concepto) {
    throw new ErrorHttp(400, "Indicá el concepto");
  }
  const corregido = { fecha: fechaDesdeTexto(datos.fecha), importe: datos.importe, medio: datos.medio, concepto };
  const valorAnterior = describirPago(pago);
  const valorNuevo = describirPago(corregido);
  if (valorAnterior === valorNuevo) return pago;

  return prisma.$transaction(async (tx) => {
    if (pago.cuotaId) {
      await tx.cuota.update({ where: { id: pago.cuotaId }, data: { importe: datos.importe } });
    }
    await tx.cambioAlumno.create({ data: { alumnoId: pago.alumnoId, campo: "pago", valorAnterior, valorNuevo } });
    return tx.pago.update({ where: { id }, data: corregido });
  });
}

// ---------- Estado de cuotas de todos los alumnos activos ----------

// Lo que requiere atención primero.
const PRIORIDAD: Record<EstadoCuota, number> = { VENCIDA: 0, POR_VENCER: 1, SIN_PAGOS: 2, AL_DIA: 3 };

export async function obtenerEstadoCuotas() {
  const alumnos = await prisma.alumno.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      telefono: true,
      activo: true,
      plan: { select: { nombre: true, precioMensual: true } },
      cuotas: ultimaCuota,
      cambios: ultimaReactivacion,
    },
  });

  const filas = alumnos.map((alumno) => {
    const situacion = calcularSituacion(alumno.cuotas[0] ?? null, armarContexto(alumno));
    return {
      id: alumno.id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      telefono: alumno.telefono,
      plan: alumno.plan?.nombre ?? null,
      estado: situacion.estado,
      vence: situacion.vence,
      diasRestantes: situacion.diasRestantes,
      cantidadAdeudadas: situacion.cuotasAdeudadas.length,
      deudaTotal: situacion.deudaTotal,
    };
  });

  // Dentro del mismo estado: los que deben más cuotas primero, después por días y apellido.
  return filas.sort(
    (a, b) =>
      PRIORIDAD[a.estado] - PRIORIDAD[b.estado] ||
      b.cantidadAdeudadas - a.cantidadAdeudadas ||
      Number(b.deudaTotal.gt(0)) - Number(a.deudaTotal.gt(0)) ||
      (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0) ||
      a.apellido.localeCompare(b.apellido),
  );
}

// ---------- Reporte de ingresos ----------

export function obtenerUltimosPagos(cantidad: number) {
  return prisma.pago.findMany({
    include: { alumno: { select: { id: true, nombre: true, apellido: true } } },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
    take: cantidad,
  });
}

export async function obtenerIngresos(desde: string, hasta: string) {
  const pagos = await prisma.pago.findMany({
    where: { fecha: { gte: fechaDesdeTexto(desde), lte: fechaDesdeTexto(hasta) } },
    include: { alumno: { select: { id: true, nombre: true, apellido: true } } },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
  });

  const cero = () => new Prisma.Decimal(0);
  const totales = { total: cero(), efectivo: cero(), transferencia: cero(), cuotas: cero(), otros: cero() };
  const porMes = new Map<string, { mes: string; total: Prisma.Decimal; efectivo: Prisma.Decimal; transferencia: Prisma.Decimal }>();

  for (const pago of pagos) {
    const esEfectivo = pago.medio === "EFECTIVO";
    totales.total = totales.total.plus(pago.importe);
    if (esEfectivo) totales.efectivo = totales.efectivo.plus(pago.importe);
    else totales.transferencia = totales.transferencia.plus(pago.importe);
    if (pago.cuotaId) totales.cuotas = totales.cuotas.plus(pago.importe);
    else totales.otros = totales.otros.plus(pago.importe);

    const mes = textoDesdeFecha(pago.fecha).slice(0, 7); // "aaaa-mm"
    const fila = porMes.get(mes) ?? { mes, total: cero(), efectivo: cero(), transferencia: cero() };
    fila.total = fila.total.plus(pago.importe);
    if (esEfectivo) fila.efectivo = fila.efectivo.plus(pago.importe);
    else fila.transferencia = fila.transferencia.plus(pago.importe);
    porMes.set(mes, fila);
  }

  return {
    desde,
    hasta,
    cantidad: pagos.length,
    totales,
    porMes: [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    pagos,
  };
}
