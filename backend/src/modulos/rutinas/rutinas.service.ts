import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TipoBloque } from "@prisma/client";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { env } from "../../config/env";
import { ErrorHttp } from "../../lib/errores";
import { calcularEdad, fechaArgentina, fechaDesdeTexto, formatearFechaTexto, hoyComoTexto, sumarDias, sumarMeses, textoDesdeFecha } from "../../lib/fechas";
import { prisma } from "../../lib/prisma";
import { obtenerAlumno } from "../alumnos/alumnos.service";
import { conservarCambiosDelAlumno } from "./rutina-alumno.service";

// Campos que se muestran en las listas: "deporte" en los modelos actuales; en la planilla vieja, "untitled2"
// (los nombres "untitled…" los puso el programa que armó ese PDF).
const CAMPO_DEPORTE = "deporte";
const CAMPO_OBJETIVO_VIEJO = "untitled2";
const CAMPO_NOMBRE = "nombre";

// Duración de cada tipo de rutina. "Modelo Rutina" y "Modelo Rutina 2" tienen 4 microciclos de 2 semanas.
const DURACION: Record<TipoBloque, { meses: number } | { semanas: number }> = {
  MICROCICLOS_2_SEMANAS: { meses: 2 },
  MICROCICLOS_1_SEMANA: { meses: 1 },
  MODELO_RUTINA: { meses: 2 },
  MODELO_RUTINA_2: { meses: 2 },
  PLANILLA_6_SEMANAS: { semanas: 6 },
};

function fechaFin(tipo: TipoBloque, desde: string) {
  const duracion = DURACION[tipo];
  return "meses" in duracion ? sumarMeses(desde, duracion.meses) : sumarDias(desde, duracion.semanas * 7);
}

// Los tipos viejos usan una planilla en un archivo (PLANTILLA_RUTINA) y solo sirven para abrir las rutinas ya
// guardadas. Esa planilla no se guarda en ninguna base: tiene datos de una persona real y terminaría copiada en otros
// gimnasios (por ejemplo, en la demo).
const PLANTILLAS_VIEJAS: Partial<Record<TipoBloque, string>> = {
  MICROCICLOS_2_SEMANAS: env.PLANTILLA_RUTINA,
  MICROCICLOS_1_SEMANA: env.PLANTILLA_RUTINA,
};

// Modelos actuales: los PDF que genera `npm run plantillas` (carpeta backend/plantillas). De ahí se cargan a la base
// de cada gimnasio con `npm run centros -- plantillas <base> [modelos]`; el sistema usa siempre la copia del
// gimnasio, y cada gimnasio ve solo los modelos que tiene cargados.
export const ARCHIVOS_MODELOS: Partial<Record<TipoBloque, string>> = {
  MODELO_RUTINA: "plantillas/Modelo Rutina.pdf",
  MODELO_RUTINA_2: "plantillas/Modelo Rutina 2.pdf",
  PLANILLA_6_SEMANAS: "plantillas/Planilla 6 semanas.pdf",
};

type Valores = Record<string, string>;

// Planilla del tipo de rutina, del gimnasio del pedido. Nunca se escribe sobre ella.
async function leerPlantilla(tipo: TipoBloque) {
  const vieja = PLANTILLAS_VIEJAS[tipo];
  if (vieja) {
    try {
      return await readFile(path.resolve(process.cwd(), vieja));
    } catch {
      throw new ErrorHttp(500, `No se encontró la plantilla de rutinas (${vieja})`);
    }
  }
  const plantilla = await prisma.plantillaRutina.findUnique({ where: { tipo } });
  if (!plantilla) throw new ErrorHttp(404, "Este gimnasio todavía no tiene cargada la planilla de ese modelo de rutina.");
  return plantilla.pdf;
}

async function extraerValores(bytes: Uint8Array) {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes);
  } catch {
    throw new ErrorHttp(400, "El archivo recibido no es un PDF válido");
  }
  const valores: Valores = {};
  for (const campo of pdf.getForm().getFields()) {
    if (campo instanceof PDFTextField) valores[campo.getName()] = campo.getText() ?? "";
  }
  if (Object.keys(valores).length === 0) {
    throw new ErrorHttp(400, "El PDF no tiene los campos de la plantilla de rutinas");
  }
  return valores;
}

function resumen(valores: Valores) {
  return { objetivo: (valores[CAMPO_DEPORTE] ?? valores[CAMPO_OBJETIVO_VIEJO])?.trim() || null };
}

// La fuente de los campos del PDF (Helvetica) no tiene todos los caracteres: se reemplazan los más comunes
// y se quitan los que no puede dibujar (las tildes y la ñ sí las tiene). Lo guardado en la base no cambia.
function textoDibujable(texto: string) {
  return texto
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\n\r\t\x20-\x7E\xA0-\xFF]/g, "");
}

// Arma el PDF de una rutina: la plantilla con los valores dados. Los campos siguen siendo editables,
// y los que no vienen en valores conservan lo que trae la plantilla.
async function generarPdf(tipo: TipoBloque, valores: Valores) {
  const pdf = await PDFDocument.load(await leerPlantilla(tipo));
  for (const campo of pdf.getForm().getFields()) {
    if (!(campo instanceof PDFTextField) || !(campo.getName() in valores)) continue;
    // Solo se reescriben los que cambian: cada campo reescrito suma peso al PDF, y hay planillas con miles de campos vacíos.
    const texto = textoDibujable(valores[campo.getName()]);
    if (texto !== (campo.getText() ?? "")) campo.setText(texto);
  }
  return pdf.save();
}

// ---------- Consultas ----------

// Modelos de rutina que tiene cargados el gimnasio del pedido (los únicos que puede elegir), en el orden de ARCHIVOS_MODELOS.
export async function listarModelos() {
  const cargados = await prisma.plantillaRutina.findMany({ select: { tipo: true } });
  const tipos = new Set(cargados.map((plantilla) => plantilla.tipo));
  return (Object.keys(ARCHIVOS_MODELOS) as TipoBloque[]).filter((tipo) => tipos.has(tipo));
}

// Alumnos activos con cuántas rutinas tienen y cuándo se creó la última.
export async function listarAlumnosConRutinas() {
  const alumnos = await prisma.alumno.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      rutinas: { select: { creadoEn: true }, orderBy: { creadoEn: "desc" }, take: 1 },
      _count: { select: { rutinas: true } },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
  return alumnos.map((alumno) => ({
    id: alumno.id,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    cantidad: alumno._count.rutinas,
    ultimaRutina: alumno.rutinas[0] ? fechaArgentina(alumno.rutinas[0].creadoEn) : null,
  }));
}

// Datos de cada rutina, sin los valores de los campos (para las listas).
const datosRutina = {
  id: true,
  alumnoId: true,
  tipo: true,
  objetivo: true,
  desde: true,
  hasta: true,
  linkAlumno: true, // link para que el alumno la complete desde el celular (null = no compartida)
  alumnoEditoEn: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

export async function listarRutinas(alumnoId: number) {
  await obtenerAlumno(alumnoId); // 404 si no existe
  return prisma.rutina.findMany({ where: { alumnoId }, select: datosRutina, orderBy: [{ creadoEn: "desc" }, { id: "desc" }] });
}

export async function obtenerRutina(id: number) {
  const rutina = await prisma.rutina.findUnique({
    where: { id },
    select: { ...datosRutina, alumno: { select: { id: true, nombre: true, apellido: true } } },
  });
  if (!rutina) {
    throw new ErrorHttp(404, "Rutina no encontrada");
  }
  // leidaEn: el editor la devuelve al guardar, para no pisar lo que el alumno cambie mientras tanto.
  return { ...rutina, leidaEn: new Date() };
}

// Rutinas sin alumno, con el nombre escrito en la planilla para reconocerlas en la lista.
export async function listarRutinasSueltas() {
  const rutinas = await prisma.rutina.findMany({
    where: { alumnoId: null },
    select: { ...datosRutina, valores: true },
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
  });
  return rutinas.map(({ valores, ...rutina }) => ({ ...rutina, nombre: nombreEscrito(valores as Valores) }));
}

function nombreEscrito(valores: Valores) {
  return valores[CAMPO_NOMBRE]?.trim() || null;
}

// PDF de una rutina guardada, con un nombre de archivo para descargarlo.
export async function pdfDeRutina(id: number) {
  const rutina = await prisma.rutina.findUnique({
    where: { id },
    include: { alumno: { select: { nombre: true, apellido: true } } },
  });
  if (!rutina) {
    throw new ErrorHttp(404, "Rutina no encontrada");
  }
  const valores = rutina.valores as Valores;
  const para = rutina.alumno ? `${rutina.alumno.apellido} ${rutina.alumno.nombre}` : nombreEscrito(valores);
  return {
    bytes: await generarPdf(rutina.tipo, valores),
    nombreArchivo: `Rutina ${para ? `${para} ` : ""}${formatearFechaTexto(fechaArgentina(rutina.creadoEn))}.pdf`,
  };
}

// PDF para empezar una rutina nueva: la plantilla con el nombre y la edad del alumno (una rutina sin alumno
// arranca en blanco). Con una rutina base del mismo alumno (o, sin alumno, otra rutina sin alumno), copia lo
// escrito en ella, salvo las fechas, que son del bloque anterior.
export async function borradorRutina(alumnoId: number | null, tipo: TipoBloque, baseId?: number) {
  const alumno = alumnoId === null ? null : await obtenerAlumno(alumnoId);
  let copiados: Valores = {};
  if (baseId) {
    const base = await prisma.rutina.findUnique({ where: { id: baseId } });
    if (!base || base.alumnoId !== alumnoId) {
      throw new ErrorHttp(404, "Rutina no encontrada");
    }
    if (base.tipo !== tipo) {
      throw new ErrorHttp(400, "La rutina base es de otro modelo");
    }
    copiados = Object.fromEntries(Object.entries(base.valores as Valores).filter(([campo]) => !campo.startsWith("fecha_")));
  }
  if (!alumno) return generarPdf(tipo, copiados);
  return generarPdf(tipo, { ...copiados, ...datosDelAlumno(alumno) });
}

function datosDelAlumno(alumno: { nombre: string; apellido: string; fechaNacimiento: Date }): Valores {
  return {
    [CAMPO_NOMBRE]: `${alumno.apellido}, ${alumno.nombre}`,
    edad: String(calcularEdad(textoDesdeFecha(alumno.fechaNacimiento))),
  };
}

// ---------- Altas y cambios ----------

// Con datosAlumno, el nombre y la edad de la planilla pasan a ser los del alumno ("Guardar en" otro alumno).
export async function crearRutina(alumnoId: number | null, tipo: TipoBloque, pdf: Uint8Array, datosAlumno = false) {
  const alumno = alumnoId === null ? null : await obtenerAlumno(alumnoId);
  let valores = await extraerValores(pdf);
  if (alumno && datosAlumno) valores = { ...valores, ...datosDelAlumno(alumno) };
  // La rutina empieza el día que se crea y dura lo que indica su tipo de bloque.
  const desde = hoyComoTexto();
  const hasta = fechaFin(tipo, desde);
  return prisma.rutina.create({
    data: { alumnoId, tipo, valores, ...resumen(valores), desde: fechaDesdeTexto(desde), hasta: fechaDesdeTexto(hasta) },
    select: datosRutina,
  });
}

// leidaEn: cuándo se abrió la rutina en el editor (ver conservarCambiosDelAlumno).
export async function actualizarRutina(id: number, pdf: Uint8Array, leidaEn?: Date) {
  await obtenerRutina(id);
  const nuevos = await extraerValores(pdf);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Rutina" WHERE id = ${id} FOR UPDATE`; // que no se mezcle con un guardado del alumno
    const actual = await tx.rutina.findUniqueOrThrow({ where: { id }, select: { valores: true, edicionesAlumno: true } });
    const valores = leidaEn
      ? conservarCambiosDelAlumno(nuevos, actual.valores as Valores, actual.edicionesAlumno as Record<string, string>, leidaEn)
      : nuevos;
    return tx.rutina.update({ where: { id }, data: { valores, ...resumen(valores) }, select: datosRutina });
  });
}

export async function eliminarRutina(id: number) {
  await obtenerRutina(id);
  await prisma.rutina.delete({ where: { id } });
}
