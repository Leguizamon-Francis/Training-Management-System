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

// Crear, editar y eliminar se confirman con la contraseña del usuario.
export const perfilesApi = {
  listar: () => pedir<Perfil[]>("/perfiles"),

  crear: (datos: DatosPerfil, password: string) =>
    pedir<Perfil>("/perfiles", { metodo: "POST", datos: { ...datos, password } }),

  actualizar: (id: number, datos: DatosPerfil, password: string) =>
    pedir<Perfil>(`/perfiles/${id}`, { metodo: "PUT", datos: { ...datos, password } }),

  // 409 si algún alumno lo tiene o si es el único perfil.
  eliminar: (id: number, password: string) =>
    pedir<void>(`/perfiles/${id}/eliminar`, { metodo: "POST", datos: { password } }),
};
