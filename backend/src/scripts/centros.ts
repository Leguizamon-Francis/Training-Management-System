// Gimnasios (centros): cada uno con su propia base.
// Uso (desde la carpeta backend):
//   npm run centros -- listar
//   npm run centros -- crear   <base> "<nombre>"     → crea la base, le aplica las migraciones y los datos iniciales
//   npm run centros -- adoptar <base> "<nombre>"     → registra una base que ya existe (la de antes de que hubiera
//                                                       varios gimnasios): pasa sus usuarios y sesiones a la base de
//                                                       control y después le aplica las migraciones pendientes
//   npm run centros -- copiar  <origen> <base> "<nombre>" [--demo]
//                                                     → crea un gimnasio nuevo con una copia de los datos de otro, tomada
//                                                       una sola vez (lo que se cargue después en el origen no pasa).
//                                                       Con --demo queda de solo lectura y se le crea el usuario de la demo.
//
// Cuando un gimnasio deja de usar el sistema:
//   npm run centros -- desactivar <base>   → nadie de ese gimnasio puede entrar (se cierran sus sesiones). Reversible.
//   npm run centros -- activar    <base>
//   npm run centros -- exportar   <base>   → sus datos en planillas CSV (para entregárselos), en ../exportaciones/
//   npm run centros -- eliminar   <base>   → borra su base, sus usuarios y sus copias locales. Sin vuelta atrás:
//                                            pide escribir el nombre de la base y solo funciona si está desactivado.
// Para crear el usuario de un gimnasio: npm run crear-admin.
import crypto from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { urlDeBase, validarNombreBase } from "../lib/centros";
import { control } from "../lib/control";
import { hashearPassword } from "../modulos/auth/auth.service";
import { asegurarBase, datosInicialesCentro, migrarCentro } from "./herramientas-centros";
import { ejecutarPostgres } from "./herramientas-postgres";

async function listar() {
  const centros = await control.centro.findMany({ orderBy: { id: "asc" }, include: { _count: { select: { usuarios: true } } } });
  if (centros.length === 0) console.log("Todavía no hay gimnasios.");
  for (const c of centros) {
    const marcas = [c.esDemo && "demo", !c.activo && "inactivo"].filter(Boolean).join(", ");
    console.log(`${c.id}. ${c.nombre} — base ${c.baseDatos} — ${c._count.usuarios} usuario(s)${marcas ? ` (${marcas})` : ""}`);
  }
}

async function buscarCentro(baseDatos: string) {
  validarNombreBase(baseDatos);
  const centro = await control.centro.findUnique({ where: { baseDatos } });
  if (!centro) throw new Error(`No hay ningún gimnasio con la base "${baseDatos}" (npm run centros -- listar).`);
  return centro;
}

async function exigirBaseNueva(baseDatos: string) {
  validarNombreBase(baseDatos);
  if (await control.centro.findUnique({ where: { baseDatos } })) throw new Error(`Ya hay un gimnasio con la base ${baseDatos}.`);
  if (!(await asegurarBase(baseDatos))) {
    throw new Error(`La base ${baseDatos} ya existe. Si es la de un gimnasio de antes, usar "adoptar".`);
  }
}

async function crear(baseDatos: string, nombre: string) {
  await exigirBaseNueva(baseDatos);
  migrarCentro(baseDatos);
  datosInicialesCentro(baseDatos);
  await control.centro.create({ data: { nombre, baseDatos } });
  console.log(`Gimnasio "${nombre}" creado (base ${baseDatos}). Falta su usuario: npm run crear-admin.`);
}

// Copia con pg_dump/pg_restore (no con CREATE DATABASE ... TEMPLATE, que exige que nadie esté conectado al origen:
// el sistema publicado siempre lo está).
async function copiar(origen: string, baseDatos: string, nombre: string, esDemo: boolean) {
  await buscarCentro(origen);
  await exigirBaseNueva(baseDatos);
  const temporal = await mkdtemp(path.join(os.tmpdir(), "copia-"));
  try {
    const archivo = path.join(temporal, "origen.dump");
    await ejecutarPostgres("pg_dump", ["-Fc", "-f", archivo, origen]);
    await ejecutarPostgres("pg_restore", ["--no-owner", "--no-privileges", "-d", baseDatos, archivo]);
  } finally {
    await rm(temporal, { recursive: true });
  }
  migrarCentro(baseDatos);

  const centro = await control.centro.create({ data: { nombre, baseDatos, esDemo } });
  if (esDemo) {
    // Se entra con el botón "Ver demo", nunca con contraseña: se le pone una al azar que nadie conoce.
    await control.usuario.create({
      data: {
        email: `demo@${baseDatos}.invalid`,
        nombre: "Visitante",
        rol: "DEMO",
        passwordHash: await hashearPassword(crypto.randomBytes(32).toString("base64url")),
        centroId: centro.id,
      },
    });
  }
  console.log(`Gimnasio "${nombre}" creado con una copia de ${origen} (base ${baseDatos})${esDemo ? ", como demo de solo lectura" : ""}.`);
}

interface FilaUsuario { id: number; email: string; nombre: string; passwordHash: string; creadoEn: Date }
interface FilaToken { usuarioId: number; tokenHash: string; expiraEn: Date; creadoEn: Date }

// Lee los usuarios que la base todavía tiene (antes de la migración usuarios_a_base_de_control).
async function leerUsuariosViejos(baseDatos: string) {
  const vieja = new PrismaClient({ datasourceUrl: urlDeBase(baseDatos) });
  try {
    const [{ existe }] = await vieja.$queryRaw<{ existe: boolean }[]>`SELECT to_regclass('"Usuario"') IS NOT NULL AS existe`;
    if (!existe) return null;
    return {
      usuarios: await vieja.$queryRaw<FilaUsuario[]>`SELECT id, email, nombre, "passwordHash", "creadoEn" FROM "Usuario"`,
      sesiones: await vieja.$queryRaw<FilaToken[]>`SELECT "usuarioId", "tokenHash", "expiraEn", "creadoEn" FROM "Sesion"`,
      recuperaciones: await vieja.$queryRaw<FilaToken[]>`SELECT "usuarioId", "tokenHash", "expiraEn", "creadoEn" FROM "RecuperacionPassword"`,
    };
  } finally {
    await vieja.$disconnect();
  }
}

async function adoptar(baseDatos: string, nombre: string) {
  validarNombreBase(baseDatos);
  const existente = await control.centro.findUnique({ where: { baseDatos } });
  if (existente) {
    console.log(`La base ${baseDatos} ya es del gimnasio "${existente.nombre}": solo se aplican las migraciones pendientes.`);
  } else {
    const viejos = await leerUsuariosViejos(baseDatos);
    // Primero se copian los usuarios (en una transacción) y recién después la migración borra las tablas viejas.
    await control.$transaction(async (tx) => {
      const centro = await tx.centro.create({ data: { nombre, baseDatos } });
      for (const u of viejos?.usuarios ?? []) {
        if (await tx.usuario.findUnique({ where: { email: u.email } })) {
          throw new Error(`El email ${u.email} ya es de un usuario de otro gimnasio: no se adoptó nada.`);
        }
        const nuevo = await tx.usuario.create({
          data: { email: u.email, nombre: u.nombre, passwordHash: u.passwordHash, creadoEn: u.creadoEn, centroId: centro.id },
        });
        const deEste = (filas: FilaToken[]) =>
          filas.filter((f) => f.usuarioId === u.id).map((f) => ({ usuarioId: nuevo.id, tokenHash: f.tokenHash, expiraEn: f.expiraEn, creadoEn: f.creadoEn }));
        await tx.sesion.createMany({ data: deEste(viejos!.sesiones) });
        await tx.recuperacionPassword.createMany({ data: deEste(viejos!.recuperaciones) });
      }
    });
    console.log(`Gimnasio "${nombre}" registrado con ${viejos?.usuarios.length ?? 0} usuario(s) (base ${baseDatos}).`);
  }
  migrarCentro(baseDatos);
}

async function cambiarActivo(baseDatos: string, activo: boolean) {
  const centro = await buscarCentro(baseDatos);
  await control.$transaction([
    control.centro.update({ where: { id: centro.id }, data: { activo } }),
    // Al desactivar se cierran todas las sesiones (igual ya no servían: requiereSesion exige un gimnasio activo).
    ...(activo ? [] : [control.sesion.deleteMany({ where: { usuario: { centroId: centro.id } } })]),
  ]);
  console.log(`Gimnasio "${centro.nombre}" ${activo ? "activado" : "desactivado: nadie de ese gimnasio puede entrar"}.`);
}

// ---------- Exportar (planillas para entregarle sus datos al gimnasio) ----------

// Separador ";" y coma decimal, con BOM: así Excel en español lo abre bien con doble clic.
function valorCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let texto: string;
  if (valor instanceof Date) {
    texto = valor.toISOString().endsWith("T00:00:00.000Z") ? valor.toISOString().slice(0, 10) : valor.toISOString();
  } else if (typeof valor === "object" && valor.constructor?.name === "Decimal") {
    texto = String(valor).replace(".", ",");
  } else if (typeof valor === "object") {
    texto = JSON.stringify(valor);
  } else {
    texto = String(valor);
  }
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

async function exportar(baseDatos: string) {
  const centro = await buscarCentro(baseDatos);
  const cliente = new PrismaClient({ datasourceUrl: urlDeBase(baseDatos) });
  const carpeta = path.resolve("../exportaciones", `${baseDatos}-${new Date().toISOString().slice(0, 10)}`);
  try {
    await mkdir(carpeta, { recursive: true });
    const tablas = await cliente.$queryRaw<{ tabla: string }[]>`
      SELECT table_name AS tabla FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
      ORDER BY table_name`;
    for (const { tabla } of tablas) {
      const columnas = await cliente.$queryRaw<{ columna: string }[]>`
        SELECT column_name AS columna FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tabla} ORDER BY ordinal_position`;
      // El nombre de la tabla sale del catálogo de la base, no de algo que escriba una persona.
      const filas = await cliente.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${tabla}" ORDER BY 1`);
      const lineas = [columnas.map((c) => c.columna).join(";"), ...filas.map((f) => columnas.map((c) => valorCsv(f[c.columna])).join(";"))];
      await writeFile(path.join(carpeta, `${tabla}.csv`), "﻿" + lineas.join("\r\n") + "\r\n", "utf8");
      console.log(`${tabla}.csv: ${filas.length} fila(s)`);
    }
  } finally {
    await cliente.$disconnect();
  }
  console.log(`\nDatos de "${centro.nombre}" en ${carpeta}`);
  console.log("Tienen datos personales: entregarlos por un medio seguro y borrar la carpeta después.");
}

// ---------- Eliminar ----------

async function eliminar(baseDatos: string) {
  const centro = await buscarCentro(baseDatos);
  if (centro.esDemo) throw new Error("Es la demo: no se elimina con este comando.");
  if (centro.activo) throw new Error(`"${centro.nombre}" está activo: primero desactivarlo (npm run centros -- desactivar ${baseDatos}).`);

  console.log(`Se van a borrar, SIN VUELTA ATRÁS, la base ${baseDatos} con todos los datos de "${centro.nombre}",`);
  console.log("sus usuarios y sus copias de seguridad de esta compu. Conviene exportar antes sus datos para entregárselos.");
  const consola = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirmacion = await consola.question(`Para confirmar, escribí el nombre de la base (${baseDatos}): `);
  consola.close();
  if (confirmacion.trim() !== baseDatos) throw new Error("No coincide: no se borró nada.");

  // Primero la base: si algo falla después, el gimnasio sigue registrado (y desactivado) y se puede volver a correr.
  const mantenimiento = new PrismaClient({ datasourceUrl: urlDeBase("postgres") });
  try {
    await mantenimiento.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${baseDatos}" WITH (FORCE)`);
  } finally {
    await mantenimiento.$disconnect();
  }
  await control.$transaction([
    control.sesion.deleteMany({ where: { usuario: { centroId: centro.id } } }),
    control.recuperacionPassword.deleteMany({ where: { usuario: { centroId: centro.id } } }),
    control.usuario.deleteMany({ where: { centroId: centro.id } }),
    control.centro.delete({ where: { id: centro.id } }),
  ]);
  await rm(path.resolve(process.env.RESPALDOS_DIR ?? "../respaldos", baseDatos), { recursive: true, force: true });

  console.log(`\n"${centro.nombre}" eliminado: base, usuarios y copias locales.`);
  console.log(`Falta: borrar la carpeta "${baseDatos}/" del bucket de Backblaze desde su panel (la clave del servidor no puede`);
  console.log("borrar). Si no, la regla de 30 días las elimina sola; sin la clave maestra no se pueden abrir.");
}

async function main() {
  const [comando, a, b, c] = process.argv.slice(2);
  const conBandera = process.argv.includes("--demo");
  if (comando === "listar") return listar();
  if (comando === "crear" && a && b) return crear(a, b);
  if (comando === "adoptar" && a && b) return adoptar(a, b);
  if (comando === "copiar" && a && b && c) return copiar(a, b, c, conBandera);
  if (comando === "desactivar" && a) return cambiarActivo(a, false);
  if (comando === "activar" && a) return cambiarActivo(a, true);
  if (comando === "exportar" && a) return exportar(a);
  if (comando === "eliminar" && a) return eliminar(a);
  console.error("Comandos: listar | crear <base> \"<nombre>\" | adoptar <base> \"<nombre>\" | copiar <origen> <base> \"<nombre>\" [--demo]");
  console.error("          desactivar <base> | activar <base> | exportar <base> | eliminar <base>");
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => control.$disconnect());
