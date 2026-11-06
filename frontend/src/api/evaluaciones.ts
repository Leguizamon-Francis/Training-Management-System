import { pedir } from "./cliente";
import type { PerfilAlumno } from "./alumnos";
import type { CategoriaPrueba } from "./pruebas";

export type Lado = "IZQ" | "DER";
export type OrigenResultado = "PLATAFORMA_FUERZA" | "MYJUMP" | "MANUAL";

export interface ResultadoEvaluacion {
  id: number;
  pruebaId: number;
  prueba: { id: number; nombre: string; categoria: CategoriaPrueba; unidad: string };
  valor: string; // Decimal: llega como texto ("32.5") para no perder precisión
  unidad: string;
  lado: Lado | null;
  origen: OrigenResultado;
  observacion: string | null;
}

export interface Evaluacion {
  id: number;
  alumnoId: number;
  idEvaluacion: number; // "Evaluación n°": numeración propia de cada alumno (1, 2, 3…)
  fecha: string; // ISO; la fecha son los primeros 10 caracteres
  observaciones: string | null;
  resultados: ResultadoEvaluacion[];
}

export interface ProximaEvaluacion {
  fecha: string; // "aaaa-mm-dd"
  desde: "ultimaEvaluacion" | "alta";
  diasRestantes: number; // negativo = vencida
}

export interface ListadoEvaluaciones {
  evaluaciones: Evaluacion[]; // de la más reciente a la más vieja
  proximaEvaluacion: ProximaEvaluacion;
}

export interface DatosResultado {
  pruebaId: number | null;
  valor: string; // acepta coma decimal
  unidad: string;
  lado: Lado | null;
  origen: OrigenResultado;
  observacion: string;
}

export interface DatosEvaluacion {
  fecha: string; // "aaaa-mm-dd"
  observaciones: string;
  resultados: DatosResultado[];
}

// Alumno activo con el resumen de sus evaluaciones (pantalla Evaluaciones).
export interface ResumenEvaluacionAlumno {
  id: number;
  nombre: string;
  apellido: string;
  perfil: PerfilAlumno;
  cantidad: number;
  ultimaEvaluacion: string | null; // "aaaa-mm-dd"
  proximaEvaluacion: ProximaEvaluacion;
}

export const evaluacionesApi = {
  resumenAlumnos: () => pedir<ResumenEvaluacionAlumno[]>("/evaluaciones/resumen-alumnos"),

  listar: (alumnoId: number) => pedir<ListadoEvaluaciones>(`/alumnos/${alumnoId}/evaluaciones`),

  obtener: (id: number) => pedir<Evaluacion>(`/evaluaciones/${id}`),

  crear: (alumnoId: number, datos: DatosEvaluacion) =>
    pedir<Evaluacion>(`/alumnos/${alumnoId}/evaluaciones`, { metodo: "POST", datos }),

  actualizar: (id: number, datos: DatosEvaluacion) =>
    pedir<Evaluacion>(`/evaluaciones/${id}`, { metodo: "PUT", datos }),

  eliminar: (id: number) => pedir<void>(`/evaluaciones/${id}`, { metodo: "DELETE" }),
};
