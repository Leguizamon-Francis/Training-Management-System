import { z } from "zod";
import { esquemaFechaHastaHoy, hoyComoTexto } from "../../lib/fechas";

const fecha = esquemaFechaHastaHoy;

// PUT y DELETE /api/alumnos/:alumnoId/asistencias/:fecha
export const esquemaFechaAsistencia = fecha;

// GET /api/asistencias/dia?fecha=aaaa-mm-dd
export const esquemaDia = z.object({ fecha });

// GET /api/asistencias/resumen?mes=aaaa-mm
export const esquemaMes = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido")
    .refine((valor) => valor <= hoyComoTexto().slice(0, 7), "El mes no puede ser futuro"),
});
