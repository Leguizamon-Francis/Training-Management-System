// Programas de PostgreSQL (pg_dump, pg_restore, psql...) con los datos de conexión de DATABASE_URL.
// Sin Prisma: lo usa también el Cron Job de respaldos, que no genera los clientes de Prisma.
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const ejecutarArchivo = promisify(execFile);

// Carpeta de los programas. En Windows, los del 18: Render hace las copias con pg_dump 18 y pg_restore
// no lee copias de una versión más nueva que la suya.
const BIN_POSTGRES = process.env.PG_BIN ?? (process.platform === "win32" ? "C:/Program Files/PostgreSQL/18/bin" : "");

// Servidor, usuario y base de control, sacados de DATABASE_URL. La contraseña va por variable de entorno
// (PGPASSWORD) y no en la línea de comandos; los parámetros de Prisma (?schema=public) estos programas no los entienden.
export function conexion() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL en backend/.env");
  let url: URL;
  try {
    url = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL no es una dirección válida: tiene que empezar con postgresql:// (sin comillas ni espacios).");
  }
  return {
    baseControl: decodeURIComponent(url.pathname.slice(1)),
    args: ["-h", url.hostname, "-p", url.port || "5432", "-U", decodeURIComponent(url.username)],
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
  };
}

// Ejecuta un programa de PostgreSQL con los datos de conexión ya puestos.
export function ejecutarPostgres(programa: string, argumentos: string[]) {
  const { args, env } = conexion();
  return ejecutarArchivo(path.join(BIN_POSTGRES, programa), [...args, ...argumentos], { env, maxBuffer: 64 * 1024 * 1024 });
}

// Resultado de una consulta de texto (psql -tAc).
export async function consultar(base: string, sql: string) {
  const { stdout } = await ejecutarPostgres("psql", ["-d", base, "-tAc", sql]);
  return stdout.trim();
}
