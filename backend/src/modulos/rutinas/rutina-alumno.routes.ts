import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { clienteDeCentro, enCentro } from "../../lib/centros";
import { control } from "../../lib/control";
import { ErrorHttp } from "../../lib/errores";
import { guardarCambiosDelAlumno, rutinaParaAlumno } from "./rutina-alumno.service";

// Rutas SIN sesión para el alumno: /api/publico/rutinas/:centro/:link. El link identifica una sola rutina de un solo
// gimnasio; con un link no se puede ver ni cambiar nada más.
export const rutinaAlumnoRouter = Router();

// Límite de pedidos por IP (en memoria): alcanza de sobra para ir anotando y frena a quien pruebe links al azar.
const PEDIDOS_POR_VENTANA = 300;
const MINUTOS_VENTANA = 10;
const pedidosPorIp = new Map<string, { cantidad: number; desde: number }>();

const limitar: RequestHandler = (req, res, next) => {
  const ahora = Date.now();
  const ip = req.ip ?? "desconocida";
  let registro = pedidosPorIp.get(ip);
  if (!registro || ahora - registro.desde > MINUTOS_VENTANA * 60_000) {
    registro = { cantidad: 0, desde: ahora };
    pedidosPorIp.set(ip, registro);
  }
  registro.cantidad++;
  if (registro.cantidad > PEDIDOS_POR_VENTANA) {
    res.status(429).json({ error: "Demasiados pedidos seguidos. Esperá unos minutos y volvé a intentar." });
    return;
  }
  next();
};

setInterval(() => {
  const limite = Date.now() - MINUTOS_VENTANA * 60_000;
  for (const [ip, { desde }] of pedidosPorIp) if (desde < limite) pedidosPorIp.delete(ip);
}, 5 * 60_000).unref();

const esquemaRuta = z.object({
  centro: z.coerce.number().int().positive(),
  link: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
});

const NO_EXISTE = "Este link no existe o ya no está activo. Pedile a tu profesor uno nuevo.";

// El resto del pedido corre dentro del gimnasio del link (como con una sesión). La demo no tiene links de alumno.
const enGimnasioDelLink: RequestHandler = async (req, res, next) => {
  const ruta = esquemaRuta.safeParse(req.params);
  const centro = ruta.success ? await control.centro.findUnique({ where: { id: ruta.data.centro } }) : null;
  if (!centro || !centro.activo || centro.esDemo) {
    res.status(404).json({ error: NO_EXISTE });
    return;
  }
  enCentro(clienteDeCentro(centro.baseDatos), next);
};

function leerLink(params: unknown) {
  const ruta = esquemaRuta.safeParse(params);
  if (!ruta.success) throw new ErrorHttp(404, NO_EXISTE);
  return ruta.data.link;
}

const RUTA = "/rutinas/:centro/:link";

rutinaAlumnoRouter.use(limitar);

// GET → la rutina para verla día por día
rutinaAlumnoRouter.get(RUTA, enGimnasioDelLink, async (req, res) => {
  res.json(await rutinaParaAlumno(leerLink(req.params)));
});

// PUT { cambios: { "AO5": "52", … } } → guarda solo esos campos
const esquemaCambios = z.object({
  cambios: z
    .record(z.string(), z.string().max(1000, "Cada casillero admite hasta 1000 caracteres"))
    .refine((cambios) => Object.keys(cambios).length <= 500, "Demasiados cambios juntos"),
});

rutinaAlumnoRouter.put(RUTA, enGimnasioDelLink, async (req, res) => {
  const { cambios } = esquemaCambios.parse(req.body);
  res.json(await guardarCambiosDelAlumno(leerLink(req.params), cambios));
});
