import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import {
  esquemaCorreccionPago,
  esquemaPago,
  esquemaRangoIngresos,
  esquemaUltimosPagos,
  type CorreccionPago,
  type DatosPago,
} from "./pagos.schemas";
import {
  anularDeuda,
  corregirPago,
  eliminarPago,
  obtenerEstadoCuotas,
  obtenerIngresos,
  obtenerUltimosPagos,
  obtenerPagosAlumno,
  registrarPago,
} from "./pagos.service";

export const pagosRouter = Router();

// GET /api/pagos/estado-cuotas  → alumnos activos con el estado de su cuota (lo urgente primero)
pagosRouter.get("/pagos/estado-cuotas", async (_req, res) => {
  res.json(await obtenerEstadoCuotas());
});

// GET /api/pagos/ultimos?cantidad=20  → los pagos más recientes
pagosRouter.get("/pagos/ultimos", async (req, res) => {
  const { cantidad } = esquemaUltimosPagos.parse(req.query);
  res.json(await obtenerUltimosPagos(cantidad));
});

// GET /api/pagos/ingresos?desde=aaaa-mm-dd&hasta=aaaa-mm-dd
pagosRouter.get("/pagos/ingresos", async (req, res) => {
  const { desde, hasta } = esquemaRangoIngresos.parse(req.query);
  res.json(await obtenerIngresos(desde, hasta));
});

// GET /api/alumnos/:alumnoId/pagos  → { plan, situacion, pagos }
pagosRouter.get("/alumnos/:alumnoId/pagos", async (req, res) => {
  res.json(await obtenerPagosAlumno(leerId(req.params.alumnoId)));
});

// POST /api/alumnos/:alumnoId/pagos  { tipo: "CUOTA" | "OTRO", ... }
pagosRouter.post("/alumnos/:alumnoId/pagos", validar(esquemaPago), async (req, res) => {
  res.status(201).json(await registrarPago(leerId(req.params.alumnoId), req.body as DatosPago));
});

// POST /api/alumnos/:alumnoId/anular-deuda  → las cuotas adeudadas quedan anuladas (no se cobran)
pagosRouter.post("/alumnos/:alumnoId/anular-deuda", async (req, res) => {
  await anularDeuda(leerId(req.params.alumnoId));
  res.status(204).end();
});

// PUT /api/pagos/:id  { fecha, importe, medio, concepto? }
pagosRouter.put("/pagos/:id", validar(esquemaCorreccionPago), async (req, res) => {
  res.json(await corregirPago(leerId(req.params.id), req.body as CorreccionPago));
});

pagosRouter.delete("/pagos/:id", async (req, res) => {
  await eliminarPago(leerId(req.params.id));
  res.status(204).end();
});
