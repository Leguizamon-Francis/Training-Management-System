import { z } from "zod";
import { esquemaImporte } from "../../lib/montos";

const esquemaNombre = z.string().trim().min(1, "Escribí el nombre").max(60, "Hasta 60 caracteres");

// Cambiar el precio de una membresía.
export const esquemaPrecioPlan = z.object({
  precioMensual: esquemaImporte,
});

// Cambiar el nombre de una membresía.
export const esquemaNombrePlan = z.object({
  nombre: esquemaNombre,
});

// Agregar una membresía (las nuevas no tienen modalidad).
export const esquemaNuevoPlan = z.object({
  nombre: esquemaNombre,
  precioMensual: esquemaImporte,
});

export type DatosPrecioPlan = z.infer<typeof esquemaPrecioPlan>;
export type DatosNombrePlan = z.infer<typeof esquemaNombrePlan>;
export type DatosNuevoPlan = z.infer<typeof esquemaNuevoPlan>;
