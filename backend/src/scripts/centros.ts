// Gimnasios (centros): cada uno con su propia base.
// Uso (desde la carpeta backend):
//   npm run centros -- listar
//   npm run centros -- crear   <base> "<nombre>" [--demo]   → crea la base, le aplica las migraciones y los datos iniciales
//   npm run centros -- adoptar <base> "<nombre>"            → registra una base que ya existe (la de antes de que hubiera
//                                                              varios gimnasios): pasa sus usuarios y sesiones a la base de
//                                                              control y después les aplica las migraciones pendientes
// Para crear el usuario de un gimnasio: npm run crear-admin.
import { PrismaClient } from "@prisma/client";
import { urlDeBase, validarNombreBase } from "../lib/centros";
import { control } from "../lib/control";
import { asegurarBase, datosInicialesCentro, migrarCentro } from "./herramientas-centros";

async function listar() {
  const centros = await control.centro.findMany({ orderBy: { id: "asc" }, include: { _count: { select: { usuarios: true } } } });
  if (centros.length === 0) console.log("Todavía no hay gimnasios.");
  for (const c of centros) {
    const marcas = [c.esDemo && "demo", !c.activo && "inactivo"].filter(Boolean).join(", ");
    console.log(`${c.id}. ${c.nombre} — base ${c.baseDatos} — ${c._count.usuarios} usuario(s)${marcas ? ` (${marcas})` : ""}`);
  }
}

async function crear(baseDatos: string, nombre: string, esDemo: boolean) {
  validarNombreBase(baseDatos);
  if (await control.centro.findUnique({ where: { baseDatos } })) throw new Error(`Ya hay un gimnasio con la base ${baseDatos}.`);
  if (!(await asegurarBase(baseDatos))) {
    throw new Error(`La base ${baseDatos} ya existe. Si es la de un gimnasio de antes, usar "adoptar".`);
  }
  migrarCentro(baseDatos);
  datosInicialesCentro(baseDatos);
  await control.centro.create({ data: { nombre, baseDatos, esDemo } });
  console.log(`Gimnasio "${nombre}" creado (base ${baseDatos}). Falta su usuario: npm run crear-admin.`);
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

async function main() {
  const [comando, baseDatos, nombre] = process.argv.slice(2);
  if (comando === "listar") return listar();
  if ((comando === "crear" || comando === "adoptar") && baseDatos && nombre) {
    return comando === "crear" ? crear(baseDatos, nombre, process.argv.includes("--demo")) : adoptar(baseDatos, nombre);
  }
  console.error('Uso: npm run centros -- listar | crear <base> "<nombre>" [--demo] | adoptar <base> "<nombre>"');
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => control.$disconnect());
