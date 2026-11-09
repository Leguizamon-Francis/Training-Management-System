import type { RequestHandler } from "express";

export const MENSAJE_DEMO = "Es una demo: no se pueden hacer cambios.";

export const esDemo = (req: Parameters<RequestHandler>[0]) => req.usuario?.rol === "DEMO";

// La demo es de solo lectura: el usuario DEMO solo puede consultar (GET). Todo lo demás (crear, guardar,
// borrar, registrar...) se rechaza acá, en el servidor: ocultar botones en las pantallas no alcanza.
export const soloLectura: RequestHandler = (req, res, next) => {
  if (esDemo(req) && req.method !== "GET" && req.method !== "HEAD") {
    res.status(403).json({ error: MENSAJE_DEMO });
    return;
  }
  next();
};

// Para lo que la demo no puede hacer ni siquiera consultando (ej.: descargar el PDF de una rutina, o
// cualquier dato de la cuenta).
export const bloquearDemo: RequestHandler = (req, res, next) => {
  if (esDemo(req)) {
    res.status(403).json({ error: MENSAJE_DEMO });
    return;
  }
  next();
};
