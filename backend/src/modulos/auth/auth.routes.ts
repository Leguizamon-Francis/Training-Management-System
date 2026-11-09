import { Router, type Request, type RequestHandler, type Response } from "express";
import { env } from "../../config/env";
import { enviarEmail, escaparHtml } from "../../lib/email";
import { requiereSesion } from "../../middlewares/requiereSesion";
import { validar } from "../../middlewares/validar";
import {
  esquemaCambioEmail,
  esquemaCambioNombre,
  esquemaCambioPassword,
  esquemaLogin,
  esquemaOlvidePassword,
  esquemaRestablecerPassword,
  type DatosCambioEmail,
  type DatosCambioNombre,
  type DatosCambioPassword,
  type DatosLogin,
  type DatosOlvidePassword,
  type DatosRestablecerPassword,
} from "./auth.schemas";
import {
  cambiarEmail,
  cambiarNombre,
  cambiarPassword,
  cerrarSesion,
  crearRecuperacion,
  iniciarSesion,
  limpiarIntentos,
  MINUTOS_LINK_RECUPERACION,
  minutosDeBloqueo,
  NOMBRE_COOKIE,
  passwordCorrecta,
  registrarIntentoFallido,
  restablecerPassword,
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

// Middleware para cambios que se confirman con la contraseña del usuario (va antes de validar(), que
// descarta los campos que no están en el esquema). Cuenta para el límite de intentos fallidos.
export function exigirPassword(campo = "password"): RequestHandler {
  return async (req, res, next) => {
    if (respondioBloqueo(req, res)) return;
    const password: unknown = req.body?.[campo];
    if (typeof password !== "string" || password === "") {
      const mensaje = "Ingresá tu contraseña para confirmar";
      res.status(400).json({ error: mensaje, campos: { [campo]: [mensaje] } });
      return;
    }
    if (!(await passwordCorrecta(req.usuario!.id, password))) {
      rechazarPassword(req, res, campo, "La contraseña no es correcta");
      return;
    }
    aceptarPassword(req);
    next();
  };
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

// PUT /api/auth/nombre  { nombre, actual }
authRouter.put("/nombre", requiereSesion, exigirPassword("actual"), validar(esquemaCambioNombre), async (req, res) => {
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

// ---------- "¿Olvidaste tu contraseña?" ----------

const URL_DESARROLLO = "http://localhost:5173";

// Mail con el link para elegir una contraseña nueva.
function mailRecuperacion(nombre: string, link: string) {
  const vence = `Vence en ${MINUTOS_LINK_RECUPERACION} minutos y sirve una sola vez.`;
  const noFuisteVos = "Si no lo pediste, ignorá este mail: tu contraseña no cambia.";
  return {
    asunto: "Elegí una contraseña nueva para DV Training",
    texto: `Hola ${nombre}:\n\nPara elegir una contraseña nueva, entrá a este link:\n${link}\n\n${vence}\n${noFuisteVos}\n\nDV Training`,
    html: `<p>Hola ${escaparHtml(nombre)}:</p>
<p>Para elegir una contraseña nueva, tocá el botón:</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">Elegir contraseña nueva</a></p>
<p>${vence}<br>${noFuisteVos}</p>
<p>DV Training</p>`,
  };
}

// POST /api/auth/olvide-password  { email }
// Responde lo mismo exista o no el email, para no revelar quién tiene cuenta. Cada pedido cuenta para el
// límite de intentos: así nadie puede usar el formulario para llenar de mails la casilla del usuario.
authRouter.post("/olvide-password", validar(esquemaOlvidePassword), async (req, res) => {
  if (respondioBloqueo(req, res)) return;
  const produccion = env.NODE_ENV === "production";
  if (produccion && (!env.RESEND_API_KEY || !env.URL_PUBLICA)) {
    res.status(503).json({ error: "La recuperación por email todavía no está configurada. Avisale al administrador del sistema." });
    return;
  }
  registrarIntentoFallido(claveIntentos(req));

  const { email } = req.body as DatosOlvidePassword;
  const recuperacion = await crearRecuperacion(email);
  if (recuperacion) {
    const link = `${env.URL_PUBLICA ?? URL_DESARROLLO}/restablecer-password?token=${recuperacion.token}`;
    if (!env.RESEND_API_KEY) {
      console.log(`[desarrollo] Link para restablecer la contraseña de ${email}: ${link}`);
    } else {
      const { asunto, texto, html } = mailRecuperacion(recuperacion.usuario.nombre, link);
      try {
        await enviarEmail({ para: email, asunto, texto, html }, { clave: env.RESEND_API_KEY, remitente: env.EMAIL_REMITENTE });
      } catch (err) {
        console.error("No se pudo enviar el mail de recuperación:", err);
        res.status(502).json({ error: "No se pudo enviar el mail. Probá de nuevo en unos minutos." });
        return;
      }
    }
  }
  res.json({ mensaje: "Si el email está registrado, te enviamos un link para elegir una contraseña nueva." });
});

// POST /api/auth/restablecer-password  { token, nueva }  → cambia la contraseña y cierra todas las sesiones
authRouter.post("/restablecer-password", validar(esquemaRestablecerPassword), async (req, res) => {
  if (respondioBloqueo(req, res)) return;
  const { token, nueva } = req.body as DatosRestablecerPassword;
  if (!(await restablecerPassword(token, nueva))) {
    registrarIntentoFallido(claveIntentos(req));
    res.status(400).json({ error: "El link no es válido o ya venció. Pedí uno nuevo." });
    return;
  }
  limpiarIntentos(claveIntentos(req));
  res.status(204).end();
});

// GET /api/auth/yo  → el frontend lo pide al abrir la página para saber si ya hay sesión
authRouter.get("/yo", requiereSesion, (req, res) => {
  res.json({ usuario: req.usuario });
});
