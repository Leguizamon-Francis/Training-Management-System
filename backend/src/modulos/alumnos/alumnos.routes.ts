import { Router } from "express";
import { leerId } from "../../lib/errores";
import { validar } from "../../middlewares/validar";
import { claveIntentos, respondioBloqueo } from "../auth/auth.routes";
import { limpiarIntentos, passwordCorrecta, registrarIntentoFallido } from "../auth/auth.service";
import { esquemaAlumno, esquemaEliminarAlumno, esquemaEstado, esquemaFiltros, esquemaPlanAlumno, type DatosAlumno } from "./alumnos.schemas";
import {
  actualizarAlumno,
  cambiarEstado,
  cambiarPlan,
  crearAlumno,
  eliminarAlumno,
  listarAlumnos,
  obtenerAlumno,
  obtenerHistorial,
} from "./alumnos.service";

export const alumnosRouter = Router();

// GET /api/alumnos?buscar=&estado=activos|inactivos|todos&perfil=
alumnosRouter.get("/", async (req, res) => {
  const filtros = esquemaFiltros.parse(req.query);
  res.json(await listarAlumnos(filtros));
});

// POST /api/alumnos
alumnosRouter.post("/", validar(esquemaAlumno), async (req, res) => {
  res.status(201).json(await crearAlumno(req.body as DatosAlumno));
});

// POST /api/alumnos/:id/eliminar  { password }  → borra al alumno y todos sus datos, sin vuelta atrás
alumnosRouter.post("/:id/eliminar", validar(esquemaEliminarAlumno), async (req, res) => {
  if (respondioBloqueo(req, res)) return;
  if (!(await passwordCorrecta(req.usuario!.id, req.body.password))) {
    registrarIntentoFallido(claveIntentos(req));
    // 400 y no 401: un 401 haría que el frontend cierre la sesión.
    res.status(400).json({ error: "La contraseña no es correcta", campos: { password: ["La contraseña no es correcta"] } });
    return;
  }
  limpiarIntentos(claveIntentos(req));
  await eliminarAlumno(leerId(req.params.id));
  res.status(204).end();
});

// GET /api/alumnos/:id
alumnosRouter.get("/:id", async (req, res) => {
  res.json(await obtenerAlumno(leerId(req.params.id)));
});

// PUT /api/alumnos/:id  (se envía la ficha completa)
alumnosRouter.put("/:id", validar(esquemaAlumno), async (req, res) => {
  res.json(await actualizarAlumno(leerId(req.params.id), req.body as DatosAlumno));
});

// PATCH /api/alumnos/:id/estado  { activo: true | false }
alumnosRouter.patch("/:id/estado", validar(esquemaEstado), async (req, res) => {
  res.json(await cambiarEstado(leerId(req.params.id), req.body.activo));
});

// PATCH /api/alumnos/:id/plan  { planId: number | null }
alumnosRouter.patch("/:id/plan", validar(esquemaPlanAlumno), async (req, res) => {
  res.json(await cambiarPlan(leerId(req.params.id), req.body.planId));
});

// GET /api/alumnos/:id/historial
alumnosRouter.get("/:id/historial", async (req, res) => {
  res.json(await obtenerHistorial(leerId(req.params.id)));
});
