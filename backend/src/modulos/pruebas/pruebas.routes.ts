import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { esquemaFiltrosPruebas, esquemaPrueba, type DatosPrueba } from "./pruebas.schemas";
import { actualizarPrueba, crearPrueba, eliminarPrueba, listarPruebas } from "./pruebas.service";

// Catálogo de pruebas de evaluación. Desactivar (PUT con activa: false) deja de ofrecerla y se puede
// revertir; eliminar (DELETE) es permanente y conserva los resultados ya cargados.
export const pruebasRouter = Router();

// GET /api/pruebas?incluirInactivas=true&incluirEliminadas=true
pruebasRouter.get("/", async (req, res) => {
  const { incluirInactivas, incluirEliminadas } = esquemaFiltrosPruebas.parse(req.query);
  res.json(await listarPruebas(incluirInactivas, incluirEliminadas));
});

pruebasRouter.post("/", validar(esquemaPrueba), async (req, res) => {
  res.status(201).json(await crearPrueba(req.body as DatosPrueba));
});

// PUT /api/pruebas/:id  (incluye "activa" para activar/desactivar)
pruebasRouter.put("/:id", validar(esquemaPrueba), async (req, res) => {
  res.json(await actualizarPrueba(leerId(req.params.id), req.body as DatosPrueba));
});

pruebasRouter.delete("/:id", async (req, res) => {
  await eliminarPrueba(leerId(req.params.id));
  res.status(204).end();
});
