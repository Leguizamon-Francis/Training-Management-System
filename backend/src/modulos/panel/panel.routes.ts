import { Router } from "express";
import { leerId } from "../../lib/errores";
import { obtenerPanel, resumenAlumno } from "./panel.service";

export const panelRouter = Router();

// GET /api/panel  → resumen del día para la pantalla de Inicio
panelRouter.get("/", async (_req, res) => {
  res.json(await obtenerPanel());
});

// GET /api/panel/alumnos/:id  → franja de resumen de la ficha del alumno
panelRouter.get("/alumnos/:id", async (req, res) => {
  res.json(await resumenAlumno(leerId(req.params.id)));
});
