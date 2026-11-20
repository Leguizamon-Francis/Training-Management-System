import { ErrorHttp } from "../../lib/errores";
import { prisma } from "../../lib/prisma";
import type { DatosNombrePlan, DatosNuevoPlan, DatosPrecioPlan } from "./planes.schemas";

// Primero las 4 del seed en el orden de las modalidades (Presencial, Semi presencial, Online, Otro)
// y después las agregadas por el gimnasio, en el orden en que se crearon.
// "eliminable": la agregó el gimnasio y ningún alumno (activo o no) ni cuota la usa.
export async function listarPlanes() {
  const planes = await prisma.plan.findMany({
    orderBy: [{ modalidad: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    include: { _count: { select: { alumnos: true, cuotas: true } } },
  });
  return planes.map(({ _count, ...plan }) => ({
    ...plan,
    eliminable: plan.modalidad === null && _count.alumnos === 0 && _count.cuotas === 0,
  }));
}

async function obtenerPlan(id: number) {
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) {
    throw new ErrorHttp(404, "Membresía no encontrada");
  }
  return plan;
}

// Sin distinguir mayúsculas, para no tener "Pase libre" y "pase libre" como membresías distintas.
async function verificarNombreLibre(nombre: string, idActual?: number) {
  const otro = await prisma.plan.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  if (otro && otro.id !== idActual) {
    throw new ErrorHttp(409, `Ya existe una membresía llamada "${otro.nombre}"`);
  }
}

export async function crearPlan(datos: DatosNuevoPlan) {
  await verificarNombreLibre(datos.nombre);
  return prisma.plan.create({ data: { nombre: datos.nombre, precioMensual: datos.precioMensual } });
}

// Cambiar el precio no modifica las cuotas ya generadas: cada cuota guarda su propio importe.
export async function actualizarPrecioPlan(id: number, datos: DatosPrecioPlan) {
  await obtenerPlan(id);
  return prisma.plan.update({ where: { id }, data: { precioMensual: datos.precioMensual } });
}

// Se puede renombrar cualquier membresía. El historial de los alumnos conserva el nombre que tenía en ese momento.
export async function cambiarNombrePlan(id: number, datos: DatosNombrePlan) {
  await obtenerPlan(id);
  await verificarNombreLibre(datos.nombre, id);
  return prisma.plan.update({ where: { id }, data: { nombre: datos.nombre } });
}

// Solo las agregadas por el gimnasio y que nadie usa: así no quedan alumnos sin membresía ni cuotas sin su plan.
export async function eliminarPlan(id: number) {
  const plan = await obtenerPlan(id);
  if (plan.modalidad !== null) {
    throw new ErrorHttp(409, `"${plan.nombre}" es una de las membresías iniciales: no se puede eliminar`);
  }
  const alumnos = await prisma.alumno.count({ where: { planId: id } });
  if (alumnos > 0) {
    const cuantos = alumnos === 1 ? "1 alumno la tiene" : `${alumnos} alumnos la tienen`;
    throw new ErrorHttp(409, `No se puede eliminar "${plan.nombre}": ${cuantos}. Primero cambiales la membresía.`);
  }
  if ((await prisma.cuota.count({ where: { planId: id } })) > 0) {
    throw new ErrorHttp(409, `No se puede eliminar "${plan.nombre}": ya hay cuotas cobradas con esta membresía.`);
  }
  await prisma.plan.delete({ where: { id } });
}
