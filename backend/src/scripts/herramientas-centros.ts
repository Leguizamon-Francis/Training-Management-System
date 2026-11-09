// Herramientas compartidas por los scripts que crean bases de gimnasios y les aplican migraciones.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { urlDeBase, validarNombreBase } from "../lib/centros";

const CARPETA_BACKEND = path.resolve(__dirname, "../..");
const PRISMA_CLI = path.join(CARPETA_BACKEND, "node_modules/prisma/build/index.js");
const TSX_CLI = path.join(CARPETA_BACKEND, "node_modules/tsx/dist/cli.mjs");

export const ESQUEMA_CONTROL = path.join(CARPETA_BACKEND, "prisma/control/schema.prisma");
export const ESQUEMA_CENTRO = path.join(CARPETA_BACKEND, "prisma/schema.prisma");

// Crea la base si no existe. Devuelve true si la creó. Se conecta a "postgres", la base de mantenimiento
// que trae todo servidor de PostgreSQL (CREATE DATABASE no se puede ejecutar dentro de una transacción de Prisma,
// por eso va con $executeRawUnsafe; el nombre ya está validado).
export async function asegurarBase(baseDatos: string) {
  validarNombreBase(baseDatos);
  const mantenimiento = new PrismaClient({ datasourceUrl: urlDeBase("postgres") });
  try {
    const existe = await mantenimiento.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${baseDatos}`;
    if (existe.length > 0) return false;
    await mantenimiento.$executeRawUnsafe(`CREATE DATABASE "${baseDatos}"`);
    return true;
  } finally {
    await mantenimiento.$disconnect();
  }
}

function ejecutar(programa: string, argumentos: string[], variables: Record<string, string> = {}) {
  execFileSync(process.execPath, [programa, ...argumentos], {
    cwd: CARPETA_BACKEND,
    stdio: "inherit",
    env: { ...process.env, ...variables },
  });
}

// Aplica las migraciones pendientes de la base de control.
export function migrarControl() {
  ejecutar(PRISMA_CLI, ["migrate", "deploy", "--schema", ESQUEMA_CONTROL]);
}

// Aplica las migraciones pendientes en la base de un gimnasio.
export function migrarCentro(baseDatos: string) {
  ejecutar(PRISMA_CLI, ["migrate", "deploy", "--schema", ESQUEMA_CENTRO], { CENTRO_DATABASE_URL: urlDeBase(baseDatos) });
}

// Datos iniciales de un gimnasio nuevo (catálogo de tests y membresías por modalidad).
export function datosInicialesCentro(baseDatos: string) {
  ejecutar(TSX_CLI, [path.join(CARPETA_BACKEND, "prisma/seed.ts")], { CENTRO_DATABASE_URL: urlDeBase(baseDatos) });
}
