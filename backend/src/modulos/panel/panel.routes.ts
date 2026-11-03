import { Router } from "express";
import { obtenerPanel } from "./panel.service";

export const panelRouter = Router();

// GET /api/panel  → resumen del día para la pantalla de Inicio
panelRouter.get("/", async (_req, res) => {
  res.json(await obtenerPanel());
});
