import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { esquemaPrecioPlan, type DatosPrecioPlan } from "./planes.schemas";
import { actualizarPrecioPlan, listarPlanes } from "./planes.service";

// Planes fijos (uno por modalidad, creados por el seed): no se crean ni se borran, solo cambia el precio.
export const planesRouter = Router();

planesRouter.get("/", async (_req, res) => {
  res.json(await listarPlanes());
});

// PUT /api/planes/:id  { precioMensual }
planesRouter.put("/:id", validar(esquemaPrecioPlan), async (req, res) => {
  res.json(await actualizarPrecioPlan(leerId(req.params.id), req.body as DatosPrecioPlan));
});
