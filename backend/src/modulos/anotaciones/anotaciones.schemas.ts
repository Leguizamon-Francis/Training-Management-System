import { TipoAnotacion } from "@prisma/client";
import { z } from "zod";
import { esquemaFechaHastaHoy } from "../../lib/fechas";

export const esquemaAnotacion = z.object({
  fecha: esquemaFechaHastaHoy,
  tipo: z.enum(TipoAnotacion, { error: "Elegí un tipo de anotación" }),
  detalle: z
    .string({ error: "El detalle es obligatorio" })
    .trim()
    .min(1, "El detalle es obligatorio")
    .max(2000, "Máximo 2000 caracteres"),
  motivo: z
    .string()
    .trim()
    .max(1000, "Máximo 1000 caracteres")
    .nullish()
    .transform((valor) => valor || null),
});

export type DatosAnotacion = z.infer<typeof esquemaAnotacion>;
