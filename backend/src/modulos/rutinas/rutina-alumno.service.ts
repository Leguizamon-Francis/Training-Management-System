// Rutinas que el alumno completa desde el celular, con un link y sin usuario (como una planilla compartida).
// El profesor crea el link desde la lista de rutinas; el alumno ve un día y una semana por vez y puede cambiar
// cualquier campo de los días. Lo que guarda va a la misma rutina, así el profesor lo ve al abrirla.
import crypto from "node:crypto";
import type { Prisma, TipoBloque } from "@prisma/client";
import { ErrorHttp } from "../../lib/errores";
import { hoyComoTexto, sumarDias, textoDesdeFecha } from "../../lib/fechas";
import { prisma } from "../../lib/prisma";
import { camposDeLosDias, estructuraPlanilla6Semanas } from "./planilla-6-semanas";

type Valores = Record<string, string>;
type Ediciones = Record<string, string>; // campo → fecha y hora ISO del último cambio del alumno

// Por ahora solo la "Planilla 6 semanas" tiene vista para el celular.
const MODELOS_PARA_ALUMNO: TipoBloque[] = ["PLANILLA_6_SEMANAS"];

// El link deja de funcionar un mes después del "hasta" de la rutina (el profesor también lo puede cortar).
const DIAS_LINK_DESPUES_DEL_FIN = 30;

const DIAS = estructuraPlanilla6Semanas();
const CAMPOS_EDITABLES = camposDeLosDias(DIAS);

// ---------- Del lado del profesor (con sesión) ----------

// Devuelve el link de la rutina; si no tenía, lo crea. Siempre el mismo hasta que se deje de compartir.
export async function compartirRutina(id: number) {
  const rutina = await prisma.rutina.findUnique({ where: { id }, select: { tipo: true, linkAlumno: true } });
  if (!rutina) throw new ErrorHttp(404, "Rutina no encontrada");
  if (!MODELOS_PARA_ALUMNO.includes(rutina.tipo)) {
    throw new ErrorHttp(400, "Este modelo de rutina todavía no se puede compartir con el alumno.");
  }
  if (rutina.linkAlumno) return { linkAlumno: rutina.linkAlumno };
  const linkAlumno = crypto.randomBytes(24).toString("base64url"); // 32 caracteres al azar: imposible de adivinar
  await prisma.rutina.update({ where: { id }, data: { linkAlumno } });
  return { linkAlumno };
}

// Corta el link: el que lo tenga ya no entra. Si se vuelve a compartir, sale un link nuevo.
export async function dejarDeCompartir(id: number) {
  const rutina = await prisma.rutina.findUnique({ where: { id }, select: { id: true } });
  if (!rutina) throw new ErrorHttp(404, "Rutina no encontrada");
  await prisma.rutina.update({ where: { id }, data: { linkAlumno: null } });
}

// Al guardar desde el editor (que manda la planilla entera), los campos que el alumno cambió después de que se
// abrió la rutina (leidaEn) conservan lo del alumno: si no, se perderían cambios que el profesor nunca vio.
export function conservarCambiosDelAlumno(nuevos: Valores, actuales: Valores, ediciones: Ediciones, leidaEn: Date) {
  const resultado = { ...nuevos };
  for (const [campo, cuando] of Object.entries(ediciones)) {
    if (new Date(cuando) > leidaEn && campo in actuales) resultado[campo] = actuales[campo];
  }
  return resultado;
}

// ---------- Del lado del alumno (sin sesión: corre dentro del gimnasio del link) ----------

async function buscarPorLink(link: string) {
  const rutina = await prisma.rutina.findUnique({ where: { linkAlumno: link } });
  if (!rutina || !MODELOS_PARA_ALUMNO.includes(rutina.tipo)) {
    throw new ErrorHttp(404, "Este link no existe o ya no está activo. Pedile a tu profesor uno nuevo.");
  }
  if (hoyComoTexto() > sumarDias(textoDesdeFecha(rutina.hasta), DIAS_LINK_DESPUES_DEL_FIN)) {
    throw new ErrorHttp(410, "Esta rutina ya terminó. Pedile a tu profesor la nueva.");
  }
  return rutina;
}

export async function rutinaParaAlumno(link: string) {
  const rutina = await buscarPorLink(link);
  const todos = rutina.valores as Valores;
  // Solo los campos de los días (y los datos de arriba): nada más de la base viaja al celular.
  const valores: Valores = {};
  for (const campo of CAMPOS_EDITABLES) if (todos[campo]) valores[campo] = todos[campo];
  return {
    nombre: todos.nombre?.trim() || null,
    deporte: todos.deporte?.trim() || null,
    desde: textoDesdeFecha(rutina.desde),
    hasta: textoDesdeFecha(rutina.hasta),
    dias: DIAS,
    valores,
  };
}

// Guarda solo los campos que cambió el alumno, encima de lo último guardado (por si el profesor también la editó).
export async function guardarCambiosDelAlumno(link: string, cambios: Valores) {
  const invalido = Object.keys(cambios).find((campo) => !CAMPOS_EDITABLES.has(campo));
  if (invalido) throw new ErrorHttp(400, `El campo ${invalido} no es parte de la rutina`);
  const { id } = await buscarPorLink(link);
  const ahora = new Date();

  await prisma.$transaction(async (tx) => {
    // Bloquea la fila hasta terminar: dos guardados al mismo tiempo no se pisan.
    await tx.$queryRaw`SELECT id FROM "Rutina" WHERE id = ${id} FOR UPDATE`;
    const actual = await tx.rutina.findUniqueOrThrow({ where: { id }, select: { valores: true, edicionesAlumno: true } });
    const ediciones: Ediciones = { ...(actual.edicionesAlumno as Ediciones) };
    for (const campo of Object.keys(cambios)) ediciones[campo] = ahora.toISOString();
    await tx.rutina.update({
      where: { id },
      data: {
        valores: { ...(actual.valores as Valores), ...cambios } as Prisma.InputJsonObject,
        edicionesAlumno: ediciones,
        alumnoEditoEn: ahora,
      },
    });
  });
  return { guardadoEn: ahora };
}
