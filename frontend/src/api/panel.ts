import type { Destacado } from "./asistencias";
import { pedir } from "./cliente";

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

export const panelApi = {
  obtener: () => pedir<Panel>("/panel"),
};
