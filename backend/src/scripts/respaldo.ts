// Copia de seguridad de la base con pg_dump (viene con PostgreSQL, no hace falta instalar nada).
// Uso (desde la carpeta backend):
//   npm run respaldo           → guarda una copia en RESPALDOS_DIR y borra las más viejas (quedan las últimas 30)
//   npm run respaldo:probar    → restaura la copia más nueva en una base temporal, cuenta los alumnos y la borra
//   npm run respaldo:descifrar -- archivo.dump.cifrado  → deja al lado el .dump para restaurarlo con pg_restore
// Una copia que nunca se probó restaurar no es una copia segura: conviene probarla cada tanto.
// Con RESPALDO_CLAVE las copias se guardan cifradas (en producción es obligatoria). Sin esa clave no se
// pueden recuperar: hay que guardarla fuera del servidor.
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { cifrar, descifrar } from "../lib/cifrado";

const ejecutar = promisify(execFile);

// Carpeta de las copias (relativa a la carpeta backend). Conviene que esté sincronizada con la nube
// (ej.: Google Drive para escritorio): si la notebook se rompe, la copia en el mismo disco no sirve.
const CARPETA = path.resolve(process.env.RESPALDOS_DIR ?? "../respaldos");
// Carpeta de los programas de PostgreSQL (pg_dump, pg_restore...).
const BIN_POSTGRES = process.env.PG_BIN ?? (process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin" : "");
const COPIAS_A_CONSERVAR = 30;
const PREFIJO = "entrenamiento-";
const EXTENSION_CIFRADA = ".dump.cifrado";

// Datos de conexión sacados de DATABASE_URL. La contraseña va por variable de entorno (PGPASSWORD)
// y no en la línea de comandos; los parámetros de Prisma (?schema=public) pg_dump no los entiende.
function conexion() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL en backend/.env");
  const url = new URL(process.env.DATABASE_URL);
  return {
    base: decodeURIComponent(url.pathname.slice(1)),
    args: ["-h", url.hostname, "-p", url.port || "5432", "-U", decodeURIComponent(url.username)],
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
  };
}

function claveDeRespaldo() {
  const clave = process.env.RESPALDO_CLAVE;
  if (!clave && process.env.NODE_ENV === "production") {
    throw new Error("Falta RESPALDO_CLAVE: en producción las copias se guardan cifradas.");
  }
  if (clave && clave.length < 16) throw new Error("RESPALDO_CLAVE debe tener al menos 16 caracteres.");
  return clave;
}

function programa(nombre: string) {
  return path.join(BIN_POSTGRES, nombre);
}

// Las copias, de la más vieja a la más nueva (el nombre lleva fecha y hora, así que ordenar por nombre alcanza).
async function listarCopias() {
  const archivos = await readdir(CARPETA).catch(() => []);
  return archivos.filter((archivo) => archivo.startsWith(PREFIJO) && (archivo.endsWith(".dump") || archivo.endsWith(EXTENSION_CIFRADA))).sort();
}

async function respaldar() {
  const { base, args, env } = conexion();
  const clave = claveDeRespaldo();
  await mkdir(CARPETA, { recursive: true });
  // "aaaa-mm-dd_hh-mm" en hora local.
  const ahora = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  const sello = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}_${dos(ahora.getHours())}-${dos(ahora.getMinutes())}`;
  const archivo = path.join(CARPETA, `${PREFIJO}${sello}.dump`);

  // -Fc: formato propio de PostgreSQL, comprimido; se restaura con pg_restore.
  await ejecutar(programa("pg_dump"), [...args, "-Fc", "-f", archivo, base], { env });
  let guardado = archivo;
  if (clave) {
    guardado = archivo.replace(/\.dump$/, EXTENSION_CIFRADA);
    await writeFile(guardado, cifrar(await readFile(archivo), clave));
    await rm(archivo);
  }
  console.log(`Copia guardada: ${guardado}`);

  const copias = await listarCopias();
  for (const vieja of copias.slice(0, Math.max(0, copias.length - COPIAS_A_CONSERVAR))) {
    await rm(path.join(CARPETA, vieja));
    console.log(`Copia vieja borrada: ${vieja}`);
  }
}

async function probarRestauracion() {
  const { args, env } = conexion();
  const copias = await listarCopias();
  const ultima = copias.at(-1);
  if (!ultima) throw new Error(`No hay copias en ${CARPETA}`);

  // Una copia cifrada se descifra en una carpeta temporal, que se borra al terminar.
  const temporal = await mkdtemp(path.join(os.tmpdir(), "respaldo-"));
  let dump = path.join(CARPETA, ultima);
  if (ultima.endsWith(EXTENSION_CIFRADA)) {
    const clave = claveDeRespaldo();
    if (!clave) throw new Error("La copia está cifrada: falta RESPALDO_CLAVE.");
    dump = path.join(temporal, "copia.dump");
    await writeFile(dump, descifrar(await readFile(path.join(CARPETA, ultima)), clave));
  }

  const basePrueba = "entrenamiento_prueba_restauracion";
  await ejecutar(programa("dropdb"), [...args, "--if-exists", basePrueba], { env });
  await ejecutar(programa("createdb"), [...args, basePrueba], { env });
  try {
    await ejecutar(programa("pg_restore"), [...args, "--no-owner", "-d", basePrueba, dump], { env });
    const { stdout } = await ejecutar(
      programa("psql"),
      [...args, "-d", basePrueba, "-tAc", 'SELECT (SELECT count(*) FROM "Alumno") || \' alumnos, \' || (SELECT count(*) FROM "Pago") || \' pagos\''],
      { env },
    );
    console.log(`Restauración correcta de ${ultima}: ${stdout.trim()}.`);
  } finally {
    await ejecutar(programa("dropdb"), [...args, basePrueba], { env });
    await rm(temporal, { recursive: true });
  }
}

async function descifrarCopia(archivo: string | undefined) {
  if (!archivo?.endsWith(EXTENSION_CIFRADA)) throw new Error(`Indicá un archivo ${EXTENSION_CIFRADA}`);
  const clave = claveDeRespaldo();
  if (!clave) throw new Error("Falta RESPALDO_CLAVE.");
  const salida = archivo.slice(0, -EXTENSION_CIFRADA.length) + ".dump";
  await writeFile(salida, descifrar(await readFile(archivo), clave));
  console.log(`Copia descifrada: ${salida}. Tiene datos personales: borrarla después de usarla.`);
}

const accion = process.argv.includes("--probar")
  ? probarRestauracion()
  : process.argv.includes("--descifrar")
    ? descifrarCopia(process.argv[process.argv.indexOf("--descifrar") + 1])
    : respaldar();

accion.catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
