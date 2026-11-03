import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { esquemaEvaluacion, type DatosEvaluacion } from "./evaluaciones.schemas";
import {
  actualizarEvaluacion,
  crearEvaluacion,
  eliminarEvaluacion,
  listarEvaluaciones,
  obtenerEvaluacion,
  resumenAlumnos,
} from "./evaluaciones.service";

// Se monta en /api, igual que anotaciones: se listan y crean dentro de un alumno,
// y se consultan, editan o borran por su propio id.
export const evaluacionesRouter = Router();

// GET /api/alumnos/:alumnoId/evaluaciones  → { evaluaciones, proximaEvaluacion }
evaluacionesRouter.get("/alumnos/:alumnoId/evaluaciones", async (req, res) => {
  res.json(await listarEvaluaciones(leerId(req.params.alumnoId)));
});

evaluacionesRouter.post("/alumnos/:alumnoId/evaluaciones", validar(esquemaEvaluacion), async (req, res) => {
  res.status(201).json(await crearEvaluacion(leerId(req.params.alumnoId), req.body as DatosEvaluacion));
});

// GET /api/evaluaciones/resumen-alumnos  (va antes de /evaluaciones/:id para que no se confunda con un id)
evaluacionesRouter.get("/evaluaciones/resumen-alumnos", async (_req, res) => {
  res.json(await resumenAlumnos());
});

evaluacionesRouter.get("/evaluaciones/:id", async (req, res) => {
  res.json(await obtenerEvaluacion(leerId(req.params.id)));
});

evaluacionesRouter.put("/evaluaciones/:id", validar(esquemaEvaluacion), async (req, res) => {
  res.json(await actualizarEvaluacion(leerId(req.params.id), req.body as DatosEvaluacion));
});

evaluacionesRouter.delete("/evaluaciones/:id", async (req, res) => {
  await eliminarEvaluacion(leerId(req.params.id));
  res.status(204).end();
});
