import { ErrorHttp } from "../../lib/errores";
import { prisma } from "../../lib/prisma";
import type { DatosPerfil } from "./perfiles.schemas";

// Cada perfil con cuántos alumnos lo tienen (activos e inactivos): la pantalla lo usa para avisar
// por qué no se puede eliminar.
export async function listarPerfiles() {
  const perfiles = await prisma.perfil.findMany({
    include: { _count: { select: { alumnos: true } } },
    orderBy: { nombre: "asc" },
  });
  return perfiles.map(({ _count, ...perfil }) => ({ ...perfil, alumnos: _count.alumnos }));
}

async function obtenerPerfil(id: number) {
  const perfil = await prisma.perfil.findUnique({ where: { id } });
  if (!perfil) {
    throw new ErrorHttp(404, "Perfil no encontrado");
  }
  return perfil;
}

// Sin distinguir mayúsculas, para no tener "Salud" y "salud" como perfiles distintos.
async function verificarNombreLibre(nombre: string, idActual?: number) {
  const otro = await prisma.perfil.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  if (otro && otro.id !== idActual) {
    throw new ErrorHttp(409, `Ya existe un perfil llamado "${otro.nombre}"`);
  }
}

export async function crearPerfil(datos: DatosPerfil) {
  await verificarNombreLibre(datos.nombre);
  return prisma.perfil.create({ data: datos });
}

// Cambiar los meses mueve la próxima evaluación de todos los alumnos con este perfil: se calcula
// siempre a partir de la última evaluación, no se guarda. Cambiar el nombre no toca el historial
// de cambios de cada alumno (ahí queda el nombre que tenía en ese momento).
export async function actualizarPerfil(id: number, datos: DatosPerfil) {
  await obtenerPerfil(id);
  await verificarNombreLibre(datos.nombre, id);
  return prisma.perfil.update({ where: { id }, data: datos });
}

// Solo si ningún alumno (activo o inactivo) lo tiene: antes hay que cambiarles el perfil.
export async function eliminarPerfil(id: number) {
  const perfil = await obtenerPerfil(id);
  const alumnos = await prisma.alumno.count({ where: { perfilId: id } });
  if (alumnos > 0) {
    const cuantos = alumnos === 1 ? "1 alumno lo tiene" : `${alumnos} alumnos lo tienen`;
    throw new ErrorHttp(409, `No se puede eliminar "${perfil.nombre}": ${cuantos}. Primero cambiales el perfil.`);
  }
  if ((await prisma.perfil.count()) === 1) {
    throw new ErrorHttp(409, "Tiene que quedar al menos un perfil para poder cargar alumnos");
  }
  await prisma.perfil.delete({ where: { id } });
}
