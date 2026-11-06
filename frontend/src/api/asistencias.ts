import { pedir } from "./cliente";

export interface AlumnoDelDia {
  id: number;
  nombre: string;
  apellido: string;
  presente: boolean;
}

export interface FilaResumen {
  id: number;
  nombre: string;
  apellido: string;
  activo: boolean;
  cantidad: number; // asistencias del mes
  promedioSemanal: number;
  ultimaAsistencia: string | null; // "aaaa-mm-dd"
  diasSinVenir: number | null;
}

// Quién tuvo más asistencias en un período (si empatan, todos).
export interface Destacado {
  cantidad: number;
  alumnos: { id: number; nombre: string; apellido: string }[];
}

export interface ResumenAsistencias {
  mes: string; // "aaaa-mm"
  alumnos: FilaResumen[]; // de más a menos asistencias
  sinVenir: FilaResumen[]; // activos que hace varios días que no vienen
  diasAvisoSinVenir: number;
}

export interface HistorialAsistencias {
  total: number;
  esteMes: number;
  fechas: string[]; // "aaaa-mm-dd", de la más nueva a la más vieja
}

export const asistenciasApi = {
  dia: (fecha: string) => pedir<AlumnoDelDia[]>(`/asistencias/dia?fecha=${fecha}`),

  resumen: (mes: string) => pedir<ResumenAsistencias>(`/asistencias/resumen?mes=${mes}`),

  historial: (alumnoId: number) => pedir<HistorialAsistencias>(`/alumnos/${alumnoId}/asistencias`),

  registrar: (alumnoId: number, fecha: string) => pedir<void>(`/alumnos/${alumnoId}/asistencias/${fecha}`, { metodo: "PUT" }),

  quitar: (alumnoId: number, fecha: string) => pedir<void>(`/alumnos/${alumnoId}/asistencias/${fecha}`, { metodo: "DELETE" }),
};
