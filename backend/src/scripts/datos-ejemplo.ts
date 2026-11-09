// Carga datos inventados para probar el sistema o grabar una demostración, sin usar datos reales.
// Uso (desde la carpeta backend):  npm run datos-ejemplo -- <base del gimnasio>  (con el servidor de .env.prueba)
// El gimnasio tiene que existir (npm run centros -- crear). Por seguridad solo funciona fuera de producción
// y si el nombre de la base contiene "prueba".
import { Prisma } from "@prisma/client";
import { fechaDesdeTexto, hoyComoTexto, sumarMeses } from "../lib/fechas";
import { clienteDeCentro, desconectarCentros, enCentro } from "../lib/centros";
import { control } from "../lib/control";
import { prisma } from "../lib/prisma";
import { hashearPassword } from "../modulos/auth/auth.service";

const EMAIL_DEMO = "demo@dvtraining.test";
const PASSWORD_DEMO = "demo-1234";

const ALUMNOS: [nombre: string, apellido: string, perfil: string, detalle: string][] = [
  ["Lucas", "Ferreyra", "Deportivo", "Hockey"],
  ["Martina", "Quiroga", "Deportivo", "Básquet"],
  ["Julián", "Sosa", "Deportivo", "Recuperación / post lesión: esguince de tobillo"],
  ["Camila", "Ibarra", "Salud", "Actividad general"],
  ["Tomás", "Aguirre", "Deportivo", "Fútbol"],
  ["Valentina", "Luna", "Salud", "Actividad general"],
  ["Nicolás", "Medina", "Deportivo", "Rugby"],
  ["Sofía", "Carrizo", "Deportivo", "Recuperación / post lesión: hombro"],
  ["Mateo", "Rojas", "Deportivo", "Hockey"],
  ["Florencia", "Vega", "Salud", "Actividad general"],
  ["Agustina", "Paz", "Deportivo", "Vóley"],
  ["Bruno", "Molina", "Salud", "Actividad general"],
];

function diasAtras(hoy: string, dias: number) {
  const fecha = fechaDesdeTexto(hoy);
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha;
}

async function main() {
  const base = process.argv[2] ?? "";
  if (process.env.NODE_ENV === "production" || !base.includes("prueba")) {
    throw new Error(`La base "${base}" no parece de prueba: no se cargan datos de ejemplo.`);
  }
  const centro = await control.centro.findUnique({ where: { baseDatos: base } });
  if (!centro) throw new Error(`No hay ningún gimnasio con la base "${base}" (npm run centros -- listar).`);

  // El usuario va en la base de control, unido a este gimnasio.
  const existente = await control.usuario.findUnique({ where: { email: EMAIL_DEMO } });
  if (existente && existente.centroId !== centro.id) throw new Error(`${EMAIL_DEMO} ya es usuario de otro gimnasio.`);
  if (!existente) {
    await control.usuario.create({
      data: { email: EMAIL_DEMO, nombre: "Demo", passwordHash: await hashearPassword(PASSWORD_DEMO), centroId: centro.id },
    });
  }

  await enCentro(clienteDeCentro(base), () => cargar(base));
}

async function cargar(base: string) {

  const hoy = hoyComoTexto();
  const planes = await prisma.plan.findMany({ orderBy: { id: "asc" } });
  const pruebas = await prisma.prueba.findMany({ where: { porLado: false }, take: 2 });
  if (planes.length === 0 || pruebas.length === 0) {
    throw new Error("Falta el catálogo inicial: ejecutar primero npm run db:seed con esta base.");
  }
  for (const plan of planes) {
    await prisma.plan.update({ where: { id: plan.id }, data: { precioMensual: new Prisma.Decimal(40000 + plan.id * 5000) } });
  }

  // Los perfiles los crea la migración (Deportivo y Salud); si se cambiaron, se usa el primero.
  const perfiles = await prisma.perfil.findMany({ orderBy: { id: "asc" } });
  for (const [i, [nombre, apellido, perfil, detallePerfil]] of ALUMNOS.entries()) {
    const dni = String(90000000 + i);
    if (await prisma.alumno.findUnique({ where: { dni } })) continue; // se puede ejecutar varias veces

    const plan = planes[i % planes.length];
    const alumno = await prisma.alumno.create({
      data: {
        nombre,
        apellido,
        dni,
        fechaNacimiento: fechaDesdeTexto(`${1985 + (i % 20)}-0${(i % 9) + 1}-15`),
        profesion: "Ejemplo",
        telefono: `34100000${String(i).padStart(2, "0")}`,
        email: `${nombre.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()}@ejemplo.test`,
        perfilId: (perfiles.find((p) => p.nombre === perfil) ?? perfiles[0]).id,
        detallePerfil,
        planId: plan.id,
      },
    });

    // Cuotas encadenadas: unos al día, otros por vencer y otros con deuda.
    const cuotas = 2 + (i % 3);
    const inicio = sumarMeses(hoy, -cuotas - (i % 4 === 0 ? 1 : 0));
    for (let k = 0; k < cuotas; k++) {
      const desde = sumarMeses(inicio, k);
      const cuota = await prisma.cuota.create({
        data: { alumnoId: alumno.id, planId: plan.id, desde: fechaDesdeTexto(desde), vence: fechaDesdeTexto(sumarMeses(desde, 1)), importe: 45000 },
      });
      await prisma.pago.create({
        data: {
          alumnoId: alumno.id,
          cuotaId: cuota.id,
          fecha: fechaDesdeTexto(desde),
          importe: 45000,
          concepto: "Cuota mensual",
          medio: k % 2 === 0 ? "TRANSFERENCIA" : "EFECTIVO",
        },
      });
    }

    for (let n = 1; n <= 3; n++) {
      await prisma.evaluacion.create({
        data: {
          alumnoId: alumno.id,
          idEvaluacion: n,
          fecha: fechaDesdeTexto(sumarMeses(hoy, (n - 3) * 2 - 1)),
          resultados: { create: pruebas.map((prueba, p) => ({ pruebaId: prueba.id, valor: 30 + i + n * 2 + p * 5, unidad: prueba.unidad })) },
        },
      });
    }

    await prisma.anotacion.create({
      data: { alumnoId: alumno.id, fecha: diasAtras(hoy, i + 1), tipo: "OBSERVACION", detalle: "Buena predisposición en la sesión." },
    });

    const desdeRutina = sumarMeses(hoy, -1 - (i % 2));
    await prisma.rutina.create({
      data: {
        alumnoId: alumno.id,
        tipo: i % 2 === 0 ? "MODELO_RUTINA" : "MODELO_RUTINA_2",
        valores: { nombre: `${apellido}, ${nombre}`, deporte: detallePerfil, A4: "Sentadilla", B4: "40" },
        objetivo: detallePerfil,
        desde: fechaDesdeTexto(desdeRutina),
        hasta: fechaDesdeTexto(sumarMeses(desdeRutina, 2)),
      },
    });

    // Asistencias de las últimas semanas; algunos dejaron de venir.
    const primerDia = i % 5 === 4 ? 20 : 1;
    for (let dia = primerDia; dia <= 45; dia += 2 + (i % 3)) {
      await prisma.asistencia.create({ data: { alumnoId: alumno.id, fecha: diasAtras(hoy, dia) } });
    }
  }

  console.log(`Datos de ejemplo cargados en "${base}". Usuario: ${EMAIL_DEMO} / contraseña: ${PASSWORD_DEMO}`);
}

main()
  .catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([control.$disconnect(), desconectarCentros()]));
