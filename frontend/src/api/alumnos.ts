import { pedir } from "./cliente";
import type { Plan } from "./planes";

export type Perfil = "DEPORTIVO" | "SALUD" | "RECUPERACION";
export type EstadoFiltro = "activos" | "inactivos" | "todos";

// Lo que devuelve el listado.
export interface AlumnoResumen {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string; // ISO; la fecha son los primeros 10 caracteres
  telefono: string;
  perfil: Perfil;
  activo: boolean;
}

// Ficha completa.
export interface Alumno extends AlumnoResumen {
  email: string | null;
  profesion: string;
  detallePerfil: string | null;
  lesiones: string | null;
  molestias: string | null;
  actividadLaboral: string | null;
  otrosDatos: string | null;
  plan: Plan | null;
  creadoEn: string;
}

export interface CambioAlumno {
  id: number;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
}

// Datos del formulario: todo como texto (el backend valida y convierte).
export interface DatosAlumno {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string; // "aaaa-mm-dd" (formato del <input type="date">)
  telefono: string;
  email: string;
  profesion: string;
  perfil: Perfil | "";
  detallePerfil: string;
  lesiones: string;
  molestias: string;
  actividadLaboral: string;
  otrosDatos: string;
}

export interface FiltrosAlumnos {
  buscar: string;
  estado: EstadoFiltro;
  perfil: Perfil | "";
}

export const alumnosApi = {
  listar: (filtros: FiltrosAlumnos) => {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) parametros.set(clave, valor);
    }
    return pedir<AlumnoResumen[]>(`/alumnos?${parametros}`);
  },

  obtener: (id: number) => pedir<Alumno>(`/alumnos/${id}`),

  eliminar: (id: number, password: string) => pedir<void>(`/alumnos/${id}/eliminar`, { metodo: "POST", datos: { password } }),

  historial: (id: number) => pedir<CambioAlumno[]>(`/alumnos/${id}/historial`),

  crear: (datos: DatosAlumno) => pedir<Alumno>("/alumnos", { metodo: "POST", datos }),

  actualizar: (id: number, datos: DatosAlumno) =>
    pedir<Alumno>(`/alumnos/${id}`, { metodo: "PUT", datos }),

  cambiarEstado: (id: number, activo: boolean) =>
    pedir<Alumno>(`/alumnos/${id}/estado`, { metodo: "PATCH", datos: { activo } }),

  cambiarPlan: (id: number, planId: number | null) =>
    pedir<Alumno>(`/alumnos/${id}/plan`, { metodo: "PATCH", datos: { planId } }),
};
