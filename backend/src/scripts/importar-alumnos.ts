// Copia alumnos con todos sus datos de una base a otra (ej.: alumnos de ejemplo de la compu al sistema publicado).
// El archivo lo arma un exportador a partir de la otra base: JSON, o el mismo JSON comprimido con gzip y en base64
// (más corto para pegarlo en una terminal). Uso, desde la carpeta backend:
//   npx tsx src/scripts/importar-alumnos.ts /tmp/alumnos.txt
// Membresías (por modalidad), perfiles y tests (por nombre) se buscan en la base de destino; los perfiles y tests
// que falten se crean. Un alumno cuyo DNI ya existe se saltea: correrlo dos veces no duplica nada.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { CategoriaPrueba, Lado, MedioPago, Modalidad, OrigenResultado, TipoAnotacion, TipoBloque } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Fechas como texto ISO y montos como texto ("25000.00"), tal como salen de JSON.stringify.
interface AlumnoExportado {
  datos: {
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string;
    profesion: string;
    telefono: string;
    email: string | null;
    detallePerfil: string | null;
    lesiones: string | null;
    molestias: string | null;
    actividadLaboral: string | null;
    otrosDatos: string | null;
    activo: boolean;
    creadoEn: string; // de acá se cuentan la próxima evaluación y la deuda: se conserva
  };
  perfil: { nombre: string; mesesReevaluacion: number };
  modalidadPlan: Modalidad | null;
  cuotas: { ref: number; modalidadPlan: Modalidad; desde: string; vence: string; importe: string; anulada: boolean }[];
  pagos: { cuotaRef: number | null; fecha: string; importe: string; concepto: string; medio: MedioPago }[];
  evaluaciones: {
    idEvaluacion: number;
    fecha: string;
    observaciones: string | null;
    resultados: {
      prueba: { nombre: string; categoria: CategoriaPrueba; unidad: string; porLado: boolean };
      valor: string;
      unidad: string;
      lado: Lado | null;
      origen: OrigenResultado;
      observacion: string | null;
    }[];
  }[];
  anotaciones: { fecha: string; tipo: TipoAnotacion; detalle: string; motivo: string | null }[];
  rutinas: { tipo: TipoBloque; valores: Record<string, string>; objetivo: string | null; desde: string; hasta: string; creadoEn: string }[];
  asistencias: string[];
  cambios: { campo: string; valorAnterior: string | null; valorNuevo: string | null; fecha: string }[];
}

function leerArchivo(ruta: string): { alumnos: AlumnoExportado[] } {
  const texto = readFileSync(ruta, "utf8").trim();
  const json = texto.startsWith("{") ? texto : gunzipSync(Buffer.from(texto, "base64")).toString("utf8");
  return JSON.parse(json);
}

const fecha = (texto: string) => new Date(texto);

async function buscarOCrearPerfil(perfil: AlumnoExportado["perfil"]) {
  const existente = await prisma.perfil.findFirst({ where: { nombre: { equals: perfil.nombre, mode: "insensitive" } } });
  if (existente) return existente.id;
  console.log(`  Perfil nuevo: ${perfil.nombre} (cada ${perfil.mesesReevaluacion} meses)`);
  return (await prisma.perfil.create({ data: perfil })).id;
}

async function buscarOCrearPrueba(prueba: AlumnoExportado["evaluaciones"][number]["resultados"][number]["prueba"]) {
  const existente = await prisma.prueba.findFirst({ where: { nombre: { equals: prueba.nombre, mode: "insensitive" } } });
  if (existente) return existente.id;
  console.log(`  Test nuevo: ${prueba.nombre}`);
  return (await prisma.prueba.create({ data: prueba })).id;
}

async function idPlan(modalidad: Modalidad) {
  const plan = await prisma.plan.findUnique({ where: { modalidad } });
  if (!plan) throw new Error(`No existe la membresía ${modalidad}: corré antes el seed (npx prisma db seed)`);
  return plan.id;
}

async function importar(alumno: AlumnoExportado) {
  const { datos } = alumno;
  const nombre = `${datos.apellido}, ${datos.nombre}`;
  if (await prisma.alumno.findUnique({ where: { dni: datos.dni } })) {
    console.log(`- ${nombre}: ya existe un alumno con el DNI ${datos.dni}, se saltea.`);
    return;
  }
  console.log(`- ${nombre}`);

  // Lo que puede crearse fuera de la transacción (perfiles, tests) se resuelve antes.
  const perfilId = await buscarOCrearPerfil(alumno.perfil);
  const planId = alumno.modalidadPlan ? await idPlan(alumno.modalidadPlan) : null;
  const pruebas = new Map<string, number>();
  for (const evaluacion of alumno.evaluaciones) {
    for (const { prueba } of evaluacion.resultados) {
      if (!pruebas.has(prueba.nombre)) pruebas.set(prueba.nombre, await buscarOCrearPrueba(prueba));
    }
  }
  const planesCuotas = new Map<Modalidad, number>();
  for (const cuota of alumno.cuotas) {
    if (!planesCuotas.has(cuota.modalidadPlan)) planesCuotas.set(cuota.modalidadPlan, await idPlan(cuota.modalidadPlan));
  }

  // El alumno y todo lo suyo, o nada.
  await prisma.$transaction(async (tx) => {
    const { id: alumnoId } = await tx.alumno.create({
      data: {
        ...datos,
        fechaNacimiento: fecha(datos.fechaNacimiento),
        creadoEn: fecha(datos.creadoEn),
        perfilId,
        planId,
      },
    });

    const cuotas = new Map<number, number>(); // id en la base de origen → id nuevo
    for (const cuota of alumno.cuotas) {
      const creada = await tx.cuota.create({
        data: {
          alumnoId,
          planId: planesCuotas.get(cuota.modalidadPlan)!,
          desde: fecha(cuota.desde),
          vence: fecha(cuota.vence),
          importe: cuota.importe,
          anulada: cuota.anulada,
        },
      });
      cuotas.set(cuota.ref, creada.id);
    }
    await tx.pago.createMany({
      data: alumno.pagos.map(({ cuotaRef, ...pago }) => ({
        ...pago,
        alumnoId,
        cuotaId: cuotaRef === null ? null : cuotas.get(cuotaRef)!,
        fecha: fecha(pago.fecha),
      })),
    });

    for (const evaluacion of alumno.evaluaciones) {
      await tx.evaluacion.create({
        data: {
          alumnoId,
          idEvaluacion: evaluacion.idEvaluacion,
          fecha: fecha(evaluacion.fecha),
          observaciones: evaluacion.observaciones,
          resultados: {
            create: evaluacion.resultados.map(({ prueba, ...resultado }) => ({ ...resultado, pruebaId: pruebas.get(prueba.nombre)! })),
          },
        },
      });
    }

    await tx.anotacion.createMany({ data: alumno.anotaciones.map((anotacion) => ({ ...anotacion, alumnoId, fecha: fecha(anotacion.fecha) })) });
    for (const rutina of alumno.rutinas) {
      await tx.rutina.create({
        data: { ...rutina, alumnoId, desde: fecha(rutina.desde), hasta: fecha(rutina.hasta), creadoEn: fecha(rutina.creadoEn) },
      });
    }
    await tx.asistencia.createMany({ data: alumno.asistencias.map((dia) => ({ alumnoId, fecha: fecha(dia) })) });
    await tx.cambioAlumno.createMany({ data: alumno.cambios.map((cambio) => ({ ...cambio, alumnoId, fecha: fecha(cambio.fecha) })) });
  });

  console.log(
    `  ${alumno.cuotas.length} cuotas, ${alumno.pagos.length} pagos, ${alumno.evaluaciones.length} evaluaciones, ` +
      `${alumno.anotaciones.length} anotaciones, ${alumno.rutinas.length} rutinas, ${alumno.asistencias.length} asistencias`,
  );
}

async function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("Uso: npx tsx src/scripts/importar-alumnos.ts <archivo>");
    process.exitCode = 1;
    return;
  }
  const { alumnos } = leerArchivo(ruta);
  console.log(`Importando ${alumnos.length} ${alumnos.length === 1 ? "alumno" : "alumnos"}:`);
  for (const alumno of alumnos) await importar(alumno);
  console.log("Listo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
