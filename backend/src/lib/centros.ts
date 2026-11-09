// Una base por gimnasio: cómo se arma la dirección de cada una y cómo se elige en cada pedido.
//
// Cada pedido con sesión corre "dentro" del gimnasio del usuario (enCentro). Las consultas a `prisma`
// (lib/prisma.ts) van a la base de ese gimnasio y a ninguna otra. Si el código intenta consultar sin
// gimnasio identificado, da error en vez de elegir una base cualquiera: ante la duda, se cierra.
import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@prisma/client";
import { validarNombreBase } from "./nombre-base";

export { validarNombreBase };

// Conexiones por gimnasio. El servidor de la base acepta 100 en total: con 3 por gimnasio entran muchos.
const CONEXIONES_POR_CENTRO = 3;

// Los gimnasios que no se usan hace un rato cierran sus conexiones (se vuelven a abrir solas al usarlos).
const MINUTOS_INACTIVIDAD = 15;

// Misma dirección que DATABASE_URL (servidor, usuario y contraseña), con otra base.
export function urlDeBase(baseDatos: string, conexiones?: number) {
  validarNombreBase(baseDatos);
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${baseDatos}`;
  if (conexiones) url.searchParams.set("connection_limit", String(conexiones));
  return url.toString();
}

const clientes = new Map<string, { cliente: PrismaClient; ultimoUso: number }>();

// Cliente de Prisma de un gimnasio. Se crea la primera vez y se reutiliza.
export function clienteDeCentro(baseDatos: string) {
  let entrada = clientes.get(baseDatos);
  if (!entrada) {
    entrada = { cliente: new PrismaClient({ datasourceUrl: urlDeBase(baseDatos, CONEXIONES_POR_CENTRO) }), ultimoUso: 0 };
    clientes.set(baseDatos, entrada);
  }
  entrada.ultimoUso = Date.now();
  return entrada.cliente;
}

setInterval(() => {
  const limite = Date.now() - MINUTOS_INACTIVIDAD * 60_000;
  for (const [baseDatos, { cliente, ultimoUso }] of clientes) {
    if (ultimoUso < limite) {
      clientes.delete(baseDatos);
      void cliente.$disconnect();
    }
  }
}, 5 * 60_000).unref(); // unref: no impide que un script termine

export async function desconectarCentros() {
  const pendientes = [...clientes.values()].map(({ cliente }) => cliente.$disconnect());
  clientes.clear();
  await Promise.all(pendientes);
}

const almacen = new AsyncLocalStorage<PrismaClient>();

// Ejecuta `accion` (y todo lo que llame, aunque sea asincrónico) contra la base de un gimnasio.
export function enCentro<T>(cliente: PrismaClient, accion: () => T): T {
  return almacen.run(cliente, accion);
}

export function clienteActual(): PrismaClient {
  const cliente = almacen.getStore();
  if (!cliente) throw new Error("Consulta a la base sin un gimnasio identificado");
  return cliente;
}
