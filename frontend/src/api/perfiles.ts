import { pedir } from "./cliente";

// Perfil de los alumnos (Configuración → Perfiles).
export interface Perfil {
  id: number;
  nombre: string;
  mesesReevaluacion: number; // cada cuántos meses toca la próxima evaluación
  alumnos: number; // cuántos alumnos lo tienen (activos e inactivos)
}

export interface DatosPerfil {
  nombre: string;
  mesesReevaluacion: string; // texto del formulario; el backend lo convierte a número
}

export const perfilesApi = {
  listar: () => pedir<Perfil[]>("/perfiles"),

  crear: (datos: DatosPerfil) => pedir<Perfil>("/perfiles", { metodo: "POST", datos }),

  actualizar: (id: number, datos: DatosPerfil) => pedir<Perfil>(`/perfiles/${id}`, { metodo: "PUT", datos }),

  // 409 si algún alumno lo tiene o si es el único perfil.
  eliminar: (id: number) => pedir<void>(`/perfiles/${id}`, { metodo: "DELETE" }),
};
