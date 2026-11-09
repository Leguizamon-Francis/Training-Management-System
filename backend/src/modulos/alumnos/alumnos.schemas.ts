import { z } from "zod";
import { hoyComoTexto } from "../../lib/fechas";

const textoObligatorio = (mensaje: string) =>
  z.string({ error: mensaje }).trim().min(1, mensaje).max(100, "Máximo 100 caracteres");

// Campos de texto libre opcionales: un texto vacío se guarda como null.
const textoLargo = z
  .string()
  .trim()
  .max(2000, "Máximo 2000 caracteres")
  .nullish()
  .transform((valor) => valor || null);

// Deja solo los dígitos y quita el prefijo internacional si lo cargaron (+54 9 ...).
function normalizarTelefono(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length === 13 && digitos.startsWith("549")) return digitos.slice(3);
  if (digitos.length === 12 && digitos.startsWith("54")) return digitos.slice(2);
  return digitos;
}

// POST /api/alumnos/:id/eliminar
export const esquemaEliminarAlumno = z.object({
  password: z.string({ error: "Ingresá tu contraseña" }).min(1, "Ingresá tu contraseña"),
});

export const esquemaAlumno = z.object({
  nombre: textoObligatorio("El nombre es obligatorio"),
  apellido: textoObligatorio("El apellido es obligatorio"),
  dni: z
    .string({ error: "El DNI es obligatorio" })
    .transform((valor) => valor.replace(/[.\s]/g, ""))
    .pipe(z.string().regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos")),
  fechaNacimiento: z
    .iso.date("Fecha de nacimiento inválida")
    .refine(
      (fecha) => fecha >= "1900-01-01" && fecha <= hoyComoTexto(),
      "La fecha de nacimiento no puede ser futura",
    ),
  // 10 dígitos: código de área sin 0 + número sin 15 (lo necesita el link de WhatsApp).
  telefono: z
    .string({ error: "El teléfono es obligatorio" })
    .transform(normalizarTelefono)
    .pipe(
      z
        .string()
        .regex(/^[1-9]\d{9}$/, "Código de área sin 0 y número sin 15: 10 dígitos en total (ej.: 341 6123456)"),
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .nullish()
    .transform((valor) => valor || null)
    .pipe(z.email("Email inválido").nullable()),
  profesion: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .nullish()
    .transform((valor) => valor || null),
  perfilId: z.coerce.number({ error: "Elegí un perfil" }).int("Elegí un perfil").positive("Elegí un perfil"),
  detallePerfil: textoLargo,
  lesiones: textoLargo,
  molestias: textoLargo,
  actividadLaboral: textoLargo,
  otrosDatos: textoLargo,
});

export type DatosAlumno = z.infer<typeof esquemaAlumno>;

export const esquemaEstado = z.object({
  activo: z.boolean({ error: "Indicá si el alumno queda activo o inactivo" }),
});

export const esquemaPlanAlumno = z.object({
  planId: z.number({ error: "Elegí una membresía" }).int().positive().nullable(),
});

// Filtros del listado: llegan por query string (?buscar=...&estado=...&perfilId=...).
export const esquemaFiltros = z.object({
  buscar: z.string().trim().optional(),
  estado: z.enum(["activos", "inactivos", "todos"]).default("activos"),
  perfilId: z.coerce.number().int().positive().optional(),
});

export type FiltrosAlumnos = z.infer<typeof esquemaFiltros>;
