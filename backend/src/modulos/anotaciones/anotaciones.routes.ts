import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { esquemaAnotacion, type DatosAnotacion } from "./anotaciones.schemas";
import {
  actualizarAnotacion,
  crearAnotacion,
  eliminarAnotacion,
  listarAnotaciones,
} from "./anotaciones.service";

// Se monta en /api: las anotaciones se listan y crean "dentro" de un alumno,
// y se editan o borran por su propio id.
export const anotacionesRouter = Router();

anotacionesRouter.get("/alumnos/:alumnoId/anotaciones", async (req, res) => {
  res.json(await listarAnotaciones(leerId(req.params.alumnoId)));
});

anotacionesRouter.post("/alumnos/:alumnoId/anotaciones", validar(esquemaAnotacion), async (req, res) => {
  res.status(201).json(await crearAnotacion(leerId(req.params.alumnoId), req.body as DatosAnotacion));
});

anotacionesRouter.put("/anotaciones/:id", validar(esquemaAnotacion), async (req, res) => {
  res.json(await actualizarAnotacion(leerId(req.params.id), req.body as DatosAnotacion));
});

anotacionesRouter.delete("/anotaciones/:id", async (req, res) => {
  await eliminarAnotacion(leerId(req.params.id));
  res.status(204).end();
});
