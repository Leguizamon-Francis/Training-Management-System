import { Router } from "express";
import { leerId } from "../../lib/errores";
import { esquemaDia, esquemaFechaAsistencia, esquemaMes } from "./asistencias.schemas";
import { historialAlumno, listarDia, quitarAsistencia, registrarAsistencia, resumenMes } from "./asistencias.service";

// Se monta en /api.
export const asistenciasRouter = Router();

// GET /api/asistencias/dia?fecha=aaaa-mm-dd  → alumnos activos, marcando quiénes vinieron ese día
asistenciasRouter.get("/asistencias/dia", async (req, res) => {
  const { fecha } = esquemaDia.parse(req.query);
  res.json(await listarDia(fecha));
});

// GET /api/asistencias/resumen?mes=aaaa-mm  → reporte del mes
asistenciasRouter.get("/asistencias/resumen", async (req, res) => {
  const { mes } = esquemaMes.parse(req.query);
  res.json(await resumenMes(mes));
});

// GET /api/alumnos/:alumnoId/asistencias  → { total, esteMes, fechas }
asistenciasRouter.get("/alumnos/:alumnoId/asistencias", async (req, res) => {
  res.json(await historialAlumno(leerId(req.params.alumnoId)));
});

// PUT /api/alumnos/:alumnoId/asistencias/:fecha  (repetirlo no duplica: hay una por día)
asistenciasRouter.put("/alumnos/:alumnoId/asistencias/:fecha", async (req, res) => {
  await registrarAsistencia(leerId(req.params.alumnoId), esquemaFechaAsistencia.parse(req.params.fecha));
  res.status(204).end();
});

// DELETE /api/alumnos/:alumnoId/asistencias/:fecha
asistenciasRouter.delete("/alumnos/:alumnoId/asistencias/:fecha", async (req, res) => {
  await quitarAsistencia(leerId(req.params.alumnoId), esquemaFechaAsistencia.parse(req.params.fecha));
  res.status(204).end();
});
