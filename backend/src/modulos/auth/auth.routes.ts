import { Router, type Request, type Response } from "express";
import { env } from "../../config/env";
import { requiereSesion } from "../../middlewares/requiereSesion";
import { validar } from "../../middlewares/validar";
import {
  esquemaCambioEmail,
  esquemaCambioNombre,
  esquemaCambioPassword,
  esquemaLogin,
  type DatosCambioEmail,
  type DatosCambioNombre,
  type DatosCambioPassword,
  type DatosLogin,
} from "./auth.schemas";
import {
  cambiarEmail,
  cambiarNombre,
  cambiarPassword,
  cerrarSesion,
  iniciarSesion,
  limpiarIntentos,
  minutosDeBloqueo,
  NOMBRE_COOKIE,
  registrarIntentoFallido,
} from "./auth.service";

export const authRouter = Router();

// Los intentos fallidos se cuentan por dirección IP.
// Si en producción el servidor queda detrás de un proxy, hay que configurar app.set("trust proxy", ...)
// para que req.ip sea la IP real y no la del proxy.
export function claveIntentos(req: Request) {
  return req.ip ?? "desconocida";
}

// Responde 429 si la conexión está bloqueada por demasiados intentos. Devuelve true si respondió.
export function respondioBloqueo(req: Request, res: Response) {
  const minutos = minutosDeBloqueo(claveIntentos(req));
  if (minutos === 0) return false;
  res.status(429).json({
    error: `Demasiados intentos fallidos. Probá de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
  });
  return true;
}

// POST /api/auth/login  { email, password }
authRouter.post("/login", validar(esquemaLogin), async (req, res) => {
  if (respondioBloqueo(req, res)) return;
  const { email, password } = req.body as DatosLogin;
  const resultado = await iniciarSesion(email, password);

  if (!resultado) {
    registrarIntentoFallido(claveIntentos(req));
    // Mismo mensaje si falla el email o la contraseña: no se revela qué emails existen.
    res.status(401).json({ error: "Email o contraseña incorrectos" });
    return;
  }
  limpiarIntentos(claveIntentos(req));

  res.cookie(NOMBRE_COOKIE, resultado.token, {
    httpOnly: true, // JavaScript del navegador no puede leerla
    sameSite: "lax", // no se envía desde formularios de otros sitios
    secure: env.NODE_ENV === "production", // solo por HTTPS en producción
    expires: resultado.expiraEn,
    path: "/",
  });
  res.json({ usuario: resultado.usuario });
});

// POST /api/auth/logout
authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[NOMBRE_COOKIE];
  if (token) {
    await cerrarSesion(token);
  }
  res.clearCookie(NOMBRE_COOKIE, { path: "/" });
  res.status(204).end();
});

// POST /api/auth/password  { actual, nueva }  → cambia la contraseña y cierra las otras sesiones
authRouter.post("/password", requiereSesion, validar(esquemaCambioPassword), async (req, res) => {
  if (respondioBloqueo(req, res)) return;
  const { actual, nueva } = req.body as DatosCambioPassword;
  const cambiada = await cambiarPassword(req.usuario!.id, actual, nueva, req.cookies[NOMBRE_COOKIE]);
  if (!cambiada) {
    registrarIntentoFallido(claveIntentos(req));
    // 400 y no 401: un 401 haría que el frontend cierre la sesión.
    res.status(400).json({ error: "La contraseña actual no es correcta", campos: { actual: ["La contraseña actual no es correcta"] } });
    return;
  }
  limpiarIntentos(claveIntentos(req));
  res.status(204).end();
});

// PUT /api/auth/nombre  { nombre }
authRouter.put("/nombre", requiereSesion, validar(esquemaCambioNombre), async (req, res) => {
  const { nombre } = req.body as DatosCambioNombre;
  res.json({ usuario: await cambiarNombre(req.usuario!.id, nombre) });
});

// PUT /api/auth/email  { email, actual }
authRouter.put("/email", requiereSesion, validar(esquemaCambioEmail), async (req, res) => {
  if (respondioBloqueo(req, res)) return;
  const { email, actual } = req.body as DatosCambioEmail;
  const resultado = await cambiarEmail(req.usuario!.id, email, actual);
  if (resultado.motivo === "password") {
    registrarIntentoFallido(claveIntentos(req));
    res.status(400).json({ error: "La contraseña actual no es correcta", campos: { actual: ["La contraseña actual no es correcta"] } });
    return;
  }
  limpiarIntentos(claveIntentos(req));
  if (resultado.motivo === "email") {
    res.status(400).json({ error: "Ese email ya está en uso", campos: { email: ["Ese email ya está en uso"] } });
    return;
  }
  res.json({ usuario: resultado.usuario });
});

// GET /api/auth/yo  → usuario de la sesión actual (el frontend lo usa al cargar)
authRouter.get("/yo", requiereSesion, (req, res) => {
  res.json({ usuario: req.usuario });
});
