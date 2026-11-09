// Copias de seguridad con pg_dump (viene con PostgreSQL, no hace falta instalar nada).
// Se hace UNA COPIA POR BASE: la de control (gimnasios, usuarios y sesiones) y la de cada gimnasio.
// Ningún archivo tiene datos de dos gimnasios, y cada uno se cifra con su propia clave (derivada de RESPALDO_CLAVE):
// la copia de un gimnasio no se abre con la clave de otro.
//
// Uso (desde la carpeta backend):
//   npm run respaldo                       → copia todas las bases; en cada carpeta quedan las últimas 30
//   npm run respaldo:probar [-- <base>]    → restaura la copia más nueva de cada base (o de una) en una base
//                                            temporal, cuenta los registros y la borra
//   npm run respaldo:descifrar -- <archivo.dump.cifrado>  → deja al lado el .dump para restaurarlo con pg_restore
// Una copia que nunca se probó restaurar no es una copia segura: conviene probarla cada tanto.
//
// Las copias quedan en RESPALDOS_DIR/<base>/ y, en Backblaze B2, en la carpeta <base>/ del bucket.
// Con RESPALDO_CLAVE se guardan cifradas (en producción es obligatoria). Sin esa clave no se pueden recuperar:
// hay que guardarla fuera del servidor. Con B2_KEY_ID y B2_APPLICATION_KEY cada copia se sube además a B2
// (en producción es obligatorio: el disco del servidor se borra en cada ejecución).
// No usa Prisma: la lista de gimnasios se lee con psql, que viene junto con pg_dump.
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { subirABackblaze } from "../lib/backblaze";
import { cifrar, claveDeBase, descifrar } from "../lib/cifrado";
import { validarNombreBase } from "../lib/nombre-base";
import { conexion, consultar, ejecutarPostgres } from "./herramientas-postgres";

// Carpeta de las copias (relativa a la carpeta backend). Conviene que esté sincronizada con la nube
// (ej.: Google Drive para escritorio): si la compu se rompe, la copia en el mismo disco no sirve.
const CARPETA = path.resolve(process.env.RESPALDOS_DIR ?? "../respaldos");
const COPIAS_A_CONSERVAR = 30;
const EXTENSION_CIFRADA = ".dump.cifrado";
const BASE_RESTAURACION = "respaldo_prueba_restauracion";

function claveMaestra() {
  const clave = process.env.RESPALDO_CLAVE;
  if (!clave && process.env.NODE_ENV === "production") {
    throw new Error("Falta RESPALDO_CLAVE: en producción las copias se guardan cifradas.");
  }
  if (clave && clave.length < 16) throw new Error("RESPALDO_CLAVE debe tener al menos 16 caracteres.");
  return clave;
}

function credencialesBackblaze() {
  const idClave = process.env.B2_KEY_ID;
  const clave = process.env.B2_APPLICATION_KEY;
  if (idClave && clave) return { idClave, clave };
  if (process.env.NODE_ENV === "production") {
    throw new Error("Faltan B2_KEY_ID y B2_APPLICATION_KEY: en producción la copia se guarda fuera del servidor.");
  }
  return null;
}

// "aaaa-mm-dd_hh-mm" siempre en hora de Argentina (el servidor está en UTC): así las copias de la compu
// y las del servidor se ordenan bien por nombre.
function selloArgentina(momento: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(momento);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${parte("year")}-${parte("month")}-${parte("day")}_${parte("hour")}-${parte("minute")}`;
}

// La base de control y la de cada gimnasio registrado en ella.
async function listarBases() {
  const { baseControl } = conexion();
  const centros = (await consultar(baseControl, 'SELECT "baseDatos" FROM "Centro" ORDER BY id')).split(/\r?\n/).filter(Boolean);
  for (const base of [baseControl, ...centros]) validarNombreBase(base);
  return { baseControl, bases: [baseControl, ...centros] };
}

const carpetaDe = (base: string) => path.join(CARPETA, base);

// Las copias de una base, de la más vieja a la más nueva (el nombre lleva fecha y hora: ordenar por nombre alcanza).
async function listarCopias(base: string) {
  const archivos = await readdir(carpetaDe(base)).catch(() => []);
  return archivos.filter((a) => a.startsWith(`${base}-`) && (a.endsWith(".dump") || a.endsWith(EXTENSION_CIFRADA))).sort();
}

async function respaldarBase(base: string, clave: string | undefined, backblaze: ReturnType<typeof credencialesBackblaze>) {
  await mkdir(carpetaDe(base), { recursive: true });
  const archivo = path.join(carpetaDe(base), `${base}-${selloArgentina(new Date())}.dump`);

  // -Fc: formato propio de PostgreSQL, comprimido; se restaura con pg_restore.
  await ejecutarPostgres("pg_dump", ["-Fc", "-f", archivo, base]);
  let guardado = archivo;
  if (clave) {
    guardado = archivo.replace(/\.dump$/, EXTENSION_CIFRADA);
    await writeFile(guardado, cifrar(await readFile(archivo), claveDeBase(clave, base)));
    await rm(archivo);
  }
  console.log(`Copia guardada: ${guardado}`);

  if (backblaze) {
    const nombre = `${base}/${path.basename(guardado)}`;
    await subirABackblaze(nombre, await readFile(guardado), backblaze);
    console.log(`Copia subida a Backblaze: ${nombre}`);
  }

  const copias = await listarCopias(base);
  for (const vieja of copias.slice(0, Math.max(0, copias.length - COPIAS_A_CONSERVAR))) {
    await rm(path.join(carpetaDe(base), vieja));
    console.log(`Copia vieja borrada: ${base}/${vieja}`);
  }
}

// Si una base falla se siguen copiando las demás; al final se informa el error (y el Cron Job queda en rojo).
async function respaldar() {
  const clave = claveMaestra();
  const backblaze = credencialesBackblaze();
  const { bases } = await listarBases();
  const fallidas: string[] = [];
  for (const base of bases) {
    try {
      await respaldarBase(base, clave, backblaze);
    } catch (error) {
      fallidas.push(base);
      console.error(`No se pudo copiar ${base}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (fallidas.length > 0) throw new Error(`Fallaron ${fallidas.length} de ${bases.length} bases: ${fallidas.join(", ")}`);
  console.log(`Listo: ${bases.length} ${bases.length === 1 ? "base copiada" : "bases copiadas"}.`);
}

async function probarBase(base: string, esControl: boolean) {
  const ultima = (await listarCopias(base)).at(-1);
  if (!ultima) throw new Error(`No hay copias de ${base} en ${carpetaDe(base)}`);

  // Una copia cifrada se descifra en una carpeta temporal, que se borra al terminar.
  const temporal = await mkdtemp(path.join(os.tmpdir(), "respaldo-"));
  let dump = path.join(carpetaDe(base), ultima);
  if (ultima.endsWith(EXTENSION_CIFRADA)) {
    const clave = claveMaestra();
    if (!clave) throw new Error("La copia está cifrada: falta RESPALDO_CLAVE.");
    dump = path.join(temporal, "copia.dump");
    await writeFile(dump, descifrar(await readFile(path.join(carpetaDe(base), ultima)), claveDeBase(clave, base)));
  }

  await ejecutarPostgres("dropdb", ["--if-exists", BASE_RESTAURACION]);
  await ejecutarPostgres("createdb", [BASE_RESTAURACION]);
  try {
    // Sin dueños ni permisos: los usuarios de la base de origen (ej.: el de Render) no existen acá.
    await ejecutarPostgres("pg_restore", ["--no-owner", "--no-privileges", "-d", BASE_RESTAURACION, dump]);
    const conteo = esControl
      ? `SELECT (SELECT count(*) FROM "Centro") || ' gimnasios, ' || (SELECT count(*) FROM "Usuario") || ' usuarios'`
      : `SELECT (SELECT count(*) FROM "Alumno") || ' alumnos, ' || (SELECT count(*) FROM "Pago") || ' pagos'`;
    console.log(`Restauración correcta de ${base}/${ultima}: ${await consultar(BASE_RESTAURACION, conteo)}.`);
  } finally {
    await ejecutarPostgres("dropdb", [BASE_RESTAURACION]);
    await rm(temporal, { recursive: true });
  }
}

async function probarRestauracion(soloBase: string | undefined) {
  const { baseControl, bases } = await listarBases();
  if (soloBase && !bases.includes(soloBase)) throw new Error(`"${soloBase}" no es la base de control ni la de un gimnasio.`);
  for (const base of soloBase ? [soloBase] : bases) await probarBase(base, base === baseControl);
}

// La clave sale de la carpeta del archivo (que se llama como la base). Las copias de antes de que hubiera
// varios gimnasios (sueltas en RESPALDOS_DIR) se cifraban directamente con la clave maestra.
async function descifrarCopia(archivo: string | undefined) {
  if (!archivo?.endsWith(EXTENSION_CIFRADA)) throw new Error(`Indicá un archivo ${EXTENSION_CIFRADA}`);
  const clave = claveMaestra();
  if (!clave) throw new Error("Falta RESPALDO_CLAVE.");
  const contenido = await readFile(archivo);
  const base = path.basename(path.dirname(path.resolve(archivo)));
  let datos: Buffer;
  try {
    validarNombreBase(base);
    datos = descifrar(contenido, claveDeBase(clave, base));
  } catch {
    datos = descifrar(contenido, clave); // copia vieja; si tampoco anda, el error dice que la clave no corresponde
  }
  const salida = archivo.slice(0, -EXTENSION_CIFRADA.length) + ".dump";
  await writeFile(salida, datos);
  console.log(`Copia descifrada: ${salida}. Tiene datos personales: borrarla después de usarla.`);
}

const argumento = (bandera: string) => {
  const indice = process.argv.indexOf(bandera);
  return indice === -1 ? undefined : process.argv[indice + 1];
};

const accion = process.argv.includes("--probar")
  ? probarRestauracion(argumento("--probar"))
  : process.argv.includes("--descifrar")
    ? descifrarCopia(argumento("--descifrar"))
    : respaldar();

accion.catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
