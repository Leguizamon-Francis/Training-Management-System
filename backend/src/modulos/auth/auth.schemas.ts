import { z } from "zod";

// Se normaliza el email (sin espacios, en minúsculas) antes de validarlo.
const email = z.string({ error: "Ingresá el email" }).trim().toLowerCase().pipe(z.email("Email inválido"));

export const esquemaLogin = z.object({
  email,
  password: z.string().min(1, "Ingresá la contraseña"),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;

export const esquemaCambioPassword = z.object({
  actual: z.string().min(1, "Ingresá la contraseña actual"),
  // bcrypt solo usa los primeros 72 bytes: más larga no agrega seguridad.
  nueva: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres").max(72, "Máximo 72 caracteres"),
});

export type DatosCambioPassword = z.infer<typeof esquemaCambioPassword>;

export const esquemaCambioNombre = z.object({
  nombre: z.string({ error: "Ingresá el nombre" }).trim().min(1, "Ingresá el nombre").max(60, "Máximo 60 caracteres"),
});

export type DatosCambioNombre = z.infer<typeof esquemaCambioNombre>;

export const esquemaCambioEmail = z.object({
  email,
  actual: z.string({ error: "Ingresá la contraseña actual" }).min(1, "Ingresá la contraseña actual"),
});

export type DatosCambioEmail = z.infer<typeof esquemaCambioEmail>;
