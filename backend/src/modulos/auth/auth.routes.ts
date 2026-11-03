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

// Los intentos fallidos se cuentan por IP. Detrás del proxy del hosting, req.ip es la real gracias a TRUST_PROXY.
function claveIntentos(req: Request) {
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

// Contraseña incorrecta en una acción que la pide estando logueado. Responde 400 y no 401,
// porque un 401 hace que el frontend cierre la sesión.
export function rechazarPassword(req: Request, res: Response, campo: string, mensaje: string) {
  registrarIntentoFallido(claveIntentos(req));
  res.status(400).json({ error: mensaje, campos: { [campo]: [mensaje] } });
}

export function aceptarPassword(req: Request) {
  limpiarIntentos(claveIntentos(req));
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
  aceptarPassword(req);

  res.cookie(NOMBRE_COOKIE, resultado.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    expires: resultado.expiraEn,
    path: "/",
  });
  res.json({ usuario: resultado.usuario });
});

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
  if (!(await cambiarPassword(req.usuario!.id, actual, nueva, req.cookies[NOMBRE_COOKIE]))) {
    rechazarPassword(req, res, "actual", "La contraseña actual no es correcta");
    return;
  }
  aceptarPassword(req);
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
    rechazarPassword(req, res, "actual", "La contraseña actual no es correcta");
    return;
  }
  aceptarPassword(req);
  if (resultado.motivo === "email") {
    res.status(400).json({ error: "Ese email ya está en uso", campos: { email: ["Ese email ya está en uso"] } });
    return;
  }
  res.json({ usuario: resultado.usuario });
});

// GET /api/auth/yo  → el frontend lo pide al abrir la página para saber si ya hay sesión
authRouter.get("/yo", requiereSesion, (req, res) => {
  res.json({ usuario: req.usuario });
});
