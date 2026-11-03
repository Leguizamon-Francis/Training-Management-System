import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { esquemaFiltrosPruebas, esquemaPrueba, type DatosPrueba } from "./pruebas.schemas";
import { actualizarPrueba, crearPrueba, listarPruebas } from "./pruebas.service";

// Catálogo de pruebas de evaluación. No hay DELETE: una prueba con resultados
// no se puede borrar, se desactiva (deja de ofrecerse al cargar evaluaciones).
export const pruebasRouter = Router();

// GET /api/pruebas?incluirInactivas=true
pruebasRouter.get("/", async (req, res) => {
  const { incluirInactivas } = esquemaFiltrosPruebas.parse(req.query);
  res.json(await listarPruebas(incluirInactivas));
});

pruebasRouter.post("/", validar(esquemaPrueba), async (req, res) => {
  res.status(201).json(await crearPrueba(req.body as DatosPrueba));
});

// PUT /api/pruebas/:id  (incluye "activa" para activar/desactivar)
pruebasRouter.put("/:id", validar(esquemaPrueba), async (req, res) => {
  res.json(await actualizarPrueba(leerId(req.params.id), req.body as DatosPrueba));
});
