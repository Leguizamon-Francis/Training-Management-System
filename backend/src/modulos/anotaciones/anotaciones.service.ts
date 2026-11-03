import { ErrorHttp } from "../../lib/errores";
import { fechaDesdeTexto } from "../../lib/fechas";
import { prisma } from "../../lib/prisma";
import { obtenerAlumno } from "../alumnos/alumnos.service";
import type { DatosAnotacion } from "./anotaciones.schemas";

function datosParaPrisma(datos: DatosAnotacion) {
  return { ...datos, fecha: fechaDesdeTexto(datos.fecha) };
}

async function obtenerAnotacion(id: number) {
  const anotacion = await prisma.anotacion.findUnique({ where: { id } });
  if (!anotacion) {
    throw new ErrorHttp(404, "Anotación no encontrada");
  }
  return anotacion;
}

export async function listarAnotaciones(alumnoId: number) {
  await obtenerAlumno(alumnoId);
  return prisma.anotacion.findMany({
    where: { alumnoId },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
  });
}

export async function crearAnotacion(alumnoId: number, datos: DatosAnotacion) {
  await obtenerAlumno(alumnoId);
  return prisma.anotacion.create({ data: { ...datosParaPrisma(datos), alumnoId } });
}

export async function actualizarAnotacion(id: number, datos: DatosAnotacion) {
  await obtenerAnotacion(id);
  return prisma.anotacion.update({ where: { id }, data: datosParaPrisma(datos) });
}

export async function eliminarAnotacion(id: number) {
  await obtenerAnotacion(id);
  await prisma.anotacion.delete({ where: { id } });
}
