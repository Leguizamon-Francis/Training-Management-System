import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { manejarErrores, rutaNoEncontrada } from "./middlewares/errores";
import { requiereSesion } from "./middlewares/requiereSesion";
import { z } from "zod";
import { alumnosRouter } from "./modulos/alumnos/alumnos.routes";
import { anotacionesRouter } from "./modulos/anotaciones/anotaciones.routes";
import { asistenciasRouter } from "./modulos/asistencias/asistencias.routes";
import { authRouter } from "./modulos/auth/auth.routes";
import { evaluacionesRouter } from "./modulos/evaluaciones/evaluaciones.routes";
import { pagosRouter } from "./modulos/pagos/pagos.routes";
import { panelRouter } from "./modulos/panel/panel.routes";
import { planesRouter } from "./modulos/planes/planes.routes";
import { pruebasRouter } from "./modulos/pruebas/pruebas.routes";
import { rutinasRouter } from "./modulos/rutinas/rutinas.routes";

// Mensajes de error de Zod en español para los casos sin mensaje propio.
z.config(z.locales.es());

export const app = express();

app.set("trust proxy", env.TRUST_PROXY);

// Encabezados de seguridad. La política de contenido solo permite recursos del propio sistema
// (pdf.js necesita "blob:" y las planillas dibujan estilos en línea).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === "production" && env.TRUST_PROXY > 0 ? [] : null,
      },
    },
  }),
);

app.use(express.json());
app.use(cookieParser());

// ---------- Rutas públicas ----------

// Permite comprobar que la API está levantada y conectada a la base.
app.get("/api/salud", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ estado: "ok", baseDeDatos: "conectada" });
});

app.use("/api/auth", authRouter);

// ---------- Rutas protegidas: de acá para abajo hace falta sesión ----------
app.use("/api", requiereSesion);

app.use("/api/alumnos", alumnosRouter);
app.use("/api", anotacionesRouter);
app.use("/api/pruebas", pruebasRouter);
app.use("/api", evaluacionesRouter);
app.use("/api/planes", planesRouter);
app.use("/api", pagosRouter);
app.use("/api", rutinasRouter);
app.use("/api", asistenciasRouter);
app.use("/api/panel", panelRouter);

app.use("/api", rutaNoEncontrada);

// En producción el mismo servidor entrega las pantallas. Cualquier otra ruta devuelve la aplicación,
// que resuelve la pantalla en el navegador (en desarrollo de esto se encarga Vite).
if (env.NODE_ENV === "production") {
  const pantallas = path.resolve(__dirname, "../../frontend/dist");
  app.use(express.static(pantallas));
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    res.sendFile(path.join(pantallas, "index.html"));
  });
}

app.use(manejarErrores);
