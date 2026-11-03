import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";
import { ErrorHttp } from "../lib/errores";
import { erroresPorCampo } from "./validar";

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
};

// Express 5 envía acá también los errores de las rutas async.
// Al cliente no se le muestra el detalle de errores inesperados (puede contener datos internos).
export const manejarErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ErrorHttp) {
    res.status(error.estado).json({ error: error.message });
    return;
  }
  // Validaciones hechas con esquema.parse() dentro de una ruta (ej.: filtros de búsqueda).
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: "Datos inválidos", campos: erroresPorCampo(error) });
    return;
  }
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo del pedido no es un JSON válido" });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Error interno del servidor" });
};
