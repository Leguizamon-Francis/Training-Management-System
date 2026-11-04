import type { Perfil, Prisma } from "@prisma/client";
import { ErrorHttp } from "../../lib/errores";
import { diasEntre, fechaArgentina, fechaDesdeTexto, hoyComoTexto, sumarMeses, textoDesdeFecha } from "../../lib/fechas";
import { prisma } from "../../lib/prisma";
import { obtenerAlumno } from "../alumnos/alumnos.service";
import type { DatosEvaluacion } from "./evaluaciones.schemas";

// Cada cuántos meses se reevalúa según el perfil.
const MESES_REEVALUACION: Record<Perfil, number> = {
  DEPORTIVO: 2,
  SALUD: 4,
};

// Próxima evaluación = última evaluación (o, si nunca se evaluó, la fecha de alta) + plazo del perfil.
// Se calcula siempre, no se guarda: si se evalúa antes, el plazo se cuenta desde esa evaluación.
function calcularProximaEvaluacion(perfil: Perfil, ultimaEvaluacion: Date | null, alta: Date) {
  const base = ultimaEvaluacion ? textoDesdeFecha(ultimaEvaluacion) : fechaArgentina(alta);
  const fecha = sumarMeses(base, MESES_REEVALUACION[perfil]);
  return {
    fecha,
    desde: ultimaEvaluacion ? ("ultimaEvaluacion" as const) : ("alta" as const),
    diasRestantes: diasEntre(hoyComoTexto(), fecha), // negativo = vencida
  };
}

// Alumnos activos con su última evaluación, cuántas tiene y cuándo toca la próxima.
export async function resumenAlumnos() {
  const alumnos = await prisma.alumno.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      perfil: true,
      creadoEn: true,
      evaluaciones: { select: { fecha: true }, orderBy: { fecha: "desc" }, take: 1 },
      _count: { select: { evaluaciones: true } },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  return alumnos.map((alumno) => {
    const ultima = alumno.evaluaciones[0]?.fecha ?? null;
    return {
      id: alumno.id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      perfil: alumno.perfil,
      cantidad: alumno._count.evaluaciones,
      ultimaEvaluacion: ultima ? textoDesdeFecha(ultima) : null,
      proximaEvaluacion: calcularProximaEvaluacion(alumno.perfil, ultima, alumno.creadoEn),
    };
  });
}

// Resultados con los datos de su prueba, en el orden en que se cargaron.
const conResultados = {
  resultados: {
    include: { prueba: { select: { id: true, nombre: true, categoria: true, unidad: true } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.EvaluacionInclude;

export async function obtenerEvaluacion(id: number) {
  const evaluacion = await prisma.evaluacion.findUnique({ where: { id }, include: conResultados });
  if (!evaluacion) {
    throw new ErrorHttp(404, "Evaluación no encontrada");
  }
  return evaluacion;
}

// Comprueba que las pruebas existan (y que el lado se use solo donde corresponde)
// y completa la unidad con la de la prueba si no se indicó.
async function prepararResultados(resultados: DatosEvaluacion["resultados"]) {
  const ids = [...new Set(resultados.map((resultado) => resultado.pruebaId))];
  const pruebas = await prisma.prueba.findMany({ where: { id: { in: ids } } });
  const pruebasPorId = new Map(pruebas.map((prueba) => [prueba.id, prueba]));

  return resultados.map((resultado) => {
    const prueba = pruebasPorId.get(resultado.pruebaId);
    if (!prueba) {
      throw new ErrorHttp(400, "Una de las pruebas elegidas no existe");
    }
    if (resultado.lado && !prueba.porLado) {
      throw new ErrorHttp(400, `"${prueba.nombre}" no se mide por lado: quitá el lado de ese resultado`);
    }
    return { ...resultado, unidad: resultado.unidad ?? prueba.unidad };
  });
}

export async function listarEvaluaciones(alumnoId: number) {
  const alumno = await obtenerAlumno(alumnoId);
  const evaluaciones = await prisma.evaluacion.findMany({
    where: { alumnoId },
    include: conResultados,
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
  });
  return {
    evaluaciones,
    proximaEvaluacion: calcularProximaEvaluacion(alumno.perfil, evaluaciones[0]?.fecha ?? null, alumno.creadoEn),
  };
}

export async function crearEvaluacion(alumnoId: number, datos: DatosEvaluacion) {
  await obtenerAlumno(alumnoId);
  const resultados = await prepararResultados(datos.resultados);
  return prisma.$transaction(async (tx) => {
    // "Evaluación n°": la siguiente de este alumno (si se borró la última, ese número se reutiliza).
    const { _max } = await tx.evaluacion.aggregate({ where: { alumnoId }, _max: { idEvaluacion: true } });
    return tx.evaluacion.create({
      data: {
        alumnoId,
        idEvaluacion: (_max.idEvaluacion ?? 0) + 1,
        fecha: fechaDesdeTexto(datos.fecha),
        observaciones: datos.observaciones,
        resultados: { create: resultados },
      },
      include: conResultados,
    });
  });
}

// Reemplaza todos los resultados: es más simple que comparar fila por fila.
export async function actualizarEvaluacion(id: number, datos: DatosEvaluacion) {
  await obtenerEvaluacion(id);
  const resultados = await prepararResultados(datos.resultados);
  return prisma.$transaction(async (tx) => {
    await tx.resultadoEvaluacion.deleteMany({ where: { evaluacionId: id } });
    return tx.evaluacion.update({
      where: { id },
      data: {
        fecha: fechaDesdeTexto(datos.fecha),
        observaciones: datos.observaciones,
        resultados: { create: resultados },
      },
      include: conResultados,
    });
  });
}

// Los resultados se borran solos (onDelete: Cascade en el schema).
export async function eliminarEvaluacion(id: number) {
  await obtenerEvaluacion(id);
  await prisma.evaluacion.delete({ where: { id } });
}
