import { diasEntre, hoyComoTexto, textoDesdeFecha } from "../../lib/fechas";
import { prisma } from "../../lib/prisma";
import { destacadoDelAnio, destacadoDelMes, destacadosDeHoy } from "../asistencias/asistencias.service";
import { resumenAlumnos } from "../evaluaciones/evaluaciones.service";
import { obtenerEstadoCuotas } from "../pagos/pagos.service";

// Con cuántos días de anticipación se avisa en el panel.
const DIAS_PROXIMAS_EVALUACIONES = 7;
const DIAS_AVISO_RUTINA = 7;

interface FilaPanel {
  id: number;
  nombre: string;
  apellido: string;
  fecha: string; // "aaaa-mm-dd"
}

// Solo estos datos salen del panel, para que nunca viajen montos en la respuesta.
function fila(alumno: Omit<FilaPanel, "fecha">, fecha: string): FilaPanel {
  return { id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido, fecha };
}

// Lo más urgente primero.
function porFecha(a: FilaPanel, b: FilaPanel) {
  return a.fecha.localeCompare(b.fecha) || a.apellido.localeCompare(b.apellido);
}

// Alumnos activos cuya última rutina ya terminó o termina en los próximos días.
async function rutinasPorCambiar(hoy: string) {
  const alumnos = await prisma.alumno.findMany({
    where: { activo: true, rutinas: { some: {} } },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      rutinas: { select: { hasta: true }, orderBy: [{ hasta: "desc" }, { id: "desc" }], take: 1 },
    },
  });
  return alumnos
    .map((alumno) => fila(alumno, textoDesdeFecha(alumno.rutinas[0].hasta)))
    .filter((alumno) => diasEntre(hoy, alumno.fecha) <= DIAS_AVISO_RUTINA);
}

// Lo que muestra la pantalla de Inicio. Reutiliza los cálculos de cada módulo:
// estado de cuotas (pagos) y próxima evaluación (evaluaciones).
// No se envían montos (ingresos, deudas): son confidenciales y se consultan en Pagos.
export async function obtenerPanel() {
  const hoy = hoyComoTexto();
  const destacados = destacadosDeHoy(hoy);
  const [cuotas, evaluaciones, rutinas, destacadoMes, destacadoAnio] = await Promise.all([
    obtenerEstadoCuotas(), // alumnos activos con el estado de su cuota
    resumenAlumnos(),
    rutinasPorCambiar(hoy),
    destacados.mes ? destacadoDelMes(hoy.slice(0, 7)) : null,
    destacados.anio ? destacadoDelAnio(hoy.slice(0, 4)) : null,
  ]);

  return {
    alumnosActivos: cuotas.length,
    cuotasPorVencer: cuotas
      .filter((alumno) => alumno.estado === "POR_VENCER")
      .map((alumno) => fila(alumno, alumno.vence as string)) // POR_VENCER siempre tiene vencimiento
      .sort(porFecha),
    // Evaluaciones que vencen entre hoy y los próximos 7 días (las ya vencidas no cuentan acá).
    evaluacionesProximas: evaluaciones
      .filter(
        (alumno) => alumno.proximaEvaluacion.diasRestantes >= 0 && alumno.proximaEvaluacion.diasRestantes <= DIAS_PROXIMAS_EVALUACIONES,
      )
      .map((alumno) => fila(alumno, alumno.proximaEvaluacion.fecha))
      .sort(porFecha),
    rutinasPorCambiar: rutinas.sort(porFecha),
    // Solo los días en que se anuncian; si nadie vino en el período, tampoco.
    destacadoMes,
    destacadoAnio,
  };
}
