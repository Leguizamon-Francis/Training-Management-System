import express, { Router, type Request } from "express";
import { ErrorHttp, leerId } from "../../lib/errores";
import { enviarPdf } from "../../lib/pdf";
import { esDemo, MENSAJE_DEMO } from "../../middlewares/soloLectura";
import { esquemaBorrador, esquemaDescarga, esquemaModeloRutina } from "./rutinas.schemas";
import {
  actualizarRutina,
  borradorRutina,
  crearRutina,
  eliminarRutina,
  listarAlumnosConRutinas,
  listarModelos,
  listarRutinas,
  listarRutinasSueltas,
  obtenerRutina,
  pdfDeRutina,
} from "./rutinas.service";

export const rutinasRouter = Router();

// El PDF completado llega como cuerpo binario (Content-Type: application/pdf), no como JSON.
const recibirPdf = express.raw({ type: "application/pdf", limit: "20mb" });

function pdfRecibido(req: Request) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new ErrorHttp(400, "Falta el PDF de la rutina");
  }
  return new Uint8Array(req.body);
}

// GET /api/rutinas/alumnos  → alumnos activos con la cantidad de rutinas
rutinasRouter.get("/rutinas/alumnos", async (_req, res) => {
  res.json(await listarAlumnosConRutinas());
});

rutinasRouter.get("/alumnos/:alumnoId/rutinas", async (req, res) => {
  res.json(await listarRutinas(leerId(req.params.alumnoId)));
});

// GET /api/alumnos/:alumnoId/rutinas/borrador?tipo=…&base=…  → el PDF para empezar una rutina nueva
rutinasRouter.get("/alumnos/:alumnoId/rutinas/borrador", async (req, res) => {
  const { tipo, base } = esquemaBorrador.parse(req.query);
  enviarPdf(res, await borradorRutina(leerId(req.params.alumnoId), tipo, base));
});

// POST /api/alumnos/:alumnoId/rutinas?tipo=…  (cuerpo: el PDF completado)
rutinasRouter.post("/alumnos/:alumnoId/rutinas", recibirPdf, async (req, res) => {
  const { tipo } = esquemaModeloRutina.parse(req.query);
  res.status(201).json(await crearRutina(leerId(req.params.alumnoId), tipo, pdfRecibido(req)));
});

// ---------- Rutinas sin alumno (van antes de /rutinas/:id para que no se confundan con un id) ----------

// GET /api/rutinas/modelos  → los modelos de rutina que tiene cargados este gimnasio
rutinasRouter.get("/rutinas/modelos", async (_req, res) => {
  res.json(await listarModelos());
});

rutinasRouter.get("/rutinas/sueltas", async (_req, res) => {
  res.json(await listarRutinasSueltas());
});

// GET /api/rutinas/borrador?tipo=…  → la planilla en blanco
rutinasRouter.get("/rutinas/borrador", async (req, res) => {
  const { tipo } = esquemaModeloRutina.parse(req.query);
  enviarPdf(res, await borradorRutina(null, tipo));
});

// POST /api/rutinas?tipo=…  (cuerpo: el PDF completado)
rutinasRouter.post("/rutinas", recibirPdf, async (req, res) => {
  const { tipo } = esquemaModeloRutina.parse(req.query);
  res.status(201).json(await crearRutina(null, tipo, pdfRecibido(req)));
});

rutinasRouter.get("/rutinas/:id", async (req, res) => {
  res.json(await obtenerRutina(leerId(req.params.id)));
});

// GET /api/rutinas/:id/pdf?descargar=true  → el PDF de la rutina (para ver, editar o descargar)
rutinasRouter.get("/rutinas/:id/pdf", async (req, res) => {
  const { descargar } = esquemaDescarga.parse(req.query);
  // La demo ve las planillas en pantalla, pero no se las puede llevar.
  if (descargar && esDemo(req)) {
    res.status(403).json({ error: MENSAJE_DEMO });
    return;
  }
  const { bytes, nombreArchivo } = await pdfDeRutina(leerId(req.params.id));
  enviarPdf(res, bytes, descargar ? nombreArchivo : undefined);
});

// PUT /api/rutinas/:id  (cuerpo: el PDF con los cambios)
rutinasRouter.put("/rutinas/:id", recibirPdf, async (req, res) => {
  res.json(await actualizarRutina(leerId(req.params.id), pdfRecibido(req)));
});

rutinasRouter.delete("/rutinas/:id", async (req, res) => {
  await eliminarRutina(leerId(req.params.id));
  res.status(204).end();
});
