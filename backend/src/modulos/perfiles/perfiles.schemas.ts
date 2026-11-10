import { z } from "zod";

const MAXIMO_MESES_REEVALUACION = 24;

export const esquemaPerfil = z.object({
  nombre: z
    .string({ error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(50, "Máximo 50 caracteres"),
  // Llega como número o como texto del formulario ("3").
  mesesReevaluacion: z.coerce
    .number({ error: "Indicá cada cuántos meses se reevalúa" })
    .int("Tiene que ser un número entero de meses")
    .min(1, "Mínimo 1 mes")
    .max(MAXIMO_MESES_REEVALUACION, `Máximo ${MAXIMO_MESES_REEVALUACION} meses`),
});

export type DatosPerfil = z.infer<typeof esquemaPerfil>;
