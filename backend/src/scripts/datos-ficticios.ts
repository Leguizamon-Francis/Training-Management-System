// Alumnos inventados, con cuotas, evaluaciones, anotaciones, rutinas y asistencias, para la demo y la base de prueba.
// Las fechas se calculan desde hoy, así hay de todo: cuotas al día, por vencer y vencidas, evaluaciones y rutinas
// próximas, y alumnos que dejaron de venir. Se puede ejecutar varias veces: saltea los DNI que ya existen.
// Usar dentro de enCentro (escribe en el gimnasio del contexto).
import { Prisma, type TipoAnotacion } from "@prisma/client";
import { fechaDesdeTexto, hoyComoTexto, sumarDias, sumarMeses, textoDesdeFecha } from "../lib/fechas";
import { prisma } from "../lib/prisma";

type AlumnoFicticio = {
  nombre: string;
  apellido: string;
  nacimiento: string;
  profesion: string;
  perfil: "Deportivo" | "Salud";
  detalle: string;
  modalidad: "PRESENCIAL" | "SEMIPRESENCIAL" | "ONLINE";
  // Días que faltan para que venza la última cuota (negativo = vencida hace tantos días).
  venceEn: number;
  lesiones?: string;
  molestias?: string;
  // Asistencias: días de la semana (0 = domingo) y hace cuántos días dejó de venir.
  dias: number[];
  dejoHace?: number;
  activo?: boolean;
};

const ALUMNOS: AlumnoFicticio[] = [
  { nombre: "Lucas", apellido: "Ferreyra", nacimiento: "2004-03-12", profesion: "Estudiante", perfil: "Deportivo", detalle: "Hockey", modalidad: "PRESENCIAL", venceEn: 18, dias: [1, 3, 5] },
  { nombre: "Martina", apellido: "Quiroga", nacimiento: "2001-07-25", profesion: "Estudiante de Kinesiología", perfil: "Deportivo", detalle: "Básquet", modalidad: "PRESENCIAL", venceEn: 4, dias: [1, 2, 4, 5], molestias: "Sobrecarga en gemelo derecho" },
  { nombre: "Julián", apellido: "Sosa", nacimiento: "1996-11-03", profesion: "Contador", perfil: "Deportivo", detalle: "Fútbol, recuperación de esguince de tobillo", modalidad: "PRESENCIAL", venceEn: -12, dias: [2, 4], lesiones: "Esguince de tobillo izquierdo (grado II), 2026" },
  { nombre: "Camila", apellido: "Ibarra", nacimiento: "1988-02-17", profesion: "Docente", perfil: "Salud", detalle: "Actividad general", modalidad: "SEMIPRESENCIAL", venceEn: 22, dias: [2, 4] },
  { nombre: "Tomás", apellido: "Aguirre", nacimiento: "2006-09-30", profesion: "Estudiante", perfil: "Deportivo", detalle: "Fútbol", modalidad: "PRESENCIAL", venceEn: 2, dias: [1, 3, 5] },
  { nombre: "Valentina", apellido: "Luna", nacimiento: "1979-05-08", profesion: "Abogada", perfil: "Salud", detalle: "Dolor lumbar, actividad general", modalidad: "ONLINE", venceEn: 10, dias: [1, 4], molestias: "Lumbalgia ocasional" },
  { nombre: "Nicolás", apellido: "Medina", nacimiento: "1999-12-14", profesion: "Programador", perfil: "Deportivo", detalle: "Rugby", modalidad: "PRESENCIAL", venceEn: -40, dias: [1, 3, 5], dejoHace: 24 },
  { nombre: "Sofía", apellido: "Carrizo", nacimiento: "2003-04-21", profesion: "Estudiante", perfil: "Deportivo", detalle: "Vóley, post lesión de hombro", modalidad: "PRESENCIAL", venceEn: 26, dias: [1, 2, 3, 4, 5], lesiones: "Tendinopatía del manguito rotador derecho" },
  { nombre: "Mateo", apellido: "Rojas", nacimiento: "2007-01-19", profesion: "Estudiante", perfil: "Deportivo", detalle: "Hockey", modalidad: "PRESENCIAL", venceEn: 6, dias: [2, 4, 6] },
  { nombre: "Florencia", apellido: "Vega", nacimiento: "1985-10-02", profesion: "Enfermera", perfil: "Salud", detalle: "Actividad general", modalidad: "SEMIPRESENCIAL", venceEn: 15, dias: [1, 3] },
  { nombre: "Agustina", apellido: "Paz", nacimiento: "2000-06-11", profesion: "Diseñadora gráfica", perfil: "Deportivo", detalle: "Running", modalidad: "ONLINE", venceEn: -5, dias: [2, 5] },
  { nombre: "Bruno", apellido: "Molina", nacimiento: "1972-08-27", profesion: "Comerciante", perfil: "Salud", detalle: "Hipertensión controlada, actividad general", modalidad: "PRESENCIAL", venceEn: 20, dias: [1, 3, 5], lesiones: "Operación de menisco (rodilla derecha), 2019" },
  { nombre: "Lautaro", apellido: "Giménez", nacimiento: "2002-02-05", profesion: "Estudiante de Ingeniería", perfil: "Deportivo", detalle: "Tenis", modalidad: "PRESENCIAL", venceEn: 12, dias: [2, 4, 6] },
  { nombre: "Micaela", apellido: "Ortiz", nacimiento: "1993-12-23", profesion: "Odontóloga", perfil: "Salud", detalle: "Actividad general", modalidad: "SEMIPRESENCIAL", venceEn: -70, dias: [3], dejoHace: 60, activo: false },
];

const PRECIOS: Record<string, number> = { PRESENCIAL: 45000, SEMIPRESENCIAL: 35000, ONLINE: 25000, OTRO: 30000 };

const ANOTACIONES: [TipoAnotacion, string][] = [
  ["OBSERVACION", "Buena predisposición, completó toda la sesión."],
  ["CORRECCION_TECNICA", "Corregir la posición de rodillas en la sentadilla: tienden a irse hacia adentro."],
  ["CARGA", "Subimos 5 kg en peso muerto, lo movió con buena técnica."],
  ["CAMBIO_EJERCICIO", "Cambiamos estocadas por sentadilla búlgara."],
  ["MOLESTIA", "Refiere molestia leve al final de la sesión; bajamos el volumen."],
  ["OBSERVACION", "Llegó cansado por partido del fin de semana: sesión más liviana."],
];

const EJERCICIOS = [
  ["Sentadilla", "Peso muerto rumano", "Estocadas", "Hip thrust", "Plancha frontal", "Pallof press", "Gemelos"],
  ["Press de banca", "Remo con barra", "Press militar", "Dominadas asistidas", "Face pull", "Curl de bíceps", "Tríceps en polea"],
  ["Sentadilla búlgara", "Peso muerto", "Saltos al cajón", "Swing con pesa rusa", "Plancha lateral"],
];

function sinTildes(texto: string) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Valores con una progresión de un microciclo a otro: kilos que suben, repeticiones y series.
function valoresRutina(modelo: "MODELO_RUTINA" | "MODELO_RUTINA_2", i: number) {
  const valores: Record<string, string> = {};
  const letra = (columna: number) => String.fromCharCode(65 + columna);
  // Modelo Rutina: ejercicios en la columna A, días desde las filas 4, 11 y 18; KG/REP/SERIE de B a M.
  // Modelo Rutina 2: ejercicios en la columna B, días desde las filas 4, 13 y 23; descanso/REP/SERIE y KG/REP/SERIE de C a N.
  const [columnaEjercicio, filasDia] = modelo === "MODELO_RUTINA" ? [0, [4, 11, 18]] : [1, [4, 13, 23]];
  filasDia.forEach((primeraFila, dia) => {
    EJERCICIOS[dia].forEach((ejercicio, n) => {
      const fila = primeraFila + n;
      const kilos = 10 + ((i + n * 3) % 6) * 5;
      valores[`${letra(columnaEjercicio)}${fila}`] = ejercicio;
      for (let micro = 0; micro < 4; micro++) {
        const primera = columnaEjercicio + 1 + micro * 3;
        const conDescanso = modelo === "MODELO_RUTINA_2" && micro < 2;
        valores[`${letra(primera)}${fila}`] = conDescanso ? "60\"" : String(kilos + micro * 2.5).replace(".", ",");
        valores[`${letra(primera + 1)}${fila}`] = String(micro < 2 ? 12 - micro * 2 : 8 - (micro - 2) * 2);
        valores[`${letra(primera + 2)}${fila}`] = String(micro < 2 ? 3 : 4);
      }
    });
  });
  return valores;
}

// Valor inventado de cada test, según su unidad, que mejora un poco en cada evaluación.
function valorTest(unidad: string, i: number, n: number, lado = 0) {
  const base: Record<string, [number, number]> = { N: [1800, 90], cm: [28, 1.5], "°": [32, 1.5], kg: [60, 4] };
  const [inicio, mejora] = base[unidad] ?? [20, 1];
  return new Prisma.Decimal((inicio + ((i * 7) % 11) * (inicio / 40) + n * mejora - lado * (inicio / 30)).toFixed(1));
}

export async function cargarDatosFicticios() {
  const hoy = hoyComoTexto();
  const planes = await prisma.plan.findMany();
  const perfiles = await prisma.perfil.findMany({ orderBy: { id: "asc" } });
  const tests = await prisma.prueba.findMany({ where: { activa: true, eliminada: false }, orderBy: { id: "asc" }, take: 4 });
  if (planes.length === 0 || perfiles.length === 0) {
    throw new Error("Falta el catálogo inicial del gimnasio (membresías y perfiles).");
  }
  // Precios de las membresías, solo si no tienen uno definido (0).
  for (const plan of planes) {
    if (plan.precioMensual.isZero()) {
      plan.precioMensual = new Prisma.Decimal(PRECIOS[plan.modalidad]);
      await prisma.plan.update({ where: { id: plan.id }, data: { precioMensual: plan.precioMensual } });
    }
  }

  let creados = 0;
  for (const [i, datos] of ALUMNOS.entries()) {
    const dni = String(90000000 + i);
    if (await prisma.alumno.findUnique({ where: { dni } })) continue;
    const plan = planes.find((p) => p.modalidad === datos.modalidad) ?? planes[0];
    const perfil = perfiles.find((p) => p.nombre === datos.perfil) ?? perfiles[0];
    const activo = datos.activo ?? true;

    const alumno = await prisma.alumno.create({
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        dni,
        fechaNacimiento: fechaDesdeTexto(datos.nacimiento),
        profesion: datos.profesion,
        telefono: `341555${String(1000 + i * 37).padStart(4, "0")}`,
        email: `${sinTildes(datos.nombre)}.${sinTildes(datos.apellido)}@example.com`,
        perfilId: perfil.id,
        detallePerfil: datos.detalle,
        lesiones: datos.lesiones,
        molestias: datos.molestias,
        planId: plan.id,
        activo,
      },
    });

    // Cuotas encadenadas hasta la última, que vence en `venceEn` días. Una cuota = un pago.
    const cantidadCuotas = 3 + (i % 4);
    const ultimaDesde = sumarMeses(sumarDias(hoy, datos.venceEn), -1);
    for (let k = cantidadCuotas - 1; k >= 0; k--) {
      const desde = sumarMeses(ultimaDesde, -k);
      const cuota = await prisma.cuota.create({
        data: { alumnoId: alumno.id, planId: plan.id, desde: fechaDesdeTexto(desde), vence: fechaDesdeTexto(sumarMeses(desde, 1)), importe: plan.precioMensual },
      });
      await prisma.pago.create({
        data: {
          alumnoId: alumno.id,
          cuotaId: cuota.id,
          fecha: fechaDesdeTexto(sumarDias(desde, k % 3)),
          importe: plan.precioMensual,
          concepto: "Cuota mensual",
          medio: (i + k) % 3 === 0 ? "EFECTIVO" : "TRANSFERENCIA",
        },
      });
    }

    // Evaluaciones cada tantos meses como indica el perfil; a algunos les toca la próxima en pocos días.
    if (tests.length > 0) {
      const ultima = i % 4 === 1 ? sumarDias(sumarMeses(hoy, -perfil.mesesReevaluacion), 3) : sumarDias(hoy, -10 - i * 3);
      const cantidad = 2 + (i % 3);
      for (let n = 1; n <= cantidad; n++) {
        const fecha = sumarMeses(ultima, -(cantidad - n) * perfil.mesesReevaluacion);
        await prisma.evaluacion.create({
          data: {
            alumnoId: alumno.id,
            idEvaluacion: n,
            fecha: fechaDesdeTexto(fecha),
            observaciones: n === cantidad ? "Buena evolución respecto de la evaluación anterior." : null,
            resultados: {
              create: tests.flatMap((test) =>
                test.porLado
                  ? (["IZQ", "DER"] as const).map((lado, l) => ({ pruebaId: test.id, valor: valorTest(test.unidad, i, n, l), unidad: test.unidad, lado }))
                  : [{ pruebaId: test.id, valor: valorTest(test.unidad, i, n), unidad: test.unidad }],
              ),
            },
          },
        });
      }
    }

    for (let n = 0; n < 2 + (i % 2); n++) {
      const [tipo, detalle] = ANOTACIONES[(i + n * 2) % ANOTACIONES.length];
      await prisma.anotacion.create({ data: { alumnoId: alumno.id, fecha: fechaDesdeTexto(sumarDias(hoy, -(n * 9 + (i % 5) + 1))), tipo, detalle } });
    }

    // Rutina actual (a algunos les termina esta semana) y, a la mitad, la anterior.
    const modelo = i % 2 === 0 ? "MODELO_RUTINA" : "MODELO_RUTINA_2";
    const desdeActual = i % 5 === 2 ? sumarDias(sumarMeses(hoy, -2), 4) : sumarDias(hoy, -(5 + i * 3));
    const desdes = i % 2 === 0 ? [sumarMeses(desdeActual, -2), desdeActual] : [desdeActual];
    for (const desde of desdes) {
      await prisma.rutina.create({
        data: {
          alumnoId: alumno.id,
          tipo: modelo,
          valores: { nombre: `${datos.apellido}, ${datos.nombre}`, edad: String(new Date().getFullYear() - Number(datos.nacimiento.slice(0, 4))), deporte: datos.detalle, ...valoresRutina(modelo, i) },
          objetivo: datos.detalle,
          desde: fechaDesdeTexto(desde),
          hasta: fechaDesdeTexto(sumarMeses(desde, 2)),
          creadoEn: fechaDesdeTexto(desde),
        },
      });
    }

    // Asistencias de los últimos dos meses en sus días de la semana (sin domingos), salvo los que dejaron de venir.
    for (let dia = datos.dejoHace ?? 1; dia <= 60; dia++) {
      const fecha = fechaDesdeTexto(sumarDias(hoy, -dia));
      if (datos.dias.includes(fecha.getUTCDay()) && (dia + i) % 7 !== 0) {
        await prisma.asistencia.create({ data: { alumnoId: alumno.id, fecha } });
      }
    }
    creados++;
  }
  return creados;
}
