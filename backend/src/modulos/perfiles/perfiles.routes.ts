import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { esquemaPerfil, type DatosPerfil } from "./perfiles.schemas";
import { actualizarPerfil, crearPerfil, eliminarPerfil, listarPerfiles } from "./perfiles.service";

// Perfiles de los alumnos (Configuración → Perfiles).
export const perfilesRouter = Router();

perfilesRouter.get("/", async (_req, res) => {
  res.json(await listarPerfiles());
});

perfilesRouter.post("/", validar(esquemaPerfil), async (req, res) => {
  res.status(201).json(await crearPerfil(req.body as DatosPerfil));
});

perfilesRouter.put("/:id", validar(esquemaPerfil), async (req, res) => {
  res.json(await actualizarPerfil(leerId(req.params.id), req.body as DatosPerfil));
});

// 409 si algún alumno lo tiene o si es el único perfil.
perfilesRouter.delete("/:id", async (req, res) => {
  await eliminarPerfil(leerId(req.params.id));
  res.status(204).end();
});
