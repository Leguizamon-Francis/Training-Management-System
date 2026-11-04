import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TipoBloque } from "@prisma/client";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { env } from "../../config/env";
import { ErrorHttp } from "../../lib/errores";
import { calcularEdad, fechaArgentina, fechaDesdeTexto, formatearFechaTexto, hoyComoTexto, sumarMeses, textoDesdeFecha } from "../../lib/fechas";
import { prisma } from "../../lib/prisma";
import { obtenerAlumno } from "../alumnos/alumnos.service";

// Campos que se muestran en las listas: "deporte" en los modelos actuales; en la planilla vieja, "untitled2"
// (los nombres "untitled…" los puso el programa que armó ese PDF).
const CAMPO_DEPORTE = "deporte";
const CAMPO_OBJETIVO_VIEJO = "untitled2";
const CAMPO_NOMBRE = "nombre";

// Duración de cada tipo de rutina. Los modelos tienen 4 microciclos de 2 semanas.
const MESES_POR_BLOQUE: Record<TipoBloque, number> = {
  MICROCICLOS_2_SEMANAS: 2,
  MICROCICLOS_1_SEMANA: 1,
  MODELO_RUTINA: 2,
  MODELO_RUTINA_2: 2,
};

// Planilla de cada tipo, relativa a la carpeta backend. Los tipos viejos solo abren las rutinas ya guardadas.
const PLANTILLAS: Record<TipoBloque, string> = {
  MICROCICLOS_2_SEMANAS: env.PLANTILLA_RUTINA,
  MICROCICLOS_1_SEMANA: env.PLANTILLA_RUTINA,
  MODELO_RUTINA: "plantillas/Modelo Rutina.pdf",
  MODELO_RUTINA_2: "plantillas/Modelo Rutina 2.pdf",
};

type Valores = Record<string, string>;

// La plantilla se lee del disco cada vez: si se reemplaza el archivo, se usa la nueva sin reiniciar nada.
// Nunca se escribe sobre ella.
async function leerPlantilla(tipo: TipoBloque) {
  const ruta = path.resolve(process.cwd(), PLANTILLAS[tipo]);
  try {
    return await readFile(ruta);
  } catch {
    throw new ErrorHttp(500, `No se encontró la plantilla de rutinas (${PLANTILLAS[tipo]})`);
  }
}

// Lee lo escrito en cada campo del PDF completado.
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
    if (campo instanceof PDFTextField && campo.getName() in valores) campo.setText(textoDibujable(valores[campo.getName()]));
  }
  return pdf.save();
}

// ---------- Consultas ----------

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
  return rutina;
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
// arranca en blanco). Con una rutina base del mismo alumno, copia lo escrito en ella, salvo las fechas,
// que son del bloque anterior.
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
  return generarPdf(tipo, {
    ...copiados,
    [CAMPO_NOMBRE]: `${alumno.apellido}, ${alumno.nombre}`,
    edad: String(calcularEdad(textoDesdeFecha(alumno.fechaNacimiento))),
  });
}

// ---------- Altas y cambios ----------

export async function crearRutina(alumnoId: number | null, tipo: TipoBloque, pdf: Uint8Array) {
  if (alumnoId !== null) await obtenerAlumno(alumnoId);
  const valores = await extraerValores(pdf);
  // La rutina empieza el día que se crea y dura lo que indica su tipo de bloque.
  const desde = hoyComoTexto();
  const hasta = sumarMeses(desde, MESES_POR_BLOQUE[tipo]);
  return prisma.rutina.create({
    data: { alumnoId, tipo, valores, ...resumen(valores), desde: fechaDesdeTexto(desde), hasta: fechaDesdeTexto(hasta) },
    select: datosRutina,
  });
}

export async function actualizarRutina(id: number, pdf: Uint8Array) {
  await obtenerRutina(id);
  const valores = await extraerValores(pdf);
  return prisma.rutina.update({ where: { id }, data: { valores, ...resumen(valores) }, select: datosRutina });
}

export async function eliminarRutina(id: number) {
  await obtenerRutina(id);
  await prisma.rutina.delete({ where: { id } });
}
