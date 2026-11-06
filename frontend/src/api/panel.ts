import type { Destacado } from "./asistencias";
import { pedir } from "./cliente";
import type { ProximaEvaluacion } from "./evaluaciones";
import type { EstadoCuota } from "./pagos";

export interface FilaPanel {
  id: number;
  nombre: string;
  apellido: string;
  fecha: string; // "aaaa-mm-dd"
}

// Lo que muestra la pantalla de Inicio (sin montos: son confidenciales).
export interface Panel {
  alumnosActivos: number;
  cuotasPorVencer: FilaPanel[]; // vencen en los próximos 7 días
  evaluacionesProximas: FilaPanel[]; // vencen entre hoy y los próximos 7 días
  rutinasPorCambiar: FilaPanel[]; // ya terminaron o terminan en los próximos 7 días
  destacadoMes: Destacado | null; // solo el último día del mes
  destacadoAnio: Destacado | null; // solo del 29 al 31 de diciembre
}

// Franja de resumen de la ficha del alumno.
export interface ResumenAlumno {
  membresia: {
    plan: string | null;
    estado: EstadoCuota;
    cuotasAdeudadas: number;
    deudaTotal: string;
  };
  ultimaAsistencia: { fecha: string; diasDesde: number } | null; // fecha "aaaa-mm-dd"
  proximaEvaluacion: ProximaEvaluacion;
  rutina: { hasta: string; diasRestantes: number } | null; // la última rutina; diasRestantes negativo = terminó
}

export const panelApi = {
  obtener: () => pedir<Panel>("/panel"),

  resumenAlumno: (alumnoId: number) => pedir<ResumenAlumno>(`/panel/alumnos/${alumnoId}`),
};
