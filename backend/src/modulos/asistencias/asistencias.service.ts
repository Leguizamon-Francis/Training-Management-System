import { ErrorHttp } from "../../lib/errores";
import { diasEntre, fechaDesdeTexto, hoyComoTexto, sumarMeses, textoDesdeFecha } from "../../lib/fechas";
import { prisma } from "../../lib/prisma";
import { obtenerAlumno } from "../alumnos/alumnos.service";

// El sistema registra quién vino, no quién faltó (para eso harían falta los turnos de cada alumno).

// A partir de cuántos días sin venir un alumno activo aparece en el reporte.
const DIAS_SIN_VENIR = 14;

function diasDelMes(mes: string) {
  const [anio, numeroMes] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
}

// Asistencias por semana en un mes ("aaaa-mm"). En el mes en curso solo cuentan los días que ya pasaron.
export function promedioSemanal(cantidad: number, mes: string, hoy: string) {
  const dias = mes === hoy.slice(0, 7) ? Number(hoy.slice(8, 10)) : diasDelMes(mes);
  return Math.round((cantidad / dias) * 7 * 10) / 10;
}

// Qué destacados se anuncian hoy en Inicio: el del mes, su último día; el del año, del 29 al 31 de diciembre.
export function destacadosDeHoy(hoy: string) {
  return {
    mes: Number(hoy.slice(8, 10)) === diasDelMes(hoy.slice(0, 7)),
    anio: hoy.slice(5) >= "12-29",
  };
}

// Quién tuvo más asistencias entre dos fechas (hasta no incluida). Si empatan, todos; null si nadie vino.
async function alumnoConMasAsistencias(desde: string, hasta: string) {
  const conteos = await prisma.asistencia.groupBy({
    by: ["alumnoId"],
    where: { fecha: { gte: fechaDesdeTexto(desde), lt: fechaDesdeTexto(hasta) } },
    _count: { _all: true },
  });
  if (conteos.length === 0) return null;
  const cantidad = Math.max(...conteos.map((conteo) => conteo._count._all));
  const alumnos = await prisma.alumno.findMany({
    where: { id: { in: conteos.filter((conteo) => conteo._count._all === cantidad).map((conteo) => conteo.alumnoId) } },
    select: { id: true, nombre: true, apellido: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
  return { cantidad, alumnos };
}

export function destacadoDelMes(mes: string) {
  const inicio = `${mes}-01`;
  return alumnoConMasAsistencias(inicio, sumarMeses(inicio, 1));
}

export function destacadoDelAnio(anio: string) {
  const inicio = `${anio}-01-01`;
  return alumnoConMasAsistencias(inicio, sumarMeses(inicio, 12));
}

// Alumnos activos, marcando quiénes ya tienen asistencia ese día.
export async function listarDia(fecha: string) {
  const alumnos = await prisma.alumno.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      asistencias: { where: { fecha: fechaDesdeTexto(fecha) }, select: { id: true } },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
  return alumnos.map(({ asistencias, ...alumno }) => ({ ...alumno, presente: asistencias.length > 0 }));
}

// Si ya tenía asistencia ese día no hace nada: hay una sola por día.
export async function registrarAsistencia(alumnoId: number, fecha: string) {
  const alumno = await obtenerAlumno(alumnoId);
  if (!alumno.activo) {
    throw new ErrorHttp(400, "El alumno está dado de baja");
  }
  const dia = fechaDesdeTexto(fecha);
  await prisma.asistencia.upsert({
    where: { alumnoId_fecha: { alumnoId, fecha: dia } },
    create: { alumnoId, fecha: dia },
    update: {},
  });
}

export async function quitarAsistencia(alumnoId: number, fecha: string) {
  await prisma.asistencia.deleteMany({ where: { alumnoId, fecha: fechaDesdeTexto(fecha) } });
}

// Reporte de un mes: totales, asistencias de cada alumno y quiénes hace mucho que no vienen.
export async function resumenMes(mes: string) {
  const hoy = hoyComoTexto();
  const inicio = `${mes}-01`;
  const delMes = { fecha: { gte: fechaDesdeTexto(inicio), lt: fechaDesdeTexto(sumarMeses(inicio, 1)) } };

  const [total, destacadoMes, destacadoAnio, alumnos] = await Promise.all([
    prisma.asistencia.count({ where: delMes }),
    destacadoDelMes(mes),
    destacadoDelAnio(mes.slice(0, 4)),
    prisma.alumno.findMany({
      // Los dados de baja solo figuran en los meses en que vinieron.
      where: { OR: [{ activo: true }, { asistencias: { some: delMes } }] },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        activo: true,
        asistencias: { select: { fecha: true }, orderBy: { fecha: "desc" }, take: 1 },
        _count: { select: { asistencias: { where: delMes } } },
      },
    }),
  ]);

  const filas = alumnos.map((alumno) => {
    const ultima = alumno.asistencias[0] ? textoDesdeFecha(alumno.asistencias[0].fecha) : null;
    return {
      id: alumno.id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      activo: alumno.activo,
      cantidad: alumno._count.asistencias,
      promedioSemanal: promedioSemanal(alumno._count.asistencias, mes, hoy),
      ultimaAsistencia: ultima,
      diasSinVenir: ultima ? diasEntre(ultima, hoy) : null,
    };
  });

  return {
    mes,
    total,
    alumnosQueVinieron: filas.filter((fila) => fila.cantidad > 0).length,
    destacadoMes,
    destacadoAnio,
    alumnos: filas.sort((a, b) => b.cantidad - a.cantidad || a.apellido.localeCompare(b.apellido)),
    // Quien nunca vino no cuenta: al empezar a usar el sistema aparecerían todos.
    sinVenir: filas
      .filter((fila) => fila.activo && fila.diasSinVenir !== null && fila.diasSinVenir > DIAS_SIN_VENIR)
      .sort((a, b) => (b.diasSinVenir ?? 0) - (a.diasSinVenir ?? 0)),
    diasAvisoSinVenir: DIAS_SIN_VENIR,
  };
}

// Historial de un alumno: la fecha de cada asistencia, de la más nueva a la más vieja.
export async function historialAlumno(alumnoId: number) {
  await obtenerAlumno(alumnoId); // 404 si no existe
  const asistencias = await prisma.asistencia.findMany({
    where: { alumnoId },
    select: { fecha: true },
    orderBy: { fecha: "desc" },
  });
  const fechas = asistencias.map((asistencia) => textoDesdeFecha(asistencia.fecha));
  const mesActual = hoyComoTexto().slice(0, 7);
  return { total: fechas.length, esteMes: fechas.filter((fecha) => fecha.startsWith(mesActual)).length, fechas };
}
