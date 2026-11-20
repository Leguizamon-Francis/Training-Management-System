import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import {
  esquemaNombrePlan,
  esquemaNuevoPlan,
  esquemaPrecioPlan,
  type DatosNombrePlan,
  type DatosNuevoPlan,
  type DatosPrecioPlan,
} from "./planes.schemas";
import { actualizarPrecioPlan, cambiarNombrePlan, crearPlan, eliminarPlan, listarPlanes } from "./planes.service";

// Membresías: las 4 del seed (una por modalidad) y las que agregue el gimnasio.
export const planesRouter = Router();

planesRouter.get("/", async (_req, res) => {
  res.json(await listarPlanes());
});

// POST /api/planes  { nombre, precioMensual }
planesRouter.post("/", validar(esquemaNuevoPlan), async (req, res) => {
  res.status(201).json(await crearPlan(req.body as DatosNuevoPlan));
});

// PUT /api/planes/:id  { precioMensual }
planesRouter.put("/:id", validar(esquemaPrecioPlan), async (req, res) => {
  res.json(await actualizarPrecioPlan(leerId(req.params.id), req.body as DatosPrecioPlan));
});

// PATCH /api/planes/:id/nombre  { nombre }
planesRouter.patch("/:id/nombre", validar(esquemaNombrePlan), async (req, res) => {
  res.json(await cambiarNombrePlan(leerId(req.params.id), req.body as DatosNombrePlan));
});

// DELETE /api/planes/:id  (solo membresías agregadas que nadie usa)
planesRouter.delete("/:id", async (req, res) => {
  await eliminarPlan(leerId(req.params.id));
  res.status(204).end();
});
