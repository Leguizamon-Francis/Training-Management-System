// Completa el gimnasio demo con alumnos inventados (ver datos-ficticios.ts), para que quien la mire vea el sistema
// con movimiento. Solo funciona sobre un gimnasio marcado como demo: nunca toca los datos de un gimnasio real.
// Uso (desde la carpeta backend, también en la Shell de Render):
//   npm run datos-demo -- <base de la demo>
//   npm run datos-demo -- <base de la demo> --renombrar "Apellido, Nombre" "Apellido nuevo, Nombre nuevo"
import { clienteDeCentro, desconectarCentros, enCentro } from "../lib/centros";
import { control } from "../lib/control";
import { prisma } from "../lib/prisma";
import { cargarDatosFicticios } from "./datos-ficticios";

function separarNombre(texto: string) {
  const [apellido, nombre] = texto.split(",").map((parte) => parte?.trim());
  if (!apellido || !nombre) throw new Error(`"${texto}" tiene que tener la forma "Apellido, Nombre".`);
  return { apellido, nombre };
}

// Cambia el nombre de un alumno y también el que quedó escrito en sus rutinas.
async function renombrar(actual: string, nuevo: string) {
  const viejo = separarNombre(actual);
  const nombreNuevo = separarNombre(nuevo);
  const alumnos = await prisma.alumno.findMany({
    where: { apellido: { equals: viejo.apellido, mode: "insensitive" }, nombre: { equals: viejo.nombre, mode: "insensitive" } },
  });
  if (alumnos.length !== 1) {
    const todos = await prisma.alumno.findMany({ select: { apellido: true, nombre: true }, orderBy: { apellido: "asc" } });
    throw new Error(
      `${alumnos.length === 0 ? "No hay" : "Hay más de"} un alumno "${actual}". Alumnos cargados: ${todos.map((a) => `${a.apellido}, ${a.nombre}`).join(" · ")}`,
    );
  }
  const alumno = alumnos[0];
  await prisma.$transaction(async (tx) => {
    await tx.alumno.update({ where: { id: alumno.id }, data: nombreNuevo });
    for (const rutina of await tx.rutina.findMany({ where: { alumnoId: alumno.id } })) {
      const valores = { ...(rutina.valores as Record<string, string>), nombre: `${nombreNuevo.apellido}, ${nombreNuevo.nombre}` };
      await tx.rutina.update({ where: { id: rutina.id }, data: { valores } });
    }
  });
  console.log(`"${alumno.apellido}, ${alumno.nombre}" ahora es "${nombreNuevo.apellido}, ${nombreNuevo.nombre}".`);
}

async function main() {
  const [base = "", opcion, actual, nuevo] = process.argv.slice(2);
  const centro = await control.centro.findUnique({ where: { baseDatos: base } });
  if (!centro) throw new Error(`No hay ningún gimnasio con la base "${base}" (npm run centros -- listar).`);
  if (!centro.esDemo) throw new Error(`"${centro.nombre}" no es la demo: no se le cargan datos inventados.`);

  await enCentro(clienteDeCentro(base), async () => {
    if (opcion === "--renombrar") {
      if (!actual || !nuevo) throw new Error('Uso: --renombrar "Apellido, Nombre" "Apellido nuevo, Nombre nuevo"');
      await renombrar(actual, nuevo);
    } else if (opcion) {
      throw new Error(`Opción desconocida: ${opcion}`);
    } else {
      const creados = await cargarDatosFicticios();
      console.log(`${creados} alumnos inventados cargados en "${centro.nombre}".`);
    }
  });
}

main()
  .catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([control.$disconnect(), desconectarCentros()]));
