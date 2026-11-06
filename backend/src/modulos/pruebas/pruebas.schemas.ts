import { CategoriaPrueba } from "@prisma/client";
import { z } from "zod";

export const esquemaPrueba = z.object({
  nombre: z
    .string({ error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  categoria: z.enum(CategoriaPrueba, { error: "Elegí una categoría" }),
  unidad: z
    .string({ error: "La unidad es obligatoria" })
    .trim()
    .min(1, "La unidad es obligatoria")
    .max(20, "Máximo 20 caracteres"),
  porLado: z.boolean().default(false), // se carga por lado (izquierdo / derecho)
  activa: z.boolean().default(true),
});

export type DatosPrueba = z.infer<typeof esquemaPrueba>;

// GET /api/pruebas?incluirInactivas=true
export const esquemaFiltrosPruebas = z.object({
  incluirInactivas: z.stringbool().default(false),
  incluirEliminadas: z.stringbool().default(false),
});
