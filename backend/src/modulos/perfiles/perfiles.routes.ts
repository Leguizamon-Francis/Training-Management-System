import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { exigirPassword } from "../auth/auth.routes";
import { esquemaPerfil, type DatosPerfil } from "./perfiles.schemas";
import { actualizarPerfil, crearPerfil, eliminarPerfil, listarPerfiles } from "./perfiles.service";

// Perfiles de los alumnos (Configuración → Perfiles). Crear, editar y eliminar piden la contraseña.
export const perfilesRouter = Router();

perfilesRouter.get("/", async (_req, res) => {
  res.json(await listarPerfiles());
});

// POST /api/perfiles  { nombre, mesesReevaluacion, password }
perfilesRouter.post("/", exigirPassword(), validar(esquemaPerfil), async (req, res) => {
  res.status(201).json(await crearPerfil(req.body as DatosPerfil));
});

// PUT /api/perfiles/:id  { nombre, mesesReevaluacion, password }
perfilesRouter.put("/:id", exigirPassword(), validar(esquemaPerfil), async (req, res) => {
  res.json(await actualizarPerfil(leerId(req.params.id), req.body as DatosPerfil));
});

// POST /api/perfiles/:id/eliminar  { password }  → 409 si algún alumno lo tiene o si es el único perfil.
perfilesRouter.post("/:id/eliminar", exigirPassword(), async (req, res) => {
  await eliminarPerfil(leerId(req.params.id));
  res.status(204).end();
});
