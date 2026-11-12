import { ErrorApi, pedir } from "./cliente";

// Rutina que el alumno completa desde el celular con un link, sin usuario (/r/:centro/:link).

export type ClaveSemana = "series" | "reps" | "rpe" | "kgsSugeridos" | "kgs" | "anotaciones" | "correcciones";

// Cada dato es el NOMBRE del campo de la planilla; lo escrito está en `valores`.
export interface EjercicioPlanilla {
  descanso: string;
  numero: string;
  ejercicio: string;
  notas: string;
  rm: string;
  semanas: Record<ClaveSemana, string[]>[]; // dos campos (dos renglones) o uno, según la columna
}

export interface RutinaParaAlumno {
  nombre: string | null;
  deporte: string | null;
  desde: string; // aaaa-mm-dd
  hasta: string;
  dias: { titulo: string; ejercicios: EjercicioPlanilla[] }[];
  valores: Record<string, string>;
}

const ruta = (centro: string, link: string) => `/publico/rutinas/${encodeURIComponent(centro)}/${encodeURIComponent(link)}`;

export const rutinaAlumnoApi = {
  obtener: (centro: string, link: string) => pedir<RutinaParaAlumno>(ruta(centro, link)),

  // keepalive: el pedido termina aunque el alumno cierre la página o cambie de aplicación justo después de escribir.
  guardar: async (centro: string, link: string, cambios: Record<string, string>) => {
    let respuesta: Response;
    try {
      respuesta = await fetch(`/api${ruta(centro, link)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cambios }),
        keepalive: true,
      });
    } catch {
      throw new ErrorApi("No se pudo conectar con el servidor", 0);
    }
    const cuerpo = await respuesta.json().catch(() => null);
    if (!respuesta.ok) throw new ErrorApi(cuerpo?.error ?? "No se pudo guardar", respuesta.status);
  },
};
