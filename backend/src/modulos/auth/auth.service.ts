import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Usuario } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const NOMBRE_COOKIE = "sesion";

// También se usa desde el celular, que se puede perder: la sesión dura 7 días, no más.
const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;

// Costo de bcrypt: más alto = más lento de adivinar por fuerza bruta (12 tarda ~0,2 s).
const COSTO_BCRYPT = 12;

// ---------- Límite de intentos ----------
// Después de 5 contraseñas incorrectas desde la misma conexión, se bloquea por 15 minutos.
// Se guarda en memoria (se reinicia al reiniciar el servidor): para un solo usuario alcanza.
const MAXIMO_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const intentosFallidos = new Map<string, { cantidad: number; primero: number }>();

// Minutos que faltan para poder volver a intentar (0 = no está bloqueado).
export function minutosDeBloqueo(clave: string) {
  const intentos = intentosFallidos.get(clave);
  if (!intentos) return 0;
  const restante = intentos.primero + MINUTOS_BLOQUEO * 60_000 - Date.now();
  if (restante <= 0) {
    intentosFallidos.delete(clave); // pasó el plazo: se empieza a contar de nuevo
    return 0;
  }
  return intentos.cantidad >= MAXIMO_INTENTOS ? Math.ceil(restante / 60_000) : 0;
}

export function registrarIntentoFallido(clave: string) {
  const intentos = intentosFallidos.get(clave);
  if (intentos) intentos.cantidad++;
  else intentosFallidos.set(clave, { cantidad: 1, primero: Date.now() });
}

export function limpiarIntentos(clave: string) {
  intentosFallidos.delete(clave);
}

export function hashearPassword(password: string) {
  return bcrypt.hash(password, COSTO_BCRYPT);
}

// El token es aleatorio y largo, así que alcanza con SHA-256 (no hace falta bcrypt).
// Si alguien lee la base, no puede usar los hashes para entrar.
function hashearToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Datos del usuario que se pueden enviar al frontend (nunca el passwordHash).
function datosPublicos(usuario: Usuario) {
  return { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol };
}

export type UsuarioSesion = ReturnType<typeof datosPublicos>;

export async function iniciarSesion(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
    return null;
  }

  // Limpieza: borra las sesiones vencidas de este usuario.
  await prisma.sesion.deleteMany({ where: { usuarioId: usuario.id, expiraEn: { lt: new Date() } } });

  const token = crypto.randomBytes(32).toString("base64url");
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS);
  await prisma.sesion.create({
    data: { usuarioId: usuario.id, tokenHash: hashearToken(token), expiraEn },
  });

  return { token, expiraEn, usuario: datosPublicos(usuario) };
}

export async function buscarUsuarioPorToken(token: string) {
  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: hashearToken(token) },
    include: { usuario: true },
  });
  if (!sesion || sesion.expiraEn < new Date()) {
    return null;
  }
  return datosPublicos(sesion.usuario);
}

// Cambia la contraseña y cierra las demás sesiones abiertas (la actual sigue).
// Devuelve false si la contraseña actual no es correcta.
export async function cambiarPassword(usuarioId: number, actual: string, nueva: string, tokenActual: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !(await bcrypt.compare(actual, usuario.passwordHash))) {
    return false;
  }
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash: await hashearPassword(nueva) } }),
    prisma.sesion.deleteMany({ where: { usuarioId, tokenHash: { not: hashearToken(tokenActual) } } }),
  ]);
  return true;
}

// Para acciones que no se pueden deshacer, además de la sesión se pide la contraseña.
export async function passwordCorrecta(usuarioId: number, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  return !!usuario && bcrypt.compare(password, usuario.passwordHash);
}

export async function cambiarNombre(usuarioId: number, nombre: string) {
  return datosPublicos(await prisma.usuario.update({ where: { id: usuarioId }, data: { nombre } }));
}

// El email es el dato para ingresar: cambiarlo pide la contraseña actual.
// Si no se puede, devuelve el motivo.
export async function cambiarEmail(usuarioId: number, email: string, actual: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !(await bcrypt.compare(actual, usuario.passwordHash))) {
    return { motivo: "password" as const };
  }
  const otro = await prisma.usuario.findUnique({ where: { email } });
  if (otro && otro.id !== usuarioId) {
    return { motivo: "email" as const };
  }
  return { usuario: datosPublicos(await prisma.usuario.update({ where: { id: usuarioId }, data: { email } })) };
}

export async function cerrarSesion(token: string) {
  await prisma.sesion.deleteMany({ where: { tokenHash: hashearToken(token) } });
}
