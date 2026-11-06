// Valida las variables de entorno al arrancar: si falta algo, el servidor no inicia
// y muestra qué está mal, en lugar de fallar más tarde con un error confuso.
import { z } from "zod";

const esquemaEnv = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  // Dirección donde escucha el servidor. Por defecto: solo esta computadora en desarrollo; todas en producción.
  HOST: z.string().optional(),
  // Cantidad de proxies delante del servidor (el del hosting suele ser 1). Sin esto, el límite de intentos
  // de ingreso vería a todos con la misma IP.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  DATABASE_URL: z.string().min(1, "Falta DATABASE_URL"),
  // Plantilla PDF de las rutinas (relativa a la carpeta backend). Nunca se modifica: cada rutina parte de ella.
  PLANTILLA_RUTINA: z.string().default("../rutina.pdf"),
  // "¿Olvidaste tu contraseña?": el mail se manda con Resend. Sin clave, en desarrollo el link se muestra
  // en la consola; en producción la recuperación queda desactivada hasta cargarla.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_REMITENTE: z.string().default("DV Training <no-responder@dvtraining.com.ar>"),
  // Dirección pública del sistema, para armar el link del mail. No se toma del pedido: alguien podría
  // falsificarla para que el link apunte a otro sitio y robar el token.
  URL_PUBLICA: z.url("URL_PUBLICA tiene que ser una dirección completa (ej.: https://dvtraining.com.ar)").optional(),
});

const resultado = esquemaEnv.safeParse(process.env);

if (!resultado.success) {
  console.error("Variables de entorno inválidas (revisar backend/.env):");
  console.error(z.prettifyError(resultado.error));
  process.exit(1);
}

export const env = resultado.data;
