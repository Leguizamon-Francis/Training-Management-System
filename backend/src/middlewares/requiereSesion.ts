import type { RequestHandler } from "express";
import { clienteDeCentro, enCentro } from "../lib/centros";
import { buscarSesion, NOMBRE_COOKIE } from "../modulos/auth/auth.service";

// Deja pasar solo si la cookie trae un token de sesión válido de un gimnasio activo.
// Si es así, el usuario queda en req.usuario y el resto del pedido corre dentro de su gimnasio:
// todas las consultas a `prisma` van a la base de ese gimnasio y a ninguna otra.
export const requiereSesion: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[NOMBRE_COOKIE];
  const sesion = token ? await buscarSesion(token) : null;

  if (!sesion) {
    res.status(401).json({ error: "Sesión no iniciada o vencida" });
    return;
  }

  req.usuario = sesion.usuario;
  enCentro(clienteDeCentro(sesion.baseDatos), next);
};
