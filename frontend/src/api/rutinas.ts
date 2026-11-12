import { ErrorApi, pedir } from "./cliente";

export type ModeloRutina = "MODELO_RUTINA" | "MODELO_RUTINA_2" | "PLANILLA_6_SEMANAS";
export type TipoBloque = "MICROCICLOS_2_SEMANAS" | "MICROCICLOS_1_SEMANA" | ModeloRutina; // los MICROCICLOS son de rutinas viejas

export interface Rutina {
  id: number;
  alumnoId: number | null; // null = rutina sin alumno
  tipo: TipoBloque;
  objetivo: string | null; // deporte u objetivo copiado de la planilla, para mostrar en listas
  desde: string; // ISO: día de creación
  hasta: string; // ISO: según el tipo (2 meses o 6 semanas)
  linkAlumno: string | null; // link para que el alumno la complete desde el celular (null = no compartida)
  alumnoEditoEn: string | null; // ISO: último cambio que hizo el alumno con el link
  creadoEn: string; // ISO
  actualizadoEn: string;
}

export interface RutinaConAlumno extends Rutina {
  alumno: { id: number; nombre: string; apellido: string } | null;
  leidaEn: string; // ISO, hora del servidor: se devuelve al guardar para no pisar lo que cambie el alumno
}

export interface RutinaSuelta extends Rutina {
  nombre: string | null; // lo escrito en el campo "Nombre" de la planilla
}

export interface AlumnoConRutinas {
  id: number;
  nombre: string;
  apellido: string;
  cantidad: number;
  ultimaRutina: string | null; // "aaaa-mm-dd"
}

// Los PDF viajan como binario (no JSON): por eso estas dos funciones no usan pedir().
async function bajarPdf(ruta: string) {
  const respuesta = await fetch(`/api${ruta}`);
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new ErrorApi(cuerpo?.error ?? "No se pudo cargar el PDF", respuesta.status);
  }
  return new Uint8Array(await respuesta.arrayBuffer());
}

async function enviarPdf(ruta: string, metodo: "POST" | "PUT", pdf: Uint8Array) {
  const respuesta = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/pdf" },
    body: pdf.slice(), // copia con un ArrayBuffer propio (lo que fetch acepta como cuerpo)
  });
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(cuerpo?.error ?? "No se pudo guardar la rutina", respuesta.status, cuerpo?.campos);
  }
  return cuerpo as Rutina;
}

export const rutinasApi = {
  alumnos: () => pedir<AlumnoConRutinas[]>("/rutinas/alumnos"),

  listar: (alumnoId: number) => pedir<Rutina[]>(`/alumnos/${alumnoId}/rutinas`),

  // Modelos de rutina que tiene cargados el gimnasio (los únicos que puede elegir).
  modelos: () => pedir<ModeloRutina[]>("/rutinas/modelos"),

  sueltas: () => pedir<RutinaSuelta[]>("/rutinas/sueltas"),

  obtener: (id: number) => pedir<RutinaConAlumno>(`/rutinas/${id}`),

  // El PDF para empezar una rutina nueva, con los datos del alumno (null = sin alumno) y lo escrito
  // en la rutina base, si hay.
  borrador: (alumnoId: number | null, tipo: ModeloRutina, base: number | null) =>
    bajarPdf(`${alumnoId ? `/alumnos/${alumnoId}` : ""}/rutinas/borrador?tipo=${tipo}${base ? `&base=${base}` : ""}`),

  pdf: (id: number) => bajarPdf(`/rutinas/${id}/pdf`),

  // Link directo para descargar el PDF (la cookie de sesión viaja sola).
  urlDescarga: (id: number) => `/api/rutinas/${id}/pdf?descargar=true`,

  // datosAlumno: el servidor pone en la planilla el nombre y la edad del alumno ("Guardar en" otro alumno).
  crear: (alumnoId: number | null, tipo: ModeloRutina, pdf: Uint8Array, datosAlumno = false) =>
    enviarPdf(`${alumnoId ? `/alumnos/${alumnoId}` : ""}/rutinas?tipo=${tipo}${datosAlumno ? "&datosAlumno=true" : ""}`, "POST", pdf),

  actualizar: (id: number, pdf: Uint8Array, leidaEn: string) =>
    enviarPdf(`/rutinas/${id}?leidaEn=${encodeURIComponent(leidaEn)}`, "PUT", pdf),

  // Link para el alumno: lo crea si no tenía; borrarlo lo corta.
  compartir: (id: number) => pedir<{ linkAlumno: string }>(`/rutinas/${id}/link`, { metodo: "POST" }),
  dejarDeCompartir: (id: number) => pedir<void>(`/rutinas/${id}/link`, { metodo: "DELETE" }),

  eliminar: (id: number) => pedir<void>(`/rutinas/${id}`, { metodo: "DELETE" }),
};
