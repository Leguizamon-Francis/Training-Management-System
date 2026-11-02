import { z } from "zod";

// POST /api/alumnos/:alumnoId/rutinas?tipo=MODELO_RUTINA  (el cuerpo es el PDF completado)
// Las rutinas nuevas solo pueden usar los modelos actuales.
export const esquemaModeloRutina = z.object({
  tipo: z.enum(["MODELO_RUTINA", "MODELO_RUTINA_2"], { error: "Elegí el modelo de rutina" }),
});

// GET /api/alumnos/:alumnoId/rutinas/borrador?tipo=MODELO_RUTINA&base=12  (base: rutina de la que se parte)
export const esquemaBorrador = esquemaModeloRutina.extend({
  base: z.coerce.number().int().positive().optional(),
});

// GET /api/rutinas/:id/pdf?descargar=true
export const esquemaDescarga = z.object({
  descargar: z.stringbool().default(false),
});
