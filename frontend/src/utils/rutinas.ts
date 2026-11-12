import type { ModeloRutina, TipoBloque } from "../api/rutinas";
import { linkChatWhatsApp } from "./whatsapp";

export function linkRutinaWhatsApp({ nombre, telefono }: { nombre: string; telefono: string }) {
  return linkChatWhatsApp(telefono, `Hola ${nombre}, ¿cómo estás? Te paso tu rutina.`);
}

// Todos los modelos actuales (cada gimnasio elige entre los que tiene cargados: GET /api/rutinas/modelos).
export const MODELOS_RUTINA: ModeloRutina[] = ["MODELO_RUTINA", "MODELO_RUTINA_2", "PLANILLA_6_SEMANAS"];

// Modelos que el alumno puede completar desde el celular con un link (tienen vista por día).
export const MODELOS_PARA_ALUMNO: TipoBloque[] = ["PLANILLA_6_SEMANAS"];

// Dirección completa del link de una rutina para el alumno.
export function urlRutinaAlumno(centroId: number, link: string) {
  return `${window.location.origin}/r/${centroId}/${link}`;
}

export function mensajeRutinaAlumno(nombre: string | null, url: string) {
  return `Hola${nombre ? ` ${nombre}` : ""}, ¿cómo estás? Acá tenés tu rutina para ir anotando: ${url}`;
}

export const ETIQUETAS_TIPO_BLOQUE: Record<TipoBloque, string> = {
  MODELO_RUTINA: "Modelo Rutina",
  MODELO_RUTINA_2: "Modelo Rutina 2",
  PLANILLA_6_SEMANAS: "Planilla 6 semanas",
  MICROCICLOS_2_SEMANAS: "Bloque de 4 microciclos de 2 semanas",
  MICROCICLOS_1_SEMANA: "Bloque de 4 microciclos de 1 semana",
};
